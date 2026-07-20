import { Casters, GamepadButtonID, IPLocation, isMobile, Key } from "common/engine/client.ts";

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
export const sandbox_version=false
export const socials={
    discord:"https://discord.gg/7czkBvtmSU",
    youtube:"https://youtube.com/@kazikni",
    github:"https://github.com/kazikni/surgemd",
} satisfies Record<string,string>
export const Debug={
    hitbox:false,
    force_mobile:false
}
export enum GraphicsDConfig {
    None=0,
    Normal,
    Advanced,
}
export const ConfigCasters=Object.freeze({
    sv_loadout_name:Casters.toString,
    sv_loadout_female:Casters.toBoolean,
    sv_loadout_body_tint:Casters.toString,
    sv_loadout_hair:Casters.toString,
    sv_loadout_hair_tint:Casters.toString,
    sv_loadout_shirt:Casters.toString,
    sv_loadout_emote_top:Casters.toString,
    sv_loadout_emote_bottom:Casters.toString,
    sv_loadout_emote_left:Casters.toString,
    sv_loadout_emote_right:Casters.toString,
    sv_loadout_emote_death:Casters.toString,
    sv_loadout_emote_victory:Casters.toString,
    sv_loadout_wrapping_weapons:Casters.toString,

    sv_graphics_resolution:Casters.generateUnionCaster(["low","medium"]),
    sv_graphics_renderer:Casters.generateUnionCaster(["webgl1","webgl2"]),
    sv_graphics_shadows:Casters.toBoolean,
    sv_graphics_particles:Casters.toInt,
    sv_graphics_lights:Casters.toInt,
    sv_graphics_post_proccess:Casters.toInt,
    sv_graphics_climate:Casters.toBoolean,
    sv_graphics_fullscreen:Casters.toBoolean,

    sv_game_region:Casters.toString,
    sv_game_friendly_fire:Casters.toBoolean,
    sv_game_interpolation:Casters.toBoolean,
    sv_game_client_rot:Casters.toBoolean,
    sv_game_ammo_outline:Casters.toBoolean,

    sv_mobile_auto_pickup:Casters.toBoolean,

    sv_sounds_master_volume:Casters.toNumber,
    sv_sounds_music_volume:Casters.toNumber,
    sv_sounds_ambient_volume:Casters.toNumber,
    sv_sounds_gameplay_music:Casters.toBoolean,

    sv_ui_primary_color:Casters.toString,
    sv_ui_secondary_color:Casters.toString,
    sv_ui_tertiary_color:Casters.toString,
    sv_ui_positive_color:Casters.toString,
    sv_ui_negative_color:Casters.toString,
    sv_ui_special_color:Casters.toString,
    sv_ui_translation:Casters.toString,
    sv_ui_interactive:Casters.toBoolean,
    sv_ui_simple_mode:Casters.toBoolean,

    sv_debug_ping_emulation:Casters.toNumber,
})
export const ConfigDefaultValues={
    sv_loadout_name:"",
    sv_loadout_female:false,
    sv_loadout_body_tint:"#f0a93f",
    sv_loadout_hair:"hair_1",
    sv_loadout_hair_tint:"#222222",
    sv_loadout_shirt:"blue_shirt",
    sv_loadout_emote_top:"logo_md",
    sv_loadout_emote_bottom:"neutral",
    sv_loadout_emote_left:"sad",
    sv_loadout_emote_right:"happy",
    sv_loadout_emote_death:"",
    sv_loadout_emote_victory:"",
    sv_loadout_wrapping_weapons:"",

    sv_graphics_renderer:"webgl2",
    sv_graphics_resolution:(Debug.force_mobile||isMobile)?"low":"medium",
    sv_graphics_shadows:!(Debug.force_mobile||isMobile),
    sv_graphics_particles:GraphicsDConfig.Advanced,
    sv_graphics_lights:GraphicsDConfig.Advanced,
    sv_graphics_post_proccess:(Debug.force_mobile||isMobile)?GraphicsDConfig.None:GraphicsDConfig.Advanced,
    sv_graphics_climate:true,
    sv_graphics_fullscreen:false,

    sv_game_region:"na",
    sv_game_friendly_fire:false,
    sv_game_interpolation:true,
    sv_game_client_rot:true,
    sv_game_ammo_outline:false,
    sv_game_ping:5,

    sv_mobile_auto_pickup:Debug.force_mobile||isMobile,

    sv_sounds_master_volume:1,
    sv_sounds_music_volume:1,
    sv_sounds_ambient_volume:1,
    sv_sounds_gameplay_music:true,

    sv_ui_primary_color:"#4f6ef7",
    sv_ui_secondary_color:"#1c2447",
    sv_ui_tertiary_color:"#eeeeee",
    sv_ui_positive_color:"#00ccff",
    sv_ui_negative_color:"#ff3c00",
    sv_ui_special_color:"#fffb00",
    sv_ui_translation:"en",
    sv_ui_interactive:true,
    sv_ui_simple_mode:Debug.force_mobile||isMobile,

    sv_debug_ping_emulation:0,
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
        buttons:[GamepadButtonID.Y],
        keys:[Key.V]
    },
    "message":{
        buttons:[],
        keys:[Key.T]
    },
    "comunication_mode":{
        buttons:[GamepadButtonID.Y],
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
        buttons:[GamepadButtonID.A],
        keys:[Key.X]
    },
    "swamp_guns":{
        buttons:[GamepadButtonID.L3],
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
        buttons:[GamepadButtonID.DPAD_Down],
        keys:[Key.Mouse_Wheel_Up]
    },
    "next_scope":{
        buttons:[GamepadButtonID.DPAD_Up],
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
    "debug_menu":{
        buttons:[GamepadButtonID.R3],
        keys:[Key.Delete,Key.Backspace]
    }
}