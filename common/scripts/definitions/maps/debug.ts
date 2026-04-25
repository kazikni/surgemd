import { random, v2, v2m } from "../../../engine/core.ts";
import { Layers } from "../../others/constants.ts";
import { FloorType } from "../../others/terrain.ts";
import { MapDef } from "./base.ts";
import { NormalBiome, NormalMap } from "./normal.ts";

export const DebugMap:MapDef={
    biome:NormalBiome,
    loot_tables:NormalMap.loot_tables,
    generation:{
        island:{
            size:v2(500,500),
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
            map.game.add_loot(v2(x,y),item,Infinity)
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
            o.initialize(0)
            o.set_position(v2(x,y))
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
            const v=map.game.add_vehicle(v2(x,y),def,Layers.Normal)
            i++
            if(i>=15){
                i=0
                x=map.size.x/2
                y-=5
            }else{
                x+=5
            }
        }
        /*for(const def of Object.values(map.game.definitions.buildings.valueNumber)){
            const b=map.game.map.add_building(def)
            b.generate(v2(x,y),1)
            i++
            if(i>=15){
                i=0
                x=map.size.x/2
                y-=5
            }else{
                x+=5
            }
        }*/
    },
}

export const SingleBuildMap:MapDef={
    biome:NormalBiome,
    loot_tables:NormalMap.loot_tables,
    generation:{
        island:{
            size:v2(80,80),
            terrain:{
                base:FloorType.Water,
                floors:[
                    {
                        padding:10,
                        type:FloorType.Sand,
                        spacing:3,
                        variation:1.3,
                    },
                    {
                        padding:5,
                        type:FloorType.Grass,
                        spacing:3,
                        variation:1.3,
                    }
                ]
            },
        },
    },
    gen_callback(map) {
        //const def=map.game.definitions.buildings.getFromString("shed")
        const def=map.game.definitions.buildings.getFromString("small_iron_stairs")
        //const def=map.game.definitions.buildings.getFromString("small_house_1")

        const b=map.game.map.add_building(def)
        b.generate(v2.dscale(map.size,2),0)

        /*let pos=v2.dscale(map.size,2)
        for(let i=0;i<5;i++){
            v2m.add(pos,pos,v2(5,0))
            const b=map.game.map.add_building(def,Layers.Normal-i-1)
            b.generate(pos,0)
        }
        pos=v2.dscale(map.size,2)
        for(let i=0;i<5;i++){
            v2m.sub(pos,pos,v2(5,0))
            const b=map.game.map.add_building(def,Layers.Normal+i+1)
            b.generate(pos,2)
        }*/
    },
}