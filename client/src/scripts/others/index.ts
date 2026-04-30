import { Game} from "./game.ts"
import "../../scss/main.scss"
import { MenuManager } from "../managers/menuManager.ts";
import { NewMDLanguageManager } from "./languages.ts";
import { BasicSocket, FetchFileManager, FileManager, IPLocation, isMobile, OfflineClientsManager, random, ReplayWatcher } from "common/engine/client.ts";
import { PlayArgs } from "./constants.ts";
import { sandbox_version } from "./config.ts";
import { GoFileManager, is_binary } from "../defs/go_files.ts";
import { CModsManager } from "../managers/modsManager.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { UpdatePacket } from "common/scripts/packets/update_packet.ts";
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

    const tm=await NewMDLanguageManager("english","/languages")

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

            this.game=new Game(this.definitions,menu_manager,canvas,tm)
        }
        async init(){
            this.menu_manager.play_callback=this.play_game.bind(this)
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
            this.menu_manager.init(this.game.save,this.file,this.game.resources,this.game.sounds,this.game.definitions,mods)
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
        async play_game(play:PlayArgs){
            if(this.game.happening)return
            this.menu_manager.show_loading_screen()
            switch(play.type){
                case "online":{
                    const reg=this.menu_manager.api_settings.regions[this.game.save.get_variable("sv_game_region")]
                    const ser=new IPLocation(reg.host,reg.port)
                    const ghost=await((await fetch(`${ser.toString("http")}/api/get-game`)).json())

                    if(ghost.status===0){
                        this.game.connect(ghost.address)
                    }
                    break
                }
                case "campaign":{
                    const js=JSON.parse(await this.file.read_file(this.menu_manager.campaign.charpters[play.charpter].levels[play.level]))
                    this.game.start_campaign_level(js)
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