import { CircleCollider2D, random, Stream, v2, v2m, Vec2 } from "../../../../engine/core.ts";
import { type ExplosionDef } from "../../../definitions/objects/explosions.ts";
import { DamageReason } from "../../../definitions/utils.ts";
import { type DamageParams, object_instance_type, ObjectType } from "../../../others/constants.ts";
import { type SimObject } from "../../base.ts";
import { type Human } from "../human/human.ts";
import { type Loot } from "../loot.ts";
import { type SI_StaticBody } from "../static_body/static_body.ts";
import { type Bullet } from "./bullet.ts";
import { type Grenade } from "./grenade.ts";
import { Projectile, type ProjectileCreateArgs, spawn_projectile } from "./projectile.ts";

export interface ExplosionCreateArgs extends ProjectileCreateArgs{
    def:ExplosionDef
    parent_velocity?:Vec2
}

export class Explosion extends Projectile{
    def!:ExplosionDef
    delay:number=0.1
    exploded_base:boolean=false
    parent_velocity?:Vec2

    constructor(){
        super()
        this.object_type=ObjectType.Explosion
        this.instance_type=object_instance_type.explosion
        this.allow_tick=true
        this.allow_checkpoint=false
        this.net_sync_deletion=false
    }

    override on_create(args:ExplosionCreateArgs){
        super.on_create(args)
        this.def=args.def
        this.parent_velocity=args.parent_velocity
        this.base_collider=new CircleCollider2D(v2(0,0),args.def.size.end)
    }

    on_tick(dt:number){
        this.explode_base()
        if(this.delay<=0)this.explode_damage()
        else this.delay-=dt
    }

    explode_base(){
        if(this.exploded_base)return
        this.exploded_base=true
        if(!this.def.bullet)return
        for(let i=0;i<this.def.bullet.count;i++){
            const b=spawn_projectile<Bullet>(this.scene,object_instance_type.bullet,this.layer,{
                position:v2.clone(this.position),
                owner:this.owner,
                source:this.source,
                critical:Math.random()<=this.scene.mode.rules.humans.critical_chance,
                def:this.def.bullet.def,
            })
            b.hit_owner=true
            b.set_direction(random.rad())
        }
    }

    explode_damage(){
        const objs=(this.manager.cells.get_objects(this.collider,this.layer) as SimObject[]).filter((o)=>o.id!==this.id&&this.collider.colliding_with(o.collider))
        objs.sort((a,b)=>v2.distanceSquared(this.position,a.position)-v2.distanceSquared(this.position,b.position))
        const blocks:SimObject[]=[]
        const size=this.def.size
        const push_force=this.def.push_force??15
        for(const obj of objs){
            const dist=v2.distance(this.position,obj.position)
            let damage=0
            if(dist<=size.end){
                damage=this.def.damage
                if(dist>size.begin)damage*=1-((dist-size.begin)/(size.end-size.begin))
            }
            const block_factor=blocks.some((b)=>b.collider.overlap_line(this.position,obj.position))?0:1
            damage*=block_factor
            const force=Math.max(0,(size.end-dist)/size.end)*push_force*block_factor
            const params:DamageParams={
                amount:damage,
                reason:DamageReason.Explosion,
                source:this.source,
                owner:this.owner,
                position:v2.clone(obj.position),
                critical:false,
                direction:v2.lookTo(obj.position,this.position),
                penetration:1,
            }
            switch(obj.object_type){
                case ObjectType.StaticBody:
                    if(damage>0){
                        params.amount*=this.def.obstacle_mult??1
                        ;(obj as SI_StaticBody&{damage?(p:DamageParams):void}).damage?.(params)
                    }
                    if(!(obj as SI_StaticBody).physical.no_collision)blocks.push(obj)
                    break
                case ObjectType.Human:
                    if(damage>0)(obj as Human).damage(params)
                    break
                case ObjectType.Loot:
                    if(damage>0)(obj as Loot).push(force,v2.lookTo(this.position,obj.position))
                    break
                case ObjectType.Grenade:{
                    if(damage<=0)break
                    const g=obj as Grenade
                    const resistence=g.def.push_force_resistence??0.75
                    if(resistence){
                        g.push(force*resistence,v2.lookTo(this.position,obj.position),0)
                        g.angular_velocity=random.neg_float(2,10)
                    }
                    if(!g.def.zindex_set_resistence){
                        g.zpos=random.float(0.3,1)
                        g.zpos_speed=0
                    }
                    break
                }
            }
        }
        if(this.def.projectiles){
            const gdef=this.app.definitions.grenades.getFromString(this.def.projectiles.def)
            for(let i=0;i<this.def.projectiles.count;i++){
                const p=spawn_projectile<Grenade>(this.scene,object_instance_type.grenade,this.layer,{
                    position:v2.clone(this.position),
                    def:gdef,
                    owner:this.owner,
                })
                p.zpos=0.5
                p.zpos_speed=1.5
                p.velocity=v2.random(-this.def.projectiles.speed,this.def.projectiles.speed)
                p.angular_velocity=random.neg_value(this.def.projectiles.angSpeed+(Math.random()*this.def.projectiles.randomAng))
                if(this.parent_velocity)v2m.add(p.velocity,p.velocity,this.parent_velocity)
            }
        }
        this.destroy()
    }

    on_encode_net(stream:Stream){
        stream.write_pos2(this.position)
        .write_float(this.def.size.end,0,50,3)
        .write_uint16(this.def.id_number!)
    }
}
