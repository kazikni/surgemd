import { DefaultObjec2DEvents, Numeric, ObjectComponent2D, v2, v2m, Vec2, type Stream } from "common/engine/core.ts";
import { GameObject } from "../others/gameObject.ts";
import { MovingBodyBase } from "common/scripts/objects/moving_body.ts"
export const MovingBodyNetwork:ObjectComponent2D<MovingBody>={
    number_name:1,
    string_name:"moving_body_network",
    events:{
        [DefaultObjec2DEvents.bind]:[
            (obj)=>{
                obj.allow_tick=true
            }
        ],
        [DefaultObjec2DEvents.create]:[
            (obj,args)=>{
                obj.dest_pos=v2.zero()
                obj.dest_rot=0
                obj.distance_walked=0
                obj.enable_auto_rot=true
            }
        ],
        [DefaultObjec2DEvents.tick]:[
            (obj,_dt:number)=>{
                obj.distance_walked=0
                if(!obj.old_pos){
                    obj.old_pos=v2.clone(obj.position)
                }else if(!v2.is(obj.old_pos,obj._position)){
                    obj.distance_walked=v2.distance(obj.old_pos, obj.position)
                    obj.old_pos=v2.clone(obj.position)
                }
                v2m.lerp(obj.position,obj.dest_pos,obj.game.global_interpolation)
                if(obj.enable_auto_rot)obj.rotation=Numeric.lerp_rad(obj.rotation,obj.dest_rot!,obj.game.global_interpolation)
            }
        ],
        [DefaultObjec2DEvents.net_encode]:[
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