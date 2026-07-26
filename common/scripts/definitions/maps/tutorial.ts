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
    definitions:{
        objects:{
            buildings:[
                {
                    idString:"part_1",
                    hitbox:new HitboxGroup2D(
                        ...RectHitbox2D.wall_enabled_list(v2(-2.65,-2.65),v2(2.65,2.65),{
                            bottom:true,
                            top:true,
                            left:true,
                            right:false
                        },0.22),
                        new RectHitbox2D(v2(2.45,-2.65),v2(2.65,-0.85)),
                        new RectHitbox2D(v2(2.45,0.85),v2(2.65,2.65))
                    ),
                    reflect_bullets:true,
                    floor_image:[
                        {image:"small_bunker_floor_1",position:v2(0,0),rotation:Math.PI}
                    ],
                    generate:{
                        obstacles:[
                            {def:"green_button",position:v2(0.5,-2.45),rotation:1,id:1,press_data:{allow_switch:false},puzzle_piece:{}},
                            {def:"metal_door",position:v2(2.55,-0.7),rotation:1,variation:7,id:2,door_data:{
                                locked:true,
                            }},


                            {def:"small_bed",position:v2(-1.5,1.1),rotation:0},
                            {def:"large_drawer",position:v2(-1,-1.97),rotation:1},
                        ],
                        puzzles:[
                            {
                                complete_conditions:[
                                    {type:"press",id:1},
                                ],
                                complete_actions:[
                                    {type:"wait",time:1},
                                    {type:"door",id:2,locked:true,open_state:1}
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

                            {def:"part_1",position:v2(10,43),rotation:0},
                            {def:"part_1",position:v2(10,57),rotation:0},
                        ],
                        obstacles:[
                            {def:"wood_crate",position:v2(18,50),id:1,puzzle_piece:{id:"puzzle_2"}},
                            {def:"metal_door",position:v2(20,49.5),rotation:1,variation:7,id:2,door_data:{
                                locked:true,
                            }},
                            
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