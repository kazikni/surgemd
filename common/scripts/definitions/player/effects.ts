import { Definition, Definitions } from "../../../engine/core.ts";
import { HumanModifiers } from "../../others/constants.ts";
import { BoostDef, Boosts, BoostType } from "./boosts.ts";

export enum EffectType{
    Buff,
    Debuff,
    Neutral
}
export interface EffectDef extends Definition{
    effect_type:EffectType
    particles?:{
        delay:number
        frame:string
    }
    side_effects:SideEffect[]
}
export enum SideEffectType{
    AddEffect,
    Modify,
    Damage,
    Heal,
    Parachute
}
export type SideEffect=({
    type:SideEffectType.AddEffect
    effect:string
    duration:number
}|{
    type:SideEffectType.Modify,
    modify:Partial<HumanModifiers>
}|{
    type:SideEffectType.Damage,
    amount:number
}|{
    type:SideEffectType.Heal,
    health?:{
        amount:number
        max?:number
    }
    boost?:{
        amount:number
        def:BoostDef
        max?:number
    }
    global?:{
        amount:number
        boost?:BoostDef
    }
}|{
    type:SideEffectType.Parachute,
})
export const Effects=new Definitions<EffectDef,{}>((i)=>{
})

export interface EffectInstance{
    effect:EffectDef
    time:number
    tick_time:number
}
Effects.insert(
    {
        idString:"fire",
        effect_type:EffectType.Debuff,
        side_effects:[
            {
                type:SideEffectType.Damage,
                amount:4
            },
        ],
    },
    {
        idString:"well_fed",
        effect_type:EffectType.Buff,
        side_effects:[
            {
                type:SideEffectType.Heal,
                global:{
                    amount:3,
                    boost:Boosts[BoostType.Adrenaline]
                }
            },
        ],
    },
    {
        idString:"kill_haste",
        effect_type:EffectType.Buff,
        side_effects:[
            {
                type:SideEffectType.Modify,
                modify:{
                    speed:1.5
                }
            },
        ],
    },
    {
        idString:"blue_effect",
        effect_type:EffectType.Buff,
        particles:{
            delay:0.3,
            frame:"boost_addiction_particle"
        },
        side_effects:[
            {
                type:SideEffectType.Heal,
                global:{
                    amount:2,
                    boost:Boosts[BoostType.Shield]
                }
            },
        ],
    }
)