import { ClientApplication, Renderer } from "common/engine/web.ts"
import { api, api_server, ConfigCasters, ConfigDefaultActions, ConfigDefaultValues, sources } from "./config.ts"
import { LoadingScreenScene } from "../scenes/loading_screen.ts";
import { MenuScene } from "../scenes/menu/scene.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts"
import { Color, ColorM, FileManager, Language, Matrix, matrix4, Numeric, Path, StaticStream, TranslationManager, v2, Vec2 } from "common/engine/core.ts";
import { ApiSettings, game_version } from "common/scripts/config/config.ts";
import { warning_popup } from "../scenes/menu/def.ts";
import { CutsceneScene } from "../scenes/cutscene/scene.ts";
import { CommonApplication } from "common/scripts/game/base.ts";
import { OnlineGameOptions, PlayScene, WorkerGameOptions, type PlaySceneKind } from "../scenes/play/scene.ts";

import { InitialScreenScene } from "../scenes/initial_screen/scene.ts";
import { JoinData } from "common/scripts/net/join_packet.ts";

export class Application extends ClientApplication implements CommonApplication{
    menu_scene=new MenuScene()
    loading_scene=new LoadingScreenScene()
    cutscene_scene=new CutsceneScene()
    play_scene!:PlayScene

    definitions:GameDefinition=new GameDefinition()
    fs:FileManager
    translation:TranslationManager=new TranslationManager()

    api_public?:ApiSettings

    global_interpolation:number=1

    world_shadow:{
        enabled:boolean
        color: Color
        matrix: Matrix
        offset: Vec2
        scale: Vec2
    }

    constructor(fs:FileManager,renderer:Renderer){
        super(renderer)
        this.fs=fs

        this.sounds.create_bus("music")
        this.sounds.create_bus("ambient")
        this.sounds.create_bus("objects")

        this.sounds.create_controller("music","music")
        this.sounds.create_controller("ambient","ambient")

        this.save.settings.casters=ConfigCasters
        this.save.settings.default_values=ConfigDefaultValues
        this.save.settings.default_actions=ConfigDefaultActions
        this.save.settings.compatible_version=1
        this.save.settings.version=1

        this.world_shadow={
            enabled:true,
            color:ColorM.hex("#0014"),
            matrix:matrix4.translation_2d(v2(0.1,0.1)),//matrix4.mul(),matrix4.translation_2d(v2(0.9,0.9)))
            offset:v2(0.1,0.1),
            scale:v2(1,1)
        }
    }

    async initialize(){
        await this.save.settings.init({
            type:"localstorage",
            key:sources.save.key
        })

        this.sounds.master_bus.set_volume(Numeric.clamp(this.save.settings.get_var("sounds_master_volume"),0,1))
        this.sounds.buses.get("music")!.set_volume(Numeric.clamp(this.save.settings.get_var("sounds_music_volume"),0,1))
        this.sounds.buses.get("ambient")!.set_volume(Numeric.clamp(this.save.settings.get_var("sounds_ambient_volume"),0,1))

        await this.loading_scene.preload_loading_screens(sources.loading_screens)

        if(this.save.settings.get_var("ui_show_intro")){
            const initial_screen=new InitialScreenScene(sources.intro)
            await initial_screen.init(this)
            this.scene=initial_screen
            await initial_screen.show()
        }

        this.scene=this.loading_scene

        this.input.add_axis("movement","move_up","move_down","move_left","move_right","left")
        this.input.add_axis("aim","aim_up","aim_down","aim_left","aim_right","right")

        this.translation.load_default_language(await(await fetch("/scripts/languages/en.json")).json() as Language,"main")
        this.translation.load_language(await(await fetch(`/scripts/languages/${this.save.settings.get_var("ui_translation")}.json`)).json() as Language,"main")

        this.definitions.reset()

        await this.load_resources(["/assets/kspr/common"])
        await this.menu_scene.init(this)

        this.play_scene=new PlayScene(this)

        //this.scene=this.menu_scene

        const params=new URLSearchParams(location.search)
        const kind=(params.get("play")??"worker") as Exclude<PlaySceneKind,"none">
        const mode=params.get("mode")??undefined
        await this.play(kind,{
            url:params.get("server")??undefined,
            mode,
            settings:{
                map:{def:params.get("map")??(mode==="debug"?"debug":"normal")},
            },
        })
    }
    override on_update(dt: number): void {
        super.on_update(dt)
        this.global_interpolation=Numeric.get_interpolation_t(this.tps,dt)
    }

    async play(kind:Exclude<PlaySceneKind,"none">,options?:WorkerGameOptions|OnlineGameOptions,join?:JoinData){
        const game=this.play_scene
        switch(kind){
            case "worker":
                await game.worker_initialize(options as WorkerGameOptions)
                break
            case "online":
                await game.online_initialize(options as OnlineGameOptions)
                break
        }
        await game.join(join??{
            name:this.save.settings.get_var("loadout_name")??"",
        })
        //game.free_cam()
        this.scene=game
    }

    override on_bind(){
        return this.initialize()
    }

    async load_resources(agro:string[]=[],assets:Record<string,string>={},languages_path:string="",definitions:string[]=[]){
        const loading_set=this.loading_scene.set_current.bind(this.loading_scene)
        
        agro=["/assets/kspr/main",...agro]
        for(const p in this.resources.imported){
            if(agro.includes(p))continue
            this.resources.unload_imported(p)
        }
        let resolution = this.save.settings.get_var("graphics_resolution")
        for(const tt of agro){
            if(this.resources.imported[tt])continue
            const v=await this.resources.load_json(`${tt}/settings.json`,loading_set)

            for(const f of (v.files as string[])){
                const path=Path.join_simple(tt,f)
                loading_set(path)
                if(f.startsWith("sounds")){
                    await this.resources.load_source(tt,path)
                }else if(f.startsWith("sheets/sheet_"+resolution)){
                    resolution=""
                    await this.resources.load_source(tt,path)
                }
            }
        }
        if(languages_path!=""){
            try{
                this.translation.load_default_language(await this.resources.load_json(`${languages_path}/en.json`),"ingame")
                this.translation.load_language(await this.resources.load_json(`${languages_path}/${this.save.settings.get_var("ui_translation")}.json`),"ingame")
            }catch(e){
                console.log(e)
            }
        }
        for(const d of definitions){
            const stream=new StaticStream((await (await fetch(d)).bytes()).buffer)
            this.definitions.add_definitions(stream.read_td(GameDefinition.add_td))
        }
    }
    async update_api(){
        if(api){
            let js=this.api_public
            try{
                js=await(await fetch(`${api_server.toString("http")}/get-public`,{ signal: AbortSignal.timeout(4000) })).json()
                if(js?.game_version!==game_version){
                    js=undefined
                    await this.menu_scene.popup.popup(warning_popup("Invalid Game Version. Please Update the game To play online"))
                }
            }catch(e){
                console.log(e)
                js=undefined
            }
            this.api_public=js
        }
    }

    override on_run(): void {
        super.on_run()
    }

    show_error(error:string){

    }
}