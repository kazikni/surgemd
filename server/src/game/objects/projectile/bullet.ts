import { CircleCollider2D, Numeric, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type AmmoDef } from "common/scripts/definitions/items/ammo.ts";
import { type VestDef } from "common/scripts/definitions/items/equipaments.ts";
import { type ExplosionDef } from "common/scripts/definitions/objects/explosions.ts";
import { type SideEffect } from "common/scripts/definitions/player/effects.ts";
import { BulletReflection, GameItemType, type BulletDef } from "common/scripts/definitions/utils.ts";
import { object_instance_type, ObjectType } from "common/scripts/others/constants.ts";
import { SimObject } from "../../main/base.ts";
import { type Inventory } from "../../inventory/inventory.ts";
import { type Human } from "../human/human.ts";
import { type SI_StaticBody } from "../static_body/static_body.ts";
import { Projectile, type SimObjectDamageable } from "./projectile.ts";

export class Bullet extends Projectile{
    speed:number=0
    max_distance:number=1
    angle:number=0
    reflection:BulletReflection=BulletReflection.Only_Reflective
    reflection_count:number=0

    velocity:Vec2=v2.zero()

    tracer_color:number=0
    tracer_alpha:number=255
    tracer_width:number=1
    tracer_height:number=1
    weight:number=0

    damage:number=0
    penetration:number=1
    obstacle_mult:number=1
    critical_mult?:number
    falloff?:number
    effective_range?:number
    on_hit_explosion?:ExplosionDef
    effects?:SideEffect[]

    critical:boolean=false
    hit_owner:boolean=false
    pass_through_humans:boolean=false
    pass_through_everthing:boolean=false

    ammo?:AmmoDef
    initial_position:Vec2=v2.zero()
    old_position:Vec2=v2.zero()
    tticks:number=0
    collided_with=new Set<number>()

    constructor(){
        super()
        this.object_type=ObjectType.Bullet
        this.instance_type=object_instance_type.bullet
        this.allow_tick=true
        this.allow_checkpoint=false
        this.net_sync_deletion=false
        this.net_sync_can_unsee=false
        this.base_collider=new CircleCollider2D(v2(0,0),0.2)
    }

    override on_create(args:{def?:BulletDef,ammo?:AmmoDef,critical?:boolean,angle?:number}={}){
        super.on_create(args)
        this.initial_position=v2.clone(this.position)
        this.old_position=v2.clone(this.position)
        this.critical=args.critical??false
        this.ammo=args.ammo
        if(args.def)this.set_definition(args.def)
        if(args.angle!==undefined)this.set_direction(args.angle)
    }

    set_definition(def:BulletDef){
        this.speed=def.speed
        this.max_distance=def.range/2.5
        this.reflection=def.reflection??BulletReflection.Only_Reflective
        this.weight=def.weight??0
        this.tracer_width=def.tracer.width
        this.tracer_height=def.tracer.height
        this.tracer_alpha=Math.floor(255*(def.tracer.alpha??1))
        this.tracer_color=def.tracer.color??this.ammo?.defaultTrail??0xffffff
        this.damage=def.damage
        this.obstacle_mult=def.obstacle_mult??1
        this.critical_mult=def.critical_mult
        this.falloff=def.falloff
        this.effective_range=def.effective_range
        this.on_hit_explosion=def.on_hit_explosion?this.app.definitions.explosions.getFromStringSafe(def.on_hit_explosion):undefined
        this.pass_through_humans=def.pass_through_humans??false
    }
    set_satured(satured?:number){
        this.tracer_color=satured!==undefined&&this.ammo?.strongTrail?.[satured]!==undefined?this.ammo.strongTrail[satured]:this.ammo?.defaultTrail??0xffffff
    }
    set_direction(angle:number){
        this.angle=angle
        this.velocity=v2.from_RadAngle(angle,this.speed)
        this.set_dirty_full()
    }

    on_tick(dt:number){
        if(this.owner&&(this.owner.dead||this.owner.destroyed)){
            this.destroy()
            return
        }
        this.old_position=v2.clone(this.position)
        this.tticks+=dt
        const distance_t=v2.distance(this.initial_position,this.position)/this.max_distance
        v2m.add_component(this._position,this.velocity.x*dt,this.velocity.y*dt)

        for(const obj of this.manager.cells.get_objects(this.collider,this.layer) as SimObject[]){
            if(this.destroyed)break
            if(obj.id===this.id)continue
            if(obj.object_type===ObjectType.Human)this.collide_human(obj as Human,distance_t)
            else if(obj.object_type===ObjectType.StaticBody)this.collide_static(obj as SI_StaticBody&SimObjectDamageable)
        }
        if(!this.destroyed&&v2.distance(this.initial_position,this.position)>this.max_distance)this.on_hit()
    }

    on_hit(){
        if(this.on_hit_explosion){
            this.scene.add_object(this.scene.make_object(object_instance_type.explosion),this.layer,undefined,{
                position:v2.clone(this.position),
                def:this.on_hit_explosion,
                owner:this.owner,
                source:this.source,
            })
        }
        this.destroy()
    }

    collide_human(obj:Human,distance_t:number){
        if(obj.dead||this.collided_with.has(obj.id)||(obj===this.owner&&!this.hit_owner))return
        const col_body=obj.collider.overlap_line(this.old_position,this.position)
        const col_reflect=obj.get_reflect_collider()?.overlap_line(this.old_position,this.position)
        if(!col_body&&!col_reflect)return
        const dist_body=col_body?v2.distance(this.old_position,col_body.point):Infinity
        const dist_reflect=col_reflect?v2.distance(this.old_position,col_reflect.point):Infinity
        const is_reflect=dist_reflect<dist_body
        const chosen=(is_reflect?col_reflect:col_body)!

        this.collided_with.add(obj.id)
        if(is_reflect){
            this.on_hit()
            const b=this.reflect(chosen.dir,chosen.point)
            if(b){
                b.owner=obj
                b.hit_owner=false
            }
            return
        }

        let amount=this.damage
        if(this.falloff!==undefined){
            const range=this.effective_range??0
            amount*=Numeric.lerp(1,this.falloff,Numeric.clamp((distance_t-range)/(1-range),0,1))
        }
        if(this.critical&&this.critical_mult!==undefined)amount*=this.critical_mult
        obj.damage({
            amount,
            owner:this.owner,
            source:this.source,
            position:v2.clone(chosen.point),
            critical:this.critical,
            direction:this.angle+3.1415,
            penetration:this.penetration,
        })
        for(const e of this.effects??[])obj.apply_side_effect(e,this.owner)

        const vest=obj.inventory.get_items(GameItemType.vest)[0]?.def as VestDef|undefined
        if(vest?.reflect_bullets){
            this.reflect(chosen.dir,chosen.point)
            this.on_hit()
        }else if(!(this.pass_through_humans||this.pass_through_everthing)){
            this.on_hit()
        }
    }
    collide_static(obj:SI_StaticBody&SimObjectDamageable){
        if(obj.physical.no_projectiles_collision||this.collided_with.has(obj.id))return
        const col=obj.collider.overlap_line(this.old_position,this.position)
        if(!col)return
        this.collided_with.add(obj.id)
        if(!(obj.physical.passable_by_projectiles||this.pass_through_everthing)){
            if((obj.physical.reflect_projectiles||this.reflection===BulletReflection.All)&&this.reflection!==BulletReflection.None&&!this.on_hit_explosion){
                this.reflect(col.dir,col.point)
            }
            this.on_hit()
        }
        obj.damage?.({
            amount:this.damage*this.obstacle_mult,
            resistence:0,
            owner:this.owner,
            source:this.source,
            position:v2.clone(this.position),
            critical:this.critical,
            direction:Math.atan2(col.dir.y,col.dir.x),
            penetration:this.penetration,
        })
    }

    reflect(normal:Vec2,point:Vec2):Bullet|undefined{
        if(this.reflection_count>=3)return
        const n=v2.normalizeSafe(normal)
        const d=v2.from_RadAngle(this.angle)
        const dir=v2.sub(d,v2.scale(n,2*v2.dot(d,n)))
        const position=v2.add(point,v2.scale(n,0.05))
        const b=this.clone(position)
        b.hit_owner=true
        b.tracer_alpha=Math.floor(b.tracer_alpha/2)
        b.damage/=2
        b.reflection_count=this.reflection_count+1
        b.angle=Math.atan2(dir.y,dir.x)
        ;(this.owner as {inventory?:Inventory}|undefined)?.inventory?.emit_event("bullet_reflect",{user:this.owner,item:this,bullet:b,angle:b.angle,position})
        b.set_direction(b.angle)
        return b
    }
    clone(position:Vec2=v2.clone(this.position)):Bullet{
        const b:Bullet=this.scene.add_object(this.scene.make_object(object_instance_type.bullet),this.layer,undefined,{
            position,
            owner:this.owner,
            source:this.source,
            ammo:this.ammo,
            critical:this.critical,
        })
        Object.assign(b,{
            speed:this.speed,
            max_distance:this.max_distance,
            reflection:this.reflection,
            weight:this.weight,
            tracer_width:this.tracer_width,
            tracer_height:this.tracer_height,
            tracer_alpha:this.tracer_alpha,
            tracer_color:this.tracer_color,
            damage:this.damage,
            penetration:this.penetration,
            obstacle_mult:this.obstacle_mult,
            critical_mult:this.critical_mult,
            falloff:this.falloff,
            effective_range:this.effective_range,
            on_hit_explosion:this.on_hit_explosion,
            effects:this.effects,
            pass_through_humans:this.pass_through_humans,
            pass_through_everthing:this.pass_through_everthing,
            reflection_count:this.reflection_count,
            hit_owner:this.hit_owner,
        })
        return b
    }

    on_encode_net(stream:Stream,full:boolean){
        stream.write_pos2(this.position).write_float(this.tticks,0,100,2)
        if(full){
            stream.write_pos2(this.initial_position)
            .write_float32(this.max_distance)
            .write_float32(this.speed)
            .write_rad(this.angle)
            .write_uint8(this.weight)
            .write_float32(this.tracer_width)
            .write_float32(this.tracer_height)
            .write_uint32(this.tracer_color)
            .write_uint8(this.tracer_alpha)
            .write_boolean_group(this.hit_owner,this.critical,this.pass_through_humans,this.pass_through_everthing)
            .write_id(this.owner?.id??0)
        }
    }
}
