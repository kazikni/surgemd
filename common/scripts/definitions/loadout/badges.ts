import { Definition } from "../../../engine/core.ts";
import { ItemRank } from "../../others/item.ts";
import { GameObjectDefinitionType } from "../utils.ts";

export interface BadgeDef extends Definition{
    rank:ItemRank
    def_type?:GameObjectDefinitionType.badge
}

export function Badges_Default_Init():BadgeDef[]{
    return [
        {id_string:"stone_1", rank:ItemRank.E},
        {id_string:"stone_2", rank:ItemRank.E},
        {id_string:"stone_3", rank:ItemRank.E},

        {id_string:"md", rank:ItemRank.S},
        {id_string:"campfire", rank:ItemRank.D},
    ]
}
