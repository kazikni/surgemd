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
            scope_view:1,
            droppable:false,
            rank:ItemRank.E
        },
        {
            idString:"scope_2", //2x
            scope_view:0.755, //75.5% of 1
            droppable:true,
            rank:ItemRank.E
        },
        {
            idString:"scope_3", //4x
            scope_view:0.570025,
            droppable:true,
            rank:ItemRank.D
        },
        {
            idString:"scope_4", //6x
            scope_view:0.430368875,
            droppable:true,
            rank:ItemRank.C
        },
        {
            idString:"scope_5", // 8x
            scope_view: 0.324928500625,
            droppable:true,
            rank:ItemRank.B
        },
        {
            idString:"scope_6",
            scope_view:0.245321017971875,
            droppable:true,
            rank:ItemRank.A
        },
        {
            idString:"scope_7",
            scope_view:0.18521736856876564,
            droppable:true,
            rank:ItemRank.S
        },
    )
}