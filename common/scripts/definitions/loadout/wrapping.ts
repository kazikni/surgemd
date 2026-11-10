import { Definition, Definitions, FrameDef } from "../../../engine/core.ts";
import { ItemRank } from "../../others/item.ts";

export interface WrappingDef extends Definition{
    rank:ItemRank
    replace:Record<string,FrameDef>
}

export function Wrapping_Default_Init():WrappingDef[]{
    return [
        {
            id_string:"gradient",
            rank:ItemRank.E,
            replace:{
                "weapon_small_world":{
                    image:"gradient_weapon_small",
                },
                "weapon_medium_world":{
                    image:"gradient_weapon_medium",
                },
                "weapon_large_world":{
                    image:"gradient_weapon_large",
                }
            }
        },
        {
            id_string:"shiny",
            rank:ItemRank.D,
            replace:{
                "weapon_small_world":{
                    image:"shiny_weapon_small",
                },
                "weapon_medium_world":{
                    image:"shiny_weapon_medium",
                },
                "weapon_large_world":{
                    image:"shiny_weapon_large",
                }
            }
        },
        {
            id_string:"aqua",
            rank:ItemRank.B,
            replace:{
                "weapon_small_world":{
                    image:"aqua_weapon_small",
                },
                "weapon_medium_world":{
                    image:"aqua_weapon_medium",
                },
                "weapon_large_world":{
                    image:"aqua_weapon_large",
                }
            }
        },
        {
            id_string:"aqua_blue",
            rank:ItemRank.B,
            replace:{
                "weapon_small_world":{
                    image:"aqua_weapon_small",
                    tint:0x2da0ed
                },
                "weapon_medium_world":{
                    image:"aqua_weapon_medium",
                    tint:0x2da0ed
                },
                "weapon_large_world":{
                    image:"aqua_weapon_large",
                    tint:0x2da0ed
                }
            }
        },
    ]
}
