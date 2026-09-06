import { v2 } from "../../../engine/core.ts";
import { Layers } from "../../others/constants.ts";
import { FloorType } from "../../others/terrain.ts";
import { MapDef } from "./base.ts";
import { NormalBiome, NormalMap } from "./normal.ts";

export const DebugMap:MapDef={
    biome:NormalBiome,
    loot_tables:NormalMap.loot_tables,
    size:v2(550,550),
    generation:{
        base:FloorType.Water,
        islands:[{
            terrain:{
                radius:230,
                passes:3,
                points:5,
                variation:50,
                floors:[
                    {
                        padding:0,
                        type:FloorType.Sand,
                        spacing:3,
                        variation:3,
                    },
                    {
                        padding:10,
                        type:FloorType.Grass,
                        spacing:3,
                        variation:3,
                    }
                ]
            },
        }],
        callback(map) {
            let x=map.size.x/2
            let y=map.size.y/2
            let i=0
            for(const item of Object.values(map.scene.game.definitions.game_items.valueNumber)){
                map.scene.add_loot(v2(x,y),{item,count:Infinity})
                i++
                if(i>=10){
                    i=0
                    x=map.size.x/2
                    y+=2
                }else{
                    x+=2
                }
                if((item as any).skins){
                    for(let skin=0;skin<((item as any).skins as string[]).length;skin++){
                        map.scene.add_loot(v2(x,y),{item,count:Infinity,skin})
                        i++
                        if(i>=10){
                            i=0
                            x=map.size.x/2
                            y+=2
                        }else{
                            x+=2
                        }
                    }
                }
            }
            x=map.size.x/2
            y=map.size.y/2-10
            i=0
            for(const def of Object.values(map.scene.game.definitions.obstacles.valueNumber)){
                const o=map.add_obstacle(def,Layers.Normal)
                o.initialize(0)
                o.set_position(v2(x,y))
                i++
                if(i>=25){
                    i=0
                    x=map.size.x/2
                    y-=5
                }else{
                    x+=5
                }
            }
            for(const def of Object.values(map.scene.game.definitions.vehicles.valueNumber)){
                const v=map.scene.add_vehicle(v2(x,y),def,Layers.Normal)
                i++
                if(i>=25){
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
    },
}

export const SingleBuildMap:MapDef={
    biome:NormalBiome,
    loot_tables:NormalMap.loot_tables,
    size:v2(150,100),
    generation:{
        base:FloorType.Water,
        islands:[{
            terrain:{
                radius:50,
                passes:1,
                points:5,
                variation:1,
                floors:[
                    {
                        padding:0,
                        type:FloorType.Sand,
                        spacing:1,
                        variation:1,
                    },
                    {
                        padding:10,
                        type:FloorType.Grass,
                        spacing:1,
                        variation:1,
                    }
                ]
            },
        }],
        callback(map) {
            //const def=map.scene.game.definitions.buildings.getFromString("shed")
            const def=map.scene.game.definitions.buildings.getFromString("puzzle_test")
            //const def=map.scene.game.definitions.buildings.getFromString("storehouse_1")
            //const def=map.scene.game.definitions.buildings.getFromString("bunker_1")
            //const def=map.scene.game.definitions.buildings.getFromString("small_house_1")
            //const def=map.scene.game.definitions.buildings.getFromString(`${random.choose(["yellow","blue","red","green"])}_container_${random.int(1,2)}`)
            //const def=map.scene.game.definitions.buildings.getFromString("black_container")

            const b=map.add_building(def)
            b.init(0)
            b.generate(v2.dscale(map.size,2))

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
    },
}