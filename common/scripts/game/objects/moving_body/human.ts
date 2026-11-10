import { gel_events, GELComponent, Numeric, v2, v2m, Vec2 } from "../../../../engine/core.ts"
import { InputAction } from "../../../../engine/web.ts";
import { GameItem } from "../../../definitions/game_defs.ts";
import { BadgeDef } from "../../../definitions/loadout/badges.ts";
import { EmoteDef } from "../../../definitions/loadout/emotes.ts";
import { BoostDef } from "../../../definitions/player/boosts.ts";
import { apply_modifiers } from "../../../others/functions.ts";
import { Floors, FloorType } from "../../../others/terrain.ts";
import { C_Humanoid_Visual, c_humanoid_visual, si_humanoid_visual } from "./humanoid.ts";
import { c_moving_body, C_MovingBody, moving_body_events, si_moving_body, SI_MovingBody } from "./moving_body.ts";

export const human_events={
    update_modifiers:moving_body_events.last+1,
    tick_physics:moving_body_events.last+2,
    last:moving_body_events.last+3
}

export type C_Human=C_MovingBody&C_Humanoid_Visual&{
    physical:{
        movement_locked?:boolean
    }
}
export const c_human:GELComponent<C_Human>={
    id_string:"c_human",
    extensions:[c_moving_body,c_humanoid_visual],
}

export type SI_Human=C_Human&SI_MovingBody&{
    knocked:boolean
    downed:boolean

    boost:{
        value:number
        max:number
        old:number

        old_def?:BoostDef
        def:BoostDef

        time:number
    }

    input:{
        rotation:number,
        movement:{dir:number,scale:number}

        dist_to_pointer:number

        auto_click:boolean
        using_item:boolean
        using_item_alt:boolean
        using_item_down:boolean

        actions:InputAction[]
        emote?:GameItem|EmoteDef|BadgeDef
        //ping?:PingData
        message?:string

        reload:boolean
        interaction:boolean
        swap_guns:boolean
        cancel:boolean
    }

    physical:{
        secondary_velocity_enabled:boolean
        secondary_velocity_swimming:boolean
        secondary_velocity:Vec2
        secondary_acceleration:number
    }
    scale:number

    modifiers:Record<string,number>
    temp_modifiers:Record<string,number>

    tick_physics(current_floor:FloorType,dt:number):void
}
export const si_human:GELComponent<SI_Human>={
    id_string:"si_human",
    extensions:[si_moving_body,si_humanoid_visual],
    events:{
        [gel_events.bind]:function(){
            this.physical={
                ...this.physical,

                movement_locked:false,

                secondary_velocity_enabled:false,
                secondary_velocity:v2.zero(),
                secondary_velocity_swimming:false,
                secondary_acceleration:1,
            }
            this.knocked=false
            this.downed=false

            this.input={
                movement:{
                    dir:0,
                    scale:1
                },
                rotation:0,
                dist_to_pointer:0,

                auto_click:false,
                using_item:false,
                using_item_alt:false,
                using_item_down:false,

                actions:[],
                reload:false,
                interaction:false,
                swap_guns:false,
                cancel:false
            }
            this.modifiers={}
            this.temp_modifiers={}
        },
        [gel_events.tick](dt:number){
            this.modifiers={}
            apply_modifiers(this.modifiers,this.temp_modifiers)
            this.emit_event(human_events.update_modifiers,this.modifiers)

            this.tick_physics(FloorType.Void,dt)

            this.set_dirty_part()
        }
    },
    methods:{
        tick_physics(current_floor:FloorType,dt:number){
            let acceleration=40*(this.downed?0.2:Floors[current_floor].acceleration)
            acceleration=Numeric.dt_expo_inter(acceleration,dt)

            if(!this.physical.movement_locked){
                const speed=5.7*(this.modifiers["speed"]??1)
                const move=v2.from_PolarMovement(this.input.movement)
                v2m.scale(move,move,speed)
                v2m.lerp(this.physical.velocity,move,acceleration)

                if(this.downed){
                    if(this.input.movement.scale>0)this.rotation=Numeric.lerp_rad(this.rotation,this.input.movement.dir,Numeric.dt_expo_inter(1,dt))
                }else this.rotation=this.input.rotation
            }else{
                this.physical.velocity=v2.zero()
            }
        }
    }
}