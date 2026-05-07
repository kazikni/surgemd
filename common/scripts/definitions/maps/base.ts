import { InventoryItemType } from "../utils.ts";
import { GunDef } from "../items/guns.ts";
import { FloorType, RiversDef } from "../../others/terrain.ts";
import { SpawnMode, type Layers } from "../../others/constants.ts";
import { NormalLobby, NormalMap } from "./normal.ts";
import { DebugMap, SingleBuildMap } from "./debug.ts";
import { Hitbox2D, LootTable, LootTableItemRet, Random1, Vec2, WeightDefinition } from "../../../engine/core.ts";
import { GameDefinition, GameItem } from "../game_defs.ts";
import { TundraMap } from "./tundra.ts";
import { JSONBuildingDef } from "../objects/buildings_base.ts"

import {type GameMap} from "../../../../server/src/game_server/others/map.ts"
import { type Game } from "../../../../server/src/game_server/others/game.ts";
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
export interface BiomeFloor{
    color?:number
}
export interface BiomeDef{
    biome_skin?:string
    floors:Partial<Record<FloorType,BiomeFloor>>
    assets:string[]
    ambient:{
        snow?:boolean
        rain?:boolean
        particles:string[]
        sound?:string
    }
    musics?:string[]
}
export interface IslandDef{
    size:Vec2
    terrain:{
        base:FloorType
        floors:{
            type:FloorType
            padding:number
            variation:number
            spacing:number
        }[]
        rivers?:{
            defs:RiversDef[]
            expansion?:number
            spawn_floor:number
            divisions:number
            floor?:FloorType
        }
    },
    spawn?:{def:string|(WeightDefinition&{def:string})[],count:Random1,layer?:Layers,spawn?:SpawnMode}[][],
}
export interface MapDef{
    loot_tables:Record<string,LootTable>
    default_floor?:FloorType
    biome:BiomeDef
    generation:{
        island?:IslandDef
    }
    assets?:string[]
    buildings?:JSONBuildingDef[]
    seed?:number
    gen_callback?:(map:GameMap)=>void
}
export interface CounterMapDef extends MapDef{
    spawn:Hitbox2D[]
}
export const Maps:Record<string,MapDef>={
    normal:NormalMap,
    lobby:NormalLobby,
    tundra:TundraMap,

    debug:DebugMap,
    single_building:SingleBuildMap,
}