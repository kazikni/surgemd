import { Hitbox2D, NetStream, NullHitbox2D, Orientation, v2, Vec2 } from "common/engine/core.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { type Human } from "./human.ts";
import { type DamageParams } from "../others/utils.ts";

export class StaticBody extends ServerGameObject{
    string_type:string="static_body"
    number_type:number=GameObjectType.StaticBody

    alt_hitboxes:{hitbox:Hitbox2D,layer?:number}[]=[]
    spawn_hitbox!:Hitbox2D
    physical_data:{
        dirty:boolean
        dirty_part:boolean

        rotation:number
        side:Orientation
        scale:number

        reflect_bullet:boolean
        no_collision:boolean
        no_bullet_collision:boolean

        spawn_hitbox:Hitbox2D
        hitbox:Hitbox2D
    }

    constructor(){
        super()

        this.physical_data={
            dirty:true,
            dirty_part:true,

            scale:1,
            rotation:0,
            side:0,

            reflect_bullet:false,
            no_collision:false,
            no_bullet_collision:false,

            spawn_hitbox:new NullHitbox2D(v2.zero),
            hitbox:new NullHitbox2D(v2.zero),
        }
    }

    override net_update(): void {
        this.physical_data.dirty=false
        this.physical_data.dirty_part=false
    }
    update(_dt:number): void {
    }
    interact(user: Human): void {
    }
    create(args: Record<string,any>): void {
        
    }
    set_position(position: Vec2, side: number) {
        this.position = position
        this.physical_data.side = side as Orientation

        this.spawn_hitbox=this.physical_data.spawn_hitbox.transform(this.position)
        this.base_hitbox=this.physical_data.hitbox.clone()

        this.manager.cells.updateObject(this)
    }
    damage(damage:DamageParams){

    }
    override encode(stream: NetStream, full: boolean): void {
        if(full||this.physical_data.dirty||this.physical_data.dirty_part){
            stream.writeFloat(this.physical_data.scale,0,10,2)
            if(this.physical_data.dirty||full){
                stream.writePos2(this.position)
                .writeRad(this.physical_data.rotation)
                .writeUint8(this.physical_data.side)
            }
        }
    }
}