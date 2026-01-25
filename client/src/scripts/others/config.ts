import { IPLocation } from "common/scripts/engine/utils.ts"
import { Casters } from "../engine/console.ts"
import { GamepadButtonID, Key } from "../engine/mod.ts"
import { isMobile } from "../engine/game.ts";

/*
* LOCAL SERVER
export const api_server=new IPLocation("localhost",3000,false,false,"api")
*/
/*
* GLOBAL SERVER
export const api_server=new IPLocation("api.surgemd.io",443,true,true,"")
*/
//export const api_server=new IPLocation("api.surgemd.io",443,true,true,"")
export const api_server=new IPLocation("localhost",3000,false,false,"api")
export const API_BASE=api_server.toString("http")
export const api=true
export const forum=false
export enum GraphicsDConfig {
    None=0,
    Normal,
    Advanced,
}

export const Debug={
    hitbox:false,
    force_mobile:false
}

export const ConfigCasters=Object.freeze({
    cv_loadout_name:Casters.toString,
    cv_loadout_skin:Casters.toString,

    cv_graphics_resolution:Casters.generateUnionCaster(["very-low","low","medium","high","very-high"]),
    cv_graphics_renderer:Casters.generateUnionCaster(["webgl1","webgl2"]),
    cv_graphics_particles:Casters.toInt,
    cv_graphics_lights:Casters.toInt,
    cv_graphics_post_proccess:Casters.toInt,
    cv_graphics_climate:Casters.toBoolean,


    cv_game_region:Casters.toString,
    cv_game_friendly_fire:Casters.toBoolean,
    cv_game_interpolation:Casters.toBoolean,
    cv_game_client_rot:Casters.toBoolean,
    cv_game_ping:Casters.toInt,

    cv_mobile_auto_pickup:Casters.toBoolean,

    cv_sounds_master_volume:Casters.toInt,
})
export const ConfigDefaultValues={
    cv_loadout_skin:"default_skin",
    cv_loadout_name:"",

    cv_graphics_renderer:"webgl2",
    cv_graphics_resolution:(Debug.force_mobile||isMobile)?"very-low":"high",
    cv_graphics_particles:GraphicsDConfig.Advanced,
    cv_graphics_lights:GraphicsDConfig.Advanced,
    cv_graphics_post_proccess:GraphicsDConfig.Advanced,
    cv_graphics_climate:true,

    cv_game_region:"na",
    cv_game_friendly_fire:false,
    cv_game_interpolation:true,
    cv_game_client_rot:true,
    cv_game_ping:5,

    cv_mobile_auto_pickup:(Debug.force_mobile||isMobile),

    cv_sounds_master_volume:100,
    
}
export const ConfigDefaultActions={
    "fire":{
        buttons:[GamepadButtonID.R2],
        keys:[Key.Mouse_Left]
    },
    "emote_wheel":{
        buttons:[GamepadButtonID.L2],
        keys:[Key.V]
    },
    "reload":{
        buttons:[GamepadButtonID.X],
        keys:[Key.R]
    },
    "interact":{
        buttons:[GamepadButtonID.A],
        keys:[Key.E]
    },
    "swamp_guns":{
        buttons:[GamepadButtonID.L3],
        keys:[Key.F]
    },
    "full_tab":{
        buttons:[GamepadButtonID.Start],
        keys:[Key.M]
    },
    "hide_tab":{
        buttons:[GamepadButtonID.Select],
        keys:[Key.N]
    },
    "weapon1":{
        buttons:[],
        keys:[Key.Number_1]
    },
    "weapon2":{
        buttons:[],
        keys:[Key.Number_2]
    },
    "weapon3":{
        buttons:[],
        keys:[Key.Number_3]
    },
    "use_item1":{
        buttons:[],
        keys:[Key.Number_4]
    },
    "use_item2":{
        buttons:[],
        keys:[Key.Number_5]
    },
    "use_item3":{
        buttons:[],
        keys:[Key.Number_6]
    },
    "use_item4":{
        buttons:[],
        keys:[Key.Number_7]
    },
    "use_item5":{
        buttons:[],
        keys:[Key.Number_8]
    },
    "use_item6":{
        buttons:[],
        keys:[Key.Number_9]
    },
    "use_item7":{
        buttons:[],
        keys:[Key.Number_0]
    },
    "previous_weapon":{
        buttons:[GamepadButtonID.L1],
        keys:[]
    },
    "next_weapon":{
        buttons:[GamepadButtonID.R1],
        keys:[]
    },
    "previous_scope":{
        buttons:[],
        keys:[Key.Mouse_Wheel_Up]
    },
    "next_scope":{
        buttons:[],
        keys:[Key.Mouse_Wheel_Down]
    },
    "debug_menu":{
        buttons:[GamepadButtonID.R3],
        keys:[Key.Delete,Key.Backspace]
    }
}