import { Definition } from "../../../engine/core.ts";
import { GameObjectDefinitionType } from "../utils.ts";
export interface PingDef extends Definition{
    def_type?:GameObjectDefinitionType.ping
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
            id_string:"airdrop",
            lifetime:13
        },

        {id_string:"alert",world_version:true},
        {id_string:"here",world_version:true},
        {id_string:"heal",world_version:true},
        {id_string:"gift",world_version:true},
    ]
}
