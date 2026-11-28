import { CheckpointContext, random, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { SimObject } from "../../main/base.ts";
import { object_instance_type, ObjectType } from "common/scripts/others/constants.ts";

export abstract class AirBody extends SimObject {
    override instance_type = object_instance_type.plane
    override object_type = ObjectType.AirBody

    velocity:Vec2=v2.zero()
    rotation:number=0
    speed = 10

    constructor(){
        super()
        this.allow_tick=true
    }

    check_destroy(){
        if(this.position.x<=this.scene.map.air_bounds.min.x||this.position.y<=this.scene.map.air_bounds.min.y||this.position.x>=this.scene.map.air_bounds.max.x||this.position.y>=this.scene.map.air_bounds.max.y)this.destroy()
    }
    set_configuration(speed:number,position?:Vec2,..._args:any){
        this.speed = speed
        if(!position){
            const dir=random.int(0,3)
            switch(dir){
                case 0:position=v2(random.float(this.scene.map.air_bounds.min.x,this.scene.map.air_bounds.max.x),this.scene.map.air_bounds.min.y);break
                case 1:position=v2(random.float(this.scene.map.air_bounds.min.x,this.scene.map.air_bounds.max.x),this.scene.map.air_bounds.max.y);break
                case 2:position=v2(this.scene.map.air_bounds.min.x,random.float(this.scene.map.air_bounds.min.y,this.scene.map.air_bounds.max.y));break
                default:position=v2(this.scene.map.air_bounds.max.x,random.float(this.scene.map.air_bounds.min.y,this.scene.map.air_bounds.max.y));break
            }
        }
        this.position=position
    }

    on_tick(dt: number): void {
        v2m.add(this.position,this.position,v2.scale(this.velocity, dt))
        if(v2.len(this.velocity)<=0.000001)v2m.zero(this.velocity)
        this.set_dirty_part()
    }
    on_encode_net(stream: Stream,full: boolean): void {
        stream.write_pos2(this.position)
        .write_rad(this.rotation)
    }
    on_encode_checkpoint(stream: Stream,_ctx?:CheckpointContext): void {
        stream.write_pos2(this.position)
        .write_rad(this.rotation)
        .write_float32(this.speed)
    }
    on_decode_checkpoint(stream: Stream,_ctx?:CheckpointContext): void {
        this.position=stream.read_pos2()
        this.rotation=stream.read_rad()
        this.speed = stream.read_float32()
    }
}