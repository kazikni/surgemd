import { Angle, CircleCollider2D, random, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type SyncedParticleDef } from "common/scripts/definitions/objects/synced_particles.ts";
import { SideEffectType } from "common/scripts/definitions/player/effects.ts";
import { object_instance_type, ObjectType } from "common/scripts/others/constants.ts";
import { type SimObject } from "../base.ts";
import { type Human } from "./human/human.ts";
import { MovingBody } from "./moving_body.ts";
import { type DamageParams, type ProjectileOwner } from "./projectile/projectile.ts";
import { type SI_StaticBody } from "./static_body/static_body.ts";

export class SyncedParticle extends MovingBody{
    owner?:ProjectileOwner
    def!:SyncedParticleDef

    time:number=0
    action_tick:number=0
    action_time:number=0.1
    angular_speed:number=0
    hitted:boolean=false

    constructor(){
        super()
        this.object_type=ObjectType.SyncedParticle
        this.instance_type=object_instance_type.synced_particle
        this.allow_tick=true
        this.allow_checkpoint=false
    }

    on_create(args:{position:Vec2,def:SyncedParticleDef,owner?:ProjectileOwner}){
        this.owner=args.owner
        this.position=v2.clone(args.position)
        this.def=args.def
        this.base_collider=this.def.collider??new CircleCollider2D(v2.zero(),1.5)
        this.rotation=random.rad()
        this.action_time=this.def.action_time??0.1
        const movement=this.def.movement
        if(!movement)return
        if(movement.angular)this.angular_speed=random.neg_float(movement.angular.min,movement.angular.max)
        if(movement.type==="walk"&&movement.velocity)this.push(random.float(movement.velocity.min,movement.velocity.max),random.rad())
    }

    override on_collided(obj:SimObject,dt:number){
        const effects=this.def.side_effect
        const ready=effects!==undefined&&this.action_tick>=this.action_time
        if(obj.object_type===ObjectType.StaticBody){
            const body=obj as unknown as SI_StaticBody&{damage?(params:DamageParams):void}
            if(ready&&body.damage&&this.collider.colliding_with(obj.collider)){
                for(const sf of effects){
                    if(sf.type===SideEffectType.Damage)body.damage({amount:sf.amount*(sf.obstacle_mult??1),owner:this.owner,source:this.def,position:this.position})
                }
            }
            if(this.def.movement?.type==="direction")super.on_collided(obj,dt)
        }else if(obj.object_type===ObjectType.Human){
            const human=obj as unknown as Human
            if(human.dead||(this.def.single_use&&this.hitted))return
            const col=this.collider.overlap_collision(human.collider)
            if(!col)return
            if(this.def.movement?.type==="direction"){
                v2m.sub(this.velocity,this.velocity,v2.scale((col.dir.x===1&&col.dir.y===0)?v2.random(-1,1):col.dir,4*dt))
            }
            if(ready&&!(this.def.no_hit_owner&&human.id===this.owner?.id)){
                this.hitted=true
                for(const sf of effects)human.apply_side_effect(sf,this.owner)
            }
        }
    }

    on_tick(dt:number){
        this.time+=dt
        if(this.time>=this.def.lifetime){
            this.time=this.def.lifetime
            this.destroy()
            return
        }
        this.action_tick+=dt
        const decay=this.def.movement?.velocity.decay
        if(decay)v2m.scale(this.velocity,this.velocity,1/(1+dt*decay))
        this.move(dt)
        if(this.action_tick>=this.action_time)this.action_tick=0
        this.rotation=Angle.loop_rad(this.rotation+this.angular_speed*dt)
        this.set_dirty_part()
    }

    on_encode_net(stream:Stream,full:boolean){
        stream.write_pos2(this.position).write_rad(this.rotation)
        if(full)stream.write_float(this.time,0,120,2).write_uint8(this.def.id_number!)
    }
}
