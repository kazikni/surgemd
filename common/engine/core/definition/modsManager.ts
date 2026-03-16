import { type AbstractGame } from "../game/game.ts";
import { FileManager } from "./file.ts";
import { joinPath, importFromString, mergeDeep, cloneDeep } from "../math/utils.ts"
import { v2 } from "../math/vec2.ts";
import { Angle } from "../math/geometry.ts";
import { random } from "../math/random.ts";
import { v3 } from "../math/vec3.ts";
import { ColorM } from "../math/color.ts";
import { CircleHitbox2D, HitboxGroup2D, PolygonHitbox2D, RectHitbox2D } from "../math/hitbox.ts";
export type ModManifest = {
    id: string
    name: string
    version: string
    main: string

    author?: string
    description?: string
    dependencies?: string[]
    conflicts?: string[]
    priority?: number

    permissions?: {
        fs?: "none" | "read" | "full"
        net?: boolean
        engine?: "readonly" | "full"
    }
}

export type ModContext<
    Game extends AbstractGame<any>,
    Manifest extends ModManifest
> = {
    id: string
    root: string
    manifest: Manifest
    fs: FileManager
    game: Game
    globals: Record<string,any>
}

export type ModModule<
    Game extends AbstractGame<any>,
    Ctx extends ModContext<Game, any>,
    Result={}
> = {
    main(ctx: Ctx): Promise<Result> | Result
    tick?(dt: number, ctx: Ctx): void
    draw?(ctx: Ctx): void
    dispose?(ctx: Ctx): void
}

type ModState = {
    id: string
    enabled: boolean
}

type LoadedMod<
    Game extends AbstractGame<any>,
    Manifest extends ModManifest,
    Ctx extends ModContext<Game, Manifest>,
    Result,
    Module extends ModModule<Game,Ctx,Result>
> = {
    module: Module
    manifest: Manifest & { path: string }
    ctx: Ctx
    result: Result | null
}
export class ModsManager<
    Manifest extends ModManifest,
    Game extends AbstractGame<any>,
    Context extends ModContext<Game, Manifest>,
    Result,
    Module extends ModModule<Game,Context,Result>
> {
    fs: FileManager

    modsDir = "mods"
    stateFile = "mods_state.json"

    private manifests = new Map<string, Manifest & { path: string }>()
    private state = new Map<string, boolean>()
    state_changed:boolean=false
    loaded = new Map<string, LoadedMod<Game, Manifest, Context, Result,Module>>()

    globals!:Record<string,any>
    
    constructor(fs: FileManager) {
        this.fs = fs
    }

    async loadManifests(): Promise<void> {
        this.manifests.clear()

        let folders:string[]=[]
        try{
            folders = await this.fs.list_dir(this.modsDir)
        }catch{
            //console.log(e)
        }

        for (const folder of folders) {
            try {
                const raw = await this.fs.read_file(`${this.modsDir}/${folder}/mod.json`)
                const manifest = JSON.parse(raw) as Manifest
                this.manifests.set(manifest.id, {
                    ...manifest,
                    path: `${this.modsDir}/${folder}`
                })
            } catch {
                console.warn("Invalid mod:", folder)
            }
        }

        await this.loadState()
    }
    async initialize(game: Game): Promise<void> {
        this.loaded.clear()

        for (const manifest of this.getLoadOrder()) {
            try {
                const entry = joinPath(manifest.path, manifest.main)
                const source = await this.fs.read_file(entry)
                const module = await importFromString(source) as Module

                const ctx = this.create_context(manifest,manifest.path, game)

                let result: Result | null = null
                if (module.main) {
                    result = await module.main(ctx)
                }

                this.loaded.set(manifest.id, {
                    module,
                    manifest,
                    ctx,
                    result,
                })

                console.log("Loaded mod:", manifest.name)
            } catch (err) {
                console.error("Failed loading mod:", manifest.id, err)
            }
        }
    }
    create_context(manifest:Manifest,path:string,game:Game):Context{
        if(!this.globals){
            this.globals=this.make_globals()
        }
        return {
            id: manifest.id,
            root: path,
            manifest,
            fs: this.createSandboxFS(manifest),
            game: game,
            globals:this.globals
        } as unknown as Context
    }
    tick(dt: number) {
        for (const mod of this.loaded.values()) {
            mod.module.tick?.(dt, mod.ctx)
        }
    }
    draw() {
        for (const mod of this.loaded.values()) {
            mod.module.draw?.(mod.ctx)
        }
    }
    async unloadAll() {
        for (const mod of this.loaded.values()) {
            await mod.module.dispose?.(mod.ctx)
        }
        this.loaded.clear()
    }

    private async loadState() {
        try {
            const raw = await this.fs.read_file(this.stateFile)
            const data: ModState[] = JSON.parse(raw)
            for (const s of data) this.state.set(s.id, s.enabled)
        } catch {}
    }

    private async saveState() {
        const arr: ModState[] = []
        for (const [id, enabled] of this.state) {
            arr.push({ id, enabled })
        }
        await this.fs.write_file(this.stateFile, JSON.stringify(arr, null, 4))
    }

    make_globals():Record<string,any>{
        return {
            //Utils
            v2,
            v3,
            Angle,
            random,
            ColorM,
            RectHitbox2D,
            CircleHitbox2D,
            PolygonHitbox2D,
            HitboxGroup2D,
            mergeDeep,
            cloneDeep,
        }
    }

    enable(id: string) {
        this.state.set(id, true)
        this.state_changed=true
        return this.saveState()
    }
    disable(id: string) {
        this.state.set(id, false)
        this.state_changed=true
        return this.saveState()
    }
    toggle(id: string){
        this.state.set(id, !(this.isEnabled(id)))
        this.state_changed=true
        return this.saveState()
    }

    isEnabled(id: string): boolean {
        return this.state.get(id) ?? false
    }
    getAll():(Manifest&{path:string})[]{
        return [...this.manifests.values()]
    }

    getLoadOrder() {
        return [...this.manifests.values()]
            .filter(m => this.isEnabled(m.id))
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    }

    private createSandboxFS(manifest: Manifest): FileManager {
        const perm = manifest.permissions?.fs ?? "none"

        if (perm === "full") return this.fs

        return {
            read_file: async (path: string) => {
                if (perm === "none") throw new Error("FS not allowed")
                return this.fs.read_file(path)
            },
            write_file: async () => {
                throw new Error("Write not allowed")
            },
            read_fileb: async (p: string) => {
                if (perm === "none") throw new Error("FS not allowed")
                return this.fs.read_fileb(p)
            },
            write_fileb: async () => {
                throw new Error("Write not allowed")
            },
            list_dir: async (p: string) => {
                if (perm === "none") throw new Error("FS not allowed")
                return this.fs.list_dir(p)
            }
        }
    }

    private wrapGame(game: Game, manifest: Manifest): Game {
        const perm = manifest.permissions?.engine ?? "full"

        if (perm === "full") return game

        return new Proxy(game, {
            get(target, prop) {
                const value = (target as any)[prop]
                if (typeof value === "function") {
                    return value.bind(target)
                }
                return value
            },
            set() {
                throw new Error("Readonly engine access")
            }
        })
    }
}