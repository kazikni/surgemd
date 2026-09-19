import { MapZone } from "common/scripts/packets/general_update.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { GrenadeDef } from "common/scripts/definitions/items/grenades.ts";
import { circle, CircleHitbox2D, random, v2, Vec2 } from "common/engine/core.ts";
import { type Human } from "../objects/human.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { DamageReason } from "common/scripts/definitions/utils.ts";

export class DangerZone extends ServerGameObject{
    override number_type: number=-1;
    override string_type: string="_danger_zone";
    zone!:MapZone

    timer:number=0

    grenade?:GrenadeDef
    delay:number=0.3
    lifetime:number=40
    owner?:Human

    constructor(){
        super()
        this.allow_tick=true
        this.allow_checkpoint=false
    }
    
    override on_create(args: {grenade:GrenadeDef,position:Vec2,radius?:number,delay?:number,lifetime?:number,owner?:Human}): void {
        super.on_create(args)

        this.grenade=args.grenade
        this.owner=args.owner
        if(args.delay)this.delay=args.delay
        if(args.lifetime)this.lifetime=args.lifetime

        this.position=args.position
        this.zone={
            position:this.position,
            color:0xd91a3a,
            icon:6,
            radius:args.radius??random.float(30,50),
            id:this.id,
        }
        this.scene.map_zones.push(this.zone)
    }
    override on_tick(dt: number): void {
        this.timer-=dt
        this.lifetime-=dt
        if(this.timer<=0){
            this.timer=this.delay
            if(this.grenade){
                const g=this.scene.add_grenade(circle.random_point_inside(this.position,this.zone.radius),this.grenade,this.owner,this.layer)
                g.physical_data.zpos=1
                g.physical_data.zpos_speed=0
                g.physical_data.angular_velocity=Math.random()>=0.5?-1.5:1.5
            }
        }
        if(this.lifetime<=0)this.destroy()
    }
    override on_destroy(): void {
        if(this.zone){
            const idx=this.scene.map_zones.indexOf(this.zone)
            if(idx!==-1)this.scene.map_zones.splice(idx,1)
        }
    }
}

export class ToxicZone extends ServerGameObject{
    override number_type: number=-1;
    override string_type: string="_toxic_zone";
    zone!:MapZone

    damage:number=3
    timer:number=0
    delay:number=1
    lifetime:number=30

    owner?:Human

    constructor(){
        super()
        this.allow_tick=true
        this.allow_checkpoint=false
    }
    
    override on_create(args: {position:Vec2,radius?:number,delay?:number,lifetime?:number,owner?:Human}): void {
        super.on_create(args)

        this.owner=args.owner
        if(args.delay)this.delay=args.delay
        if(args.lifetime)this.lifetime=args.lifetime

        this.position=args.position
        this.zone={
            position:this.position,
            color:0x18c445,
            icon:6,
            radius:args.radius??random.float(30,40),
            id:this.id,
        }
        this.base_hitbox=new CircleHitbox2D(v2.zero(),this.zone.radius)
        this.scene.map_zones.push(this.zone)
    }
    override on_tick(dt: number): void {
        this.timer-=dt
        this.lifetime-=dt
        if(this.timer<=0){
            this.timer=this.delay
            const objects:ServerGameObject[]=this.manager.cells.get_objects(this.hitbox,this.layer)
            for(const o of objects){
                if(o.number_type===GameObjectType.Human){
                    if(!o.hitbox.colliding_with(this.hitbox))break
                    (o as Human).piercing_damage({
                        amount:this.damage,
                        critical:false,
                        direction:random.rad(),
                        penetration:0,
                        position:o.position,
                        reason:DamageReason.SideEffect,
                        owner:this.owner,
                    })
                }
            }
        }
        if(this.lifetime<=0)this.destroy()
    }
    override on_destroy(): void {
        if(this.zone){
            const idx=this.scene.map_zones.indexOf(this.zone)
            if(idx!==-1)this.scene.map_zones.splice(idx,1)
        }
    }
}