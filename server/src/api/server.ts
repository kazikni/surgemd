import { ApiServerConfig, ApiSettings, GameConfig, GameModeConfig, ModeConfig } from "common/scripts/config/config.ts";
import { GroupManager } from "./game/groups.ts";
import { Server } from "common/engine/server.ts";
import { RegionManager } from "./game/regions.ts";
export class ApiServer {
    server: Server
    groups = new GroupManager(this)
    regions = new RegionManager(this)
    modes:ModeConfig[]=[]

    api_settings!:ApiSettings
    constructor(public config: ApiServerConfig){
        this.server = new Server(
            config.host.port,
            config.host.ssl,
            config.host.cert,
            config.host.key
        )

        this.modes=config.game.modes
        this.update_settings()
        this.routes()
    }
    update_settings(){
        this.api_settings={
            database:{
                enabled:this.config.database?.enabled!==undefined?this.config.database.enabled:false,
            },
            modes:this.modes,
            regions:this.regions.regions
        }
    }
    get_game_config(mode:number,group_size:number):GameConfig{
        return {
            mode: this.modes[mode].mode! as GameModeConfig,
            group_size: (this.modes[mode].group_size as unknown as number[])[group_size],
        }
    }
    routes(){
        this.server.route("/get-settings", () => {
            return this.server.default_handlers.cors(
                Response.json(this.api_settings)
            )
        })
        this.server.route("/find-game", async (req) => {
            if(req.method !== "POST"){
                return new Response(null,{status:204})
            }
            const body = await req.json()
            const game=await this.regions.find_game(body)
            return this.server.default_handlers.cors(
                Response.json(game)
            )
        })
        this.groups.routes(this.server.router("group"))
        this.regions.routes(this.server.router("regions"))
    }
    tick(dt:number){
        this.update_settings()
    }
    run(){
        this.server.run()

        setInterval(this.tick.bind(this,1),1000)
    }
}