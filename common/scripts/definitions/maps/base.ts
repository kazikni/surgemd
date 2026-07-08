import { InventoryItemType } from "../utils.ts";
import { GunDef } from "../items/guns.ts";
import { FloorType, RiversDef } from "../../others/terrain.ts";
import { SpawnMode, type Layers } from "../../others/constants.ts";
import { Hitbox2D, LootTable, LootTableItemRet, Random1, Vec2, WeightDefinition } from "../../../engine/core.ts";
import { type GameADefinitions, GameDefinition, GameItem } from "../game_defs.ts";

import { type GameMap } from "../../../../server/src/game/others/map.ts"
import { type Game } from "../../../../server/src/game/others/game.ts";
import { type MapRegion } from "../../packets/map_packet.ts";
export interface Aditional{
    withammo:boolean
}
export function loot_table_get_item(item:string,count:number,_aditional:Aditional,game:Game):LootTableItemRet<GameItem>[]{
    const itemD=(game.definitions as GameDefinition).game_items.valueString[item]
    if(!itemD){
        console.error(item,"Not Founded")
        return []
    }
    if(itemD.item_type===InventoryItemType.gun){
        const ret:LootTableItemRet<GameItem>[]=[
            {
                item:itemD,
                count:count
            }
        ]
        if(itemD.ammo_spawn){
            const ammo_def=(game.definitions as GameDefinition).game_items.valueString[(itemD as unknown as GunDef).ammo_spawn?.type??(itemD as unknown as GunDef).ammo_type]
            ret.push({
                item:ammo_def,
                count:(itemD as GunDef).ammo_spawn!.amount
            })
        }
        return ret
    }else{
        return [
            {
                item:itemD,
                count:count
            }
        ]
    }
}
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
    spawn?:MapObjectGeneration[]
    structures?:MapStructureDef[]
    terrain:{
        base:FloorType
        base_tint?:number
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
    loot_tables:Record<string,LootTable>
    default_floor?:FloorType
    size:Vec2
    generation:{
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