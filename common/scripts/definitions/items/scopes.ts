import { Definition, TD, tdm, TDType } from "../../../engine/core.ts";
import { ItemRank } from "../../others/item.ts";
import { GameItemDefTD, type GameItemType, type GameObjectDefinitionType } from "../utils.ts";
export const ScopeTD:TD={
    type:TDType.object,
    content:[
        ...GameItemDefTD,

        {name:"scope_view",content:tdm.float32},
        {name:"droppable",content:tdm.boolean},
    ]
}
export interface ScopeDef extends Definition{
    def_type?:GameObjectDefinitionType.item
    item_type?:GameItemType.scope
    name?:string
    tname?:string
    rank:ItemRank

    scope_view:number
    droppable:boolean
}


export function Scopes_Default_Init():ScopeDef[]{
    let scope_view:number=0.87
    const ret:ScopeDef[]=[
        {
            idString:"scope_1", // 1x
            scope_view:scope_view,
            droppable:false,
            rank:ItemRank.E
        }
        /*
        {
            idString:"scope_0d1", // 1x
            scope_view:scope_view*1.25,
            rank:ItemRank.E,
            droppable:true
        },{
            idString:"scope_0d2", // 1x
            scope_view:scope_view*1.5,
            rank:ItemRank.E,
            droppable:true
        },{
            idString:"scope_0d3", // 1x
            scope_view:scope_view*2,
            rank:ItemRank.E,
            droppable:true
        }
        */
    ]
    for(let i=2;i<=7;i++){
        scope_view*=0.743
        ret.push({
            idString:"scope_"+i,
            scope_view:scope_view,
            droppable:true,
            rank:ItemRank.E
        })
    }
    return ret
}