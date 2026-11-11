import { v2 } from "../../../engine/core.ts";
import { Layers, type LootData, object_instance_type } from "../../others/constants.ts";
import { type SI_Obstacle } from "../../game/objects/static_body/obstacle.ts";
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
            const scene=map.scene
            const defs=scene.app.definitions
            const center=v2.dscale(map.size,2)
            let x=center.x
            let y=center.y
            let i=0
            const next=(cols:number,step:number,dy:number)=>{
                i++
                if(i>=cols){
                    i=0
                    x=center.x
                    y+=dy
                }else{
                    x+=step
                }
            }
            const add_loot=(data:LootData)=>{
                scene.add_object(scene.make_object(object_instance_type.loot),Layers.Normal,undefined,{data,position:v2(x,y)})
                next(10,2,2)
            }
            for(const item of Object.values(defs.game_items.valueNumber)){
                add_loot({item,count:Infinity})
                const skins=(item as {skins?:unknown[]}).skins
                if(skins){
                    for(let skin=0;skin<skins.length;skin++)add_loot({item,count:Infinity,skin})
                }
            }
            x=center.x
            y=center.y-10
            i=0
            for(const def of Object.values(defs.obstacles.valueNumber)){
                const o=scene.add_object(scene.make_object(object_instance_type.obstacle),Layers.Normal,undefined,{def}) as SI_Obstacle
                o.init(0)
                o.set_position(v2(x,y))
                next(25,5,-5)
            }
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
        callback(map:any) {
            //const def=map.scene.game.definitions.buildings.getFromString("shed")
            //const def=map.scene.game.definitions.buildings.getFromString("puzzle_test")
            //const def=map.scene.game.definitions.buildings.getFromString("storehouse_1")
            //const def=map.scene.game.definitions.buildings.getFromString("bunker_1")
            const def=map.scene.app.definitions.buildings.getFromString("bunker_2")
            //const def=map.scene.game.definitions.buildings.getFromString("watchtower")

            //const def=map.scene.game.definitions.buildings.getFromString("blue_container_1")
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