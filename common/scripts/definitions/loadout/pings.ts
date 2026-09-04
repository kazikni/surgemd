import { Definition } from "../../../engine/core.ts";
export interface PingDef extends Definition{
    lifetime?:number

    pulse?:{
        infinity?:boolean
        interval?:number
        duration?:number
        scale?:number
    }

    world_version?:boolean
}
export function Pings_Default_Init():PingDef[]{
    return [
        {
            idString:"airdrop",
            lifetime:13
        },

        {idString:"alert",world_version:true},
        {idString:"here",world_version:true},
        {idString:"heal",world_version:true},
        {idString:"gift",world_version:true},
    ]
}
