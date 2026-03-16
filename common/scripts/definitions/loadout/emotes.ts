import { Definition, Definitions } from "../../../engine/core.ts";
import { ItemQuality } from "../../others/item.ts";

export interface EmoteDef extends Definition{
    quality:ItemQuality
}
export function Emotes_Default_Init(emotes:Definitions<EmoteDef,{}>){
    emotes.insert(
        {
            idString:"happy",
            quality:ItemQuality.Common
        },
        {
            idString:"sad",
            quality:ItemQuality.Common
        },
        {
            idString:"neutral",
            quality:ItemQuality.Common
        },
        {
            idString:"md_logo",
            quality:ItemQuality.Common
        },
    )
}
