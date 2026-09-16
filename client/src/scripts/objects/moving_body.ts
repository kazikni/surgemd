import { DefaultObjectEvents, Numeric, ObjectComponent, v2, v2m, Vec2, type Stream } from "common/engine/core.ts";
import { GameObject } from "../others/gameObject.ts";
import { MovingBodyBase } from "common/scripts/objects/moving_body.ts"
export const MovingBodyNetwork:ObjectComponent<MovingBody>={
    number_name:1,
    string_name:"moving_body_network",
    events:{
        [DefaultObjectEvents.bind]:[
            (obj)=>{
                obj.allow_tick=true
            }
        ],
        [DefaultObjectEvents.create]:[
            (obj,args)=>{
                obj.dest_pos=v2.zero()
                obj.dest_rot=0
                obj.distance_walked=0
                obj.enable_auto_rot=true
                obj._velocity=v2.zero()
            }
        ],
        [DefaultObjectEvents.tick]:[
            (obj,dt:number)=>{
                obj.distance_walked=0
                if(!obj.old_pos){
                    obj.old_pos=v2.clone(obj.position)
                }else if(!v2.is(obj.old_pos,obj._position)){
                    v2m.sub(obj._velocity,obj.position,obj.old_pos)
                    v2m.scale(obj._velocity,obj._velocity,obj.game.ntps)
                    obj.distance_walked=v2.distance(obj.old_pos, obj.position)
                    obj.old_pos=v2.clone(obj.position)
                }else{
                    obj._velocity.x=0
                    obj._velocity.y=0
                }
                v2m.lerp(obj.position,obj.dest_pos,obj.game.global_interpolation)
                if(obj.enable_auto_rot)obj.rotation=Numeric.lerp_rad(obj.rotation,obj.dest_rot!,obj.game.global_interpolation)
            }
        ],
        [DefaultObjectEvents.net_encode]:[
            (obj,stream:Stream,full:boolean)=>{
            }
        ]
    }
}
export abstract class MovingBody extends GameObject implements MovingBodyBase{
    rotation!:number

    old_pos?:Vec2
    dest_pos!:Vec2
    dest_rot!:number
    distance_walked!:number
    _velocity!:Vec2

    enable_auto_rot!:boolean
    constructor(){
        super()
        this.add_component(MovingBodyNetwork)
    }
    decode_physical_data(stream:Stream,full:boolean):void{
        const obj=this
        obj.dest_pos=stream.read_pos2()
        obj.dest_rot=stream.read_rad()
        if(full){
            obj.position=obj.dest_pos
            obj.rotation=obj.dest_rot
        }
    }
}