import { AbstractApplication, Client, ClientsManager, SignalManager } from "common/engine/core.ts";
import { type GameDataBase, type ServerGameApplication } from "common/engine/server/server.ts";
import { type GameConfig } from "common/scripts/config/config.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";
import { get_map_def } from "common/scripts/definitions/maps/maps.ts";
import { type CommonApplication } from "common/scripts/game/base.ts";
import { mode_events } from "common/scripts/game/gelo/mode.ts";
import { type BattleRoyaleSettings, type SI_BattleRoyale } from "common/scripts/game/modes/battle_royale.ts";
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

/**
 * Configuracao de um jogo (mesmo formato do config.jsonc: play_options[].content[]).
 * settings.map.def = nome do mapa (ver common/scripts/definitions/maps/maps.ts)
 */
export type GameSettings=BattleRoyaleSettings&{
    map?:{
        def?:string
        seed?:number
    }
}

/**
 * Um jogo rodando no servidor (ou dentro de um WebWorker).
 * E uma Application cuja cena e uma SimulationScene. Nao tem nada de render/DOM.
 *
 * Fluxo:
 *  - init(config): monta o modo, gera o mapa e a deadzone
 *  - mainloop(): comeca o clock (tps)
 *  - handle_connection(client): cria um NetPlayerConn para cada cliente
 *  - a cada 1/ntps segundos: net_tick() manda os UpdatePackets
 */
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

        const settings=(game_config.settings??{}) as GameSettings

        const mode=this.sim.make_mode(game_config.mode)??this.sim.make_mode("normal")!
        this.sim.setup(mode)

        // Configuracao especifica do battle royale
        const br=mode as unknown as SI_BattleRoyale
        if(br.configure_battle_royale){
            br.configure_battle_royale({
                ...settings,
                group_size:settings.group_size??game_config.group_size,
            })
        }

        this.sim.map.generate(get_map_def(settings.map?.def),settings.map?.seed)
        this.sim.add_deadzone()

        mode.on(mode_events.start,()=>this.update_data())
        mode.on(mode_events.player_join,()=>this.update_data())
        mode.on(mode_events.human_die,()=>this.update_data())
        mode.on(mode_events.finish,()=>this.update_data())
        mode.on(mode_events.closed,()=>{
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
            running:this.running&&!!mode&&!mode.closed,
            can_join:!!mode&&mode.can_join(),
            started:!!mode&&mode.started,
            living_count:mode?mode.get_living_count():0,
        }
    }
    update_data(){
        this.signals.emit("update_data",this.get_data())
    }

    handle_connection(client:Client,username:string){
        if(!this.initialized||!this.sim.mode.can_join()){
            client.disconnect()
            return
        }
        const conn=new NetPlayerConn(this,client)
        conn.username=username
        this.sim.mode.connect(conn)
        conn.send_start()
    }

    override update(dt:number){
        super.update(dt)
        if(!this.initialized)return
        this.net_timer+=dt
        if(this.net_timer>=1/this.ntps){
            this.net_timer-=1/this.ntps
            // Evita acumular atraso se o servidor travar
            if(this.net_timer>1/this.ntps)this.net_timer=0
            this.net_tick()
        }
    }
    net_tick(){
        this.sim.mode.net_update_conns()
        this.sim.net_update()
        this.sim.objects.apply_destroy_queue()
    }

    override mainloop(rqf?:boolean,auto_mainloop?:boolean){
        this.clients.onconnection=this.handle_connection.bind(this)
        super.mainloop(rqf,auto_mainloop)
        this.update_data()
        console.log(`[GAME-${this.id}] Started`)
    }
    override on_stop(): void {
        this.update_data()
        this.clients.clear()
        console.log(`[GAME-${this.id}] Stopped`)
    }
}
