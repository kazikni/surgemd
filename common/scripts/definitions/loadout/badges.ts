import { Definition } from "../../../engine/core.ts";
import { ItemRank } from "../../others/item.ts";
import { GameObjectDefinitionType } from "../utils.ts";

export interface BadgeDef extends Definition{
    rank:ItemRank
    def_type?:GameObjectDefinitionType.badge
}

export function Badges_Default_Init():BadgeDef[]{
    return [
        {idString:"stone_1", rank:ItemRank.E},
        {idString:"stone_2", rank:ItemRank.E},
        {idString:"stone_3", rank:ItemRank.E},

        {idString:"md", rank:ItemRank.S},
        {idString:"campfire", rank:ItemRank.D},
    ]
}
