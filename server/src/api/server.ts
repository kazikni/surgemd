import { ApiSettingsS, ConfigType, ModeConfig } from "common/scripts/config/config.ts";
import { GroupManager } from "./game/groups.ts";
import { Server } from "common/engine/server.ts";
import { RegionManager } from "./game/regions.ts";

export class ApiServer {
    server: Server
    groups = new GroupManager(this)
    regions = new RegionManager(this)
    modes:ModeConfig[]=[]
    constructor(public config: ConfigType){
        this.server = new Server(
            config.api.host.port,
            config.api.host.https,
            config.api.host.cert,
            config.api.host.key
        )
        this.modes=config.game.modes
        this.routes()
    }
    get api_settings():ApiSettingsS{
        return {
            modes: this.config.game.modes,
            debug: {
                debug_menu: this.config.game.debug.debug_menu
            },
            regions:this.regions.regions,
            database: {
                enabled: this.config.database.enabled
            }
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
    run(){
        this.server.run()
    }
}