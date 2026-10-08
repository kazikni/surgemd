import { Game} from "./game.ts"
import "../../scss/main.scss"
import { MenuManager } from "../managers/menuManager.ts";
import { BinFileManager, is_binary } from "../defs/bin_files.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { UpdatePacket } from "common/scripts/packets/update_packet.ts";
import { FetchFileManager, FileManager, TranslationManager } from "common/engine/core.ts";
(async() => {
    const canvas=document.querySelector("#game-canvas") as HTMLCanvasElement
    const fs:FileManager=is_binary?new BinFileManager():new FetchFileManager()

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
            this.menu_manager=menu_manager

            this.game=new Game(this.definitions,menu_manager,canvas,new TranslationManager())
        }
        async init(){
            await this.menu_manager.preload_loading_screens([
                "/assets/img/menu/loading_screens/normal.png",
                "/assets/img/menu/loading_screens/tundra.png",
                "/assets/img/menu/loading_screens/guns.svg",
            ])
            this.menu_manager.change_loading_screen()
            this.menu_manager.play_callback=this.game.play_game.bind(this.game)
            this.menu_manager.play_callback_hard=this.game.play_game_hard.bind(this.game)
            await this.game.bind(fs)
            if(is_binary)this.game.save.fs=fs
            await this.menu_manager.init(this.game.input_manager,this.game.save,this.file,this.game.resources,this.game.sounds,this.game.scene_2d.camera,this.game.definitions,this.game.language)
            await this.game.load_resources([],{})
            await this.menu_manager.reload(this.game.definitions,this.file)

            this.game.menu.cutscene.root.addEventListener("click",()=>{
                this.game.input_manager.resolve_input_wait?.()
            })
            
            this.game.menu.hide_loading_screen()
            this.game.mainloop(true)
        }
    }
    const app=new App()
    await app.init()
})()