import { ApiServerConfig, ApiSettings, GameConfig, GameModeConfig, ModeConfig } from "common/scripts/config/config.ts";
import { GroupManager } from "./game/groups.ts";
import { default_handlers, Server } from "common/engine/deno.ts";
import { RegionManager } from "./game/regions.ts";
export class ApiServer {
    server: Server
    groups = new GroupManager(this)
    regions = new RegionManager(this)
    modes:ModeConfig[]=[]

    api_settings!:ApiSettings

    play_time?:{
        last_playtime?:number
        current_time?:number
        day:number
        hour:number
    }
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

        if(this.config.game.play_time){
            this.play_time={
                day:-1,
                hour:-1
            }
        }
    }
    can_play():boolean{
        return !this.play_time||this.play_time.current_time!==undefined
    }
    update_settings(){
        this.api_settings={
            database:{
                enabled:this.config.database?.enabled!==undefined?this.config.database.enabled:false,
            },
            modes:this.modes,
            regions:this.regions.regions,
            playtime:this.play_time?{
                config:this.config.game.play_time!,
                current:{
                    day:this.play_time.day,
                    hour:this.play_time.hour,
                    duration:this.play_time.current_time
                }
            }:undefined
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
            return this.server.default_handlers.cors(default_handlers.no_cache(Response.json(this.api_settings)))
        })
        this.server.route("/find-game", async (req) => {
            if(req.method !== "POST"){
                return new Response(null,{status:503})
            }
            if(!this.can_play())return new Response("You Cant Play Now",{status:204})
            const body = await req.json()
            const game=await this.regions.find_game(body)
            return this.server.default_handlers.cors(default_handlers.no_cache(Response.json(game??{})))
        })
        this.groups.routes(this.server.router("group"))
        this.regions.routes(this.server.router("regions"))
    }

    last_frame_time:number=0
    tick(){
        const dt=(performance.now()-this.last_frame_time)/1000
        this.update_settings()

        if(this.play_time&&this.config.game.play_time){
            if(this.play_time?.current_time===undefined){
                const now = new Date()
                const week_day = now.getDay()
                const hour = now.getHours()
                this.play_time.day=week_day
                this.play_time.hour=hour
                if(this.config.game.play_time.hour===hour&&this.config.game.play_time.week_days.includes(week_day)){
                    this.play_time.current_time=this.config.game.play_time.duration
                    this.play_time.last_playtime=performance.now()
                    console.log("[API] Playtime Started")
                }
            }else{
                this.play_time.current_time-=dt
                if(this.play_time.current_time<=0){
                    this.play_time.current_time=undefined
                    console.log("[API] Playtime Fineshed")
                }
            }
        }

        this.last_frame_time = performance.now()
    }
    run(){
        this.server.run()
        setInterval(this.tick.bind(this),1000)
    }
}