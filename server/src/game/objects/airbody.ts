import { GameObjectType } from "common/scripts/others/constants.ts";
import { MovingBodyPhysicalData } from "./moving_body.ts";
import { NullHitbox2D, random, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { ServerGameObject } from "../others/gameObject.ts";

export interface AirbodyPhysicalData extends MovingBodyPhysicalData {}

export abstract class AirBody extends ServerGameObject {
    override string_type = "plane"
    override number_type = GameObjectType.Plane

    physical_data: AirbodyPhysicalData = {
        velocity: v2.zero(),
        rotation: 0
    }
    speed = 10

    constructor(){
        super()
        this.allow_tick=true
        this.base_hitbox=new NullHitbox2D(v2.zero())
    }

    check_destroy(){
        if(this.position.x<=this.game.map.air_bounds.min.x||this.position.y<=this.game.map.air_bounds.min.y||this.position.x>=this.game.map.air_bounds.max.x||this.position.y>=this.game.map.air_bounds.max.y)this.destroy()
    }
    set_configuration(speed:number,position?:Vec2,...args:any){
        this.speed = speed
        if(!position){
            const dir=random.int(0,3)
            switch(dir){
                case 0:position=v2(random.float(this.game.map.air_bounds.min.x,this.game.map.air_bounds.max.x),this.game.map.air_bounds.min.y);break
                case 1:position=v2(random.float(this.game.map.air_bounds.min.x,this.game.map.air_bounds.max.x),this.game.map.air_bounds.max.y);break
                case 2:position=v2(this.game.map.air_bounds.min.x,random.float(this.game.map.air_bounds.min.y,this.game.map.air_bounds.max.y));break
                default:position=v2(this.game.map.air_bounds.max.x,random.float(this.game.map.air_bounds.min.y,this.game.map.air_bounds.max.y));break
            }
        }
        this.position=position
    }
    
    override on_create(_args: any): void {
        super.on_create(_args)
        this.game.scene_2d.always_visible[this.id]=this
    }
    override on_destroy(): void {
        delete this.game.scene_2d.always_visible[this.id]
    }
    override on_tick(dt: number): void {
        v2m.add(this.position,this.position,v2.scale(this.physical_data.velocity, dt))
        if(v2.len(this.physical_data.velocity)<=0.000001)v2m.zero(this.physical_data.velocity)
        this.set_dirty_part()
    }
    override on_encode_net(stream: Stream,full: boolean): void {
        stream.write_pos2(this.position)
        .write_rad(this.physical_data.rotation)
    }
    override on_encode_checkpoint(stream: Stream): void {
        stream.write_pos2(this.position)
        .write_rad(this.physical_data.rotation)
        .write_float32(this.speed)
    }
    override on_decode_checkpoint(stream: Stream): void {
        this.position=stream.read_pos2()
        this.physical_data.rotation=stream.read_rad()
        this.speed = stream.read_float32()
    }
}