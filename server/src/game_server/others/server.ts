import { Server, AbstractGameContainer, AbstractGameServer} from "common/engine/server.ts"
import { ConfigType, GameConfig } from "common/scripts/config/config.ts";
import { GameData } from "./game.ts";
import { WorkerMessage } from "./game_worker.ts";
export class ApiConnection {
    socket?: WebSocket
    logged:boolean=false
    constructor(public game: GameServer,public config: ConfigType) {}
    connect(attempts=5) {
        if(attempts<=0)return
        this.logged=false
        const region = this.config.region
        if (!region) return
        const ws = new WebSocket(`${this.config.api.global}/regions/ws`)
        ws.onopen = () => {
            console.log("[API] Connected")
            ws.send(JSON.stringify({
                type: "login",
                region
            }))
        }
        ws.onmessage = (e) => {
            this.handle_message(e.data)
        }
        ws.onclose = () => {
            console.log("[API] Disconnected")
            setTimeout(() => {
                this.connect(this.logged?undefined:attempts-1)
            }, 5000)
            if (this.socket === ws) {
                this.socket = undefined
            }
        }
        ws.onerror = () => {
            ws.close()
        }
        this.socket = ws
    }
    handle_message(data: string) {
        const msg = JSON.parse(data)
        switch (msg.type) {
            case "find_game": {
                const game = this.game.get_game(msg.config)
                const addr=game?.get_address?.()
                this.send({
                    type: "find_game_response",
                    request_id: msg.request_id,
                    success: game ? true : false,
                    address: addr
                })
                break
            }
            case "logged":{
                this.logged=true
                console.log("[API] Logged")
            }
        }
    }
    send(data: unknown) {
        if(!this.socket || this.socket.readyState !== WebSocket.OPEN){
            return
        }
        this.socket.send(JSON.stringify(data))
    }
}
export class GameServer extends AbstractGameServer<GameData,GameConfig>{
    api_conn:ApiConnection
    constructor(server: Server,config:ConfigType){
        super(server,config)

        this.api_conn=new ApiConnection(this,config)
        this.api_conn.connect()

        this.add_container(new GameContainer())
    }
    get_game(config?:GameConfig):GameContainer|undefined{
        for(const g of this.games.values()){
            if(g.data.running&&g.data.can_join&&g.data.mode===config?.mode&&g.data.group_size===config?.group_size){
                return g as GameContainer
            }
        }
        return this.make_game(config)
    }
    make_game(config?:GameConfig):GameContainer|undefined{
        for(const g of this.games.values()){
            if(!g.data.running){
                if(!config||!config.mode){
                    config={
                        mode:"normal",
                        //mode:"debug",
                        //group_size:4,
                        mode_settings:{
                            map:{
                                //def:"tundra"
                                //def:"single_building"
                                //def:"lobby"
                            }
                        }
                    }
                }
                g.new_game(config)
                return g as GameContainer
            }
        }
        return undefined
    }
}
export class GameContainer extends AbstractGameContainer<GameData,GameConfig,ConfigType,WorkerMessage>{
    override worker_path: URL
    constructor(){
        super()

        const worker_path=import.meta.filename?.endsWith(".ts")?"./game_worker.ts":"./game_worker.js"
        this.worker_path=new URL(worker_path, import.meta.url)
    }
    override get_address():string{
        return `ws${this.server.config.region!.https?"s":""}://${super.get_address(this.server.config.region!.host)}/api/ws`
    }
    override begin(): void {
        this.port=this.server.config.game!.host.port+this.id+1
        super.begin()
    }
}