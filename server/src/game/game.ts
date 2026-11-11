import { AbstractApplication, Client, ClientsManager, SignalManager } from "common/engine/core.ts";
import { type GameDataBase, type ServerGameApplication } from "common/engine/server/server.ts";
import { type GameConfig } from "common/scripts/config/config.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";
import { type CommonApplication } from "common/scripts/game/base.ts";
import { mode_events } from "common/scripts/game/modes/mode_manager.ts";
import { setup_game_scene } from "common/scripts/game/modes/modes.ts";
import { NetPlayerConn } from "./net_player_conn.ts";
import { simulation_defs, SimulationDefs, SimulationScene } from "./scene.ts";

export interface GameData extends GameDataBase{
    running:boolean
    can_join:boolean
    started:boolean
    living_count:number
}

export interface GameAppConfig{
    tps:number
    ntps:number
    debug?:{
        debug_menu?:boolean
    }
}

export class Game extends AbstractApplication implements ServerGameApplication,CommonApplication{
    id:number=0
    definitions:GameDefinition=new GameDefinition()
    signals:SignalManager=new SignalManager()

    clients:ClientsManager
    config:GameAppConfig
    game_config?:GameConfig

    readonly ntps:number
    sim:SimulationScene

    initialized:boolean=false
    private net_timer:number=0

    constructor(config:GameAppConfig,clients:ClientsManager,defs:SimulationDefs=simulation_defs){
        super(config.tps)
        this.config=config
        this.ntps=config.ntps
        this.clients=clients
        this.sim=new SimulationScene(defs)
        this.scene=this.sim
    }

    async init(game_config:GameConfig){
        this.game_config=game_config
        this.initialized=false
        this.definitions.reset()

        const mode=await setup_game_scene(this.sim,game_config)

        mode.signals.on(mode_events.start,()=>this.update_data())
        mode.signals.on(mode_events.player_join,()=>this.update_data())
        mode.signals.on(mode_events.human_die,()=>this.update_data())
        mode.signals.on(mode_events.finish,()=>this.update_data())
        mode.signals.on(mode_events.closed,()=>{
            console.log(`[GAME-${this.id}] Closed`)
            this.stop()
        })

        this.initialized=true
        this.signals.emit("initialized")
        this.update_data()
    }

    get_data():GameData{
        const mode=this.sim.mode
        return {
            running:this.running&&!!mode&&!mode.finished,
            can_join:!!mode&&mode.can_connect(),
            started:!!mode&&mode.started,
            living_count:mode?mode.get_living_count():0,
        }
    }
    update_data(){
        this.signals.emit("update_data",this.get_data())
    }

    handle_connection(client:Client,username:string){
        if(!this.initialized||!this.sim.mode.can_connect()){
            client.disconnect()
            return
        }
        const conn=new NetPlayerConn(this,client)
        conn.username=username
        if(!this.sim.mode.connect(conn)){
            client.disconnect()
            return
        }
        conn.send_start()
    }

    override update(dt:number){
        super.update(dt)
        if(!this.initialized)return
        this.net_timer+=dt
        if(this.net_timer>=1/this.ntps){
            this.net_timer-=1/this.ntps
            if(this.net_timer>1/this.ntps)this.net_timer=0
            this.net_tick()
        }
        this.update_data()
    }
    net_tick(){
        this.sim.mode.net_update()
        this.sim.net_update()
        this.sim.objects.apply_destroy_queue()
    }

    override mainloop(rqf?:boolean,auto_mainloop?:boolean){
        this.clients.onconnection=this.handle_connection.bind(this)
        super.mainloop(rqf,auto_mainloop)
        this.update_data()
        console.log(`[GAME-${this.id}] Running`)
    }
    override on_stop(): void {
        this.update_data()
        this.clients.clear()
        console.log(`[GAME-${this.id}] Stopped`)
    }
}