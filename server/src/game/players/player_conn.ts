import { type DamageParams } from "../objects/projectile/projectile.ts";
import { Numeric, random, v2 } from "common/engine/core.ts";
import { type JoinData } from "common/scripts/net/join_packet.ts";
import { type ModeManager } from "../modes/mode_manager.ts";
import { type Human } from "../objects/human/human.ts";

export abstract class PlayerConn{
    private static _next_id=1

    id:number
    mode?:ModeManager<any,any>
    human?:Human
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

    set_human(human?:Human){
        this.human=human
        this.spectating=false
    }
    spectate(human?:Human){
        this.human=human
        this.spectating=true
    }

    on_human_knocked(_params:DamageParams):void{}
    on_human_die(_params:DamageParams):void{}
    on_game_start():void{}
    on_game_finish(_win:boolean):void{}

    tick(_dt:number):void{}

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