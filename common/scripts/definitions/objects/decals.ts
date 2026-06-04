import { Definition, Definitions, FrameDef, Hitbox2D, KeyFrameSpriteDef } from "../../../engine/core.ts";

export interface DecalTint{
    color:number
    alpha:number
}
export interface DecalDef extends Definition{
    hitbox?:Hitbox2D
    assets?:{
        main?:FrameDef
        frames?:KeyFrameSpriteDef[]
    }
    lifetime?:number
}
export interface DecalInstanceDef{
    def:string
    tint?:DecalTint
    scale?:number
}
export function Decals_Default_Init(decals:Definitions<DecalDef,{}>){
    decals.insert({
        idString:"explosion_decal",
    })
}