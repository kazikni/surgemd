import { Definition, Definitions, FrameDef, Collider2D, KeyFrameSpriteDef } from "../../../engine/core.ts";

export interface DecalTint{
    color:number
    alpha:number
}
export interface DecalDef extends Definition{
    collider?:Collider2D
    assets?:{
        main?:FrameDef
        frames?:KeyFrameSpriteDef[]
    }
    lifetime?:number
}
export interface DecalInstanceDef{
    def:string
    lifetime?:number
    tint?:DecalTint
    scale?:number
}
export function Decals_Default_Init():DecalDef[]{
    return [
        {
            id_string:"explosion_decal",
        },
        {
            id_string:"wood_pallet",
        }
    ]
}