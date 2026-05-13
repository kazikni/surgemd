import { ApiSettingsS, ConfigType, GameConfig } from "common/scripts/config/config.ts";
import { GroupManager } from "./game/groups.ts";
import { Server } from "common/engine/server.ts";
import { NewsManager } from "./data/news.ts";

export class ApiServer {
    server: Server
    groups = new GroupManager(this)
    news = new NewsManager(this,"./files/news")
    constructor(public config: ConfigType){
        this.server = new Server(
            config.api.host.port,
            config.api.host.https,
            config.api.host.cert,
            config.api.host.key
        )
        this.routes()
    }
    routes(){
        this.server.route("/get-settings", () => {
            const settings: ApiSettingsS = {
                regions: this.config.regions,
                modes: this.config.game.modes,
                shop: this.config.shop,
                debug: {
                    debug_menu: this.config.game.debug.debug_menu
                },
                database: {
                    enabled: this.config.database.enabled
                }
            }
            return this.server.default_handlers.cors(
                Response.json(settings)
            )
        })
        this.server.route("/find-game", async (req) => {
            if(req.method !== "POST"){
                return new Response(null,{status:204})
            }
            const body = await req.json()
            return this.server.default_handlers.cors(
                Response.json(
                    await this.find_game(body)
                )
            )
        })
        this.news.route(this.server)
        this.groups.routes(this.server)
    }
    async find_game(body:{region:string,mode:string,group?:string[],config?:GameConfig}){
        const region = this.config.regions[body.region]
        if(!region){
            return {
                success:false,
                error:"invalid_region"
            }
        }
        try{
            const req = await fetch(
                `http${region.ssh?"s":""}://${region.host}:${region.port}/api/get-game`,
                {
                    method:"POST",
                    headers:{
                        "content-type":"application/json"
                    },
                    body:JSON.stringify({
                        mode:body.mode,
                        group:body.group,
                        config:body.config
                    })
                }
            )
            return await req.json()
        }catch(err){
            console.error(err)
            return {
                success:false,
                error:"region_offline"
            }
        }
    }
    run(){
        this.news.load().then(()=>{
            this.server.run()
        })
    }
}