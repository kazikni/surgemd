import { Definition, Definitions } from "../../../engine/core.ts";
export interface PingDef extends Definition{
    lifetime?:number

    pulse?:{
        infinity?:boolean
        interval?:number
        duration?:number
        scale?:number
    }
}
export function Ping_Default_Init(pings:Definitions<PingDef,{}>){
    pings.insert(
        {
            idString:"airdrop",
            lifetime:13
        },
        {
            idString:"alert",
        },
    )
}
