import { FloorType, RiversDef } from "../../others/terrain.ts";
import { LootAditional, SpawnMode, type Layers } from "../../others/constants.ts";
import { Hitbox2D, LootTable, Random1, Rect,  tdm,  Vec2, WeightDefinition } from "../../../engine/core.ts";
import { GameDefinition, type GameADefinitions } from "../game_defs.ts";

import { type GameMap } from "../../../../server/src/game/others/map.ts"
import { type MapRegion } from "../../packets/map_packet.ts";

export type MapObjectGeneration={def:string|(WeightDefinition&{def:string})[],count:Random1,layer?:Layers,spawn?:SpawnMode}
export interface TerrainLayerDef {
    type:FloorType
    tint?:number
    layer?:number
    padding:number
    variation:number
    spacing:number
}
export interface TerrainShapeDef {
    radius:number

    position?:Vec2

    variation?:number
    points?:number
    passes?:number
    variation_decay?:number

    floors:TerrainLayerDef[]
}
export interface MapStructureDef extends TerrainShapeDef{
    spawn?:MapObjectGeneration[]
    region?:MapRegion
}
export interface IslandDef{
    position?:Vec2
    size?:Vec2
    spawn?:MapObjectGeneration[]
    structures?:MapStructureDef[]
    terrain:{
        rivers?:{
            defs:RiversDef[]
            expansion?:number
            spawn_floor:number
            divisions:number
        }
    }&TerrainShapeDef,
}
export const MapBiomeTD = tdm.ctx.parse(`{
    skin:string1?,
    skin_chance:float32?,

    skins_replace:any,

    floors:any,

    particles:string1[1],
    particles_tint:uint32?,

    ambient_sound:string1?,

    musics:string1[1],
    textures:string1[1],
}`)
export interface MapBiomeDef{
    skin?:string
    skin_chance?:number
    skins_replace?:Record<string,string|string[]>
    floors:Partial<Record<FloorType,number>>
    particles:string[]
    particles_tint?:number
    ambient_sound?:string
    musics:string[]
    textures:string[]
}
export const MapTD = tdm.ctx.parse(`{
    loot_tables:any,
    default_floor:uint8?,
    size:{x:uint16,y:uint16},
    bounds:any,
    bounds_size:float32?,
    generation:{
        base:uint8,
        base_tint:uint32?,
        spawn:any,
        islands:{
            position:vec2?,
            size:vec2?,
            spawn:any,
            structures:{
                radius:float32,
                position:vec2?,
                variation:float32?,
                points:uint8?,
                passes:uint8?,
                variation_decay:float32?,
                floors:any,
                spawn:any,
                region:any,
            }[2]?,
            terrain:{
                rivers:any,
                radius:float32,
                position:vec2?,
                variation:float32?,
                points:uint8?,
                passes:uint8?,
                variation_decay:float32?,
                floors:any,
            },
        }[2]?,
        callback:any,
    },
    definitions:GameDefinitions?,
    seed:uint32?,
    biome:MapBiome,
    deadzone_initial_size:float32?,
}`,{MapBiome:MapBiomeTD,GameDefinitions:GameDefinition.add_td})
export interface MapDef{
    loot_tables:Record<string,LootTable<LootAditional>>
    default_floor?:FloorType
    size:Vec2
    bounds?:Rect
    bounds_size?:number
    generation:{
        base:FloorType
        base_tint?:number
        spawn?:MapObjectGeneration[]
        islands?:IslandDef[]
        callback?:(map:GameMap)=>void
    }
    definitions?:GameADefinitions
    seed?:number
    biome:MapBiomeDef
    deadzone_initial_size?:number
}
export interface CounterMapDef extends MapDef{
    spawn:Hitbox2D[]
}