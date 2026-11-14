import { AKeyFrame, Definition, Definitions, ease, v2 } from "../../../engine/core.ts";
import { DefaultFistRig } from "../../others/item.ts";
import { type WeaponDef } from "../game_defs.ts";
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
    variations?:HumanoidMomentaryVariation[]
}

export interface HumanoidMomentaryState{
    def:HumanoidMomentaryDef
    variation:number
    time:number
    duration?:number
}

export interface MomentaryPlayOptions{
    item?:{id_string:string,item_type?:GameItemType}
    duration?:number
    force?:boolean
    on_end?:(completed:boolean)=>void
}

export const HumanoidAnimations=new Definitions<HumanoidMomentaryDef,{}>()

const left=DefaultFistRig.left!
const right=DefaultFistRig.right!

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
    },
    {
        id_string:"suicide",
        priority:3,
        duration:2,
        lock_movement:true,
        lock_rotation:true,
        lock_hand:true,
        keyframes:[
            {
                time:0.6,
                actions:[
                    {type:"tween",fuser:"left_arm",to:{position:v2(0.45,-0.1),rotation:-0.8},ease:ease.quadraticInOut},
                    {type:"tween",fuser:"right_arm",to:{position:v2(0.45,0.1),rotation:0.8},ease:ease.quadraticInOut},
                    {type:"callmode",mode:"eyes",args:[1,false]},
                ],
            },
            {
                time:1,
                actions:[],
            },
            {
                time:0.4,
                actions:[
                    {type:"tween",fuser:"left_arm",to:{position:v2(0.2,-0.2),rotation:-1.4},ease:ease.backIn},
                    {type:"tween",fuser:"right_arm",to:{position:v2(0.2,0.2),rotation:1.4},ease:ease.backIn},
                ],
            },
        ],
        variations:[
            {
                item_type:GameItemType.gun,
                duration:2.2,
                keyframes:[
                    {
                        time:0.5,
                        actions:[
                            {type:"tween",fuser:"right_arm",to:{position:v2(0.05,0.42),rotation:-2.4},ease:ease.quadraticInOut},
                            {type:"tween",fuser:"weapon",to:{position:v2(0.05,0.42),rotation:-2.4},ease:ease.quadraticInOut},
                            {type:"tween",fuser:"left_arm",to:{position:v2(0.3,-0.3),rotation:-0.4},ease:ease.quadraticInOut},
                        ],
                    },
                    {
                        time:1.4,
                        actions:[
                            {type:"callmode",mode:"eyes",args:[1,false]},
                        ],
                    },
                    {
                        time:0.3,
                        actions:[
                            {type:"callmode",mode:"fire"},
                            {type:"tween",fuser:"right_arm",to:{position:v2(-0.05,0.5),rotation:-2.7},ease:ease.backOut},
                            {type:"tween",fuser:"weapon",to:{position:v2(-0.05,0.5),rotation:-2.7},ease:ease.backOut},
                        ],
                    },
                ],
            },
            {
                item_type:GameItemType.melee,
                duration:2,
                keyframes:[
                    {
                        time:0.5,
                        actions:[
                            {type:"tween",fuser:"right_arm",to:{position:v2(0.75,0.15),rotation:2.6},ease:ease.quadraticInOut},
                            {type:"tween",fuser:"weapon",to:{position:v2(0.75,0.15),rotation:3.6},ease:ease.quadraticInOut},
                            {type:"tween",fuser:"left_arm",to:{position:v2(0.75,-0.1),rotation:-2.6},ease:ease.quadraticInOut},
                        ],
                    },
                    {
                        time:1.2,
                        actions:[
                            {type:"callmode",mode:"eyes",args:[1,false]},
                        ],
                    },
                    {
                        time:0.3,
                        actions:[
                            {type:"tween",fuser:"right_arm",to:{position:v2(0.35,0.1),rotation:2.6},ease:ease.backIn},
                            {type:"tween",fuser:"weapon",to:{position:v2(0.35,0.1),rotation:3.6},ease:ease.backIn},
                            {type:"tween",fuser:"left_arm",to:{position:v2(0.35,-0.05),rotation:-2.6},ease:ease.backIn},
                        ],
                    },
                ],
            },
        ],
    },
)

export function get_momentary_variation(def:HumanoidMomentaryDef,item?:WeaponDef):number{
    if(!def.variations||!item)return -1
    let ret=-1
    for(let i=0;i<def.variations.length;i++){
        const v=def.variations[i]
        if(v.item!==undefined&&v.item===item.id_string)return i
        if(v.item===undefined&&v.item_type!==undefined&&v.item_type===item.item_type&&ret===-1)ret=i
    }
    return ret
}
