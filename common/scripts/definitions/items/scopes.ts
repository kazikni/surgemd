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
            idString:"scope_1",
            scope_view:0.75,
            droppable:false,
            quality:ItemQuality.Common
        },
        {
            idString:"scope_2",
            scope_view:0.65,
            droppable:true,
            quality:ItemQuality.Common
        },
        {
            idString:"scope_3",
            scope_view:0.55,
            droppable:true,
            quality:ItemQuality.Uncommon
        },
        {
            idString:"scope_4",
            scope_view:0.45,
            droppable:true,
            quality:ItemQuality.Rare
        },
        {
            idString:"scope_5",
            scope_view:0.35,
            droppable:true,
            quality:ItemQuality.Epic
        },
        {
            idString:"scope_6",
            scope_view:0.30,
            droppable:true,
            quality:ItemQuality.Mythic
        },
        {
            idString:"scope_7",
            scope_view:0.25,
            droppable:true,
            quality:ItemQuality.Legendary
        },
    )
}