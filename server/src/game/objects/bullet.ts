import { BulletDef, BulletReflection, DamageReason } from "common/scripts/definitions/utils.ts";
import { ServerGameObject } from "../others/gameObject.ts"; 
import { SideEffect } from "common/scripts/definitions/player/effects.ts";
import { CircleHitbox2D, Stream, Numeric, v2, v2m, Vec2 } from "common/engine/core.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { type Human } from "./human.ts";
import { type StaticBody } from "./static_body.ts";
import { DamageSourceDef } from "common/scripts/definitions/game_defs.ts";
import { AmmoDef } from "common/scripts/definitions/items/ammo.ts";
import { ExplosionDef } from "common/scripts/definitions/objects/explosions.ts";

export class Bullet extends ServerGameObject{
    string_type:string="bullet"
    number_type:number=GameObjectType.Bullet

    /*    
        Definition
    */

    // Physics
    speed!:number
    max_distance!:number
    reflection!:BulletReflection
    // Visual
    tracer_color:number=0
    tracer_alpha:number=255
    tracer_width:number=1
    tracer_height:number=1
    // Damage
    damage:number=0
    penetration:number=1
    obstacle_mult:number=1
    critical_mult:number=1.25
    falloff:number=1
    on_hit_explosion?:ExplosionDef
    effects?:SideEffect[]

    // Status
    angle!:number
    old_position!:Vec2
    initial_position!:Vec2
    velocity:Vec2

    critical!:boolean
    hit_owner:boolean=false

    owner?:Human
    ammo?:AmmoDef
    source?:DamageSourceDef

    tticks:number=0

    reflection_count:number=0

    collided_with:Set<ServerGameObject>=new Set()

    pass_through_humans=false
    pass_through_everthing=false
    constructor(){
        super()
        this.velocity=v2(0,0)

        this.net_sync_deletion=false
        this.net_sync_can_unsee=false

        this.allow_tick=true
    }
    on_hit(){
        if(this.on_hit_explosion){
            this.game.add_explosion(this.position,this.on_hit_explosion,this.owner,this.source,this.layer)
        }
        this.destroy()
    }
    override on_tick(dt:number): void {
        this.old_position=v2.clone(this.position)
        this.tticks+=dt
        const disT=v2.distance(this.initial_position,this.position)/this.max_distance
        v2m.add_component(this.position,this.velocity.x*dt,this.velocity.y*dt)

        const objs:ServerGameObject[]=this.manager.cells.get_objects(this.hitbox,this.layer)
        for(const obj of objs){
            if(this.destroyed)break
            switch(obj.number_type){
                case GameObjectType.Human:{
                    if((obj as Human).dead||this.collided_with.has(obj)||(obj as Human).parachute||(this.owner&&obj.id===this.owner.id&&!this.hit_owner))break
                    const colBody = obj.hitbox.overlap_line(this.old_position, this.position)
                    const reflectSeg = (obj as Human).get_reflect_segment()
                    let colReflect = null
                    if (reflectSeg) {
                        colReflect = reflectSeg.overlap_line(this.old_position,this.position)
                    }
                    let chosen: typeof colBody | typeof colReflect = null
                    let isReflect = false
                    if (colBody || colReflect) {
                        const distBody = colBody ? v2.distance(this.old_position, colBody.point) : Infinity
                        const distPan = colReflect ? v2.distance(this.old_position, colReflect.point) : Infinity
                        if (distPan < distBody) {
                            chosen = colReflect
                            isReflect = true
                        } else {
                            chosen = colBody
                        }
                    }
                    if(chosen) {
                        this.collided_with.add(obj)
                        if (isReflect) {
                            this.on_hit()
                            const b=this.reflect(chosen.dir, chosen.point)
                            if(b){
                                b.owner=obj as Human
                                b.hit_owner=false
                            }
                            break
                        }
                        const dmg:number=this.damage*(this.falloff===1?1:Numeric.lerp(1,this.falloff,disT))*(this.critical?this.critical_mult:1)

                        ;(obj as Human).damage({
                            amount:dmg,
                            owner:this.owner,
                            source:this.source as unknown as DamageSourceDef,
                            object:this,
                            reason:DamageReason.Human,
                            position:v2.clone(chosen.point),
                            critical:this.critical,
                            direction:this.angle+3.1415,
                            penetration:this.penetration
                        })

                        if(this.effects){
                            for(const e of this.effects)(obj as Human).side_effect(e,this.owner)
                        }

                        // Armor Reflect
                        if((obj as Human).equipment_data.vest&&(obj as Human).equipment_data.vest?.reflect_bullets){
                            this.reflect(chosen.dir,chosen.point)
                            this.on_hit()
                        }else if(!(this.pass_through_humans||this.pass_through_everthing)){
                            this.on_hit()
                        }  
                    }
                    break
                }
                case GameObjectType.Obstacle:
                case GameObjectType.Building:{
                    if((obj as StaticBody).physical_data.no_bullets_collision||this.collided_with.has(obj))break
                    const col1=obj.hitbox.overlap_line(this.old_position,this.position)
                    if(!col1)continue

                    this.collided_with.add(obj)
                    if(!((obj as StaticBody).physical_data.passable_by_bullets||this.pass_through_everthing)){
                        if(((obj as StaticBody).physical_data.reflect_bullets||BulletReflection.All===this.reflection)&&this.reflection!==BulletReflection.None&&!this.on_hit_explosion){
                            this.reflect(col1.dir,col1.point)
                        }
                        this.on_hit()
                    }
                    const dmg:number=this.damage*this.obstacle_mult;
                    (obj as StaticBody).damage({
                        amount:dmg,
                        resistence:0,
                        owner:this.owner,
                        reason:DamageReason.Human,
                        position:v2.clone(this.position),
                        critical:this.critical,
                        source:this.source as unknown as DamageSourceDef,
                        object:this,
                        direction:Math.atan2(col1.dir.y,col1.dir.x),
                        penetration:this.penetration
                    })
                    break
                }
            }
        }
        if(v2.distance(this.initial_position,this.position)>this.max_distance){
            this.on_hit()
        }
    }
    override on_create(args?: {position:Vec2,owner:Human,ammo:AmmoDef,critical_chance?:number,critical?:boolean,source?:DamageSourceDef,satured?:number}): void {
        this.base_hitbox=new CircleHitbox2D(v2.zero,0.2)
        if(args)this.set_configuration(args.position,args.owner,args.ammo,args.critical_chance,args.critical,args.source)
    }
    set_definition(def:BulletDef){
        this.speed=def.speed
        this.max_distance=def.range/2.5
        if(def.reflection!==undefined)this.reflection=def.reflection
        else this.reflection=BulletReflection.Only_Reflective

        this.tracer_width=def.tracer.width
        this.tracer_height=def.tracer.height
        this.tracer_alpha=255
        this.tracer_color=def.tracer.color??this.ammo?.defaultTrail??0
        if(def.tracer.alpha!==undefined)this.tracer_alpha*=def.tracer.alpha

        this.damage=def.damage
        this.penetration=1
        if(def.obstacle_mult!==undefined)this.obstacle_mult=def.obstacle_mult
        if(def.critical_mult!==undefined)this.critical_mult=def.critical_mult
        if(def.falloff!==undefined)this.falloff=def.falloff
        if(def.on_hit_explosion)this.on_hit_explosion=this.game.definitions.explosions.getFromStringSafe(def.on_hit_explosion)

        this.pass_through_humans=def.pass_through_humans??false
    }
    set_configuration(position:Vec2,owner:Human,ammo:AmmoDef,critical_chance:number=0.15,critical?:boolean,source?:DamageSourceDef,satured?:number){
        this.position=position
        this.initial_position=v2.clone(position)
        this.old_position=v2.clone(this.position)

        this.owner=owner
        this.critical=critical===undefined?(Math.random()<=critical_chance):critical
        this.source=source
        this.ammo=ammo
    }
    set_direction(angle:number){
        this.angle=angle
        this.velocity=v2.from_RadAngle(angle,this.speed)
        this.set_dirty_full()
    }
    set_satured(satured:number){
        if(satured!==undefined&&this.ammo?.strongTrail?.[satured]){
            this.tracer_color=this.ammo.strongTrail[satured]
        }else{
            this.tracer_color=this.ammo?.defaultTrail===undefined?0xffffff:this.ammo.defaultTrail
        }
    }
    reflect(normal: Vec2, point: Vec2):Bullet|undefined{
        if(this.reflection_count>=3)return
        const n = v2.normalizeSafe(normal)
        const d = v2.from_RadAngle(this.angle)

        const dot = v2.dot(d, n)
        const newDir = v2.sub(d,v2.scale(n, 2 * dot))
        const pos = v2.add(point, v2.scale(n, 0.05))

        const b = this.clone(pos)
        b.hit_owner=true
        b.tracer_alpha/=2
        b.damage/=2
        b.reflection_count=this.reflection_count+1
        if(this.owner){
            this.owner.inventory.accessorys.call_event("bullet_reflect",{user:this.owner,item:this,bullet:b,angle:b.angle,position:pos})
        }

        b.set_direction(Math.atan2(newDir.y, newDir.x))
        return b
    }
    clone(position?:Vec2){
        const b=this.game.add_bullet(position??this.position,this.owner,this.ammo,this.source,this.layer)
        
        b.speed=this.speed
        b.max_distance=this.max_distance
        b.reflection=this.reflection

        b.tracer_width=this.tracer_width
        b.tracer_height=this.tracer_height
        b.tracer_alpha=this.tracer_alpha
        b.tracer_color=this.tracer_color

        b.damage=this.damage
        b.penetration=this.penetration
        b.obstacle_mult=this.obstacle_mult
        b.critical_mult=this.critical_mult
        b.falloff=this.falloff
        b.on_hit_explosion=this.on_hit_explosion
        b.effects=this.effects

        b.pass_through_humans=this.pass_through_humans
        b.pass_through_everthing=this.pass_through_everthing

        b.reflection_count=this.reflection_count
        b.hit_owner=this.hit_owner
        
        return b
    }
    override on_encode_net(stream: Stream, full: boolean): void {
        stream.write_pos2(this.position)
        .write_float(this.tticks,0,100,2)
        if(full){
            stream.write_pos2(this.initial_position)
            .write_float32(this.max_distance)
            .write_float32(this.speed)
            .write_rad(this.angle)
            .write_float32(this.tracer_width)
            .write_float32(this.tracer_height)
            .write_uint32(this.tracer_color)
            .write_uint8(this.tracer_alpha)
            .write_boolean_group(this.hit_owner,this.critical,this.pass_through_humans,this.pass_through_everthing)
            .write_id(this.owner?.id??0)
        }
    }
}