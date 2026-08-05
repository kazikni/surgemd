import { type Plugin } from "vite";
import { buildKSPRGroup, CompilerOptions, Resolution } from "./utils/spritesheet.ts";

const PLUGIN_NAME = "vite-spritesheet-plugin";

export function spritesheet(atlas_list: Record<string,{path:string,save_assets?:boolean,base?:string}>,resolutions: Resolution[] = [{ name: "low", scale: 0.5 }],options?:CompilerOptions): Plugin[] {
    async function buildAll() {
        const outputs: Record<string, Uint8Array> = {}
        for (const [name, folder] of Object.entries(atlas_list)) {
            outputs[name] = await buildKSPRGroup(folder.base??"",folder.path,resolutions,folder.save_assets,options)
        }
        return outputs
    }

    return [
        // ======================
        // BUILD
        // ======================
        {
            name: `${PLUGIN_NAME}:build`,
            apply: "build",
            async generateBundle() {
                const outputs = await buildAll()
                for (const [name, buffer] of Object.entries(outputs)) {
                    this.emitFile({
                        type: "asset",
                        fileName: `${name}.kspr`,
                        source: buffer
                    })
                }
            }
        },
        {
            name: `${PLUGIN_NAME}:serve`,
            apply: "serve",
            async configureServer(server) {
                let files: Record<string, Uint8Array> = {}

                async function rebuild() {
                    console.log("Rebuilding atlases...")
                    files = await buildAll()
                    server.ws.send({ type: "full-reload" })
                }

                await rebuild()
                server.middlewares.use((req, res, next) => {
                    if (!req.url) return next()
                    for (const name of Object.keys(files)) {
                        if (req.url === `/${name}.kspr`) {
                            res.writeHead(200, {
                                "Content-Type": "application/octet-stream"
                            })
                            res.end(files[name])
                            return
                        }
                    }

                    next()
                })
            },
        }
    ]
}