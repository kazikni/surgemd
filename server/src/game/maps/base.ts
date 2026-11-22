import { FloorType, type MapBiomeDef, type MapRegion, RiversDef, type TerrainShapeDef } from "common/scripts/others/terrain.ts";
import { LootAditional, SpawnMode, type Layers } from "common/scripts/others/constants.ts";
import { Collider2D, LootTable, Orientation, Random1, Rect,  tdm,  Vec2, WeightDefinition } from "common/engine/core.ts";
import { GameDefinition, type GameADefinitions } from "common/scripts/definitions/game_defs.ts";
import { type SI_GameMap } from "../gelo/map.ts";

export type MapObjectGeneration={def:string|(WeightDefinition&{def:string})[],count:Random1,layer?:Layers,spawn?:SpawnMode}
export interface MapStructureDef extends TerrainShapeDef{
    spawn?:MapObjectGeneration[]
    region?:MapRegion
}
export interface IslandDef{
    position?:Vec2
    size?:Vec2
    spawn?:MapObjectGeneration[]
    structures?:MapStructureDef[]
    terrain?:{
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
export interface MapObjectItem{
    def:string
    position:Vec2
    layer?:number
    count:number
    velocity?:Vec2
    skin?:number
    aditional?:{count:number,item:string}[]
}
export interface MapObjectBuilding{
    def:string
    position:Vec2
    side?:Orientation
    layer?:number
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
        callback?:(map:SI_GameMap)=>void
        objects?:{
            buildings?:MapObjectBuilding[]
            items?:MapObjectItem[]
        }
    }
    assets?:{
        textures?:string[]
    }
    players_spawn?:SpawnMode
    definitions?:GameADefinitions
    seed?:number
    biome:MapBiomeDef
    deadzone_initial_size?:number
}
export interface CounterMapDef extends MapDef{
    spawn:Collider2D[]
}