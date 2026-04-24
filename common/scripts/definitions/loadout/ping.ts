import { Definition, Definitions } from "../../../engine/core.ts";
import { ItemRank } from "../../others/item.ts";

export interface PingDef extends Definition{
    rank:ItemRank
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
            rank:ItemRank.E,
            lifetime:10
        },
    )
}
