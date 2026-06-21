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
    deenable_lobby?:boolean
    debug_menu:boolean
    dead_zone?:{
        time_speed:number
    }
}
export interface RegionConfig{
    name:string
    host:string
    https?:boolean
    user:{
        name:string
        password:string
    }
}
export interface ApiSettingsS{
    regions:string[]
    modes:ModeConfig[]
    debug:{
        debug_menu:boolean
    }
    database:{
        enabled:boolean
    }
}
export interface FindGameData{
    region:string
    mode:number
    token?:string
    group_size?:number
}
export type GameResult={
    success:true
    address:string
    token?:string
}|{
    success:false
    error:string
}
export interface ConfigType{
    api: {
        host: HostConfig
        global:string
        users?: Record<string,{
            password:string
            permitions?:{
                allow_moderate?:boolean // Ban, Unban, Kick
                allow_region?:boolean // Give Region Access
                allow_database?:boolean // Give Access To Database
            }
        }>
    };
    game: {
        max_games: number
        debug:GameDebugOptions
        host: HostConfig
        ntps:number
        tps:number
        modes: ModeConfig[]
    }
    region?:RegionConfig
    vite:{
        port:number
        allowed_hosts?:true|string[]
    }
    database: {
        enabled: boolean
        statistic:boolean
        files: {
            accounts: string
            forum: string
            statistic:string
        }
    }
}

export function ZeroConfig():ConfigType{
    return {
        api:{
            host:{
                port:-1
            },
            global:"",
        },
        database:{
            enabled:false,
            files:{
                accounts:"",
                forum:"",
                statistic:""
            },
            statistic:false
        },
        game:{
            debug:{
                debug_menu:true,
            },
            host:{
                port:-1,
            },
            tps:100,
            ntps:32,
            max_games:1,
            modes:[],
        },
        vite:{
            port:3000,
            allowed_hosts:true
        }
    }
}
