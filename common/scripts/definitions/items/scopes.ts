import { Definition, Definitions } from "../../../engine/core.ts";
import { ItemRank } from "../../others/item.ts";
import { InventoryItemType } from "../utils.ts";
export interface ScopeDef extends Definition{
    scope_view:number
    droppable:boolean
    rank:ItemRank
    item_type?:InventoryItemType.scope
}

export function Scopes_Default_Init(scopes:Definitions<ScopeDef,{}>){
    scopes.insert(
        {
            idString:"scope_1", // 1x
            scope_view:0.9,
            droppable:false,
            rank:ItemRank.E
        },
        {
            idString:"scope_2", //2x
            scope_view:0.693, //77% of 0.9
            droppable:true,
            rank:ItemRank.E
        },
        {
            idString:"scope_3", //4x
            scope_view: 0.53361,
            droppable:true,
            rank:ItemRank.D
        },
        {
            idString:"scope_4", //6x
            scope_view:0.41087,
            droppable:true,
            rank:ItemRank.C
        },
        {
            idString:"scope_5", // 8x
            scope_view: 0.31637,
            droppable:true,
            rank:ItemRank.B
        },
        {
            idString:"scope_6",
            scope_view:0.24361,
            droppable:true,
            rank:ItemRank.A
        },
        {
            idString:"scope_7",
            scope_view:0.18758, //80% of 0.29491
            droppable:true,
            rank:ItemRank.S
        },
    )
}