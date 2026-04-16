import { InventoryItemType } from "../utils.ts";
import { GunDef } from "../items/guns.ts";
import { FloorType, RiversDef } from "../../others/terrain.ts";
import { SpawnMode, type Layers } from "../../others/constants.ts";
import { NormalLobby, NormalMap } from "./normal.ts";
import {type GameMap} from "../../../../server/src/game_server/others/map.ts"
import { DebugMap, SingleBuildMap } from "./debug.ts";
import { AbstractGame, Hitbox2D, LootTable, LootTableItemRet, Random1, Vec2 } from "../../../engine/core.ts";
import { GameDefinition, GameItem } from "../game_defs.ts";
import { TundraMap } from "./tundra.ts";
export interface Aditional{
    withammo:boolean
}
export function loot_table_get_item(item:string,count:number,_aditional:Aditional,game:AbstractGame<any>):LootTableItemRet<GameItem>[]{
    //@ts-ignore
    const itemD=(game.definitions as GameDefinition).game_items.valueString[item]
    if(!itemD){
        console.error(item,"Not Founded")
    }
    if(itemD.item_type===InventoryItemType.gun){
        const ret:LootTableItemRet<GameItem>[]=[
            {
                item:itemD,
                count:count
            }
        ]
        if(itemD.ammoSpawnAmount){
            //@ts-ignore
            const ammo_def=(game.definitions as GameDefinition).game_items.valueString[(itemD as unknown as GunDef).ammoSpawn??(itemD as unknown as GunDef).ammoType]
            ret.push({
                item:ammo_def,
                count:(itemD as unknown as GunDef).ammoSpawnAmount!
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
    spawn?:{id:string,count:Random1,layer?:Layers,spawn?:SpawnMode}[][],
}
export interface MapDef{
    loot_tables:Record<string,LootTable>
    default_floor?:FloorType
    biome:BiomeDef
    generation:{
        island?:IslandDef
    }
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