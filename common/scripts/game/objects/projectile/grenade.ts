import { CheckpointContext, CircleCollider2D, Numeric, Stream, v2, v2m } from "../../../../engine/core.ts";
import { type GrenadeDef } from "../../../definitions/items/grenades.ts";
import { type ObstacleDef } from "../../../definitions/objects/obstacles.ts";
import { object_instance_type, ObjectType } from "../../../others/constants.ts";
import { Floors, FloorType } from "../../../others/terrain.ts";
import { type SimObject } from "../../base.ts";
import { type Human } from "../human/human.ts";
import { type SI_StaticBody } from "../static_body/static_body.ts";
import { type Explosion } from "./explosion.ts";
import { Projectile, type ProjectileCreateArgs, spawn_projectile } from "./projectile.ts";

export interface GrenadeCreateArgs extends ProjectileCreateArgs{
    def:GrenadeDef
    fuse?:number
}

export class Grenade extends Projectile{
    def!:GrenadeDef
    zpos:number=0
    zpos_speed:number=0
    angular_velocity:number=0
    fuse_delay:number=0
    current_floor:FloorType=FloorType.Void
    old_pos?:{x:number,y:number}

    constructor(){
        super()
        this.object_type=ObjectType.Grenade
        this.instance_type=object_instance_type.grenade
        this.allow_tick=true
    }

    override on_create(args?:GrenadeCreateArgs){
        super.on_create(args)
        if(!args)return
        this.def=args.def
        this.source??=args.def
        this.fuse_delay=args.fuse??args.def.fuse?.time??0
        this.base_collider=new CircleCollider2D(v2(0,0),args.def.radius)
    }

    override push(speed:number,direction:number,angular_velocity:number=10){
        super.push(speed,direction)
        this.angular_velocity=Numeric.clamp(this.angular_velocity+angular_velocity,-40,40)
    }
    kill(){
        if(this.destroyed)return
        if(this.def.explosion){
            spawn_projectile<Explosion>(this.scene,object_instance_type.explosion,this.layer,{
                position:v2.clone(this.position),
                def:this.app.definitions.explosions.getFromString(this.def.explosion),
                owner:this.owner,
                source:this.source,
                parent_velocity:this.velocity,
            })
        }
        this.destroy()
    }

    override on_collided(obj:SimObject){
        if(obj.object_type===ObjectType.StaticBody){
            if((obj as SI_StaticBody).physical.no_collision)return
            const height=(obj as unknown as {def?:ObstacleDef}).def?.height
            if(height===2||(height===1&&this.zpos>=0.5))return
        }else if(obj.object_type===ObjectType.Human){
            if((obj as unknown as {dead:boolean}).dead||obj===this.owner)return
        }else{
            return
        }
        const collisions=this.collider.overlap_collisions(obj.collider)
        if(!this.def.no_collision){
            for(const col of collisions){
                const dot=v2.dot(this.velocity,col.dir)
                this.velocity=v2.scale(v2.sub(this.velocity,v2.scale(col.dir,2*dot)),0.4)
            }
        }
        if(collisions.length>0&&this.def.fuse?.impact)this.kill()
    }

    on_tick(dt:number){
        if(this.velocity.x!==0||this.velocity.y!==0){
            this.move(dt)
            if(this.destroyed)return
            if(v2.len(this.velocity)<=0.000001)v2m.zero(this.velocity)
        }
        this.rotation+=this.angular_velocity*dt

        if(this.zpos>0){
            this.zpos_speed=Numeric.clamp(this.zpos_speed-this.def.gravity*dt,-3,3)
            this.zpos=Numeric.clamp(this.zpos+this.zpos_speed*dt,0,1)
        }else{
            const floor=Floors[this.current_floor]
            const drag=floor.acceleration*floor.drag
            v2m.scale(this.velocity,this.velocity,1/(1+dt*(this.def.decays.ground_speed/drag)))
            this.angular_velocity*=1/(1+dt*(this.def.decays.ground_rotation/drag))
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
        if(!this.old_pos||!v2.is(this.position,this.old_pos)){
            this.old_pos=v2.clone(this.position)
            this.current_floor=this.scene.map.terrain.get_floor_type(this.position,this.layer,this.scene.map.default_floor)
        }
        this.set_dirty_part()
    }

    on_encode_net(stream:Stream,full:boolean){
        stream.write_pos2(this.position).write_rad(this.rotation).write_float(this.zpos,0,1,1)
        if(full)stream.write_uint16(this.def.id_number!).write_id(this.owner?.id??0)
    }
    on_encode_checkpoint(stream:Stream,ctx:CheckpointContext){
        stream.write_uint16(this.def.id_number!)
        .write_pos2(this.position)
        .write_pos2(this.velocity)
        .write_float32(this.rotation)
        .write_float32(this.angular_velocity)
        .write_float32(this.zpos)
        .write_float32(this.zpos_speed)
        .write_float32(this.fuse_delay)
        .write_boolean_group(this.owner!==undefined&&ctx.idco[this.owner.id]!==undefined)
        if(this.owner&&ctx.idco[this.owner.id]!==undefined)stream.write_id(ctx.idco[this.owner.id])
    }
    on_decode_checkpoint(stream:Stream,ctx:CheckpointContext){
        this.def=this.app.definitions.grenades.getFromNumber(stream.read_uint16())
        this.source=this.def
        this.base_collider=new CircleCollider2D(v2(0,0),this.def.radius)
        this.position=stream.read_pos2()
        this.velocity=stream.read_pos2()
        this.rotation=stream.read_float32()
        this.angular_velocity=stream.read_float32()
        this.zpos=stream.read_float32()
        this.zpos_speed=stream.read_float32()
        this.fuse_delay=stream.read_float32()
        const [has_owner]=stream.read_boolean_group()
        if(has_owner)this.owner=this.manager.objects[ctx.coid[stream.read_id()]] as Human
        this.set_dirty_full()
    }
}
