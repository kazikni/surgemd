import { v2 } from "../../../engine/core.ts";
import { FloorType } from "../../others/terrain.ts";
import { LootTables } from "../loot_tables.ts";
import { type MapDef } from "./base.ts";
import { FallBiome, map_spawns } from "./normal.ts";
const terrain={
    radius:150,
    passes:3,
    points:6,
    variation:30,
    rivers:{
        divisions:50,
        spawn_floor:1,
        expansion:32,
        defs:[
            {
                rivers:[
                    {width:15,width_variation:2},
                    {width:15,width_variation:2},
                    {width:15,width_variation:2},
                    {width:9,width_variation:2},
                ],
                weight:1
            },
            {
                rivers:[
                    {width:25,width_variation:2},
                    {width:15,width_variation:2},
                    {width:15,width_variation:2},
                ],
                weight:1
            },
            {
                rivers:[
                    {width:20,width_variation:2},
                    {width:20,width_variation:2},
                    {width:20,width_variation:2},
                ],
                weight:1
            },
        ]
    },
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
}
export const WarMap:MapDef={
    loot_tables:LootTables,
    biome:FallBiome,
    size:v2(700,450),
    generation:{
        base:FloorType.Water,
        spawn:[
            {def:"small_house_1",count:5},
            {def:"storehouse_1",count:5},
            {def:"bunker_1",count:2},
            {def:"shed",count:25},
            {def:map_spawns.containers,count:25},

            {def:"golden_stone",count:1},

            {def:"sillo",count:10},
            {def:map_spawns.crates,count:430},
            {def:map_spawns.trees,count:800},
            {def:"river_rock",count:60},
            {def:map_spawns.rocks,count:550},
            {def:"bush",count:350},
            {def:"barrel",count:200},

            {def:"normal_loot",count:130},
            {def:"jeep",count:6},
            {def:"bike",count:6},
            {def:"boat",count:6},
        ],
        islands:[{
                position:v2(190,225),
                size:v2(300,300),
                terrain:terrain
            },
            {
                position:v2(510,225),
                size:v2(300,300),
                terrain:terrain
            },
        ]
    },
}