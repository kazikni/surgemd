import { BaseGELO, BasicSocket, Client, DefaultSignals, SignalManager, WorkerSocket } from "common/engine/core.ts";
import { HideElement, ShowElement } from "common/engine/web.ts";
import { gelo_instance_type } from "common/scripts/others/constants.ts";
import { type SimulatedScene } from "common/scripts/game/base.ts";
import { mode_events, type SI_Mode } from "common/scripts/game/gelo/mode.ts";
import { type GameSettings, setup_game_scene } from "common/scripts/game/modes/modes.ts";
import { type SI_Human } from "common/scripts/game/objects/moving_body/human.ts";
import { LocalPlayerConn } from "common/scripts/game/players/player_conn.ts";
import { type JoinData, JoinedPacket, JoinPacket } from "common/scripts/net/join_packet.ts";
import { make_packet_manager } from "common/scripts/net/packet_manager.ts";
import { type ActiveHumanState, StartPacket, UpdatePacket } from "common/scripts/net/update_packet.ts";
import { GameGELO, GameObject, GameScene } from "../../main/gel.ts";
import { type Application } from "../../main/app.ts";
import { type CC_GameMap } from "../../gelo/map.ts";
import { type CC_Deadzone } from "../../gelo/deadzone.ts";
import { cc_active_human, type CC_ActiveHuman, ccn_active_human, ccs_active_human } from "../../objects/moving_body/active_human.ts";
import { local_scene_defs } from "./localdefs.ts";
import { net_scene_defs } from "./netdefs.ts";

export interface PlaySceneDefs{
    objects:Record<number|string,(...args: any)=>GameObject>
    gelo:Record<number|string,(...args: any)=>GameGELO>
}

/** Como o jogo esta rodando */
export type PlaySceneKind="none"|"self"|"worker"|"online"

export interface SelfGameOptions{
    /** Modo de jogo (ver common/scripts/game/modes/modes.ts). Padrao: "normal" (battle royale) */
    mode?:string
    settings?:GameSettings
    group_size?:number
}
export interface WorkerGameOptions extends SelfGameOptions{
    tps?:number
    ntps?:number
}
/** Mensagem que a PlayScene manda para o worker (ver worker.ts) */
export type PlayWorkerInitMessage={
    type:"init"
    options:WorkerGameOptions
}

/** Sinais em PlayScene.events */
export const play_events={
    /** (human) */
    joined:"joined",
    /** ({win:boolean}) */
    game_over:"game_over",
    /** (params) o humano ativo morreu */
    active_die:"active_die",
    disconnected:"disconnected",
    closed:"closed",
}

function with_timeout<T>(p:Promise<T>,ms:number,what:string):Promise<T>{
    return new Promise<T>((resolve,reject)=>{
        const t=setTimeout(()=>reject(new Error(`Timeout esperando ${what}`)),ms)
        p.then((v)=>{clearTimeout(t);resolve(v)},(e)=>{clearTimeout(t);reject(e)})
    })
}

/**
 * Cena de jogo. A mesma cena roda nos 3 modos:
 *
 *   // Online
 *   const game=new PlayScene(app)
 *   await game.connect("ws://localhost:8080/api/ws/0")
 *   await game.join()
 *   app.scene=game
 *
 *   // Local (sem servidor e sem worker: a simulacao roda nesta cena)
 *   await game.self_initialize({mode:"normal",settings:{bots:5}})
 *   await game.join()
 *
 *   // Worker (a simulacao roda num WebWorker, igual ao servidor)
 *   await game.worker_initialize({mode:"normal"})
 *   await game.join()
 *
 *   // Fim
 *   await game.close()
 *   app.scene=app.menu_scene
 */
export class PlayScene extends GameScene {
    game_div:HTMLDivElement=document.querySelector("#game") as HTMLDivElement

    declare map:CC_GameMap
    mode?:SI_Mode&GameGELO
    deadzone?:CC_Deadzone

    defs:PlaySceneDefs={
        objects:{},
        gelo:{}
    }

    kind:PlaySceneKind="none"
    events=new SignalManager()

    client?:Client
    worker?:Worker
    local_conn?:LocalPlayerConn

    active_human?:CC_ActiveHuman
    active_id?:number
    active_state?:ActiveHumanState

    info={
        started:false,
        living_count:0,
        ntps:32,
    }

    timeout:number=10000

    constructor(app?:Application){
        super()
        if(app)this.init(app)
    }

    override on_init(){
        super.on_init()
        this.camera.aspect_lock=true
        this.gelo.make_gelo_net_cb=(tp)=>this.make_gelo(tp)
    }

    override make_object(type: number | string, ...args:any[]): GameObject | undefined {
        return this.defs.objects[type]?.(...args)
    }
    override make_gelo(type: number | string, ...args:any[]): GameGELO | undefined {
        return this.defs.gelo[type]?.(...args)
    }
    override _registry_gelo(gelo:GameGELO){
        super._registry_gelo(gelo)
        switch((gelo as BaseGELO).instance_type){
            case gelo_instance_type.map:
                this.map=gelo as unknown as CC_GameMap
                break
            case gelo_instance_type.deadzone:
                this.deadzone=gelo as unknown as CC_Deadzone
                break
            case gelo_instance_type.mode:
                this.mode=gelo as unknown as SI_Mode&GameGELO
                break
        }
    }

    private require_app(){
        if(!this.app)throw new Error("PlayScene precisa do app: use new PlayScene(app)")
    }

    // ========================================================================
    // Modos de conexao
    // ========================================================================

    /** Modo local: a simulacao roda nesta propria cena (objetos ccs_). */
    async self_initialize(options:SelfGameOptions={}){
        this.require_app()
        await this.close()
        this.kind="self"
        this.defs=local_scene_defs

        const mode=setup_game_scene(this as unknown as SimulatedScene,{
            mode:options.mode??"normal",
            settings:options.settings??{},
            group_size:options.group_size,
        })
        mode.on(mode_events.start,()=>{this.info.started=true})
        mode.on(mode_events.human_die,()=>{this.info.living_count=mode.get_living_count()})
        mode.on(mode_events.player_join,()=>{this.info.living_count=mode.get_living_count()})
    }

    /** Modo worker: a simulacao roda num WebWorker (mesmo Game do servidor). Objetos ccn_. */
    async worker_initialize(options:WorkerGameOptions={}){
        this.require_app()
        await this.close()
        this.kind="worker"
        this.defs=net_scene_defs

        const worker=new Worker(new URL("./worker.ts",import.meta.url),{type:"module"})
        this.worker=worker
        worker.addEventListener("error",(e)=>console.error("[PLAY-WORKER]",e))
        const socket=new WorkerSocket(worker)
        await this.attach_client(socket,()=>{
            const msg:PlayWorkerInitMessage={type:"init",options}
            worker.postMessage(msg)
        })
    }

    /** Modo online: conecta num servidor de jogo. Objetos ccn_. */
    async connect(url:string){
        this.require_app()
        await this.close()
        this.kind="online"
        this.defs=net_scene_defs

        const ws=new WebSocket(url)
        ws.binaryType="arraybuffer"
        const failed=new Promise<never>((_resolve,reject)=>{
            ws.addEventListener("error",()=>reject(new Error(`Nao foi possivel conectar em ${url}`)))
        })
        await Promise.race([this.attach_client(ws as unknown as BasicSocket),failed])
    }

    private async attach_client(socket:BasicSocket,after_create?:()=>void){
        const client=new Client(socket,make_packet_manager())
        this.client=client

        client.on("start",(p:StartPacket)=>{
            this.info.ntps=p.ntps
            this.gelo.decode(p.gelos)
        })
        client.on("update",(p:UpdatePacket)=>this.on_update_packet(p))
        client.on("game_over",(msg:{win:boolean})=>this.events.emit(play_events.game_over,msg))
        client.on(DefaultSignals.DISCONNECT,()=>{
            if(this.client===client)this.events.emit(play_events.disconnected)
        })

        const started=client.wait("start")
        const disconnected=new Promise<never>((_resolve,reject)=>{
            client.on(DefaultSignals.DISCONNECT,()=>reject(new Error("Desconectado pelo servidor (jogo cheio, fechado ou ja comecou)")))
        })
        after_create?.()
        await with_timeout(Promise.race([started,disconnected]),this.timeout,"o StartPacket")
    }

    // ========================================================================
    // Join
    // ========================================================================

    /** Adiciona o player no jogo (antigo JoinPacket). Retorna o humano ativo. */
    async join(data:JoinData={name:""}):Promise<CC_ActiveHuman|undefined>{
        if(this.kind==="self"){
            if(!this.mode)throw new Error("Jogo local nao inicializado: chame self_initialize() antes")
            const conn=new LocalPlayerConn({
                on_die:(params)=>this.events.emit(play_events.active_die,params),
                on_finish:(win)=>this.events.emit(play_events.game_over,{win}),
            })
            this.local_conn=conn
            const human=this.mode.add_player(conn,data)
            if(!human)return undefined
            this.set_active_human(human as unknown as GameObject)
            this.events.emit(play_events.joined,this.active_human)
            return this.active_human
        }
        if(!this.client)throw new Error("Nao conectado: chame connect() ou worker_initialize() antes")
        const joined=this.client.wait("joined") as Promise<JoinedPacket>
        this.client.emit_packet(new JoinPacket(data))
        const p=await with_timeout(joined,this.timeout,"o JoinedPacket")
        this.info.ntps=p.ntps
        this.active_id=p.human_id
        this.try_bind_active()
        this.events.emit(play_events.joined,this.active_human)
        return this.active_human
    }

    /** Faz um humano virar o humano ativo deste cliente */
    set_active_human(obj:GameObject){
        if(this.active_human===obj as unknown)return
        this.active_human?.release_active()
        obj.add_component(cc_active_human)
        obj.add_component(this.kind==="self"?ccs_active_human:ccn_active_human)
        this.active_human=obj as unknown as CC_ActiveHuman
        this.active_id=obj.id
    }
    private try_bind_active(){
        if(this.active_id===undefined)return
        if(this.active_human&&this.active_human.id===this.active_id&&!this.active_human.destroyed)return
        const obj=this.objects.get_object(this.active_id)
        if(obj)this.set_active_human(obj)
    }

    private on_update_packet(p:UpdatePacket){
        if(p.objects)this.objects.proccess_net(p.objects,true)
        if(p.gelos)this.gelo.decode(p.gelos)
        this.info.started=p.started
        this.info.living_count=p.living_count
        if(p.active){
            this.active_state=p.active
            if(this.active_id!==p.active.id){
                this.active_id=p.active.id
            }
        }
        this.try_bind_active()
    }

    /** Estado do humano ativo (vida, boost...). Funciona nos 3 modos. */
    get_active_state():ActiveHumanState|undefined{
        if(this.kind==="self"){
            const h=this.active_human as unknown as SI_Human|undefined
            if(!h)return undefined
            return {
                id:h.id,
                spectating:false,
                knocked:h.knocked,
                health:h.health.value,
                max_health:h.health.max,
                boost:h.boost.value,
                max_boost:h.boost.max,
                boost_def:h.boost.def.id_number??0,
            }
        }
        return this.active_state
    }

    // ========================================================================
    // Fechar
    // ========================================================================

    /** Fecha o jogo (modo "hard"): desconecta, para o worker e limpa a cena. */
    async close(){
        if(this.kind==="none")return
        const client=this.client
        this.client=undefined
        client?.disconnect()
        if(this.worker){
            this.worker.terminate()
            this.worker=undefined
        }
        if(this.local_conn){
            this.local_conn.disconnect()
            this.local_conn=undefined
        }
        this.active_human?.release_active()
        this.active_human=undefined
        this.active_id=undefined
        this.active_state=undefined

        this.clear()
        for(const id of Object.keys(this.gelo.content)){
            this.gelo.unregistry(id)
        }
        this.mode=undefined
        this.deadzone=undefined
        this.info.started=false
        this.info.living_count=0

        this.kind="none"
        this.events.emit(play_events.closed)
        await Promise.resolve()
    }

    override on_set(): void {
        super.on_set()
        ShowElement(this.game_div)
    }
    override on_unset(): void {
        HideElement(this.game_div)
    }

    override update(dt: number): void {
        super.update(dt,true,true)
    }
}
