import { Definition, Definitions } from "../../../engine/core.ts";
import { ItemRank } from "../../others/item.ts";
import { InventoryItemType } from "../utils.ts";

export interface SkinDef extends Definition{
    frame?:{
        base?:string
        base_tint?:number
        chest?:string
        chest_tint?:number
        arm?:string
        arm_tint?:string
        leg?:string
        leg_tint?:string
        mount?:{
            normal:string
            closed:string
        }
    }
    animation?:{
        frames:{delay:number,image:string}[]
        no?:boolean
        no_auto_talk:boolean
    }
    rank:ItemRank,
    item_type?:InventoryItemType.skin
}

export function Skins_Default_Init(skins:Definitions<SkinDef,{}>){
    skins.insert(
        {
            idString:"default_skin",
            rank:ItemRank.E,
        },
        {
            idString:"nick_winner",
            rank:ItemRank.C,
            frame:{
                leg:"default_skin_leg"
            }
        },
        {
            idString:"justin_winner",
            frame:{
                mount:{
                    closed:"player_mounth_1_2",
                    normal:"player_mounth_2_1"
                }
            },
            rank:ItemRank.C,
        },
        {
            idString:"alice_winner",
            rank:ItemRank.C,
        },
        {
            idString:"kaklik",
            rank:ItemRank.S,
        },
        {
            idString:"kitty",
            rank:ItemRank.A,
        },
    )
}