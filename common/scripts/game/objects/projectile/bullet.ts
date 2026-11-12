import { gel_events, GELComponent, Vec2 } from "../../../../engine/core.ts";
import { CommonObject, SimulatedObject } from "../../base.ts";
import { type C_Human } from "../human/human.ts";

export interface C_Bullet extends CommonObject{
    speed:number
    max_distance:number
    angle:number

    critical:boolean
    hit_owner:boolean

    initial_position:Vec2
    owner:C_Human
    tticks:number
    
    tracer_color:number
    tracer_alpha:number
    tracer_width:number
    tracer_height:number

    pass_through_humans:boolean
    pass_through_everthing:boolean

    velocity:Vec2
}

export const c_bullet:GELComponent<C_Bullet>={
    events:{
        [gel_events.bind](){
            this.tracer_color=0
            this.tracer_alpha=255
            this.tracer_width=1
            this.tracer_height=1
        }
    }
}

export type SI_Bullet=C_Bullet&SimulatedObject&{
}
export const si_bullet:GELComponent<SI_Bullet>={
}