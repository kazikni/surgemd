import { Definition, FrameDef, FrameTD, FrameTransform, Hitbox2D, Random1, Rect, tdm, TDObject, TDType, TilemapLayer, Vec2, Vec2TD, WeightDefinition } from "../../../engine/core.ts";
import { SMRF } from "../../../engine/core/lang/context_command.ts";
import { SpawnMode } from "../../others/constants.ts";
import { FloorType } from "../../others/terrain.ts";
import { GameObjectDefTD, HitParticlesDef, HitSoundsDef, ScopeChange } from "../utils.ts";
import { DecalTint } from "./decals.ts";
import { WallsDef, WallsTD } from "./walls.ts";
//20mm = 0.17619
//2mm  = 0.017619

const building_object_obstacle_td:TDObject={
    type: TDType.object,
    content: [
        { name: "def", content: tdm.any },
        { name: "id", content: tdm.uint16_onu },
        { name: "position", content: Vec2TD },
        { name: "connections", content: tdm.any },
        { name: "skin", content: tdm.uint8_onu },
        { name: "variation", content: tdm.uint8_onu },
        { name: "layer", content: tdm.int8_onu },
        { name: "rotation", content: tdm.float32_onu },
        { name: "scale", content: tdm.float32_onu },
        { name: "stairs_dest", content: tdm.any },
        { name: "only_side", content: tdm.uint8_onu },
        { name: "allow_biome_skin", content: tdm.boolean },
    ]
}
const building_object_decal_td:TDObject={
    type: TDType.object,
    content: [
        { name: "def", content: tdm.string1 },
        { name: "position", content: Vec2TD },
        { name: "rotation", content: tdm.float32_onu },
        { name: "scale", content: tdm.float32_onu },
        { name: "layer", content: tdm.int8_onu },
        { name: "tint", content: tdm.any },
    ]
}
const building_object_sub_building_td:TDObject={
    type: TDType.object,
    content: [
        { name: "def", content: tdm.any },
        { name: "position", content: Vec2TD },
        { name: "layer", content: tdm.int8_onu },
        { name: "rotation", content: tdm.uint8_onu },
    ]
}
const building_object_loot_td:TDObject={
    type: TDType.object,
    content: [
        { name: "table", content: tdm.string1 },
        { name: "position", content: Vec2TD },
    ]
}
export const BuildingClientTD: TDObject = {
    type: TDType.object,
    content: [
        ...GameObjectDefTD,

        { name: "no_collisions", content: tdm.boolean },
        { name: "no_bullet_collision", content: tdm.boolean },
        { name: "is_ghost", content: tdm.boolean },

        { name: "hitbox", content: tdm.any },
        
        // Ceiling
        {
            name: "ceiling",
            content: {
                type: TDType.onu,
                content: {
                    type: TDType.array,
                    len_bytes: 2,
                    content: {
                        type: TDType.object,
                        content: [
                            { name: "frame", content: FrameTD },
                            { name: "variations", content: tdm.any },
                            { name: "hitbox", content: tdm.any },

                            {
                                name: "below",
                                content: {
                                    type: TDType.onu,
                                    content: {
                                        type: TDType.object,
                                        content: [
                                            { name: "deenabled", content: tdm.boolean },
                                            { name: "duration", content: tdm.float32_onu },
                                            { name: "alpha", content: tdm.float32_onu },
                                        ]
                                    }
                                }
                            },

                            { name: "layer", content: tdm.int8_onu },
                            { name: "connections", content: tdm.any },
                            { name: "scope_change", content: tdm.any },

                            {
                                name: "destroy",
                                content: {
                                    type: TDType.onu,
                                    content: {
                                        type: TDType.object,
                                        content: [
                                            { name: "frame", content: FrameTD },
                                            { name: "sound", content: tdm.string1_onu },
                                            { name: "count", content: tdm.uint8 },
                                            {
                                                name: "particles",
                                                content: {
                                                    type: TDType.onu,
                                                    content: {
                                                        type: TDType.object,
                                                        content: [
                                                            ...FrameTD.content,
                                                            { name: "count", content: tdm.uint8 },
                                                            { name: "speed", content: tdm.any },
                                                            { name: "scale_variation", content: tdm.any },
                                                        ]
                                                    }
                                                }
                                            }
                                        ]
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        },
        // Floor Images
        {
            name: "floor_image",
            content: {
                type: TDType.onu,
                content: {
                    type: TDType.array,
                    len_bytes: 1,
                    content: {
                        type: TDType.object,
                        content: [
                            ...FrameTD.content,
                            { name: "create_shadow", content: tdm.boolean }
                        ]
                    }
                }
            }
        },
        // Floor SMRF
        {
            name: "floor_smrf",
            content: {
                type: TDType.onu,
                content: {
                    type: TDType.array,
                    len_bytes: 1,
                    content: tdm.any
                }
            }
        },
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
export const BuildingTD: TDObject={
    type:TDType.object,
    content:[
        ...BuildingClientTD.content,
        { name: "spawnHitbox", content: tdm.any },
        { name: "spawnMode", content: tdm.any },
        { name: "reflect_bullets", content: tdm.boolean },
        { name: "no_spawn_collision", content: tdm.boolean },
        {
            name: "generate",
            content: {
                type: TDType.object,
                content: [
                    // Obstacles
                    {
                        name: "obstacles",
                        content: {
                            type: TDType.onu,
                            content: {
                                type: TDType.array,
                                len_bytes: 2,
                                content: building_object_obstacle_td
                            }
                        }
                    },
                    {
                        name:"walls",
                        content:{type:TDType.array,content:WallsTD,len_bytes:2},
                    },
                    // Decals
                    {
                        name: "decals",
                        content: {
                            type: TDType.onu,
                            content: {
                                type: TDType.array,
                                len_bytes: 2,
                                content: building_object_decal_td,
                            }
                        }
                    },
                    {
                        name: "sub_building",
                        content: {
                            type: TDType.onu,
                            content: {
                                type: TDType.array,
                                len_bytes: 2,
                                content: building_object_sub_building_td
                            }
                        }
                    },
                    {
                        name: "tilemapv",
                        content: tdm.any
                    },
                    // Loots
                    {
                        name: "loots",
                        content: {
                            type: TDType.onu,
                            content: {
                                type: TDType.array,
                                len_bytes: 2,
                                content: building_object_loot_td
                            }
                        }
                    },
                    // Floors
                    {
                        name: "floors",
                        content: {
                            type: TDType.onu,
                            content: {
                                type: TDType.array,
                                len_bytes: 2,
                                content: {
                                    type: TDType.object,
                                    content: [
                                        { name: "hitbox", content: tdm.any },
                                        { name: "type", content: tdm.uint8 },
                                        { name: "layer", content: tdm.int8_onu },
                                    ]
                                }
                            }
                        }
                    },
                    // Stair Data
                    {
                        name: "stair_data",
                        content: {
                            type: TDType.onu,
                            content: {
                                type: TDType.array,
                                len_bytes: 1,
                                content: {
                                    type: TDType.object,
                                    content: [
                                        { name: "hitbox", content: tdm.any },
                                        { name: "dest", content: tdm.uint8 },
                                    ]
                                }
                            }
                        }
                    },
                ]
            }
        },
    ]
}
export type BuildingCeilingDef={
    frame:FrameDef
    variations?:number[]
    hitbox:Hitbox2D
    below?:{
        deenabled?:boolean
        duration?:number
        alpha?:number
    }
    layer?:number
    connections?:number[]
    scope_change?:ScopeChange
    destroy?:{
        frame:FrameDef
        sound?:string
        count:number
        particles?:FrameDef&{
            count:number
            speed?:Random1
            scale_variation?:Random1
        }
    }
}
export type PuzzlePiece={
    id?:string
    value?:string
}
export enum BuildingObjectType{
    obstacle,
    subbuilding,
    decal,
    loot
}

export type BuildingObjectDecal={
    def:string
    position:Vec2
    rotation?:number
    scale?:number
    layer?:number
    tint?:DecalTint
}
export type BuildingObjectLoot={
    table:string
    position:Vec2
}
export type BuildingObjectSubBuilding={
    def:string|((WeightDefinition&{def:string})[])
    position:Vec2
    layer?:number
    rotation?:0|1|2|3
}
export type BuildingObjectObstacle={
    def:string|((WeightDefinition&{def?:string})[])
    id?:number
    position:Vec2
    connections?:number[]
    skin?:number
    variation?:number
    layer?:number
    rotation?:number
    scale?:number
    stairs_dest?:Record<number,number>
    allow_biome_skin?:boolean
    press_data?:{
        activated?:boolean
        locked?:boolean
        allow_switch?:boolean
    }
    door_data?:{
        locked?:boolean
        cant_close?:boolean
        only_side?:-1|1
        open_state?:-1|0|1
    }
    puzzle_piece?:PuzzlePiece
}
export type BuildingObject=({
    type:BuildingObjectType.obstacle
}&BuildingObjectObstacle)|({
    type:BuildingObjectType.subbuilding
}&BuildingObjectSubBuilding)|({
    type:BuildingObjectType.decal
}&BuildingObjectDecal)|({
    type:BuildingObjectType.loot
}&BuildingObjectDecal)

export type PuzzleCondition=({
    type:"code"
    value?:string
    dont_need_orden?:boolean
}|{
    type:"break"
    id?:number|number[]
}|{
    type:"press"
    id?:number|number[]
})&{
    negate?:boolean
}
export type PuzzleAction={
    type:"door"
    id:number|number[]
    locked?:boolean
    cant_close?:boolean
    only_side?:-1|1
    open_state?:-1|0|1
}|{
    type:"press"
    id:number|number[]
    locked?:boolean
    can_switch?:boolean
    activated?:boolean
}|{
    type:"wait"
    time:number
}|{
    type:"puzzle"
    id?:string // undefined = self
    lock?:boolean
    solved?:boolean
}|{
    type:"check_fail"
}
export interface BuildingPuzzleDef{
    idString?:string // Default = "main"
    global?:boolean
    code?:{
        value?:string
        size:number
    }

    complete_actions?:PuzzleAction[]
    complete_conditions?:PuzzleCondition[]

    fail_actions?:PuzzleAction[]
    fail_conditions?:PuzzleCondition[]

    check_actions?:PuzzleAction[]
}
export interface BuildingDef extends Definition{
    no_collisions?: boolean
    no_bullet_collision?: boolean
    reflect_bullets?:boolean
    no_spawn_collision?:boolean
    is_ghost?:boolean

    ceiling?:BuildingCeilingDef[]
    floor_image?:(FrameDef&{create_shadow?:boolean})[]
    floor_smrf?:(FrameTransform&{content:SMRF})[]

    generate:{
        obstacles?:BuildingObjectObstacle[]
        walls?:WallsDef[]
        decals?:BuildingObjectDecal[]
        sub_building?:BuildingObjectSubBuilding[]
        loots?:BuildingObjectLoot[]
        floors?:{hitbox:Hitbox2D,type:FloorType,visible?:boolean,layer?:number}[]
        stair_data?:{
            hitbox:Hitbox2D
            dest:number
        }[]
        puzzles?:BuildingPuzzleDef[]
    }
    spawnHitbox?:Hitbox2D
    hitbox?:Hitbox2D
    spawnMode?:SpawnMode
    assets?:{
        sounds?:HitSoundsDef
        particles?:HitParticlesDef
    }
}