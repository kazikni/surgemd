import { Server, AbstractGameContainer, AbstractGameServer, Cors} from "common/engine/server.ts"
import { ConfigType, GameConfig } from "common/scripts/config/config.ts";
import { GameData } from "./game.ts";
import { WorkerMessage } from "./game_worker.ts";
export class GameServer extends AbstractGameServer<GameData,GameConfig>{
    constructor(server: Server,config:ConfigType){
        super(server,config)

        this.add_container(new GameContainer())
        //this.add_container(new GameContainer())
        //this.add_container(new GameContainer())

        this.server.route("/api/get-game",(_req:Request,_url:string[], _info: Deno.ServeHandlerInfo)=>{
            const game=this.get_game()
            const msg=game===undefined
            ?{
                status:1,
            }:{
                status:0,
                address:game.get_address()
            }
            return Cors(new Response(JSON.stringify(msg),{status:200}))
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
                    mode:"normal",
                    //group_size:2,
                    mode_settings:{
                        map:{
                            //def:"single_building"
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