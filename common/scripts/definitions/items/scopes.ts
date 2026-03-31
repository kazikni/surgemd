import { Definition, Definitions } from "../../../engine/core.ts";
import { ItemQuality } from "../../others/item.ts";
import { InventoryItemType } from "../utils.ts";
export interface ScopeDef extends Definition{
    scope_view:number
    droppable:boolean
    quality:ItemQuality
    item_type?:InventoryItemType.scope
}

export function Scopes_Default_Init(scopes:Definitions<ScopeDef,{}>){
    scopes.insert(
        {
            idString:"scope_1", // 1x
            scope_view:0.75,
            droppable:false,
            quality:ItemQuality.Common
        },
        {
            idString:"scope_2", //2x
            scope_view:0.60, //80% of 0.75
            droppable:true,
            quality:ItemQuality.Common
        },
        {
            idString:"scope_3", //4x
            scope_view:0.48,    //80% of 0.60
            droppable:true,
            quality:ItemQuality.Uncommon
        },
        {
            idString:"scope_4", //6x
            scope_view:0.384, //80% of 0.48
            droppable:true,
            quality:ItemQuality.Rare
        },
        {
            idString:"scope_5", // 8x
            scope_view:0.3072, //80% of 0.384
            droppable:true,
            quality:ItemQuality.Epic
        },
        {
            idString:"scope_6",
            scope_view:0.24576,  //80% of 0.3072
            droppable:true,
            quality:ItemQuality.Mythic
        },
        {
            idString:"scope_7",
            scope_view:0.196608, //80% of 0.24576
            droppable:true,
            quality:ItemQuality.Legendary
        },
    )
}