import { Server, AbstractGameContainer, AbstractGameServer} from "common/engine/server.ts"
import { GameConfig, GameServerConfig } from "common/scripts/config/config.ts";
import { GameData } from "./game.ts";
import { WorkerMessage } from "./game_worker.ts";
import { deepEqual } from "common/engine/core.ts";
export class ApiConnection {
    socket?: WebSocket
    logged:boolean=false
    constructor(public game: GameServer,public config: GameServerConfig) {}
    connect(attempts=5) {
        if(attempts<=0)return
        this.logged=false
        const ws = new WebSocket(this.config.authentication!.server)
        ws.onopen = () => {
            console.log("[API] Connected")
            ws.send(JSON.stringify({
                type: "login",
                authentication:this.config.authentication!,
                region:{
                    name: this.config.region!.name,
                    ip: this.config.region!.ip,
                    port: this.config.region!.port===undefined?this.config.host.port:this.config.region!.port,
                    ssl: this.config.region!.ssl===undefined?this.config.host.ssl:this.config.region!.ssl
                }
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
    api_conn?:ApiConnection
    constructor(server: Server,config:GameServerConfig){
        super(server,config)

        if(config.authentication&&config.region){
            this.api_conn=new ApiConnection(this,config)
            this.api_conn.connect()
        }

        for(let i=0;i<=config.max_games;i++){
            this.add_container(new GameContainer())
        }
    }
    get_game(config?:GameConfig):GameContainer|undefined{
        for(const g of this.games.values()){
            if(
                g.data.running&&g.data.can_join&&
                (!g.config||g.config.mode.mode===config?.mode?.mode&&g.config.group_size===config.group_size&&deepEqual(g.config.mode.settings,config.mode.settings))
            ){
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
                        mode:{
                            mode:"normal",
                            settings:{
                                map:{
                                }
                            }
                        },
                    }
                }
                g.new_game(config)
                return g as GameContainer
            }
        }
        return undefined
    }
}
export class GameContainer extends AbstractGameContainer<GameData,GameConfig,GameServerConfig,WorkerMessage>{
    override worker_path: URL
    constructor(){
        super()

        const worker_path=import.meta.filename?.endsWith(".ts")?"./game_worker.ts":"./game_worker.js"
        this.worker_path=new URL(worker_path, import.meta.url)
    }
    override get_address():string{
        const ssl=this.server.config.region?.ssl===undefined?this.server.config.host.ssl:this.server.config.region.ssl
        return `ws${ssl?"s":""}://${super.get_address(this.server.config.region?.ip??"localhost")}/api/ws`
    }
    override begin(): void {
        this.port=this.server.config.host.port+this.id+1
        super.begin()
    }
}