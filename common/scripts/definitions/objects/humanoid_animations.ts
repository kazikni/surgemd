import { AKeyFrame, Definition, Definitions, ease, v2 } from "../../../engine/core.ts";
import { GameItemType } from "../utils.ts";

export interface HumanoidMomentaryVariation{
    item_type?:GameItemType
    item?:string
    duration?:number
    keyframes:AKeyFrame[]
}

export interface HumanoidMomentaryDef extends Definition{
    duration?:number
    priority?:number
    loop?:boolean
    lock_movement?:boolean
    lock_rotation?:boolean
    lock_hand?:boolean
    hide_hand?:boolean
    keyframes?:AKeyFrame[]
}

export interface MomentaryPlayOptions{
    item?:{id_string:string,item_type?:GameItemType}
    duration?:number
    force?:boolean
    on_end?:(completed:boolean)=>void
}

export const HumanoidAnimations=new Definitions<HumanoidMomentaryDef,{}>()
HumanoidAnimations.insert(
    {
        id_string:"sit",
        priority:1,
        loop:true,
        lock_movement:true,
        lock_rotation:true,
        lock_hand:true,
        hide_hand:true,
        keyframes:[
            {
                time:0.3,
                actions:[
                    {type:"tween",fuser:"left_arm",to:{position:v2(0.15,-0.4),rotation:-0.4},ease:ease.quadraticInOut},
                    {type:"tween",fuser:"right_arm",to:{position:v2(0.15,0.4),rotation:0.4},ease:ease.quadraticInOut},
                    {type:"transform",fuser:"chest",visible:true,position:v2(0.2,0),rotation:-Math.PI},
                    {type:"transform",fuser:"left_leg",visible:true,position:v2(0.55,-0.18),rotation:Math.PI+0.1},
                    {type:"transform",fuser:"left_leg_foot",visible:true,position:v2(0,0)},
                    {type:"transform",fuser:"right_leg",visible:true,position:v2(0.55,0.18),rotation:Math.PI-0.1},
                    {type:"transform",fuser:"right_leg_foot",visible:true,position:v2(0,0)},
                ],
            }
        ],
    }
)