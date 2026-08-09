import { GameObjectType } from "common/scripts/others/constants.ts";
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts";
import { CircleHitbox2D, Stream, v2, Vec2 } from "common/engine/core.ts";
import { type ServerGameObject } from "../others/gameObject.ts";

export interface AirbodyPhysicalData extends MovingBodyPhysicalData {}

export abstract class AirBody extends MovingBody {
    override string_type = "plane"
    override number_type = GameObjectType.Plane

    override physical_data: AirbodyPhysicalData = {
        velocity: v2.zero(),
        rotation: 0
    }
    speed = 10

    constructor(){
        super()
        this.allow_tick=true
        this.clamp_hitbox=false
    }

    check_destroy(){
        if(this.position.x<=this.game.map.air_bounds.min.x||this.position.y<=this.game.map.air_bounds.min.y||this.position.x>=this.game.map.air_bounds.max.x||this.position.y>=this.game.map.air_bounds.max.y)this.destroy()
    }
    override on_collided(_obj:ServerGameObject,_dt:number){}

    set_configuration(position:Vec2,speed:number,...args:any){
        this.position = position
        this.speed = speed
        this.base_hitbox=new CircleHitbox2D(v2.zero,100)
    }

    override on_tick(dt: number): void {
        super.on_tick(dt)
        this.set_dirty_part()

    }
    override on_encode_net(stream: Stream,full: boolean): void {
        this.physical_encode(stream)
    }
    override on_encode_checkpoint(stream: Stream): void {
        stream.write_pos2(this.position)
        .write_rad(this.physical_data.rotation)
        .write_float32(this.speed)
    }
    override on_decode_checkpoint(stream: Stream): void {
        this.base_hitbox = new CircleHitbox2D(v2.zero(),100)

        this.position=stream.read_pos2()
        this.physical_data.rotation=stream.read_rad()
        this.speed = stream.read_float32()
    }
}