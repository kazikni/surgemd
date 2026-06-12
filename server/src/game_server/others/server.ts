import { Server, AbstractGameContainer, AbstractGameServer} from "common/engine/server.ts"
import { ConfigType, GameConfig } from "common/scripts/config/config.ts";
import { GameData } from "./game.ts";
import { WorkerMessage } from "./game_worker.ts";
export class GameServer extends AbstractGameServer<GameData,GameConfig>{
    api_socket?:WebSocket
    constructor(server: Server,config:ConfigType){
        super(server,config)

        this.add_container(new GameContainer())

        this.server.route("/api/connect-ws",(req)=>{
            const apiKey=req.headers.get("x-api-key")
            if(apiKey!==config.api.key){
                return new Response("Forbidden",{
                    status:403
                })
            }
            if(this.api_socket &&this.api_socket.readyState===WebSocket.OPEN){
                return new Response("Already connected",{
                    status:409
                })
            }
            const res=this.server.default_handlers.websocket(req)
            if(res.socket){
                this.api_socket=res.socket
                res.socket.onclose=()=>{
                    if(this.api_socket===res.socket){
                        this.api_socket=undefined
                    }
                }
                res.socket.onerror=()=>{
                    if(this.api_socket===res.socket){
                        this.api_socket=undefined
                    }
                }
                res.socket.onmessage=(e)=>{
                    //this.handle_api_message(e.data)
                }
            }

            return res.response
        })
        this.server.route("/api/get-game",(_req:Request,_url:string[], _info: Deno.ServeHandlerInfo)=>{
            const game=this.get_game()
            const msg=game===undefined
            ?{
                status:1,
            }:{
                status:0,
                address:game.get_address()
            }
            return this.server.default_handlers.cors(new Response(JSON.stringify(msg),{status:200}))
        })
    }
    get_game(config?:GameConfig):GameContainer|undefined{
        for(const g of this.games.values()){
            if(g.data.running&&g.data.can_join){
                return g as GameContainer
            }
        }
        return this.make_game(config)
    }
    make_game(config?:GameConfig):GameContainer|undefined{
        for(const g of this.games.values()){
            if(!g.data.running){
                g.new_game(config??{
                    //mode:"normal",
                    mode:"debug",
                    //group_size:2,
                    mode_settings:{
                        map:{
                            //def:"tundra"
                            //def:"single_building"
                            //def:"lobby"
                        }
                    }
                })
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
        return `ws${this.server.config.regions[this.server.config.this_region].ssh?"s":""}://${super.get_address(this.server.config.regions[this.server.config.this_region].host)}/api/ws`
    }
    override begin(): void {
        this.port=this.server.config.game!.host.port+this.id+1
        super.begin()
    }
}