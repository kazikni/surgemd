import { AKeyFrame, v2 } from "../../engine/core.ts";
import { WeaponsArmRig, WeaponsRig } from "./item.ts";

export const default_animations={
    load_pump:Object.freeze([
        {
            time:0,
            actions:[
                {fuser:"left_arm",position:v2(WeaponsArmRig[1].left.position.x-0.5,WeaponsArmRig[1].left.position.y),type:"sprite"},
                {fuser:"right_arm",position:v2(WeaponsArmRig[1].right.position.x-0.5,WeaponsArmRig[1].right.position.y),rotation:0,type:"sprite"},
                {fuser:"weapon",position:v2(WeaponsRig[0].position.x-0.5,WeaponsRig[0].position.y),rotation:0,type:"sprite"},
            ]
        },
        {
            time:0.12,
            actions:[
                {fuser:"left_arm",to:{position:WeaponsArmRig[1].left.position},type:"tween"},
                {fuser:"right_arm",to:{position:WeaponsArmRig[1].right.position},type:"tween"},
                {fuser:"weapon",to:{position:WeaponsRig[0].position},type:"tween"},
            ]
        },
        {
            time:0.2,
            actions:[
                {fuser:"left_arm",yoyo:true,to:{position:v2(WeaponsArmRig[1].left.position.x-0.2,WeaponsArmRig[1].left.position.y)},type:"tween"},
            ]
        },
    ]) as AKeyFrame[],
    load_assault:Object.freeze([
        {
            time:0,
            actions:[
                {fuser:"left_arm",position:v2(WeaponsArmRig[0].left.position.x-0.5,WeaponsArmRig[0].left.position.y),type:"sprite"},
                {fuser:"right_arm",position:v2(WeaponsArmRig[0].right.position.x-0.5,WeaponsArmRig[0].right.position.y),rotation:0,type:"sprite"},
                {fuser:"weapon",position:v2(WeaponsRig[0].position.x-0.5,WeaponsRig[0].position.y),rotation:0,type:"sprite"},
            ]
        },
        {
            time:0.12,
            actions:[
                {fuser:"left_arm",to:{position:WeaponsArmRig[0].left.position},type:"tween"},
                {fuser:"right_arm",to:{position:v2.add(WeaponsArmRig[0].right.position,v2(-0.03,0.08))},type:"tween"},
                {fuser:"weapon",to:{position:WeaponsRig[0].position},type:"tween"},
            ]
        },
        {
            time:0.08,
            actions:[
                {fuser:"right_arm",to:{position:v2.add(WeaponsArmRig[0].right.position,v2(0.16,0.08))},type:"tween"},
            ]
        },
        {
            time:0.05,
            actions:[]
        },
        {
            time:0.08,
            actions:[
                {fuser:"right_arm",to:{position:v2.add(WeaponsArmRig[0].right.position,v2(0.20,0.02))},type:"tween"},
            ]
        },
        {
            time:0.11,
            actions:[
                {fuser:"right_arm",to:{position:v2.add(WeaponsArmRig[1].right.position,v2(0.04,0.02))},type:"tween"},
            ]
        },
        {
            time:0.08,
            actions:[
                {fuser:"right_arm",to:{position:WeaponsArmRig[1].right.position,rotation:WeaponsArmRig[1].right.rotation},type:"tween"},
            ]
        }
    ]) as AKeyFrame[],
    load_sniper:Object.freeze([
        {
            time:0,
            actions:[
                {fuser:"left_arm",position:v2(WeaponsArmRig[1].left.position.x-0.5,WeaponsArmRig[1].left.position.y),type:"sprite"},
                {fuser:"right_arm",position:v2(WeaponsArmRig[1].right.position.x-0.5,WeaponsArmRig[1].right.position.y),rotation:0,type:"sprite"},
                {fuser:"weapon",position:v2(WeaponsRig[0].position.x-0.5,WeaponsRig[0].position.y),rotation:0,type:"sprite"},
            ]
        },
        {
            time:0.13,
            actions:[
                {fuser:"left_arm",to:{position:WeaponsArmRig[1].left.position},type:"tween"},
                {fuser:"right_arm",to:{position:v2(WeaponsArmRig[1].right.position.x-0.04,WeaponsArmRig[1].right.position.y+0.1)},type:"tween"},
                {fuser:"weapon",to:{position:WeaponsRig[0].position},type:"tween"},
            ]
        },
        {
            time:0.12,
            actions:[
                {fuser:"right_arm",to:{position:v2.add(WeaponsArmRig[1].right.position,v2(0.19,0.10))},type:"tween"},
            ]
        },
        {
            time:0.06,
            actions:[]
        },
        {
            time:0.08,
            actions:[
                {fuser:"right_arm",to:{position:v2.add(WeaponsArmRig[1].right.position,v2(0.24,0.01))},type:"tween"},
            ]
        },
        {
            time:0.14,
            actions:[
                {fuser:"right_arm",to:{position:v2.add(WeaponsArmRig[1].right.position,v2(0.03,0.01))},type:"tween"},
            ]
        },
        {
            time:0.10,
            actions:[
                {fuser:"right_arm",to:{position:WeaponsArmRig[1].right.position,rotation:WeaponsArmRig[1].right.rotation},type:"tween"},
            ]
        }
    ]) as AKeyFrame[],
    load_sniper_bolt:Object.freeze([
        {
            time:0,
            actions:[
                {fuser:"left_arm",position:v2(WeaponsArmRig[1].left.position.x-0.5,WeaponsArmRig[1].left.position.y),type:"sprite"},
                {fuser:"right_arm",position:v2(WeaponsArmRig[1].right.position.x-0.5,WeaponsArmRig[1].right.position.y),rotation:0,type:"sprite"},
                {fuser:"weapon",position:v2(WeaponsRig[0].position.x-0.5,WeaponsRig[0].position.y),rotation:0,type:"sprite"},
            ]
        },
        {
            time:0.1,
            actions:[
                {fuser:"left_arm",to:{position:WeaponsArmRig[1].left.position},type:"tween"},
                {fuser:"right_arm",to:{position:v2(WeaponsArmRig[1].right.position.x,WeaponsArmRig[1].right.position.y+0.1)},type:"tween"},
                {fuser:"weapon",to:{position:WeaponsRig[0].position},type:"tween"},
            ]
        },
        {time:0.1,actions:[]},
        {
            time:0.18,
            actions:[
                {fuser:"right_arm",to:{position:v2(WeaponsArmRig[1].right.position.x+0.22,WeaponsArmRig[1].right.position.y)},type:"tween"},
            ]
        },
        {
            time:0.08,
            actions:[
                {fuser:"right_arm",to:{position:v2.add(WeaponsArmRig[1].right.position,v2(0.22,0.03))},type:"tween"},
            ]
        },
        {
            time:0.16,
            actions:[
                {fuser:"right_arm",to:{position:v2.add(WeaponsArmRig[1].right.position,v2(0.04,0.03))},type:"tween"},
            ]
        },
        {
            time:0.1,
            actions:[
                {fuser:"right_arm",to:{position:WeaponsArmRig[1].right.position,rotation:WeaponsArmRig[1].right.rotation},type:"tween"},
            ]
        }
    ]) as AKeyFrame[],
}satisfies Record<string,AKeyFrame[]>
export const default_animations_factory={
    insert_reload(time: number,repeat_count:number=1,sprite:string="casing_ammo_p76",hover:boolean=false,hotspot=v2(0,0.5),arm=WeaponsArmRig[1].right,arm_fuser:string="right_arm",weapon=WeaponsRig[0],bag_position=v2(0.25,0.2),insert_offset:number=-0.1): AKeyFrame[] {
        const ret:AKeyFrame[]=[
            {
                time: 0,
                actions: [
                    //hover?{type:"sprite",fuser:arm_fuser,zIndex:3.5}:undefined,
                    {
                        fuser: "item3",
                        image: sprite,
                        visible: false,
                        scale: 2,
                        hotspot:hotspot,
                        zIndex:hover?2.5:1.9,
                        tint:0xffffff,
                        type: "sprite"
                    }
                ]
            },
        ]

        const brotation=bag_position.y>0?-0.2:0.2
        for(let i=0;i<repeat_count;i++){
            ret.push(
                {time: time * 0.25,actions:[{fuser:arm_fuser,to:{position: bag_position,rotation:brotation*1.75},type: "tween"}]},
                {time: time * 0.05,actions:[{fuser: "item3",visible: true,position: bag_position,rotation:brotation,type: "sprite"}]},
                {
                    time: time * 0.35,
                    actions: [
                        {
                            fuser:arm_fuser,
                            to: {
                                position: v2(weapon.position.x+insert_offset+0.05,weapon.position.y+bag_position.y>0?0.08:-0.08),
                                rotation: brotation
                            },
                            type: "tween"
                        },
                        {
                            fuser: "item3",
                            to: {
                                position: v2(weapon.position.x+insert_offset,weapon.position.y),
                                rotation: 0,
                            },
                            type: "tween"
                        }

                    ]
                },
                {time: time * 0.10,actions: []},
                {time: time * 0.05, actions: [{fuser: "item3",visible: false,type: "sprite"}]}
            )
        }

        ret.push({
            time: time * 0.20,
            actions: [
                {
                    fuser:arm_fuser,
                    to: {
                        position: arm.position,
                        rotation: arm.rotation
                    },
                    type: "tween"
                }
            ]
        }/*,{
            time:0,
            actions:[hover?{type:"sprite",fuser:arm_fuser,zIndex:2}:undefined]
        }*/)
        return Object.freeze(ret) as AKeyFrame[]
    },
    pump_cycle(wait_time:number,pump_time:number=0.2,arm_fuser:string="left_arm"){
        return Object.freeze([
            {time:wait_time,actions:[]},
            {
                time:pump_time,
                actions:[
                    {fuser:arm_fuser,yoyo:true,to:{position:v2(WeaponsArmRig[1].left.position.x-0.2,WeaponsArmRig[1].left.position.y)},type:"tween"},
                ]
            },
        ]) as AKeyFrame[]
    },
    bolt_action_cycle(wait_time:number,bolt_time:number=0.5,arm_fuser="right_arm"){
        const arm=WeaponsArmRig[1].right.position
        const arm_rotation=WeaponsArmRig[1].right.rotation
        const arm_z=2
        return Object.freeze([
            {time:wait_time,actions:[]},
            //{actions:[{fuser:arm_fuser,type:"sprite",zIndex:3.5}],time:0},
            {
                time:bolt_time*0.45,
                actions:[
                    {fuser:arm_fuser,to:{position:v2(arm.x+0.22,arm.y),rotation:arm.y>0?-0.05:0.05},type:"tween"},
                ]
            },
            {
                time:bolt_time*0.15,
                actions:[
                    {fuser:arm_fuser,to:{position:v2(arm.x+0.22,arm.y+0.03)},type:"tween"},
                ]
            },
            {
                time:bolt_time*0.40,
                actions:[
                    {fuser:arm_fuser,to:{position:v2(arm.x+0.04,arm.y+0.03)},type:"tween"},
                ]
            },
            {
                time:bolt_time*0.20,
                actions:[
                    {fuser:arm_fuser,to:{position:arm,rotation:arm_rotation},type:"tween"},
                ]
            },
            //{actions:[{fuser:arm_fuser,type:"sprite",zIndex:arm_z}],time:0},
        ]) as AKeyFrame[]
    }
}