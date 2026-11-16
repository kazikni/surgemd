import { Vec2 } from "../../../../engine/core.ts";
import { GameObjectDef } from "../../../definitions/game_defs.ts";
import { SimObject } from "../../base.ts";

export type DamageParams={
    amount:number
    owner?:ProjectileOwner
    source?:GameObjectDef
    position?:Vec2
    direction?:number
    critical?:boolean
    penetration?:number
    resistence?:number
}
export type ProjectileOwner={
    dead?:boolean
}&SimObject

export type SimObjectDamageable=SimObject&{damage?(params:DamageParams):void}

export class Projectile extends SimObject{
    owner?:ProjectileOwner
    source?:GameObjectDef
    on_create(args:any={}){
        if(args.position)this.position=args.position
        if(args.source)this.source=args.source
        if(args.owner)this.owner=args.owner
    }
}