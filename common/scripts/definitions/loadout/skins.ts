import { Definition, Definitions } from "../../../engine/core.ts";
import { ItemQuality } from "../../others/item.ts";
import { InventoryItemType } from "../utils.ts";

export interface SkinDef extends Definition{
    frame?:{
        base?:string
        base_tint?:number
        arm?:string
        arm_tint?:string
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
    quality:ItemQuality,
    item_type?:InventoryItemType.skin
}

export function Skins_Default_Init(skins:Definitions<SkinDef,{}>){
    skins.insert(
        {
            idString:"default_skin",
            quality:ItemQuality.Common,
        },
        {
            idString:"nick_winner",
            quality:ItemQuality.Rare,
        },
        {
            idString:"justin_winner",
            frame:{
                mount:{
                    closed:"player_mounth_1_2",
                    normal:"player_mounth_2_1"
                }
            },
            quality:ItemQuality.Rare,
        },
        {
            idString:"alice_winner",
            quality:ItemQuality.Rare,
        },
        {
            idString:"kaklik",
            quality:ItemQuality.Legendary,
        },
        {
            idString:"kitty",
            quality:ItemQuality.Mythic,
        },
    )
}