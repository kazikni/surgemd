import { Definition, Definitions } from "../../../engine/core.ts";
import { ItemRank } from "../../others/item.ts";

export interface BadgeDef extends Definition{
    rank:ItemRank,
}

export function Badges_Default_Init(badges:Definitions<BadgeDef,{}>){
    badges.insert(
        {idString:"stone_1", rank:ItemRank.E},
        {idString:"stone_2", rank:ItemRank.E},
        {idString:"stone_3", rank:ItemRank.E},

        {idString:"md", rank:ItemRank.S},
        {idString:"campfire", rank:ItemRank.D},
    )
}
