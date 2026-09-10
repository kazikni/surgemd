import { tdm, TDObject, TDType, Vec2, Vec2TD } from "../../../engine/core.ts";
import { HitParticlesDef, HitSoundsDef } from "../utils.ts";

export const WallsClientTD: TDObject = {
    type: TDType.object,
    content: [
        { name: "positions", content: {type:TDType.array,content:{type:TDType.array,content:Vec2TD,len_bytes:2},len_bytes:2}},
        { name: "no_collisions", content: tdm.boolean },
        { name: "no_bullet_collision", content: tdm.boolean },

        { name: "width", content: tdm.float32_onu },
        { name: "stroke_width", content: tdm.float32_onu },
        { name: "tint", content: tdm.uint32 },

        // Assets
        {
            name: "assets",
            content: {
                type: TDType.onu,
                content: {
                    type: TDType.object,
                    content: [
                        { name: "sounds", content: tdm.any },
                        { name: "particles", content: tdm.any },
                    ]
                }
            }
        }
    ]
}
export const WallsTD: TDObject = {
    type: TDType.object,
    content: [
        ...WallsClientTD.content,

        { name: "reflect_bullets", content: tdm.boolean },
    ]
}
export interface WallsDef{
    no_collisions?: boolean
    no_bullet_collision?: boolean
    reflect_bullets?:boolean
    passable_by_bullets?:boolean

    position?:Vec2
    side?:number

    positions:Vec2[][]
    width?:number
    stroke_width?:number
    tint?:number

    assets?:{
        sounds?:HitSoundsDef
        particles?:HitParticlesDef
    }
}