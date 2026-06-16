import { HostConfig } from "../../engine/core.ts";

export interface GameConfig{
    mode:string
    group_size?:number
    mode_settings:any
}
export interface GamemodeConfig{
    team_size:number[]
    gamemode:string
}
export interface GameDebugOptions{
    deenable_lobby?:boolean
    debug_menu:boolean
    dead_zone?:{
        time_speed:number
    }
}
export interface RegionDef{
    host:string
    port:number
    ssh?:boolean
}
export interface ShopConfig{
    skins: Partial<Record<number, number>>
}
export interface ApiSettingsS{
    regions:Record<string,RegionDef>
    modes:GamemodeConfig[]
    shop:ShopConfig
    debug:{
        debug_menu:boolean
    }
    database:{
        enabled:boolean
    }
}
export interface ConfigType{
    api: {
        host: HostConfig
        global:string
        key:string
    };
    game: {
        max_games: number
        debug:GameDebugOptions
        host: HostConfig
        ntps:number
        tps:number
        modes: GamemodeConfig[]
    }
    this_region:string
    vite:{
        port:number
        allowed_hosts?:true|string[]
    }
    regions: Record<string, RegionDef>
    database: {
        enabled: boolean
        statistic:boolean
        files: {
            accounts: string
            forum: string
            statistic:string
        }
        api_key: string
    }
    shop: ShopConfig
}

export function ZeroConfig():ConfigType{
    return {
        api:{
            host:{
                port:-1
            },
            global:"",
            key:""
        },
        database:{
            enabled:false,
            api_key:"",
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
        regions:{

        },
        shop:{
            skins:[]
        },
        this_region:"local",
        vite:{
            port:3000,
            allowed_hosts:true
        }
    }
}
