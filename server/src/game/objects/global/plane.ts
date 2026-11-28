import { object_instance_type } from "common/scripts/others/constants.ts";
import { CheckpointContext, circle, random, Stream, v2, Vec2 } from "common/engine/core.ts";
import { GrenadeDef } from "common/scripts/definitions/items/grenades.ts";
import { ObstacleDef } from "common/scripts/definitions/objects/obstacles.ts";
import { AirBody } from "./airbody.ts";
import { SimObject } from "../../main/base.ts";
import { si_global_object } from "./base.ts";
import { type Grenade } from "../projectile/grenade.ts";
export class Plane extends AirBody {
    override instance_type = object_instance_type.plane

    type = 0
    target_pos: Vec2 = v2.zero()
    called = false
    owner?: SimObject

    count:number=1
    radius:number=0
    grenade_def?: GrenadeDef
    obstacle?: ObstacleDef

    constructor(){
        super()
        this.add_component(si_global_object)
    }

    override set_configuration(speed:number,position:Vec2|undefined,target_pos:Vec2,type:number,count:number,radius:number,owner?:SimObject,grenade?:GrenadeDef,obstacle?:ObstacleDef){
        super.set_configuration(speed,position)
        this.target_pos = target_pos
        this.type = type
        this.owner = owner
        this.grenade_def = grenade
        this.obstacle = obstacle
        this.count=count
        this.radius=radius
    }

    on_create(args: {position?:Vec2,target_pos:Vec2,speed:number,type:number,count:number,radius:number,owner?:SimObject,grenade?:GrenadeDef,obstacle?:ObstacleDef}): void {
        if(args)this.set_configuration(args.speed,args.position,args.target_pos,args.type,args.count,args.radius,args.owner,args.grenade,args.obstacle)
    }
    override on_tick(dt: number): void {
        super.on_tick(dt)
        this.set_dirty_part()
        if(!this.called&&v2.distance(this.position, this.target_pos) <= 4) {
            switch (this.type) {
                case 0:
                    this.scene.add_object(this.scene.make_object(object_instance_type.parachute),this.layer,undefined,{position:this.target_pos,obstacle:this.obstacle!})
                    break
                case 1: {
                    for(let c=0;c<this.count;c++){
                        const g=this.scene.add_object(this.scene.make_object(object_instance_type.grenade),this.layer,undefined,{
                            position:this.radius===0?this.target_pos:circle.random_point_inside(this.target_pos,this.radius),
                            def:this.grenade_def!,
                            owner:this.owner,
                        }) as Grenade
                        g.zpos=1
                        g.zpos_speed=0
                        g.angular_velocity=random.neg_value(1.5)
                    }
                    break
                }
            }
            this.called = true
        }else if(!this.called){
            this.rotation=v2.lookTo(this.position, this.target_pos)
            this.velocity=v2.from_RadAngle(this.rotation,this.speed)
        }else{
            this.check_destroy()
        }
    }
    override on_encode_net(stream: Stream,full: boolean): void {
        super.on_encode_net(stream,full)
        if(full)stream.write_uint8(this.type)
    }
    override on_encode_checkpoint(stream: Stream,ctx:CheckpointContext): void {
        stream.write_pos2(this.position)
        .write_rad(this.rotation)
        .write_pos2(this.target_pos)
        .write_uint8(this.type)
        .write_float32(this.speed)
        .write_uint16(this.count)
        .write_float32(this.radius)
        .write_boolean_group(this.called,this.owner !== undefined,this.grenade_def !== undefined,this.obstacle !== undefined)
        if(this.owner){
            stream.write_id(ctx.idco[this.owner.id]??0)
        }
        if(this.grenade_def){
            stream.write_uint16(this.grenade_def.id_number!)
        }
        if(this.obstacle){
            stream.write_uint16(this.obstacle.id_number!)
        }
    }
    override on_decode_checkpoint(stream: Stream,ctx:CheckpointContext): void {
        this.position=stream.read_pos2()
        this.rotation=stream.read_rad()
        this.target_pos = stream.read_pos2()
        this.type = stream.read_uint8()
        this.speed = stream.read_float32()
        this.count = stream.read_uint16()
        this.radius = stream.read_float32()

        const [
            called,
            hasOwner,
            hasGrenade,
            hasObstacle
        ] = stream.read_boolean_group()

        this.called = called
        if(hasOwner){
            this.owner = this.manager.objects[ctx.coid[stream.read_id()]] as SimObject|undefined
        }

        if(hasGrenade){
            this.grenade_def = this.app.definitions.grenades.valueNumber[stream.read_uint16()]
        }
        if(hasObstacle){
            this.obstacle = this.app.definitions.obstacles.valueNumber[stream.read_uint16()]
        }
    }
}