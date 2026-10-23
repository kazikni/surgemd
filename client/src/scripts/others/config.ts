import { Casters, GamepadButtonID, is_mobile, Key } from "common/engine/web.ts";
import { IPLocation } from "common/engine/core.ts";
import { is_binary_computer, is_binary_mobile } from "../defs/bin_files.ts";

/*
* LOCAL
export const api_server=new IPLocation("localhost",8000,false,true,"")
*/
/*
* GLOBAL SERVER
export const api_server=new IPLocation("api.surgemd.io",443,true,true,"")
*/
/*
* GLOBAL
export const api_server=new IPLocation("testm.surgemd.io",8000,true,true,"")
*/
//export const api_server=new IPLocation("api.surgemd.io",443,true,true,"")
//export const api_server=new IPLocation("testm.surgemd.io",8000,true,true,"")
export const api_server=new IPLocation("localhost",8000,false,true,"")
export const API_BASE=api_server.toString("http")
export const api=true
export const forum=false
export const socials={
    discord:"https://discord.gg/7czkBvtmSU",
    youtube:"https://youtube.com/@kazikni",
    github:"https://github.com/kazikni/surgemd",
    android:"/files/surgemd-android.apk",
    windows:"/files/surgemd-windows.zip",
    linux:"/files/surgemd-linux.zip"
} satisfies Record<string,string>
export const Debug={
    hitbox:false,
}
export enum GraphicsDConfig {
    None=0,
    Normal,
    Advanced,
}

force_mobile=is_binary_mobile||false
block_mobile=is_binary_computer

const mobile=is_mobile()
const low_graphics=mobile

export const ConfigCasters=Object.freeze({
    loadout_name:Casters.toString,
    loadout_female:Casters.toBoolean,
    loadout_body_tint:Casters.toString,
    loadout_hair:Casters.toString,
    loadout_hair_tint:Casters.toString,
    loadout_shirt:Casters.toString,
    loadout_legs:Casters.toString,
    loadout_foot:Casters.toString,
    loadout_emote_top:Casters.toString,
    loadout_emote_bottom:Casters.toString,
    loadout_emote_left:Casters.toString,
    loadout_emote_right:Casters.toString,
    loadout_emote_death:Casters.toString,
    loadout_emote_victory:Casters.toString,
    loadout_wrapping_weapons:Casters.toString,
    loadout_badge:Casters.toString,

    graphics_resolution:Casters.generateUnionCaster(["low","medium"]),
    graphics_renderer:Casters.generateUnionCaster(["webgl1","webgl2"]),
    graphics_shadows:Casters.toBoolean,
    graphics_perspective:Casters.toBoolean,
    graphics_particles:Casters.toInt,
    graphics_lights:Casters.toInt,
    graphics_post_proccess:Casters.toInt,
    graphics_fullscreen:Casters.toBoolean,

    game_region:Casters.toString,
    game_friendly_fire:Casters.toBoolean,
    game_tank_vehicle_control:Casters.toBoolean,
    game_interpolation:Casters.toBoolean,
    game_client_rot:Casters.toBoolean,
    game_ammo_outline:Casters.toBoolean,

    mobile_auto_pickup:Casters.toBoolean,

    sounds_master_volume:Casters.toNumber,
    sounds_music_volume:Casters.toNumber,
    sounds_ambient_volume:Casters.toNumber,
    sounds_gameplay_music:Casters.toBoolean,

    ui_primary_color:Casters.toString,
    ui_secondary_color:Casters.toString,
    ui_tertiary_color:Casters.toString,
    ui_positive_color:Casters.toString,
    ui_negative_color:Casters.toString,
    ui_special_color:Casters.toString,
    ui_translation:Casters.toString,
    ui_interactive:Casters.toBoolean,
    ui_simple_mode:Casters.toBoolean,
    ui_show_intro:Casters.toBoolean,

    debug_enabled:Casters.toBoolean,
    debug_ping_emulation:Casters.toNumber,
})
export const ConfigDefaultValues={
    loadout_name:"",
    loadout_female:false,
    loadout_body_tint:"#f0a93f",
    loadout_hair:"hair_1",
    loadout_hair_tint:"#222222",
    loadout_shirt:"blue_shirt",
    loadout_legs:"blue_jeans_pants",
    loadout_foot:"black_shoes",
    loadout_emote_top:"logo_md",
    loadout_emote_bottom:"neutral",
    loadout_emote_left:"sad",
    loadout_emote_right:"happy",
    loadout_emote_death:"",
    loadout_emote_victory:"",
    loadout_wrapping_weapons:"",
    loadout_badge:"",

    graphics_renderer:"webgl2",
    graphics_resolution:(low_graphics)?"low":"medium",
    graphics_shadows:!low_graphics,
    graphics_perspective:true,
    graphics_particles:GraphicsDConfig.Advanced,
    graphics_lights:GraphicsDConfig.Advanced,
    graphics_post_proccess:low_graphics?GraphicsDConfig.None:GraphicsDConfig.Advanced,
    graphics_fullscreen:false,

    game_region:"na",
    game_friendly_fire:false,
    game_interpolation:true,
    game_tank_vehicle_control:!mobile,
    game_client_rot:true,
    game_ammo_outline:true,
    game_ping:5,

    mobile_auto_pickup:false,

    sounds_master_volume:1,
    sounds_music_volume:1,
    sounds_ambient_volume:1,
    sounds_gameplay_music:true,

    ui_primary_color:"#4f6ef7",
    ui_secondary_color:"#1c2447",
    ui_tertiary_color:"#eeeeee",
    ui_positive_color:"#00ccff",
    ui_negative_color:"#ff3c00",
    ui_special_color:"#fffb00",
    ui_translation:"en",
    ui_interactive:true,
    ui_simple_mode:low_graphics,
    ui_show_intro:true,

    debug_enabled:false,
    debug_ping_emulation:0,
}
export const ConfigDefaultActions={
    "move_up":{
        buttons:[],
        keys:[Key.W]    
    },
    "move_down":{
        buttons:[],
        keys:[Key.S]
    },
    "move_left":{
        buttons:[],
        keys:[Key.A]
    },
    "move_right":{
        buttons:[],
        keys:[Key.D]
    },
    "fire":{
        buttons:[GamepadButtonID.R2],
        keys:[Key.Mouse_Left]
    },
    "alt_fire":{
        buttons:[GamepadButtonID.L2],
        keys:[Key.Mouse_Right]
    },
    "emote_wheel":{
        buttons:[GamepadButtonID.DPAD_Left],
        keys:[Key.V]
    },
    "message":{
        buttons:[],
        keys:[Key.T]
    },
    "comunication_mode":{
        buttons:[GamepadButtonID.DPAD_Up],
        keys:[Key.C]
    },
    "reload":{
        buttons:[GamepadButtonID.X],
        keys:[Key.R]
    },
    "interact":{
        buttons:[GamepadButtonID.A],
        keys:[Key.E]
    },
    "cancel":{
        buttons:[GamepadButtonID.Y],
        keys:[Key.X]
    },
    "swamp_guns":{
        buttons:[GamepadButtonID.R3],
        keys:[Key.F]
    },
    "toggle_full_device":{
        buttons:[GamepadButtonID.Start],
        keys:[Key.M]
    },
    "toggle_hide_device":{
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
        buttons:[GamepadButtonID.DPAD_Right],
        keys:[Key.Mouse_Wheel_Up]
    },
    "next_scope":{
        buttons:[GamepadButtonID.DPAD_Down],
        keys:[Key.Mouse_Wheel_Down]
    },
    "next":{
        buttons:[],
        keys:[Key.E,Key.Space,Key.Enter]
    },
    "escape":{
        buttons:[],
        keys:[Key.Escape]
    },

    /*"toggle_cursor":{
        keys:[],
        buttons:[GamepadButtonID.L3],
    },*/
}