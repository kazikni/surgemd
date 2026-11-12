import { CircleCollider2D, Collider2D, gel_events, GELComponent, Numeric, Stream, v2, v2m, Vec2 } from "../../../../engine/core.ts";
import { type AmmoDef } from "../../../definitions/items/ammo.ts";
import { type VestDef } from "../../../definitions/items/equipaments.ts";
import { type ExplosionDef } from "../../../definitions/objects/explosions.ts";
import { BulletReflection, DamageReason, GameItemType, type BulletDef } from "../../../definitions/utils.ts";
import { object_instance_type } from "../../../others/constants.ts";
import { type SimulatedObject } from "../../base.ts";
import { type SI_StaticBody } from "../static_body/static_body.ts";
import { c_projectile, type C_Projectile, type ProjectileCreateArgs, type ProjectileOwner, type ProjectileTarget, si_projectile, type SI_Projectile, spawn_projectile } from "./projectile.ts";
import { type SI_Explosion } from "./explosion.ts";

export const bullet_events={
    hit_visual:"bullet_hit_visual",
}

export interface C_Bullet extends C_Projectile{
    speed:number
    max_distance:number
    angle:number

    critical:boolean
    hit_owner:boolean

    initial_position:Vec2
    old_position:Vec2
    tticks:number
    weight:number

    tracer_color:number
    tracer_alpha:number
    tracer_width:number
    tracer_height:number

    pass_through_humans:boolean
    pass_through_everthing:boolean

    velocity:Vec2
    collided_with:Set<number>

    encode_bullet(stream:Stream,full:boolean):void
    decode_bullet(stream:Stream,full:boolean):void
}

export const c_bullet:GELComponent<C_Bullet>={
    id_string:"c_bullet",
    extensions:[c_projectile],
    events:{
        [gel_events.bind](){
            this.instance_type=object_instance_type.bullet
            this.allow_tick=true
            this.allow_checkpoint=false
            this.net_sync_deletion=false
            this.net_sync_can_unsee=false

            this.speed=0
            this.max_distance=1
            this.angle=0
            this.critical=false
            this.hit_owner=false
            this.initial_position=v2.zero()
            this.old_position=v2.zero()
            this.tticks=0
            this.weight=0

            this.tracer_color=0
            this.tracer_alpha=255
            this.tracer_width=1
            this.tracer_height=1

            this.pass_through_humans=false
            this.pass_through_everthing=false

            this.velocity=v2.zero()
            this.collided_with=new Set()

            this.base_collider=new CircleCollider2D(v2(0,0),0.2)
        },
    },
    methods:{
        encode_bullet(stream:Stream,full:boolean){
            stream.write_pos2(this.position)
            .write_float(this.tticks,0,100,2)
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
                .write_id(this.owner_id)
            }
        },
        decode_bullet(stream:Stream,full:boolean){
            this.position=stream.read_pos2()
            this.old_position=v2.clone(this.position)
            this.tticks=stream.read_float(0,100,2)
            if(full){
                this.initial_position=stream.read_pos2()
                this.max_distance=stream.read_float32()
                this.speed=stream.read_float32()
                this.angle=stream.read_rad()
                this.weight=stream.read_uint8()
                this.tracer_width=stream.read_float32()
                this.tracer_height=stream.read_float32()
                this.tracer_color=stream.read_uint32()
                this.tracer_alpha=stream.read_uint8()
                const [hit_owner,critical,pass_through_humans,pass_through_everthing]=stream.read_boolean_group()
                this.hit_owner=hit_owner
                this.critical=critical
                this.pass_through_humans=pass_through_humans
                this.pass_through_everthing=pass_through_everthing
                this.owner_id=stream.read_id()
                this.velocity=v2.from_RadAngle(this.angle,this.speed)
            }
        },
    },
}

export interface BulletCreateArgs extends ProjectileCreateArgs{
    def?:BulletDef
    ammo?:AmmoDef
    critical?:boolean
    angle?:number
}

export type BulletHuman=ProjectileTarget&{
    dead:boolean
    get_reflect_collider?():Collider2D|undefined
    inventory?:{get_items(type:GameItemType):{def:unknown}[]}
}

export type SI_Bullet=C_Bullet&SI_Projectile&{
    reflection:BulletReflection
    reflection_count:number

    damage_amount:number
    penetration:number
    obstacle_mult:number
    critical_mult?:number
    falloff?:number
    effective_range?:number
    on_hit_explosion?:ExplosionDef

    ammo?:AmmoDef

    set_definition(def:BulletDef):void
    set_direction(angle:number):void
    set_satured(satured?:number):void
    on_hit():void
    reflect(normal:Vec2,point:Vec2):SI_Bullet|undefined
    clone(position?:Vec2):SI_Bullet
    collide_human(obj:BulletHuman,distance_t:number):void
    collide_static(obj:SI_StaticBody):void
}

export const si_bullet:GELComponent<SI_Bullet>={
    id_string:"si_bullet",
    extensions:[c_bullet,si_projectile],
    events:{
        [gel_events.bind](){
            this.reflection=BulletReflection.Only_Reflective
            this.reflection_count=0
            this.damage_amount=0
            this.penetration=1
            this.obstacle_mult=1
        },
        [gel_events.create](args?:BulletCreateArgs){
            this.initial_position=v2.clone(this.position)
            this.old_position=v2.clone(this.position)
            if(!args)return
            this.critical=args.critical??false
            this.ammo=args.ammo
            if(args.def)this.set_definition(args.def)
            if(args.angle!==undefined)this.set_direction(args.angle)
        },
        [gel_events.tick](dt:number){
            if(this.finished)return
            if(this.owner&&!this.owner_alive()){
                this.finish()
                return
            }
            this.old_position=v2.clone(this.position)
            this.tticks+=dt
            const distance_t=v2.distance(this.initial_position,this.position)/this.max_distance
            v2m.add_component(this._position,this.velocity.x*dt,this.velocity.y*dt)

            const objs:SimulatedObject[]=this.manager.cells.get_objects(this.collider,this.layer)
            for(const obj of objs){
                if(this.finished||this.destroyed)break
                if(obj.id===this.id)continue
                if(obj.__components.has("c_human")){
                    this.collide_human(obj as BulletHuman,distance_t)
                }else if(obj.__components.has("c_static_body")){
                    this.collide_static(obj as SI_StaticBody)
                }
            }
            if(!this.finished&&v2.distance(this.initial_position,this.position)>this.max_distance){
                this.on_hit()
            }
        },
        [gel_events.net_encode](stream:Stream,full:boolean){
            this.encode_bullet(stream,full)
        },
    },
    methods:{
        set_definition(def:BulletDef){
            this.speed=def.speed
            this.max_distance=def.range/2.5
            this.reflection=def.reflection??BulletReflection.Only_Reflective
            this.weight=def.weight??0

            this.tracer_width=def.tracer.width
            this.tracer_height=def.tracer.height
            this.tracer_alpha=255
            this.tracer_color=def.tracer.color??this.ammo?.defaultTrail??0xffffff
            if(def.tracer.alpha!==undefined)this.tracer_alpha=Math.floor(this.tracer_alpha*def.tracer.alpha)

            this.damage_amount=def.damage
            this.penetration=1
            this.obstacle_mult=def.obstacle_mult??1
            this.critical_mult=def.critical_mult
            this.falloff=def.falloff
            this.effective_range=def.effective_range
            this.on_hit_explosion=def.on_hit_explosion?this.app.definitions.explosions.getFromStringSafe(def.on_hit_explosion):undefined

            this.pass_through_humans=def.pass_through_humans??false
        },
        set_direction(angle:number){
            this.angle=angle
            this.velocity=v2.from_RadAngle(angle,this.speed)
            this.set_dirty_full()
        },
        set_satured(satured?:number){
            if(satured!==undefined&&this.ammo?.strongTrail?.[satured]!==undefined){
                this.tracer_color=this.ammo.strongTrail[satured]
            }else{
                this.tracer_color=this.ammo?.defaultTrail??0xffffff
            }
        },
        on_hit(){
            if(this.on_hit_explosion){
                spawn_projectile<SI_Explosion>(this.scene,object_instance_type.explosion,this.layer,{
                    position:v2.clone(this.position),
                    def:this.on_hit_explosion,
                    owner:this.owner,
                    source:this.source,
                })
            }
            this.finish()
        },
        collide_human(obj:BulletHuman,distance_t:number){
            if(obj.dead||this.collided_with.has(obj.id)||(this.is_owner(obj)&&!this.hit_owner))return
            const col_body=obj.collider.overlap_line(this.old_position,this.position)
            const reflect_collider=obj.get_reflect_collider?.()
            const col_reflect=reflect_collider?reflect_collider.overlap_line(this.old_position,this.position):undefined
            if(!col_body&&!col_reflect)return
            const dist_body=col_body?v2.distance(this.old_position,col_body.point):Infinity
            const dist_reflect=col_reflect?v2.distance(this.old_position,col_reflect.point):Infinity
            const is_reflect=dist_reflect<dist_body
            const chosen=(is_reflect?col_reflect:col_body)!

            this.collided_with.add(obj.id)
            this.emit_event(bullet_events.hit_visual,obj,v2.clone(chosen.point),is_reflect)
            if(is_reflect){
                this.on_hit()
                const b=this.reflect(chosen.dir,chosen.point)
                if(b){
                    b.set_owner(obj as ProjectileOwner)
                    b.hit_owner=false
                }
                return
            }

            let amount=this.damage_amount
            if(this.falloff!==undefined){
                const range=this.effective_range??0
                const t=Numeric.clamp((distance_t-range)/(1-range),0,1)
                amount*=Numeric.lerp(1,this.falloff,t)
            }
            if(this.critical&&this.critical_mult!==undefined)amount*=this.critical_mult
            this.hit(obj,{
                amount,
                owner:this.owner,
                source:this.source,
                reason:DamageReason.Human,
                position:v2.clone(chosen.point),
                critical:this.critical,
                direction:this.angle+3.1415,
                penetration:this.penetration,
            })

            const vest=obj.inventory?.get_items(GameItemType.vest)[0]?.def as VestDef|undefined
            if(vest?.reflect_bullets){
                this.reflect(chosen.dir,chosen.point)
                this.on_hit()
            }else if(!(this.pass_through_humans||this.pass_through_everthing)){
                this.on_hit()
            }
        },
        collide_static(obj:SI_StaticBody){
            if(obj.physical.no_projectiles_collision||this.collided_with.has(obj.id))return
            const col=obj.collider.overlap_line(this.old_position,this.position)
            if(!col)return
            this.collided_with.add(obj.id)
            this.emit_event(bullet_events.hit_visual,obj,v2.clone(col.point),false)
            if(!(obj.physical.passable_by_projectiles||this.pass_through_everthing)){
                if((obj.physical.reflect_projectiles||this.reflection===BulletReflection.All)&&this.reflection!==BulletReflection.None&&!this.on_hit_explosion){
                    this.reflect(col.dir,col.point)
                }
                this.on_hit()
            }
            this.hit(obj as ProjectileTarget,{
                amount:this.damage_amount*this.obstacle_mult,
                resistence:0,
                owner:this.owner,
                source:this.source,
                reason:DamageReason.Human,
                position:v2.clone(this.position),
                critical:this.critical,
                direction:Math.atan2(col.dir.y,col.dir.x),
                penetration:this.penetration,
            })
        },
        reflect(normal:Vec2,point:Vec2):SI_Bullet|undefined{
            if(this.reflection_count>=3)return
            const n=v2.normalizeSafe(normal)
            const d=v2.from_RadAngle(this.angle)
            const dot=v2.dot(d,n)
            const dir=v2.sub(d,v2.scale(n,2*dot))
            const pos=v2.add(point,v2.scale(n,0.05))

            const b=this.clone(pos)
            b.hit_owner=true
            b.tracer_alpha=Math.floor(b.tracer_alpha/2)
            b.damage_amount/=2
            b.reflection_count=this.reflection_count+1
            b.set_direction(Math.atan2(dir.y,dir.x))
            return b
        },
        clone(position?:Vec2):SI_Bullet{
            const b=spawn_projectile<SI_Bullet>(this.scene,object_instance_type.bullet,this.layer,{
                position:v2.clone(position??this.position),
                owner:this.owner,
                source:this.source,
                ammo:this.ammo,
                critical:this.critical,
            })
            b.speed=this.speed
            b.max_distance=this.max_distance
            b.reflection=this.reflection
            b.weight=this.weight

            b.tracer_width=this.tracer_width
            b.tracer_height=this.tracer_height
            b.tracer_alpha=this.tracer_alpha
            b.tracer_color=this.tracer_color

            b.damage_amount=this.damage_amount
            b.penetration=this.penetration
            b.obstacle_mult=this.obstacle_mult
            b.critical_mult=this.critical_mult
            b.falloff=this.falloff
            b.effective_range=this.effective_range
            b.on_hit_explosion=this.on_hit_explosion

            b.pass_through_humans=this.pass_through_humans
            b.pass_through_everthing=this.pass_through_everthing

            b.reflection_count=this.reflection_count
            b.hit_owner=this.hit_owner
            return b
        },
    },
}
