import { Angle, Numeric, random, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type Human } from "../objects/human/human.ts";
import { type Bullet } from "../objects/projectile/bullet.ts";
import { type Grenade } from "../objects/projectile/grenade.ts";
import { spawn_projectile } from "../objects/projectile/projectile.ts";
import { type SI_StaticBody } from "../objects/static_body/static_body.ts";
import { type InventoryItem } from "./inventory.ts";
import { object_instance_type, ObjectType } from "common/scripts/others/constants.ts";
import { ItemFireDefinition } from "common/scripts/definitions/utils.ts";
import { SimObject } from "../base.ts";

export interface FireState{
    fire_sequence:number
}

export function patterning_shape(count:number,radius:number):Vec2[]{
    const shape=(points:number)=>(r:number,offset:number=0):Vec2[]=>Array.from({length:points},(_,i)=>v2.from_RadAngle(i*(Math.PI/points)+offset,r))
    const [triangle,square,pentagon,hexagon]=[3,4,5,6].map(shape)
    const half=Math.PI/2
    switch(count){
        case 1:return [v2(0,0)]
        case 2:return [v2(0,radius),v2(0,-radius)]
        case 3:return triangle(radius)
        case 4:return [v2(0,0),...triangle(radius)]
        case 5:return [v2(0,0),...square(radius)]
        case 6:return [v2(0,0),...pentagon(radius)]
        case 7:return [v2(0,0),...hexagon(radius,half)]
        case 8:return [v2(0,0),...triangle(radius/2),...square(radius,half)]
        case 9:return [v2(0,0),...triangle(radius/2),...pentagon(radius)]
    }
    return [v2(0,0),...shape(count-1)(radius)]
}

export function clip_muzzle(user:Human,muzzle:Vec2):Vec2{
    const start=user.position
    let best=v2.distance(start,muzzle)
    const objs=user.scene.cells.ray(start,muzzle,user.layer) as SimObject[]
    for(const obj of objs){
        if(obj.object_type!==ObjectType.StaticBody)continue
        const sb=obj as SI_StaticBody
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
            const b=spawn_projectile<Bullet>(user.scene,object_instance_type.bullet,user.layer,{
                position:pos,
                owner:user,
                source:item.def,
                ammo,
                critical:Math.random()<=(is_idle?rules.idle_critical_chance:rules.critical_chance),
                def:def.bullet.def,
            })
            b.speed*=user.get_modifier("bullet_speed")
            b.tracer_height*=user.get_modifier("bullet_size")
            b.set_direction(angle)
        }
    }
    if(def.grenade){
        const count=def.grenade.count??1
        const pattern=patterning_shape(count,def.jitter_radius??1)
        const gdef=user.app.definitions.grenades.getFromString(def.grenade.def)
        for(let i=0;i<count;i++){
            const pos=def.jitter_radius?v2.add(position,pattern[i]):v2.clone(position)
            const p=spawn_projectile<Grenade>(user.scene,object_instance_type.grenade,user.layer,{
                position:pos,
                def:gdef,
                owner:user,
            })
            p.zpos=0.5
            p.zpos_speed=1
            const limit=gdef.throw_max_speed??0
            p.push(Numeric.clamp(user.input.distance_to_aim*limit,0,limit),user.rotation,10)
        }
    }
    if(def.recoil){
        user.inventory.recoil={
            speed:def.recoil.speed,
            time:def.recoil.duration,
        }
    }
}
