import { Definition, Definitions } from "../../../engine/core.ts";
import { ItemQuality } from "../../others/item.ts";

export interface BadgeDef extends Definition{
    quality:ItemQuality,
}

export function Badges_Default_Init(badges:Definitions<BadgeDef,{}>){
    badges.insert(
        {
            idString:"stone_1_badge",
            quality:ItemQuality.Common
        },
    )
}
