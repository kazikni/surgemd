import { Angle, Numeric, random, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type Human } from "../objects/human/human.ts";
import { type Bullet } from "../objects/projectile/bullet.ts";
import { type Grenade } from "../objects/projectile/grenade.ts";
import { type SyncedParticle } from "../objects/synced_particle.ts";
import { type StaticBody } from "../objects/static_body/static_body.ts";
import { type InventoryItem } from "./inventory.ts";
import { object_instance_type, ObjectType } from "common/scripts/others/constants.ts";
import { ItemFireDefinition } from "common/scripts/definitions/utils.ts";
import { SimObject } from "../main/base.ts";

export interface FireState{
    fire_sequence:number
}

export function clip_muzzle(user:Human,muzzle:Vec2):Vec2{
    const start=user.position
    let best=v2.distance(start,muzzle)
    const objs=user.scene.cells.ray(start,muzzle,user.layer) as SimObject[]
    for(const obj of objs){
        if(obj.object_type!==ObjectType.StaticBody)continue
        const sb=obj as StaticBody
        if(sb.physical.no_collision||sb.physical.no_projectiles_collision||sb.physical.passable_by_projectiles)continue
        const hit=obj.collider.overlap_line(start,muzzle)
        if(!hit)continue
        const dist=v2.distance(start,hit.point)
        if(dist<best)best=dist-0.03
    }
    if(best<0)best=0
    const ret=v2.sub(muzzle,start)
    v2m.normalizeSafe(ret,v2(1,0))
    v2m.scale(ret,ret,best)
    v2m.add(ret,start,ret)
    return ret
}

export function fire_item(user:Human,item:InventoryItem&FireState,position:Vec2,def:ItemFireDefinition){
    const rules=user.scene.mode.rules.humans
    let spread=def.spread??0
    const is_idle=v2.len(user.velocity)<=0.01
    if(is_idle&&def.idle_spread!==undefined)spread*=def.idle_spread
    if(def.fire_sequence){
        const time=def.fire_sequence.ease===undefined?item.fire_sequence:def.fire_sequence.ease(item.fire_sequence)
        if(def.fire_sequence.spread)spread*=Numeric.lerp(def.fire_sequence.spread.begin,def.fire_sequence.spread.end??1,time)
        item.fire_sequence=Math.min(item.fire_sequence+def.fire_sequence.increse,1)
    }

    if(def.bullet){
        const ammo=user.app.definitions.ammos.getFromStringSafe(def.ammo_type)
        const count=def.bullet.count??1
        for(let i=0;i<count;i++){
            let angle=user.rotation
            if(spread)angle+=Angle.deg2rad(random.float(-spread,spread))
            const pos=v2.clone(position)
            if(def.jitter_radius){
                const a=random.rad()
                v2m.add(pos,pos,v2(Math.cos(a)*def.jitter_radius*0.5,Math.sin(a)*def.jitter_radius))
            }
            const b:Bullet=user.scene.add_object(user.scene.make_object(object_instance_type.bullet),user.layer,undefined,{
                position:pos,
                owner:user,
                source:item.def,
                ammo,
                critical:Math.random()<=(is_idle?rules.idle_critical_chance:rules.critical_chance),
                def:def.bullet.def,
            })
            b.speed*=user.get_modifier("bullet_speed")
            b.tracer_height*=user.get_modifier("bullet_size")
            user.inventory.emit_event("gun_shoot",{user,item,bullet:b,angle,spread,position:pos})
            b.set_direction(angle)
        }
    }
    if(def.grenade){
        const count=def.grenade.count??1
        const gdef=user.app.definitions.grenades.getFromString(def.grenade.def)
        for(let i=0;i<count;i++){
            const pos=v2.clone(position)
            if(def.jitter_radius){
                pos.x+=def.jitter_radius
                const angle=random.rad()
                v2m.add(pos,pos,v2(Math.cos(angle)*def.jitter_radius*0.25,Math.sin(angle)*def.jitter_radius))
            }
            const g:Grenade=user.scene.add_object(user.scene.make_object(object_instance_type.grenade),user.layer,undefined,{
                position:pos,
                def:gdef,
                owner:user,
            })
            g.zpos=0.5
            g.zpos_speed=1
            const limit=gdef.throw_max_speed??0
            g.push(Numeric.clamp(user.input.distance_to_aim*limit,0,limit),user.rotation,10)
        }
    }
    if(def.synsed_particle){
        const particle=def.synsed_particle
        const pdef=user.app.definitions.synced_particles.getFromString(particle.def)
        for(let i=0;i<(particle.count??1);i++){
            const pos=v2.clone(position)
            if(def.jitter_radius)v2m.add(pos,pos,v2.random(-def.jitter_radius,def.jitter_radius))
            const p=user.scene.add_object(user.scene.make_object(object_instance_type.synced_particle),user.layer,undefined,{position:pos,def:pdef,owner:user}) as SyncedParticle
            if(particle.speed){
                let angle=user.rotation
                if(spread)angle+=Angle.deg2rad(random.float(-spread,spread))
                p.push(random.random1(particle.speed),angle)
            }
        }
    }
    if(def.recoil){
        user.inventory.recoil={
            speed:def.recoil.speed,
            time:def.recoil.duration,
        }
    }
}
