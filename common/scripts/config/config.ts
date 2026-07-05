import { HostConfig } from "../../engine/core.ts";

export interface GameModeConfig{
    mode:string
    settings?:any
    name?:string
}
export interface GameConfig{
    group_size?:number
    mode:GameModeConfig
}
export interface ModeConfig{
    group_size:(number[])|{time:number,index:number,value:number[]}
    mode:GameModeConfig|{time:number,index:number,value:GameModeConfig[]}
}
export interface GameDebugOptions{
    debug_menu:boolean
    dead_zone?:{
        time_speed:number
    }
}
export interface PlayTimeCurrent{
    day:number
    hour:number
    duration?:number
}
export interface PlayTimeConfig{
    week_days:number[]
    hour:number
    duration:number
}
export interface ApiSettings{
    regions:string[]
    modes:ModeConfig[]
    database:{
        enabled:boolean
    }
    playtime?:{
        config:PlayTimeConfig
        current:PlayTimeCurrent
    }
}
export interface FindGameData{
    region:string
    mode:number
    token?:string
    group_size?:number
}
export type FindGameResult={
    success:true
    address:string
    token?:string
}|{
    success:false
    error:string
}
export interface ApiServerConfig{
    host: HostConfig
    users?: Record<string,{
        password:string
        permitions?:{
            allow_moderate?:boolean // Ban, Unban, Kick
            allow_region?:boolean // Give Region Access
            allow_database?:boolean // Give Access To Database
        }
    }>
    game:{
        modes: ModeConfig[]
        play_time?:PlayTimeConfig
    }
    database?:{
        enabled?: boolean
        statistic?: boolean
        files?: {
            accounts?: string
            forum?: string
            statistic?: string
        }
    }
}
export interface GameServerConfig{
    host: HostConfig

    max_games: number
    ntps:number
    tps:number

    region?:{
        name:string
        ip:string
        port?:number
        ssl?:boolean
    }
    authentication?:{
        server:string
        user:{
            name:string
            password:string
        }
    }
    debug:GameDebugOptions
}
export interface ViteServerConfig{
    port:number
    allowed_hosts?:true|string[]
    spritesheet:{
        sheets:Record<string,string>
        resolutions:{name:string,scale:number}[]
    }
    audios:{
        input:string
        output:string
    }[]
}
export interface ConfigType{
    api: ApiServerConfig
    game: GameServerConfig
    vite: ViteServerConfig
}
export function ZeroApiServerConfig():ApiServerConfig{
    return {
        host:{
            port:-1
        },
        database:{
            enabled:false,
            statistic:false,
            files:{
                accounts:"",
                forum:"",
                statistic:"",
            },
        },
        game:{
            modes:[]
        }
    }
}
export function ZeroGameServerConfig():GameServerConfig{
    return {
        debug:{
            debug_menu:true,
        },
        host:{
            port:-1,
        },
        tps:100,
        ntps:32,
        max_games:1,
    }
}
export function ZeroConfig():ConfigType{
    return {
        api:ZeroApiServerConfig(),
        game:ZeroGameServerConfig(),
        vite:{
            port:3000,
            allowed_hosts:true,
            spritesheet:{
                resolutions:[],
                sheets:{}
            },
            audios:[]
        }
    }
}
