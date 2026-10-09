import { Definition } from "../../../engine/core.ts";
import { DamageReason } from "../utils.ts";
import { SideEffect, SideEffectType } from "./effects.ts";

export interface BoostDef extends Definition{
    color:string
    animation_color:string
    particle:string

    shield?:{
        multiplier:number
        penetrate:number
        break_invensibility:number
    }
    se?:{
        update_modifiers?:(human:any)=>Record<string,number>
        tick?:(dt:number,human:any)=>number
        on_hitted?:(human:any)=>void
        can_apply?:(e:SideEffect,human:any)=>boolean
    }
}

export function Boosts_Default_Init():BoostDef[]{
    return [
        {
            idString:"adrenaline",
            color:"#ff0",
            animation_color:"#ff05",
            particle:"boost_adrenaline_particle",
            se:{
                tick(dt,h){
                    h.health.value=Math.min(h.health.value+(h.boost.value*dt)*0.01,h.health.max)
                    h.boost.value=Math.max(h.boost.value-0.25*dt,0)
                    return h.boost.value>h.boost.max/2?1.1:1
                }
            }
        },
        {
            idString:"shield",
            color:"#08f",
            animation_color:"#08f5",
            shield:{
                multiplier:1.2,
                penetrate:2.2,
                break_invensibility:0.3
            },
            particle:"boost_shield_particle"
        },
        {
            idString:"mana",
            color:"#92a",
            animation_color:"#92a5",
            particle:"boost_mana_particle"
        },
        {
            idString:"addiction",
            color:"#e13",
            animation_color:"#e135",
            particle:"boost_addiction_particle",
            se:{
                tick(dt,h){
                    h.boost.value=Math.max(h.boost.value-0.2*dt,0)
                    if(h.boost.time<=0){
                        h.boost.time=3
                        let damage=(h.boost.max/h.boost.value)
                        if(Number.isNaN(damage))damage=100
                        h.piercing_damage({
                            amount:(damage*0.009)*100,
                            reason:DamageReason.Abstinence,
                            position:h.position,
                            critical:false,
                            direction:0,
                            penetration:1,
                        })
                    }else{
                        h.boost.time-=dt
                    }
                    return 1+(h.boost.value/h.boost.max)*0.25
                },
                update_modifiers(h){
                    return {
                        damage:1+(1-(h.boost.value/h.boost.max))*0.5
                    }
                }
            }
        },
        {
            idString:"green_bless",
            color:"#1f3",
            animation_color:"#1f35",
            particle:"boost_green_bless_particle",
            shield:{
                multiplier:4,
                penetrate:2,
                break_invensibility:0.2
            },
            se:{
                tick(dt,h){
                    if(h.boost.time<6)h.boost.time+=dt
                    if(h.boost.time>=6){
                        h.boost.value=Math.min(h.boost.value+50*dt,h.boost.max)
                    }
                    h.health.value=Math.min(h.health.value+(h.boost.max*dt)*0.007,h.health.max)
                    return 1.1
                },
                on_hitted(h){
                    h.boost.time=0
                }
            }
        },
        {
            idString:"death",
            color:"#001",
            animation_color:"#0015",
            particle:"boost_death_particle",
            se:{
                can_apply(s,h){
                    return s.type!==SideEffectType.Heal||(s.boost?.def==="green_bless"||s.boost?.def==="death")
                },
                tick(dt,h){
                    if(h.boost.time<=0){
                        h.boost.time+=1
                        h.boost.value=Math.min(h.boost.value+((h.boost.max/160)),h.boost.max)
                    }else{
                        h.boost.time-=dt
                    }
                    if(h.boost.value>=h.boost.max){
                        h.die({
                            amount:h.health.value,
                            critical:true,
                            position:h.position,
                            reason:DamageReason.Abstinence,
                            direction:0,
                            penetration:1,
                        })
                    }
                    return 1.25
                },
                update_modifiers(h):Record<string,number>{
                    return {
                        damage_reduction:0.25,
                        speed:1+(h.boost.value/h.boost.max)*0.5,
                        damage:1+(h.boost.value/h.boost.max)*0.25
                    }
                },
            }
        }
    ]
}