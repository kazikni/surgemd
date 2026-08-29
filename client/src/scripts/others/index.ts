import { Game} from "./game.ts"
import "../../scss/main.scss"
import { MenuManager } from "../managers/menuManager.ts";
import { isMobile } from "common/engine/web.ts";
import { PlayArgs } from "./constants.ts";
import { API_BASE, sandbox_version } from "./config.ts";
import { GoFileManager, is_binary } from "../defs/go_files.ts";
import { CModsManager } from "../managers/modsManager.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { UpdatePacket } from "common/scripts/packets/update_packet.ts";
import { FindGameResult } from "common/scripts/config/config.ts";
import { BasicSocket, FetchFileManager, FileManager, OfflineClientsManager, random, ReplayWatcher, TranslationManager } from "common/engine/core.ts";
(async() => {
    async function requestImmersive() {
        const el = document.documentElement;
        if (!document.fullscreenElement) {
            if (el.requestFullscreen) {
                await el.requestFullscreen({ navigationUI: "hide" });
            } else if ((el as any).webkitRequestFullscreen) {
                await (el as any).webkitRequestFullscreen();
            }
        }
        if ((window as any).Capacitor?.Plugins?.StatusBar) {
            try {
                await (window as any).Capacitor.Plugins.StatusBar.hide();
            } catch {}
        }
    }
    
    document.addEventListener("touchstart", requestImmersive);
    document.addEventListener("visibilitychange", async () => {
        if ((!document.hidden)&&isMobile) {
            await requestImmersive();
        }
    })

    const canvas=document.querySelector("#game-canvas") as HTMLCanvasElement

    const fs:FileManager=is_binary?new GoFileManager():new FetchFileManager()
    const mods:CModsManager|undefined=sandbox_version&&is_binary?new CModsManager(fs):undefined

    class App{
        game:Game

        elements={
            play_button_normal:document.querySelector("#btn-play-normal") as HTMLButtonElement,
            play_button_campaign:document.querySelector("#btn-play-campaign") as HTMLButtonElement
        }

        menu_manager:MenuManager
        definitions:GameDefinition
        file=new FetchFileManager()

        constructor(){
            this.definitions=new GameDefinition()
            this.definitions.reset()
            PacketManager.pre_packet=(p)=>{
                if(p.Name==="update")(p as UpdatePacket).definition=this.definitions
            }
            const menu_manager=new MenuManager(this.definitions)
            menu_manager.show_loading_screen()
            this.menu_manager=menu_manager

            this.game=new Game(this.definitions,menu_manager,canvas,new TranslationManager())
        }
        async init(){
            await this.menu_manager.preload_loading_screens(["/assets/img/menu/background/normal_background.png","/assets/img/menu/background/tundra_background.png"])
            this.menu_manager.change_loading_screen()
            this.menu_manager.play_callback=this.game.play_game.bind(this.game)
            this.menu_manager.play_callback_hard=this.game.play_game_hard.bind(this.game)
            if(mods){
                mods.stateFile="save/mods_state.json"
                await mods.loadManifests()
                await mods.initialize(this.game)
                for(const k of mods.getLoadOrder()){
                    const mod=mods.loaded.get(k.id)!
                    if(mod.result?.definitions)this.definitions.add_definitions(mod?.result?.definitions)
                }
            }
            await this.game.bind(fs)
            await this.menu_manager.init(this.game.input_manager,this.game.save,this.file,this.game.resources,this.game.sounds,this.game.scene_2d.camera,this.game.definitions,this.game.language,mods,this.game.ambient.music,this.game.ambient.ambience)
            await this.game.load_resources([],{})
            await this.menu_manager.reload(this.game.definitions,this.file,mods)

            this.game.menu.hide_loading_screen()
            this.game.mainloop(true)
        }
    }
    const app=new App()
    await app.init()
})()