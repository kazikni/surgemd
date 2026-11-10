import { Numeric, random, v2 } from "../../../engine/core.ts";
import { type JoinData } from "../../net/join_packet.ts";
import { type DamageParams } from "../../others/constants.ts";
import { type SI_Mode } from "../gelo/mode.ts";
import { type SI_Human } from "../objects/moving_body/human.ts";

/**
 * PlayerConn transforma um humano em "player": ele controla o humano (input), e cuida da comunicacao.
 *
 * - Os humanos sao todos iguais (player, bot, npc). Quem diz o que cada humano e, e o ModeManager.
 * - O PlayerConn so diz QUEM controla aquele humano.
 *
 * Implementacoes:
 * - LocalPlayerConn: modo local (self). O input e aplicado direto pelo componente ccs_active_human.
 * - BotPlayerConn: bot simples controlado por IA.
 * - NetPlayerConn (server/src/game/net_player_conn.ts): online/worker, recebe InputPacket e manda UpdatePacket.
 */
export abstract class PlayerConn{
    private static _next_id=1

    id:number
    mode?:SI_Mode
    human?:SI_Human
    join?:JoinData

    connected:boolean=true
    is_bot:boolean=false
    spectating:boolean=false

    constructor(id?:number){
        this.id=id??PlayerConn._next_id++
    }

    get name():string{
        return this.join?.name??""
    }

    set_human(human?:SI_Human){
        this.human=human
        this.spectating=false
    }
    spectate(human?:SI_Human){
        this.human=human
        this.spectating=true
    }

    /** Chamado pelo ModeManager */
    on_human_knocked(_params:DamageParams):void{}
    on_human_die(_params:DamageParams):void{}
    on_game_start():void{}
    on_game_finish(_win:boolean):void{}

    /** Chamado todo tick pelo ModeManager */
    tick(_dt:number):void{}
    /** Chamado a cada net tick (ntps) no servidor/worker */
    net_update():void{}

    disconnect(){
        if(!this.connected)return
        this.connected=false
        this.mode?.disconnect(this)
    }
}

export type LocalPlayerConnCallbacks={
    on_die?:(params:DamageParams)=>void
    on_finish?:(win:boolean)=>void
}
/**
 * Player do modo local (self). Nao tem rede: o input vem do ccs_active_human.
 */
export class LocalPlayerConn extends PlayerConn{
    callbacks:LocalPlayerConnCallbacks
    constructor(callbacks:LocalPlayerConnCallbacks={},id?:number){
        super(id)
        this.callbacks=callbacks
    }
    override on_human_die(params: DamageParams): void {
        this.callbacks.on_die?.(params)
    }
    override on_game_finish(win: boolean): void {
        this.callbacks.on_finish?.(win)
    }
}

/**
 * Bot bem simples: anda aleatoriamente e foge da deadzone.
 * Serve de base para IAs mais complexas (estender e sobrescrever o tick).
 */
export class BotPlayerConn extends PlayerConn{
    override is_bot: boolean=true

    change_timer:number=0
    move_dir:number=random.rad()
    moving:boolean=true

    override tick(dt: number): void {
        const h=this.human
        if(!h||h.dead||this.spectating)return
        this.change_timer-=dt
        if(this.change_timer<=0){
            this.change_timer=random.float(1.5,4)
            this.move_dir=random.rad()
            this.moving=random.float(0,1)>0.25
        }
        const deadzone=this.mode?.scene.deadzone
        if(deadzone&&deadzone.is_on_deadzone(h.position)){
            this.move_dir=v2.lookTo(h.position,deadzone.position)
            this.moving=true
        }
        h.input.movement.dir=this.move_dir
        h.input.movement.scale=this.moving?1:0
        h.input.rotation=Numeric.lerp_rad(h.input.rotation,this.move_dir,Numeric.dt_expo_inter(5,dt))
    }
}
