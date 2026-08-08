import { HitboxGroup2D, RectHitbox2D, v2 } from "../../../engine/core.ts";
import { FloorType } from "../../others/terrain.ts";
import { LootTables } from "../loot_tables.ts";
import { type MapDef } from "./base.ts";
import { FallBiome } from "./normal.ts";

export const TutorialMap:MapDef={
    loot_tables:LootTables,
    biome:FallBiome,
    size:v2(100,100),
    bounds_size:0,
    assets:{
        textures:["scripts/campaign/levels/prologue/sprites"]
    },
    definitions:{
        objects:{
            buildings:[
                {
                    idString: 'part_1',
                    hitbox: new HitboxGroup2D(new RectHitbox2D(v2(-3.7699999809265137, -4.75), v2(-3.5399999618530273, 4.75)), new RectHitbox2D(v2(3.5399999618530273, -4.75), v2(3.7699999809265137, 4.75)), new RectHitbox2D(v2(-3.5399999618530273, 4.539999961853027), v2(3.7699999809265137, 4.75)), new RectHitbox2D(v2(-3.5399999618530273, -4.75), v2(-0.6100000143051147, -4.539999961853027)), new RectHitbox2D(v2(0.8199999928474426, -4.75), v2(3.5399999618530273, -4.539999961853027))),
                    floor_image: [{"image":"military_rest_room_floor",scale:3}],
                    generate:{
                        obstacles:[{"def":"metal_door","id":2,"position":{"x":-0.6299999952316284,"y":-4.650000095367432},"rotation":0,"variation":7},{"def":"green_button","id":1,"position":{"x":-0.8,"y":-4.7},"rotation":3},{"def":"small_bed","position":{"x":2.5,"y":3},"rotation":0,"variation":2},{"def":"small_bed","position":{"x":-2.5,"y":3},"rotation":0,"variation":2},{"def":"small_bed","position":{"x":-2.5,"y":-3},"rotation":2,"variation":2},{"def":"small_bed","position":{"x":2.5,"y":-3},"rotation":2,"variation":2},{"def":"large_drawer","position":{"x":3.0799999237060547,"y":0},"rotation":2},{"def":"large_drawer","position":{"x":-3.0799999237060547,"y":0},"rotation":0}],
                        puzzles:[
                            {
                                complete_conditions:[
                                    {type:"press",id:1},
                                ],
                                complete_actions:[
                                    {type:"wait",time:1},
                                    {type:"door",id:2,locked:true,open_state:-1}
                                ],
                            },
                        ]
                    },
                },
                {
                    idString:"main_structure",
                    generate:{
                        sub_building:[
                            {def:"part_1",position:v2(10,50),rotation:0},

                            //{def:"part_1",position:v2(10,43),rotation:0},
                            //{def:"part_1",position:v2(10,57),rotation:0},
                        ],
                        obstacles:[
                            /*{def:"wood_crate",position:v2(18,50),id:1,puzzle_piece:{id:"puzzle_2"}},
                            {def:"metal_door",position:v2(20,49.5),rotation:1,variation:7,id:2,door_data:{
                                locked:true,
                            }},*/
                            
                        ],
                        puzzles:[
                            /*{
                                idString:"puzzle_2",
                                complete_conditions:[
                                    {type:"break",id:1},
                                ],
                                complete_actions:[
                                    {type:"wait",time:1},
                                    {type:"door",id:2,locked:true,open_state:1}
                                ],
                            }*/
                        ]
                    },
                }
            ],
        }
    },
    generation:{
        base:FloorType.Grass,
        objects:{
            buildings:[
                {def:"main_structure",position:v2(0,0),side:0},
            ],
            items:[
                {def:"military_helmet",count:1,position:v2(15,50)},
                {def:"military_vest",count:1,position:v2(16,50)},
                {def:"military_pack",count:1,position:v2(17,50)},
                {def:"ak47",count:1,position:v2(19,49.5)},
                {def:"762mm",count:240,position:v2(19,50.5)}
            ]
        }
    },
}
export const map=TutorialMap