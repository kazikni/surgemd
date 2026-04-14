import { BulletDef, BulletReflection, DamageReason } from "common/scripts/definitions/utils.ts";
import { ServerGameObject } from "../others/gameObject.ts"; 
import { SideEffectType } from "common/scripts/definitions/player/effects.ts";
import { CircleHitbox2D, Collision, NetStream, Numeric, v2, v2m, Vec2 } from "common/engine/core.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { type Human } from "./human.ts";
import { type StaticBody } from "./static_body.ts";
import { DamageSourceDef } from "common/scripts/definitions/game_defs.ts";
import { AmmoDef } from "common/scripts/definitions/items/ammo.ts";

export class Bullet extends ServerGameObject{
    string_type:string="bullet"
    number_type:number=GameObjectType.Bullet

    owner?:Human
    def!:BulletDef
    angle!:number
    old_position!:Vec2
    initial_position!:Vec2
    max_distance!:number
    velocity:Vec2
    dir:Vec2
    critical!:boolean

    satured:boolean=false
    ammo?:AmmoDef

    modifiers={
        speed:1,
        size:1,
    }

    source?:DamageSourceDef

    damage:number=0
    tticks:number=0

    reflectionCount:number=0

    tracerColor:number=0
    tracerAlpha:number=255
    projColor:number=0
    constructor(){
        super()
        this.velocity=v2(0,0)
        this.dir=v2(0,0)
        this.net_sync.enabled.deletion=false
    }
    override interact(user: Human): void {}
    on_hit(){
        if(this.def.on_hit_explosion){
            this.game.add_explosion(this.position,this.game.definitions.explosions.getFromString(this.def.on_hit_explosion),this.owner,this.source,this.layer)
        }
        this.destroy()
    }
    update(dt:number): void {
        this.old_position=v2.clone(this.position)
        this.tticks+=dt
        const disT=v2.distance(this.initial_position,this.position)/this.max_distance
        v2m.add_component(this.position,this.velocity.x*dt,this.velocity.y*dt)

        this.manager.cells.updateObject(this)
        const objs:ServerGameObject[]=this.manager.cells.get_objects(this.hitbox,this.layer)
        for(const obj of objs){
            if(this.destroyed)break
            switch(obj.number_type){
                case GameObjectType.Human:{
                    if(!(obj as Human).health_data.dead&&(!this.owner||((obj as Human).id===this.owner.id&&this.reflectionCount>0)||(obj as Human).id!==this.owner.id)&&!(obj as Human).parachute){
                        const human = obj as Human

                        const colBody = human.hitbox.overlapLine(this.old_position, this.position)

                        const reflectSeg = null//human.get_reflect_segment()
                        let colReflect = null
                        if (reflectSeg) {
                            const segHit = Collision.segment_intersection(
                                this.old_position,
                                this.position,
                                reflectSeg[0],
                                reflectSeg[1]
                            )

                            if (segHit) {
                                const segDir = v2.sub(reflectSeg[1], reflectSeg[0])
                                const normal = v2.normalizeSafe(v2(-segDir.y, segDir.x))
                                colReflect = {
                                    point: segHit.point,
                                    dir: normal
                                }
                            }
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
                            if (isReflect) {
                                this.on_hit()
                                this.reflect(chosen.dir, chosen.point)
                                break
                            }

                            const dmg:number=this.damage
                                *(this.def.falloff?Numeric.lerp(1,this.def.falloff,disT):1)
                                *(this.critical?(this.def.criticalMult??1.25):1);

                            human.damage({
                                amount:dmg,
                                owner:this.owner,
                                reason:DamageReason.Human,
                                position:v2.clone(chosen.point),
                                critical:this.critical,
                                source:this.source as unknown as DamageSourceDef,
                                direction:Math.atan2(chosen.dir.y,chosen.dir.x)
                            })

                            if(this.def.effect){
                                for(const e of this.def.effect){
                                    human.side_effect({
                                        type:SideEffectType.AddEffect,
                                        duration:e.time,
                                        effect:e.id
                                    })
                                }
                            }

                            // Armor Reflect
                            if((obj as Human).equipment_data.vest&&(obj as Human).equipment_data.vest?.reflect_bullets){
                                this.reflect(chosen.dir,chosen.point)
                            }
                            this.on_hit()
                        }
                        break
                    }
                    break
                }
                /*case GameObjectType.Creature:{
                    if((obj as Creature).hitbox&&!(obj as Creature).dead&&(this.hitbox.collidingWith(obj.hitbox)||obj.hitbox.colliding_with_line(this.old_position,this.position))){
                        const dmg:number=this.damage
                        *(this.defs.falloff?Numeric.lerp(1,this.defs.falloff,disT):1)
                        *(this.critical?(this.defs.criticalMult??1.25):1);
                        (obj as Player).damage({amount:dmg,owner:this.owner,reason:DamageReason.Player,position:v2.clone(this.position),critical:this.critical,source:this.source as unknown as DamageSourceDef})
                        this.on_hit()
                        s=SubSteps
                        break
                    }
                    break
                }*/
                case GameObjectType.Obstacle:
                case GameObjectType.Building:
                    if((obj as StaticBody).physical_data.no_bullets_collision)break
                    if(obj.hitbox){
                        const col1=obj.hitbox.overlapLine(this.old_position,this.position)
                        if(!col1)continue
                        if(((obj as StaticBody).physical_data.reflect_bullets||BulletReflection.All===this.def.reflection)&&this.def.reflection!==BulletReflection.None&&this.reflectionCount<3&&!this.def.on_hit_explosion){
                            this.reflect(col1.dir,col1.point)
                        }
                        this.on_hit()
                        const dmg:number=this.damage;
                        (obj as StaticBody).damage({
                            amount:dmg,
                            resistence:0,
                            owner:this.owner,
                            reason:DamageReason.Human,
                            position:v2.clone(this.position),
                            critical:this.critical,
                            source:this.source as unknown as DamageSourceDef,
                            direction:Math.atan2(col1.dir.y,col1.dir.x)
                        })
                    }
                    break
            }
        }
        if(v2.distance(this.initial_position,this.position)>this.max_distance){
            this.on_hit()
        }
    }
    create(args: {defs:BulletDef,position:Vec2,owner:Human,ammo:string,critical?:boolean,source?:DamageSourceDef,satured?:boolean}): void {
        this.def=args.defs
        this.base_hitbox=new CircleHitbox2D(v2.zero,this.def.radius*this.modifiers.size)
        this.position=args.position
        this.initial_position=v2.clone(this.position)
        this.old_position=this.position
        this.max_distance=this.def.range/2.5

        const ad=args.ammo?this.game.definitions.ammos.getFromString(args.ammo):undefined
        this.owner=args.owner
        this.critical=args.critical??(Math.random()<=0.15)
        this.source=args.source
        this.ammo=ad

        this.damage=args.defs.damage
        this.set_color(args.satured)
    }
    set_color(satured:boolean=false){
        this.tracerColor=this.def.tracer.color??(satured?(this.ammo?.strongTrail??0xffffff):(this.ammo?.defaultTrail??0xffffff))
        this.projColor=this.def.tracer.proj.color??(satured?(this.ammo?.strongProj??0xffffff):(this.ammo?.defaultProj??0xffffff))
        this.satured=satured
    }
    set_direction(angle:number){
        this.dir=v2.from_RadAngle(angle)
        this.velocity=v2.scale(this.dir,this.def.speed*this.modifiers.speed)
        this.net_sync.full=true
        this.angle=angle;
        (this.base_hitbox as CircleHitbox2D).radius=this.def.radius*this.modifiers.size
    }
    reflect(normal: Vec2, point: Vec2) {
        const n = v2.normalizeSafe(normal)
        const d = this.dir

        const dot = v2.dot(d, n)

        const newDir = v2.sub(
            d,
            v2.scale(n, 2 * dot)
        )

        const pos = v2.add(point, v2.scale(n, 0.05))

        const b = this.game.add_bullet(
            pos,
            Math.atan2(newDir.y, newDir.x),
            this.def,
            this.owner,
            this.ammo?.idString,
            this.source,
            this.layer,
            this.satured
        )

        b.tracerAlpha/=2
        b.damage/=2
        b.reflectionCount = this.reflectionCount + 1
    }
    override encode(stream: NetStream, full: boolean): void {
        stream.writePos2(this.position)
        .writeFloat(this.tticks,0,100,2)
        if(full){
            stream.writePos2(this.initial_position)
            .writeFloat32(this.max_distance)
            .writeFloat((this.base_hitbox as CircleHitbox2D).radius,0,2,2)
            .writeFloat32(this.def.speed*this.modifiers.speed)
            .writeRad(this.angle)
            .writeFloat(this.def.tracer.width,0,100,3)
            .writeFloat(this.def.tracer.height*this.modifiers.size,0,6,2)
            .writeUint32(this.tracerColor)
            .writeUint8(this.tracerAlpha)
            .writeUint8(this.def.tracer.proj.img)
            if(this.def.tracer.proj.img>0){
                stream.writeFloat(this.def.tracer.proj.width,0,6,2)
                .writeFloat(this.def.tracer.proj.height,0,6,2)
                .writeUint32(this.projColor)
            }
            stream.writeUint8(this.def.tracer.particles?.frame??0)
            .writeBooleanGroup(this.critical)
            .writeID(this.owner!.id)
        }
    }
}