import { Game} from "./game.ts"
import "../../scss/main.scss"
import { MenuManager } from "../managers/menuManager.ts";
import { BasicSocket, FetchFileManager, FileManager, isMobile, OfflineClientsManager, random, ReplayWatcher, sleep, tdm, TranslationManager } from "common/engine/client.ts";
import { PlayArgs } from "./constants.ts";
import { API_BASE, sandbox_version } from "./config.ts";
import { GoFileManager, is_binary } from "../defs/go_files.ts";
import { CModsManager } from "../managers/modsManager.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { UpdatePacket } from "common/scripts/packets/update_packet.ts";
import { FindGameResult } from "common/scripts/config/config.ts";
import { BuildingTD } from "common/scripts/definitions/objects/buildings_base.ts";
import { bullets_factory } from "common/scripts/definitions/items/guns.ts";
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
            this.definitions.init_default()
            PacketManager.pre_packet=(p)=>{
                if(p.Name==="update")(p as UpdatePacket).definition=this.definitions
            }
            const menu_manager=new MenuManager(this.definitions)

            this.menu_manager=menu_manager

            this.game=new Game(this.definitions,menu_manager,canvas,new TranslationManager())
        }
        async init(){
            this.menu_manager.play_callback=this.play_game.bind(this)
            this.menu_manager.play_callback_hard=this.play_game_hard.bind(this)
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
            await this.menu_manager.init(this.game.input_manager,this.game.save,this.file,this.game.resources,this.game.sounds,this.game.cam2d,this.game.definitions,this.game.language,mods)
            await this.game.load_resources(["main"],{})
            await this.menu_manager.reload(this.game.definitions,this.file,mods)
            this.game.mainloop(true)
        }
        join_on_game(url:string,password:string,attempts=0,delay=500){
            console.log("Joining In: ",url)
            try{
                const ws=new WebSocket(url) as unknown as BasicSocket
                this.game.offline=false
                this.game.set_socket(ws)
            }catch{
                console.log("Failed To Join In:",url)
                if(attempts){
                    setTimeout(this.join_on_game.bind(this,url,password,attempts-1,delay),delay)
                }
            }
        }
        play_game_hard(result:FindGameResult){
            if(result.success){
                this.game.group_token=result.token??""
                this.game.connect(result.address)
            }
        }
        async play_game(play:PlayArgs){
            if(this.game.happening)return
            switch(play.type){
                case "online":{
                    const args={
                        ...play,
                        region:this.game.save.get_variable("sv_game_region"),
                    }
                    try{
                        if(this.game.menu.group_state){
                            this.game.menu.team_ws!.send(JSON.stringify({
                                ...args,
                                type:"play"
                            }))
                        }else{
                            const ghost:FindGameResult=await(await fetch(API_BASE+"/find-game",{
                                method:"post",
                                body:JSON.stringify(args)
                            })).json()
                            if(ghost.success){
                                this.game.connect(ghost.address)
                            }
                        }
                    }catch{
                        alert("Error")
                    }
                    break
                }
                case "campaign":{
                    this.game.start_with_intro=play.start_with_intro
                    this.game.local_server.begin_level("/"+play.path)
                    break
                }
                case "join":{
                    this.join_on_game(play.url,play.password,play.attempts,play.delay)
                    break
                }
                case "replay": {
                    this.game.watcher = new ReplayWatcher()
                    const ocm = new OfflineClientsManager(PacketManager, undefined, this.file)
                    const [serverSocket, clientSocket] = ocm.create_conn(0)
                    this.game.set_socket(clientSocket)
                    clientSocket.open()
                    serverSocket.open()
                    ocm.activate_ws(serverSocket, random.id(), "localhost", "replay")

                    this.game.watcher.on_load = (stream) => {
                        if (stream) {
                            serverSocket.send(stream.buffer)
                        }
                    }
                    this.game.watcher.on_frame = (stream) => {
                        if (stream) {
                            serverSocket.send(stream.buffer)
                        }
                    }
                    this.game.watcher.on_finish=()=>{
                        this.game.watcher!.reset()
                        this.game.add_timeout(()=>{
                            this.game.watcher?.play()
                        },1)
                    }

                    this.game.cam_type=1
                    await this.game.watcher.load(play.handle)
                }
            }
        }
    }
    const app=new App()
    await app.init()
})()