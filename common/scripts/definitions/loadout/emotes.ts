import { Definition, Definitions } from "../../../engine/core.ts";
import { ItemRank } from "../../others/item.ts";

export interface EmoteDef extends Definition{
    rank:ItemRank
}
export function Emotes_Default_Init(emotes:Definitions<EmoteDef,{}>){
    emotes.insert(
        {
            idString:"happy",
            rank:ItemRank.E
        },
        {
            idString:"sad",
            rank:ItemRank.E
        },
        {
            idString:"neutral",
            rank:ItemRank.E
        },
        {
            idString:"md_logo",
            rank:ItemRank.E
        },
    )
}
