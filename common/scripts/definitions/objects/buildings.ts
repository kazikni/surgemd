import { ColorM, DeepPartial, HitboxGroup2D, mergeDeep, RectHitbox2D, smrf, tilemap_layer, v2 } from "../../../engine/core.ts";
import { Spawn, zIndexes } from "../../others/constants.ts";
import { FloorType } from "../../others/terrain.ts";
import { hit_sounds } from "../utils.ts";
import { BuildingDef, BuildingObjectObstacle } from "./buildings_base.ts";

export const buildings_spawns={
    box:[
        {def:"box",weight:2},
        {def:"",weight:1},
    ]
}
export const buildings_factory={
    container:{
        type_1(id:string,tint:number=0xffffff,settings:{
            floor?:string,
            ceiling?:string,    
            b?:DeepPartial<BuildingDef>
        }={}){
            const min=v2(-2.24,-1)
            const max=v2(2.44,1)
            const rect=new RectHitbox2D(min,max)
            return mergeDeep({
                idString:id,
                is_ghost:true,
                hitbox:rect,
                floor_smrf:[
                    {content:smrf.parse(`bp;rect -2.44 -1 2.44 1;ss f ${ColorM.number2hex(tint)};fill`)}
                ],
                
                generate:{
                    walls:[{
                        tint:tint,
                        stroke_width:0.15,
                        width:0.4,
                        reflect_bullets:true,
                        assets:{
                            particles:{
                                particle:"metal_particle",
                                tint:tint
                            },
                            sounds:hit_sounds.heavy_metal,
                        },
                        positions:[[v2(max.x,min.y),v2(min.x,min.y),v2(min.x,max.y),v2(max.x,max.y)]]
                    }],
                    floors:[{hitbox:rect,type:FloorType.Metal}]
                },
                ceiling:[
                    {
                        frame:{
                            image:settings.ceiling??"container_ceiling_1",
                            tint:tint
                        },
                        hitbox:new RectHitbox2D(min,max),
                        scope_change:{}
                    }
                ],
                assets:{
                },
            } as BuildingDef,settings.b??{})
        },
        type_2(id:string,tint:number=0xffffff,settings:{
            floor?:string,
            ceiling?:string,
            b?:DeepPartial<BuildingDef>
        }={}){
            const min=v2(-2.43,-1)
            const max=v2(2.43,1)
            const rect=new RectHitbox2D(min,max)
            return mergeDeep({
                idString:id,
                hitbox:rect,
                is_ghost:true,
                floor_smrf:[
                    {content:smrf.parse(`bp;rect -2.44 -1 2.44 1;ss f ${ColorM.number2hex(tint)};fill`)}
                ],
                generate:{
                    walls:[{
                        tint:tint,
                        stroke_width:0.15,
                        width:0.4,
                        reflect_bullets:true,
                        assets:{
                            particles:{
                                particle:"metal_particle",
                                tint:tint
                            },
                            sounds:hit_sounds.heavy_metal,
                        },
                        positions:[[v2(min.x,min.y),v2(max.x,min.y)],[v2(min.x,max.y),v2(max.x,max.y)]]
                    }],
                    floors:[{hitbox:rect,type:FloorType.Metal}]
                },
                ceiling:[
                    {
                        frame:{
                            image:settings.ceiling??"container_ceiling_2",
                            tint:tint
                        },
                        hitbox:new RectHitbox2D(min,max),
                        scope_change:{}
                    }
                ]
            } as BuildingDef,settings.b??{})
        },
        simple(id:string,tint:number):BuildingDef[]{
            const b={
                generate:{
                    loots:[
                        {table:"normal_loot",position:v2.new(-1,0)},
                        {table:"normal_loot",position:v2.new(1,0)}
                    ]
                }
            }
            return [
                this.type_1(id+"_1",tint,{
                    b,
                    ceiling:"container_ceiling_1",
                }),
                this.type_2(id+"_2",tint,{
                    b,
                    ceiling:"container_ceiling_2",
                }),
            ]
        }
    },
    stairs(id:string,settings:{
        width?:number
        height?:number
        wall_size?:number
        ceiling?:string
        floor?:string
        both?:DeepPartial<BuildingDef>
        top?:DeepPartial<BuildingDef>
        bottom?:DeepPartial<BuildingDef>
    }={}):BuildingDef[]{
        const width=settings.width??0.83
        const height=settings.height??0.83
        const wall_size=settings.wall_size??0.14
        const floor=settings.floor??id+"_floor"
        const spawn_hb=new RectHitbox2D(v2(-width,-height),v2(width,height))
        return [
            mergeDeep({
                idString:id+"_down",
                hitbox:RectHitbox2D.wall_enabled(v2(-width,-height),v2(width,height),{
                    bottom:true,
                    top:true,
                    left:false,
                    right:true
                },wall_size),
                spawnHitbox:spawn_hb,
                floor_image:[
                    {image:floor+"_1",zIndex:zIndexes.BuildingsFloor3}
                ],
                generate:{
                    stair_data:[{
                        hitbox:RectHitbox2D.centered(v2(0.69,0),v2(0.01,1.5)),
                        dest:-1,
                    }]
                }
            },settings.bottom??{},settings.both??{}),
            mergeDeep({
                idString:id+"_up",
                hitbox:RectHitbox2D.wall_enabled(v2(-width,-height),v2(width,height),{
                    bottom:true,
                    top:true,
                    left:false,
                    right:true
                },wall_size),
                spawnHitbox:spawn_hb,
                floor_image:[
                    {image:floor+"_2",zIndex:zIndexes.BuildingFloor1,scale:4},
                    {image:floor+"_1"},
                ],
                generate:{
                    stair_data:[{
                        hitbox:RectHitbox2D.centered(v2(0.69,0),v2(0.01,1.5)),
                        dest:1,
                    }]
                }
            },settings.top??{},settings.both??{})
        ]
    },
    small_bunker(id:string,settings:{
        top?:DeepPartial<BuildingDef>
        bottom?:DeepPartial<BuildingDef>
        content?:BuildingObjectObstacle[]
    }={}):BuildingDef[]{
        const min=v2(-2.76,-2.76)
        const max=v2(2.76,2.76)
        const rect=new RectHitbox2D(v2(-2.65,-2.65),v2(2.65,2.65))
        return [
            mergeDeep({
                idString:id,
                generate:{
                    sub_building:[
                        {
                            def:"small_bunker_iron_stairs_down",
                            position:v2.new(-3.28,0),
                            rotation:0,
                        },
                        {
                            def:id+"_bottom",
                            position:v2.zero(),
                            rotation:0,
                            layer:-1
                        }
                    ],
                },
                is_ghost:true,
                hitbox:RectHitbox2D.centered(v2(0,0),v2(1,1)),
            },settings.top??{}),
            mergeDeep({
                idString:id+"_bottom",
                floor_image:[
                    {image:"small_bunker_floor_bg",scale:4.4,zIndex:zIndexes.BuildingFloor1,alpha:221},
                    {image:"small_bunker_floor_1",zIndex:zIndexes.BuildingsFloor2},
                ],
                ceiling:[
                    {
                        frame:{
                            image:"small_bunker_ceiling_1",
                            position:v2(0,0),
                            scale:2.15,
                        },
                        hitbox:new RectHitbox2D(v2(-2.65,-2.65),v2(2.65,2.65)),
                        scope_change:{}
                    }
                ],
                generate:{
                    sub_building:[
                        {
                            def:"small_bunker_iron_stairs_up",
                            position:v2.new(-3.45,0),
                            rotation:2,
                        },
                    ],
                    obstacles:[
                        ...settings.content??[]
                    ],
                    walls:[
                        {
                            tint:0x4a4c4d,
                            positions:[[v2(min.x,-0.84),min,v2(max.x,min.y),max,v2(min.x,max.y),v2(min.x,0.84)]],
                            reflect_bullets:true,
                            width:0.3,
                            stroke_width:0.1,
                            assets:{
                                particles:{
                                    particle:"metal_particle",
                                    tint:0x404143
                                },
                                sounds:hit_sounds.heavy_metal,
                            },
                        }
                    ]
                },
                hitbox:rect,
                is_ghost:true,
            },settings.bottom??{})
        ]
    },
    house:{
        shed(id:string,settings:{
            walls_tint?:number
            doors_tint?:number
            b?:DeepPartial<BuildingDef>
            content?:BuildingObjectObstacle[]
        }={}){
            const walls_tint=settings.walls_tint??1
            const doors_tint=settings.doors_tint??walls_tint
            return mergeDeep({
                idString:id,
                is_ghost:true,
                ceiling:[
                    {
                        frame:{
                            image:"shed_ceiling_1",
                            position:v2.zero(),
                            rotation:0
                        },
                        connections:[10,11,12,13,14],
                        destroy:{
                            frame:{
                                image:"wood_ceiling_break_1",
                                tint:0x656877,
                            },
                            sound:"ceiling_break_1",
                            count:3,
                            particles:{
                                image:"plank_particle",
                                count:13,
                                scale:2.2,
                                tint:0x656877,
                            }
                        },
                        hitbox:new RectHitbox2D(v2(-1.75,-1.55),v2(1.75,1.55)),
                        scope_change:{}
                    }
                ],
                floor_image:[
                    {
                        image:"shed_floor",
                        position:v2(0.21,0),
                        zIndex:zIndexes.BuildingFloor1
                    }
                ],
                generate:{
                    obstacles:[
                        {
                            def:"wood_door",
                            position:v2(1.76,0.739998),
                            rotation:3,
                            id:1,
                            variation:doors_tint
                        },
                        {
                            def:"wood_wall_4x1",
                            position:v2(1.76,-1.21),
                            rotation:1,
                            id:10,
                            variation:walls_tint
                        },
                        {
                            def:"wood_wall_4x1",
                            position:v2(1.76,1.21),
                            rotation:1,
                            connections:[1],
                            id:11,
                            variation:walls_tint
                        },
                        {
                            def:"wood_wall_14x1",
                            position:v2(0,-1.57),
                            rotation:0,
                            id:12,
                            connections:[5],
                            variation:walls_tint
                        },
                        {
                            def:"wood_wall_14x1",
                            position:v2(0,1.57),
                            rotation:0,
                            id:13,
                            variation:walls_tint
                        },
                        {
                            def:"wood_wall_14x1",
                            position:v2(-1.76,0),
                            rotation:1,
                            id:14,
                            variation:walls_tint
                        },
                        ...(settings.content??[])
                    ],
                },
                hitbox:RectHitbox2D.centered(v2(0,0),v2(3.5,3.1)),
            },settings.b??{})
        },
        small_house_1(id:string,settings:{
            walls_tint?:number
            doors_tint?:number
            column_tint?:number
            b?:DeepPartial<BuildingDef>
        }={}){
            const walls_tint=settings.walls_tint??2
            const doors_tint=settings.doors_tint??walls_tint
            const column_tint=settings.column_tint??walls_tint

            const wall_size=0.3
            const min=v2(-7.5,-6.75)
            const max=v2(7.5,6.75)
            return mergeDeep({
                idString:id,
                spawnHitbox:new RectHitbox2D(v2(-7.7,-7),v2(7.7,7)),
                hitbox:new HitboxGroup2D(
                    new RectHitbox2D(min,v2(max.x,min.y+wall_size)),
                    new RectHitbox2D(min,v2(min.x+wall_size,min.y+0.9)),
                    new RectHitbox2D(v2(min.x,min.y+2.32),v2(min.x+wall_size,max.y)),

                    new RectHitbox2D(v2(max.x-wall_size,min.y),v2(max.x,max.y-2.45)),
                    new RectHitbox2D(v2(max.x-wall_size,max.y-1.05),v2(max.x,max.y)),

                    new RectHitbox2D(v2(min.x,max.y-wall_size),v2(max.x,max.y)),
                ),
                floor_image:[
                    {
                        image:"small_house_1_floor",
                    }
                ],
                ceiling:[
                    {
                        frame:{image:"small_house_1_ceiling"},
                        hitbox:new RectHitbox2D(min,max),
                        scope_change:{}
                    }
                ],
                generate:{
                    obstacles:[
                        {
                            def:"wood_door",
                            position:v2(-7.36,-5.9),
                            rotation:1,
                            variation:doors_tint
                        },
                        {
                            def:"wood_door",
                            position:v2(7.37,5.73),
                            rotation:3,
                            variation:doors_tint
                        },

                        {
                            def:"wood_wall_4x1",
                            position:v2(-0.54,-5.97),
                            rotation:1,
                            variation:walls_tint
                        },
                        {
                            def:"wood_door",
                            position:v2(-0.54,-4.03),
                            rotation:3,
                            id:1,
                            variation:doors_tint
                        },
                        {
                            def:"wood_wall_14x1",
                            position:v2(-0.54,-2.4),
                            rotation:1,
                            connections:[1],
                            variation:walls_tint
                        },
                        {
                            def:"wood_column",
                            position:v2(-0.54,-0.59),
                            variation:column_tint,
                        },
                        {
                            def:"wood_wall_28x1",
                            position:v2(-3.85,-0.59),
                            rotation:0,
                            variation:walls_tint,
                        },

                        {
                            def:"wood_wall_8x1",
                            position:v2(2.38,-5.5),
                            rotation:1,
                            connections:[2],
                            variation:walls_tint,
                        },
                        {
                            def:"wood_door",
                            position:v2(2.38,-4.6),
                            rotation:1,
                            id:2,
                            variation:doors_tint,
                        },
                        {
                            def:"wood_wall_16x1",
                            position:v2(2.38,-1.22),
                            rotation:1,
                            variation:walls_tint,
                        },
                        {
                            def:"wood_column",
                            position:v2(2.38,0.8),
                            variation:column_tint,
                        },
                        {
                            def:"wood_wall_20x1",
                            position:v2(4.9,0.8),
                            rotation:0,
                            variation:walls_tint,
                        },

                        //Furnitunes
                        {
                            def:"normal_tv",
                            rotation:3,
                            position:v2(-4,-1.22),
                            id:10,
                        },
                        {
                            def:"large_drawer",
                            rotation:3,
                            position:v2(-4,-1.15),
                            connections:[10]
                        },
                        {
                            def:"couch_3x1",
                            rotation:1,
                            position:v2(-4,-5.5)
                        },
                        {
                            def:"large_drawer",
                            rotation:1,
                            position:v2(0.9,-6.05),
                        },

                        {
                            def:"large_drawer",
                            rotation:1,
                            position:v2(-6.1,-0.04),
                        },

                        {
                            def:"small_stove",
                            rotation:3,
                            variation:2,
                            position:v2(-5.5,5.9),
                        },
                        {
                            def:"sink",
                            rotation:3,
                            variation:2,
                            position:v2(-4.4,5.9),
                        },
                        {
                            def:"large_kitchen_drawer",
                            rotation:3,
                            variation:2,
                            position:v2(-2.75,5.9),
                        },

                        {
                            def:"small_bed",
                            rotation:3,
                            position:v2(5.95,-5.6),
                        },

                        {
                            def:"wood_chair",
                            rotation:0,
                            position:v2(2,3),
                        },
                        {
                            def:"wood_table",
                            rotation:1,
                            position:v2(3,3),
                        },
                        {
                            def:"wood_chair",
                            rotation:2,
                            position:v2(4,3),
                        },
                    ],
                },
                assets:{
                    sounds:hit_sounds.wood
                },
                spawnMode:Spawn.grass,
            },settings.b??{})
        }
    },
    storehouse(id:string,settings:{
        floor?:string,
        ceiling?:string,
        b?:DeepPartial<BuildingDef>
    }={}){
        const rect=new RectHitbox2D(v2(-11.7,-5),v2(11.7,5))
        return mergeDeep({
            idString:id,
            is_ghost:true,
            hitbox: rect,
            assets:{
                particles:{
                    particle:"metal_particle",
                    tint:0x404143
                },
                sounds:hit_sounds.heavy_metal,
            },
            generate:{
                walls:[
                    {
                        positions:[
                            [v2(-9.3,-3),v2(-9.3,-4.8),v2(9.3,-4.8),v2(9.3,-3)],
                            [v2(-9.3,3),v2(-9.3,4.8),v2(9.3,4.8),v2(9.3,3)]
                        ],
                        tint:0x4a4c4d,
                        stroke_width:0.15,
                        width:0.4,
                        reflect_bullets:true
                    },
                ],
                tilemapv:[
                    //{def:"storehouse_floor"}
                ],
                floors:[
                    {hitbox:rect,type:FloorType.Metal}
                ]
            },
            floor_image:[
                {image:settings.floor??"storehouse_floor_1",position:v2(5.85,0),rotation:Math.PI,scale:2.5},
                {image:settings.floor??"storehouse_floor_1",position:v2(-5.85,0),scale:2.5},
            ],
            ceiling:[
                {
                    frame:{image:settings.ceiling??"storehouse_ceiling_1",scale:2.5},
                    hitbox:new RectHitbox2D(v2(-9.3,-4.8),v2(9.3,4.8)),
                    scope_change:{}
                }
            ]
        } as BuildingDef,settings.b??{})
    },
}
export function Buildings_Default_Init():BuildingDef[]{
    return [
        ...buildings_factory.container.simple("blue_container",0x0c40b1),
        ...buildings_factory.container.simple("yellow_container",0xffd900),
        ...buildings_factory.container.simple("red_container",0xb6071e),
        ...buildings_factory.container.simple("green_container",0x00ff0d),
        
        buildings_factory.container.type_1("black_container",0x111620,{
            b:{
                generate:{
                    loots:[
                        {table:"black_container",position:v2.new(-2,0)}
                    ]
                }
            }
        }),

        ...buildings_factory.stairs("small_bunker_iron_stairs",{
            bottom:{
                ceiling:[{
                    frame:{
                        image:"small_iron_stairs_ceiling_1",
                        position:v2(0,0),
                    },
                    hitbox:new RectHitbox2D(v2(-0.83,-0.83),v2(0.83,0.83)),
                    scope_change:{}
                }]
            },
            top:{
                ceiling:[{
                    frame:{
                        image:"small_iron_stairs_ceiling_1",
                        position:v2(0,0),
                        rotation:0
                    },
                    hitbox:new RectHitbox2D(v2(-0.83,-0.83),v2(0.83,0.83)),
                    scope_change:{}
                }]
            },
            both:{
                reflect_bullets:true,
                assets:{
                    particles:{
                        particle:"metal_particle",
                        tint:0x656877,
                    },
                    sounds:hit_sounds.heavy_metal
                }
            },
            floor:"small_iron_stairs_floor"
        }),
        ...buildings_factory.stairs("small_iron_stairs",{
            both:{
                reflect_bullets:true,
                assets:{
                    particles:{
                        particle:"metal_particle",
                        tint:0x656877,
                    },
                    sounds:hit_sounds.heavy_metal
                }
            }
        }),
        ...buildings_factory.small_bunker("bunker_1",{
            content:[
                //{def:"md_crate",position:v2.zero},
                {def:"airdrop_locked",position:v2.zero},

                //{def:"barrel",position:v2(1.7,1.7)},
                {def:"metal_door",position:v2(-2.75,-0.7),rotation:1,variation:7}
            ]
        }),

        // Meat Bunker
        {
            idString: 'bunker_2_bottom',
            hitbox: new RectHitbox2D(v2(-8.25,-3.02),v2(8.25,3.02)),
            is_ghost:true,
            floor_image: [/*{
                image: "small_bunker_floor_bg",
                scale: 4.85,
                zIndex: zIndexes.BuildingFloor1,
                alpha:221,
            }, {
                image: "small_bunker_floor_bg",
                position: v2(-5.25,0),
                scale: 4.85,
                zIndex: 3,
                alpha:221,
            }, {
                image: "small_bunker_floor_bg",
                position: v2(5.25,0),
                scale: 4.85,
                zIndex: zIndexes.BuildingFloor1,
                alpha:221,
            },*/ {
                image: "small_bunker_floor_1",
                zIndex: zIndexes.BuildingsFloor2,
            }, {
                image: "small_bunker_floor_2",
                position: v2(5.23,0),
                zIndex: zIndexes.BuildingsFloor2,
            }, {
                image: "small_bunker_floor_2",
                position: v2(-5.23,0),
                zIndex: zIndexes.BuildingsFloor2,
            }],
            ceiling:[
                {
                    frame:{
                        image:"small_bunker_ceiling_1",
                        position:v2(0,0),
                        scale:2.15,
                        rotation:Math.PI
                    },
                    hitbox: new RectHitbox2D(v2(-8.25,-3.02),v2(8.25,3.02)),
                    scope_change:{}
                },
                {
                    frame:{
                        image:"small_bunker_ceiling_1",
                        position:v2(-5.3,0),
                        scale:2.15,
                        rotation:Math.PI
                    },
                    hitbox: new RectHitbox2D(v2(-8.25,-3.02),v2(8.25,3.02)),
                },
                {
                    hitbox:new RectHitbox2D(v2(2.6,-2.83),v2(8.25,2.83)),
                    frame:{
                        position:v2(5.3,0),
                        image: "small_bunker_ceiling_1",
                        scale:2.15,
                        zIndex: zIndexes.BuildingsCeiling,
                    },
                }
            ],
            generate: {
                loots:[
                    {position:v2(-5,0),table:"normal_loot"},
                    {position:v2(0,0),table:"normal_loot"},
                    {position:v2(5,0),table:"normal_loot"},
                ],
                sub_building:[
                    {def:"small_bunker_iron_stairs_up",position:v2(0,3.47),rotation:1}
                ],
                obstacles: [{
                    def: "metal_door",
                    position: v2(-0.74,2.755),
                    rotation: 0,
                    variation: 7
                },{
                    def: "metal_door",
                    position: v2(-2.6,0),
                    rotation: 1,
                    variation: 7
                },{
                    def: "metal_door",
                    position: v2(2.6,0),
                    rotation: 3,
                    variation: 7,
                    id:3,
                    door_data:{
                        locked:true,
                        cant_close:true
                    }
                }, {
                    def: "green_button",
                    position: v2(-7.9,2),
                    id:2,
                    puzzle_piece:{},
                    press_data:{allow_switch:false}
                }, {
                    def: "wood_table",
                    position:v2(-7,1.4),
                    rotation: 0,
                    connections:[1]
                }, {
                    def: "wood_chair",
                    position:v2(-6,1.4),
                    rotation: 2
                }, {
                    def: "computer",
                    position: v2(-7.3,1.4),
                    rotation: 0,
                    id:1
                }, {
                    def: "small_bed",
                    position: v2(-6.55,-1.75),
                    rotation: 1
                }, {
                    def: "large_drawer",
                    position: v2(-4.03,-2.15),
                    rotation: 1
                }, {
                    def: [{def:"wood_table",weight:5},{def:"wood_table_bonesaw",weight:10}],
                    position: v2(7,1.4)
                }, {
                    def: "ammo_crate",
                    position: v2(3.9,1.6)
                }, {
                    def:[
                        {def:"military_chest",weight:1}
                    ],
                    position:v2(7.25,-1.72),
                    rotation:2
                }],
                walls: [{
                    positions: [
                        [
                            v2(0.84,2.83),
                            v2(8.05,2.83),
                            v2(8.05,-2.83),
                            v2(-8.05,-2.83),
                            v2(-8.05,2.83),
                            v2(-0.84,2.83)
                        ],
                        [
                            v2(-2.6,-2.83),
                            v2(-2.6,0.05)
                        ],
                        [
                            v2(-2.6,1.45),
                            v2(-2.6,2.83)
                        ],
                        [
                            v2(2.6,-1.45),
                            v2(2.6,-2.83)
                        ],
                        [
                            v2(2.6,2.83),
                            v2(2.6,-0.05)
                        ]
                    ],
                    tint: 4211011,
                    width: 0.4,
                    stroke_width: 0.15,
                    reflect_bullets:true,
                    assets:{
                        particles:{
                            particle:"metal_particle",
                            tint:0x404143
                        },
                        sounds:hit_sounds.heavy_metal,
                    },
                }],
                puzzles:[{
                    complete_conditions:[
                        {type:"press"},
                    ],
                    complete_actions:[
                        {type:"press",id:[2],activated:true,locked:true},
                        {type:"door",id:3,locked:true,open_state:1}
                    ],
                }]
            }
        },
        mergeDeep(buildings_factory.house.shed("bunker_2",{
            walls_tint:2,
        }),{
            idString:"bunker_2",
            generate:{
                sub_building:[
                    {def:"bunker_2_bottom",position:v2(-3.47,0),layer:-1,rotation:3},
                    {def:"small_iron_stairs_down",position:v2(0,0),rotation:2}
                ],
            }
        } as BuildingDef),

        buildings_factory.house.shed("shed",{
            walls_tint:2,
            content:[
                {
                    def:"large_drawer",
                    position:v2(-1.21,0)
                },
                {
                    def:[{weight:5},{weight:1,def:"hp18_mount"},{weight:0.5,def:"m870_mount"}],
                    position:v2(0.3,-1.35),
                    id:5,
                }
            ],
            b:{
                generate:{
                    loots:[
                        {table:"normal_loot",position:v2.new(0.5,0)},
                    ]
                }
            }
        }),
        buildings_factory.storehouse("storehouse_1",{
            b:{
                generate:{
                    obstacles:[
                        {def:buildings_spawns.box,position:v2(-3,-4)},
                        {def:buildings_spawns.box,position:v2(-2,-4)},
                        {def:buildings_spawns.box,position:v2(-3,-3)},
                        {def:buildings_spawns.box,position:v2(-2,-3)},
                        {def:buildings_spawns.box,position:v2(3,-4)},
                        {def:buildings_spawns.box,position:v2(2,-4)},
                        {def:buildings_spawns.box,position:v2(3,-3)},
                        {def:buildings_spawns.box,position:v2(2,-3)},

                        {def:buildings_spawns.box,position:v2(-3,4)},
                        {def:buildings_spawns.box,position:v2(-2,4)},
                        {def:buildings_spawns.box,position:v2(-3,3)},
                        {def:buildings_spawns.box,position:v2(-2,3)},
                        {def:buildings_spawns.box,position:v2(3,4)},
                        {def:buildings_spawns.box,position:v2(2,4)},
                        {def:buildings_spawns.box,position:v2(3,3)},
                        {def:buildings_spawns.box,position:v2(2,3)},

                        {def:"ammo_crate",position:v2(0,-3.5)},
                        {def:"ammo_crate",position:v2(0,3.5)},
                        {def:[
                            {def:"ammo_crate",weight:50},
                            {def:"copper_crate",weight:40},
                        ],position:v2(0,0)},

                        {def:"wood_crate",position:v2(0,-1.8)},
                        {def:"wood_crate",position:v2(0,1.8)},

                        {def:"wood_crate",position:v2(8.3,3.9)},
                        {def:"barrel",position:v2(8.3,-3.9)},
                        {def:"barrel",position:v2(-8.3,-3.9)},
                    ],
                    decals:[
                        {def:"wood_pallet",position:v2(-2.5,-3.5)},
                        {def:"wood_pallet",position:v2(2.5,-3.5)},

                        {def:"wood_pallet",position:v2(-2.5,3.5)},
                        {def:"wood_pallet",position:v2(2.5,3.5)},
                    ]
                }
            }
        }),
        buildings_factory.house.small_house_1("small_house_1",{
            walls_tint:7,
            doors_tint:2,
        }),
        //Watchtower
        {
            idString: "watchtower_top",
            hitbox: new RectHitbox2D(v2(-7,-7),v2(7,7)),
            is_ghost:true,
            floor_smrf:[
                {content:smrf.parse(`bp;rect -7.1 -7.1 7.1 7.1;ss f #656877 s #4c515a sw 0.1;fill;`)}
            ],
            ceiling:[
                {
                    frame:{
                        image:"small_bunker_ceiling_1",
                        position:v2(0,0),
                        scale:3.12,
                        rotation:Math.PI
                    },
                    hitbox: new RectHitbox2D(v2(-3.85,-3.85),v2(3.85,3.85)),
                    scope_change:{}
                }
            ],
            generate: {
                obstacles: [{
                    def: "iron_ladder_top",
                    position: v2(-7.2,-4)
                },{
                    def: "iron_ladder_top",
                    position: v2(7.2,4),
                    rotation: 2
                },{
                    def: "metal_door",
                    position: v2(-4,-3.01),
                    rotation: 1,
                    variation: 7
                },{
                    def: "small_bed",
                    position: v2(2.9,2.5),
                    rotation: 0
                },{
                    def: "large_drawer",
                    position: v2(3.378,-0.3),
                    rotation: 2
                },{
                    def: "military_chest",
                    position: v2(2.8,-3.2),
                    rotation: 1
                },{
                    def: "military_chest",
                    position: v2(1,-3.2),
                    rotation: 1
                },{
                    def: "wood_table",
                    position: v2(0.5,2.95),
                    rotation: 1,
                    connections:[1]
                },{
                    def: "wood_chair",
                    position: v2(0.5,2.2),
                    rotation: 1
                },{
                    def: "computer",
                    position: v2(0.5,3.25),
                    rotation: 3,
                    id:1
                },{
                    def: "small_stove",
                    position: v2(-3.2,1.95),
                    rotation: 0,
                    variation: 1
                },{
                    def: "sink",
                    position: v2(-3.2,3.2),
                    rotation: 0,
                    variation: 1
                },{
                    def: "wood_crate",
                    position: v2(-4.85,3.2),
                    rotation: 0,
                    scale: 0.93,
                    variation: 1
                },{
                    def: "wood_crate",
                    position: v2(-6.2,3.2),
                    rotation: 0,
                    scale: 0.93,
                    variation: 1
                },{
                    def: "barrel",
                    position: v2(6.2,-6.2),
                    rotation: 0,
                    variation: 1
                },{
                    def: "large_kitchen_drawer",
                    position: v2(-3.25,0.25),
                    rotation: 0,
                    variation: 1
                }],
                walls: [{
                    positions: [
                        [
                            v2(-7,-4.53),
                            v2(-7,-7),
                            v2(7,-7),
                            v2(7,3.48)
                        ],
                        [
                            v2(-7,-3.48),
                            v2(-7,7),
                            v2(7,7),
                            v2(7,4.53)
                        ],
                        [
                            v2(-4,-3),
                            v2(-4,-4),
                            v2(4,-4),
                            v2(4,4),
                            v2(-4,4),
                            v2(-4,-1.545)
                        ]
                    ],
                    tint: 0x656877,
                    width: 0.3,
                    stroke_width: 0.15,
                    reflect_bullets:true,
                    assets:{
                        particles:{
                            particle:"metal_particle",
                            tint:0x656877,
                        },
                        sounds:hit_sounds.heavy_metal
                    }
                }],
                floors: [{
                    hitbox: new RectHitbox2D(v2(-7,-7),v2(7,7)),
                    type:FloorType.Metal,
                    visible:true,
                }]
            }
        },
        {
            idString:"watchtower",
            hitbox: new RectHitbox2D(v2(-5,-5),v2(5,5)),
            spawnHitbox: new RectHitbox2D(v2(-7,-7),v2(7,7)),
            reflect_bullets:true,
            generate:{
                obstacles: [{
                    def: "iron_ladder_bottom",
                    position: v2(-7.2,-4)
                },{
                    def: "iron_ladder_bottom",
                    position: v2(7.2,4),
                    rotation: 2
                }],
                sub_building:[
                    {def:"watchtower_top",position:v2.zero,layer:1}
                ],
                walls: [{
                    positions: [
                        [v2(-5,-4),v2(4,-4),v2(4,4),v2(-4,4),v2(-4,-5)],
                        []
                    ],
                    tint: 0x656877,
                    width: 2,
                    stroke_width: 0.15,
                    no_collisions:true,
                    no_bullet_collision:true,
                }],
            },
            assets:{
                particles:{
                    particle:"metal_particle",
                    tint:0x656877,
                },
                sounds:hit_sounds.heavy_metal
            }
        },
        {
            idString:"puzzle_test",
            generate:{
                loots:[{
                    position:v2(3,0),
                    table:"gold_crate"
                }],
                obstacles:[
                    {def:"red_button",position:v2(-2,-2),rotation:1,id:1,press_data:{allow_switch:false},puzzle_piece:{value:"r"}},
                    {def:"green_button",position:v2(0,-2),rotation:1,id:2,press_data:{allow_switch:false},puzzle_piece:{value:"g"}},
                    {def:"blue_button",position:v2(-2,2),rotation:3,id:3,press_data:{allow_switch:false},puzzle_piece:{value:"b"}},
                    {def:"yellow_button",position:v2(0,2),rotation:3,id:4,press_data:{allow_switch:false},puzzle_piece:{value:"y"}},

                    {def:"metal_door",position:v2(1,-0.6),rotation:1,variation:7,id:10,door_data:{
                        locked:true,
                    }},
                ],
                walls:[
                    {
                        positions:[[v2(-3,-3),v2(3,-3),v2(3,3)]],
                        tint:0x333344,
                        stroke_width:0.1,
                        reflect_bullets:true,
                        assets:{
                            sounds:hit_sounds.heavy_metal,
                            particles:{
                                particle:"metal_particle",
                                tint:0x404143
                            },
                        }
                    }
                ],
                puzzles:[{
                    code:{
                        value:"rgby",
                        size:4
                    },
                    complete_conditions:[
                        {type:"code"},
                    ],
                    complete_actions:[
                        {type:"press",id:[1,2,3,4],activated:true,locked:true},
                        {type:"door",id:10,locked:true,open_state:1}
                    ],
                    fail_conditions:[
                        {type:"code",negate:true}
                    ],
                    fail_actions:[
                        {type:"wait",time:1},
                        {type:"press",id:[1,2,3,4],activated:false},
                        {type:"puzzle",lock:false}
                    ]
                }]
            },
        }
    ]
}