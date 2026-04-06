import { random, v2 } from "../../../engine/core.ts";
import { Layers } from "../../others/constants.ts";
import { FloorType } from "../../others/terrain.ts";
import { MapDef } from "./base.ts";
import { NormalBiome, NormalMap } from "./normal.ts";

export const DebugMap:MapDef={
    biome:NormalBiome,
    loot_tables:NormalMap.loot_tables,
    generation:{
        island:{
            size:v2.new(500,500),
            terrain:{
                base:FloorType.Water,
                floors:[
                    {
                        padding:30,
                        type:FloorType.Sand,
                        spacing:3,
                        variation:1.3,
                    },
                    {
                        padding:20,
                        type:FloorType.Grass,
                        spacing:3,
                        variation:1.3,
                    }
                ]
            },
        },
    },
    gen_callback(map) {
        let x=map.size.x/2
        let y=map.size.y/2
        let i=0
        for(const item of Object.values(map.game.definitions.game_items.valueNumber)){
            map.game.add_loot(v2.new(x,y),item,Infinity)
            i++
            if(i>=15){
                i=0
                x=map.size.x/2
                y+=2
            }else{
                x+=2
            }
        }
        x=map.size.x/2
        y=map.size.y/2-10
        i=0
        for(const def of Object.values(map.game.definitions.obstacles.valueNumber)){
            const o=map.game.map.add_obstacle(def,undefined,Layers.Normal)
            o.set_position(v2.new(x,y),random.int(0,3))
            i++
            if(i>=15){
                i=0
                x=map.size.x/2
                y-=5
            }else{
                x+=5
            }
        }
        for(const def of Object.values(map.game.definitions.vehicles.valueNumber)){
            const o=map.game.add_vehicle(v2.new(x,y),def,Layers.Normal)
            i++
            if(i>=15){
                i=0
                x=map.size.x/2
                y-=5
            }else{
                x+=5
            }
        }
    },
}