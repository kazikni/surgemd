import { CircleCollider2D, gel_events, GELComponent, random, Stream, v2, v2m, Vec2 } from "../../../../engine/core.ts";
import { type ExplosionDef } from "../../../definitions/objects/explosions.ts";
import { DamageReason } from "../../../definitions/utils.ts";
import { object_instance_type, ObjectType } from "../../../others/constants.ts";
import { type SimulatedObject } from "../../base.ts";
import { type SI_StaticBody } from "../static_body/static_body.ts";
import { type SI_Bullet } from "./bullet.ts";
import { type SI_Grenade } from "./grenade.ts";
import { c_projectile, type C_Projectile, type ProjectileCreateArgs, type ProjectileTarget, si_projectile, type SI_Projectile, spawn_projectile } from "./projectile.ts";

export const explosion_events={
    exploded:"explosion_exploded",
}

export interface C_Explosion extends C_Projectile{
    def:ExplosionDef
    radius:number
    set_definition(def:ExplosionDef):void
}

export const c_explosion:GELComponent<C_Explosion>={
    id_string:"c_explosion",
    extensions:[c_projectile],
    events:{
        [gel_events.bind](){
            this.object_type=ObjectType.Explosion
            this.instance_type=object_instance_type.explosion
            this.allow_tick=true
            this.allow_checkpoint=false
            this.net_sync_deletion=false
            this.radius=0
        },
    },
    methods:{
        set_definition(def:ExplosionDef){
            this.def=def
            this.radius=def.size.end
            this.base_collider=new CircleCollider2D(v2(0,0),def.size.end)
        },
    },
}

export interface ExplosionCreateArgs extends ProjectileCreateArgs{
    def?:ExplosionDef
    parent_velocity?:Vec2
}

export type ExplosionPushable=SimulatedObject&{
    push?(speed:number,direction:number):void
}

export type SI_Explosion=C_Explosion&SI_Projectile&{
    delay:number
    exploded_base:boolean
    parent_velocity?:Vec2
    explode_base():void
    explode_damage():void
}

export const si_explosion:GELComponent<SI_Explosion>={
    id_string:"si_explosion",
    extensions:[c_explosion,si_projectile],
    events:{
        [gel_events.bind](){
            this.delay=0.1
            this.exploded_base=false
        },
        [gel_events.create](args?:ExplosionCreateArgs){
            if(!args)return
            if(args.def)this.set_definition(args.def)
            if(args.parent_velocity)this.parent_velocity=v2.clone(args.parent_velocity)
            this.set_dirty_full()
        },
        [gel_events.tick](dt:number){
            if(this.finished||!this.def)return
            this.explode_base()
            if(this.delay<=0){
                this.explode_damage()
            }else{
                this.delay-=dt
            }
        },
        [gel_events.net_encode](stream:Stream,_full:boolean){
            stream.write_pos2(this.position)
            .write_float(this.radius,0,50,3)
            .write_uint16(this.def.id_number!)
        },
    },
    methods:{
        explode_base(){
            if(this.exploded_base)return
            this.exploded_base=true
            if(this.def.bullet){
                const critical_chance=this.scene.mode.rules.humans.critical_chance
                for(let i=0;i<this.def.bullet.count;i++){
                    const b=spawn_projectile<SI_Bullet>(this.scene,object_instance_type.bullet,this.layer,{
                        position:v2.clone(this.position),
                        owner:this.owner,
                        source:this.source,
                        critical:Math.random()<=critical_chance,
                        def:this.def.bullet.def,
                    })
                    b.hit_owner=true
                    b.set_direction(random.rad())
                }
            }
            this.emit_event(explosion_events.exploded)
        },
        explode_damage(){
            const objs=(this.manager.cells.get_objects(this.collider,this.layer) as SimulatedObject[]).filter((v)=>v.id!==this.id&&this.collider.colliding_with(v.collider))
            objs.sort((a,b)=>v2.distanceSquared(this.position,a.position)-v2.distanceSquared(this.position,b.position))
            const blocks:SimulatedObject[]=[]
            const push_force=this.def.push_force===undefined?15:this.def.push_force
            for(const obj of objs){
                const dist=v2.distance(this.position,obj.position)
                let damage=0
                if(dist<=this.def.size.end){
                    damage=this.def.damage
                    if(dist>this.def.size.begin){
                        damage*=1-((dist-this.def.size.begin)/(this.def.size.end-this.def.size.begin))
                    }
                }
                let block_factor=1
                for(const b of blocks){
                    if(b.collider.overlap_line(this.position,obj.position)){
                        block_factor=0
                        break
                    }
                }
                damage*=block_factor
                if(damage>0){
                    if(obj.__components.has("c_static_body")){
                        this.hit(obj as ProjectileTarget,{
                            amount:damage*(this.def.obstacle_mult??1),
                            reason:DamageReason.Explosion,
                            source:this.source,
                            owner:this.owner,
                            position:v2.clone(obj.position),
                            critical:false,
                            direction:v2.lookTo(obj.position,this.position),
                            penetration:1,
                        })
                    }else if(obj.__components.has("c_human")){
                        this.hit(obj as ProjectileTarget,{
                            amount:damage,
                            reason:DamageReason.Explosion,
                            source:this.source,
                            owner:this.owner,
                            position:v2.clone(obj.position),
                            critical:false,
                            direction:v2.lookTo(obj.position,this.position),
                            penetration:1,
                        })
                    }else if(obj.__components.has("c_loot")){
                        const force=Math.max(0,(this.def.size.end-dist)/this.def.size.end)*push_force
                        ;(obj as ExplosionPushable).push?.(force*block_factor,v2.lookTo(this.position,obj.position))
                    }else if(obj.__components.has("c_grenade")){
                        const g=obj as SI_Grenade
                        const resistence=g.def.push_force_resistence!==undefined?g.def.push_force_resistence:0.75
                        if(resistence){
                            const force=Math.max(0,(this.def.size.end-dist)/this.def.size.end)*push_force
                            g.push(force*block_factor*resistence,v2.lookTo(this.position,obj.position),0)
                            g.physical.angular_velocity=random.neg_float(2,10)
                        }
                        if(!g.def.zindex_set_resistence){
                            g.zpos=random.float(0.3,1)
                            g.zpos_speed=0
                        }
                    }
                }
                if(obj.__components.has("c_static_body")&&!(obj as SI_StaticBody).physical.no_collision){
                    blocks.push(obj)
                }
            }
            if(this.def.projectiles){
                const gdef=this.app.definitions.grenades.getFromString(this.def.projectiles.def)
                for(let i=0;i<this.def.projectiles.count;i++){
                    const p=spawn_projectile<SI_Grenade>(this.scene,object_instance_type.grenade,this.layer,{
                        position:v2.clone(this.position),
                        def:gdef,
                        owner:this.owner,
                    })
                    p.zpos=0.5
                    p.zpos_speed=1.5
                    p.physical.velocity=v2.random(-this.def.projectiles.speed,this.def.projectiles.speed)
                    p.physical.angular_velocity=random.neg_value(this.def.projectiles.angSpeed+(Math.random()*this.def.projectiles.randomAng))
                    if(this.parent_velocity)v2m.add(p.physical.velocity,p.physical.velocity,this.parent_velocity)
                }
            }
            this.finish()
        },
    },
}
