import { CheckpointContext, CircleCollider2D, gel_events, GELComponent, Numeric, Stream, v2, v2m, Vec2 } from "../../../../engine/core.ts";
import { type GrenadeDef } from "../../../definitions/items/grenades.ts";
import { type ObstacleDef } from "../../../definitions/objects/obstacles.ts";
import { object_instance_type, ObjectType } from "../../../others/constants.ts";
import { Floors, FloorType } from "../../../others/terrain.ts";
import { type SimulatedObject } from "../../base.ts";
import { type SI_StaticBody } from "../static_body/static_body.ts";
import { type SI_Explosion } from "./explosion.ts";
import { c_projectile, type C_Projectile, type ProjectileCreateArgs, si_projectile, type SI_Projectile, spawn_projectile } from "./projectile.ts";

export interface C_Grenade extends C_Projectile{
    def:GrenadeDef
    zpos:number
    rotation:number
    physical:{
        velocity:Vec2
        angular_velocity:number
    }
    set_definition(def:GrenadeDef):void
}

export const c_grenade:GELComponent<C_Grenade>={
    id_string:"c_grenade",
    extensions:[c_projectile],
    events:{
        [gel_events.bind](){
            this.object_type=ObjectType.Grenade
            this.instance_type=object_instance_type.grenade
            this.allow_tick=true
            this.zpos=0
            this.rotation=0
            this.physical={
                velocity:v2.zero(),
                angular_velocity:0,
            }
        },
    },
    methods:{
        set_definition(def:GrenadeDef){
            this.def=def
            this.base_collider=new CircleCollider2D(v2(0,0),def.radius)
        },
    },
}

export interface GrenadeCreateArgs extends ProjectileCreateArgs{
    def?:GrenadeDef
    fuse?:number
}

export type SI_Grenade=C_Grenade&SI_Projectile&{
    zpos_speed:number
    fuse_delay:number
    current_floor:FloorType
    old_position?:Vec2
    physical:{
        dirty:boolean
    }
    push(speed:number,direction:number,angular_velocity?:number):void
    kill():void
    on_collided(obj:SimulatedObject):void
    reflect_velocity(obj:SimulatedObject):boolean
}

export const si_grenade:GELComponent<SI_Grenade>={
    id_string:"si_grenade",
    extensions:[c_grenade,si_projectile],
    events:{
        [gel_events.bind](){
            this.zpos_speed=0
            this.fuse_delay=0
            this.current_floor=FloorType.Void
            this.physical.dirty=true
        },
        [gel_events.create](args?:GrenadeCreateArgs){
            if(!args)return
            if(args.def){
                this.set_definition(args.def)
                if(!this.source)this.source=args.def
                this.fuse_delay=args.fuse??args.def.fuse?.time??0
            }
        },
        [gel_events.tick](dt:number){
            if(this.finished||!this.def)return
            const vel=this.physical.velocity
            if(vel.x!==0||vel.y!==0){
                const pos=v2.add(this.position,v2.scale(vel,dt))
                this.position=this.scene.map.clamp_collider(pos,this.collider)
                const objs:SimulatedObject[]=this.manager.cells.get_objects(this.collider,this.layer)
                for(const obj of objs){
                    if(obj.id===this.id)continue
                    this.on_collided(obj)
                    if(this.finished)return
                }
                if(v2.len(vel)<=0.000001)v2m.zero(vel)
            }
            this.rotation+=this.physical.angular_velocity*dt

            if(this.zpos>0){
                this.zpos_speed=Numeric.clamp(this.zpos_speed-this.def.gravity*dt,-3,3)
                this.zpos=Numeric.clamp(this.zpos+this.zpos_speed*dt,0,1)
            }else{
                const fd=Floors[this.current_floor]
                const drag=fd.acceleration*fd.drag
                v2m.scale(vel,vel,1/(1+dt*(this.def.decays.ground_speed/drag)))
                this.physical.angular_velocity*=1/(1+dt*(this.def.decays.ground_rotation/drag))
                if(this.def.fuse?.ground){
                    this.kill()
                    return
                }
            }
            if(this.def.fuse?.time){
                this.fuse_delay-=dt
                if(this.fuse_delay<=0){
                    this.kill()
                    return
                }
            }
            if(!this.old_position||!v2.is(this.position,this.old_position)){
                this.old_position=v2.clone(this.position)
                this.current_floor=this.scene.map.terrain.get_floor_type(this.position,this.layer,this.scene.map.default_floor)
            }
            this.set_dirty_part()
        },
        [gel_events.net_encode](stream:Stream,full:boolean){
            stream.write_pos2(this.position)
            .write_rad(this.rotation)
            .write_float(this.zpos,0,1,1)
            if(full){
                stream.write_uint16(this.def.id_number!)
                .write_id(this.owner_id)
            }
        },
        [gel_events.checkpoint_encode](stream:Stream,ctx:CheckpointContext){
            stream.write_uint16(this.def.id_number!)
            .write_pos2(this.position)
            .write_pos2(this.physical.velocity)
            .write_float32(this.rotation)
            .write_float32(this.physical.angular_velocity)
            .write_float32(this.zpos)
            .write_float32(this.zpos_speed)
            .write_float32(this.fuse_delay)
            this.encode_owner(stream,ctx)
        },
        [gel_events.checkpoint_decode](stream:Stream,ctx:CheckpointContext){
            this.set_definition(this.app.definitions.grenades.getFromNumber(stream.read_uint16()))
            this.source=this.def
            this.position=stream.read_pos2()
            this.physical.velocity=stream.read_pos2()
            this.rotation=stream.read_float32()
            this.physical.angular_velocity=stream.read_float32()
            this.zpos=stream.read_float32()
            this.zpos_speed=stream.read_float32()
            this.fuse_delay=stream.read_float32()
            this.decode_owner(stream,ctx)
            this.set_dirty_full()
        },
    },
    methods:{
        push(speed:number,direction:number,angular_velocity:number=10){
            v2m.add(this.physical.velocity,this.physical.velocity,v2.from_RadAngle(direction,speed))
            this.physical.angular_velocity=Numeric.clamp(this.physical.angular_velocity+angular_velocity,-40,40)
        },
        kill(){
            if(this.finished)return
            if(this.def.explosion){
                spawn_projectile<SI_Explosion>(this.scene,object_instance_type.explosion,this.layer,{
                    position:v2.clone(this.position),
                    def:this.app.definitions.explosions.getFromString(this.def.explosion),
                    owner:this.owner,
                    source:this.source,
                    parent_velocity:this.physical.velocity,
                })
            }
            this.finish()
        },
        reflect_velocity(obj:SimulatedObject):boolean{
            const collisions=this.collider.overlap_collisions(obj.collider)
            if(!this.def.no_collision){
                for(const col of collisions){
                    const vel=this.physical.velocity
                    const dot=v2.dot(vel,col.dir)
                    this.physical.velocity=v2.scale(v2.sub(vel,v2.scale(col.dir,2*dot)),0.4)
                }
            }
            return collisions.length>0
        },
        on_collided(obj:SimulatedObject){
            if(obj.__components.has("c_static_body")){
                const sb=obj as SI_StaticBody
                if(sb.physical.no_collision)return
                const height=(obj as unknown as {def?:ObstacleDef}).def?.height
                if(obj.__components.has("c_obstacle")&&(height===2||(height===1&&this.zpos>=0.5)))return
                if(this.reflect_velocity(obj)&&this.def.fuse?.impact)this.kill()
            }else if(obj.__components.has("c_human")){
                if((obj as {dead?:boolean}).dead||this.is_owner(obj))return
                if(this.reflect_velocity(obj)&&this.def.fuse?.impact)this.kill()
            }
        },
    },
}
