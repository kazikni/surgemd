import { FloorType, RiversDef } from "../../others/terrain.ts";
import { LootAditional, SpawnMode, type Layers } from "../../others/constants.ts";
import { Hitbox2D, LootTable, Random1, Rect, Vec2, WeightDefinition } from "../../../engine/core.ts";
import { type GameADefinitions } from "../game_defs.ts";

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
    }
    definitions?:GameADefinitions
    seed?:number
    biome:MapBiomeDef
    deadzone_initial_size?:number
    gen_callback?:(map:GameMap)=>void
}
export interface CounterMapDef extends MapDef{
    spawn:Hitbox2D[]
}