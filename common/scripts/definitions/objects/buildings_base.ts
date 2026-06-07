import { DeepPartial, Definition, Definitions, FrameDef, Hitbox2D, hitbox_from_json, HitboxGroup2D, JsonHitbox2D, mergeDeep, RectHitbox2D, v2, Vec2, WeightDefinition } from "../../../engine/core.ts";
import { Spawn, SpawnMode } from "../../others/constants.ts";
import { FloorType } from "../../others/terrain.ts";
import { hit_sounds, HitParticlesDef, HitSoundsDef } from "../utils.ts";
import { DecalTint } from "./decals.ts";
//20mm = 0.17619
//2mm  = 0.017619
export type BuildingCeilingDef={
    frame:FrameDef
    hitbox:Hitbox2D
    below?:{
        deenabled?:boolean
        duration?:number
        alpha?:number
    }
    layer?:number
    connections?:number[]
    no_scope_block?:boolean
    destroy?:{
        frame:string
        sound?:string
        count:number
        particles?:{
            count:number
        }
    }
}
export type BuildingObstacles={
    def:string|((WeightDefinition&{def:string})[])
    id?:number
    position:Vec2
    connections?:number[]
    skin?:number
    variation?:number
    layer?:number
    rotation?:number
    scale?:number
    stairs_dest?:Record<number,number>
}
export type BuildingDecal={
    def:string
    position:Vec2
    rotation?:number
    scale?:number
    layer?:number
    tint?:DecalTint
}
export type BuildingLoot={
    table:string
    position:Vec2
}
export type BuildingSubBuilding={
    def:string|((WeightDefinition&{def:string})[])
    position:Vec2
    layer?:number
    rotation?:0|1|2|3
}
export interface BuildingDef extends Definition{
    no_collisions?: boolean
    no_bullet_collision?: boolean
    reflect_bullets?:boolean
    content:{
        ceiling?:BuildingCeilingDef[]
        obstacles?:BuildingObstacles[]
        decals?:BuildingDecal[]
        sub_building?:BuildingSubBuilding[]
        loots?:BuildingLoot[]
        floors?:{hitbox:Hitbox2D,type:FloorType,layer?:number}[]
        floor_image?:(FrameDef&{layer?:number})[]
    }
    spawnHitbox?:Hitbox2D
    hitbox?:Hitbox2D
    spawnMode?:SpawnMode
    assets?:{
        sounds?:HitSoundsDef
        particles?:HitParticlesDef
    }
}
export type JSONBuildingCeilingDef={
    frame:FrameDef
    hitbox:JsonHitbox2D
    below?:{
        duration?:number
        alpha?:number
    }
    layer?:number
    connections?:number[]
    no_scope_block?:boolean
    destroy?:{
        frame:string
        sound?:string
        count:number
        particles?:{
            count:number
        }
    }
}
export type JSONBuildingDef={
    no_collisions?: boolean
    no_bullet_collision?: boolean
    reflect_bullets?:boolean
    spawnHitbox?:JsonHitbox2D
    hitbox?:JsonHitbox2D
    spawnMode?:SpawnMode
    assets?:{
        sounds?:HitSoundsDef
        particles?:HitParticlesDef
    }
    content:{
        ceiling?: JSONBuildingCeilingDef[]
        floors?: {hitbox:JsonHitbox2D,type:FloorType,layer?:number}[]
        obstacles?:BuildingObstacles[]
        decals?:BuildingDecal[]
        sub_building?:BuildingSubBuilding[]
        loots?:BuildingLoot[]
        floor_image?:(FrameDef&{layer?:number})[]
    }
}&Definition

export function building_to_json(b: BuildingDef): JSONBuildingDef {
    return {
        idString:b.idString,
        idNumber:b.idNumber,
        no_collisions: b.no_collisions,
        no_bullet_collision: b.no_bullet_collision,
        reflect_bullets: b.reflect_bullets,

        spawnHitbox: b.spawnHitbox?.to_json(),
        hitbox: b.hitbox?.to_json(),

        spawnMode: b.spawnMode,

        assets: b.assets,

        content: {
            ceiling: b.content.ceiling?.map(c => ({
                frame: c.frame,
                hitbox: c.hitbox.to_json(),
                below: c.below,
                layer: c.layer,
                connections: c.connections,
                no_scope_block: c.no_scope_block,
                destroy: c.destroy,
            })),
            floors: b.content.floors?.map(f => ({
                hitbox: f.hitbox.to_json(),
                type: f.type,
                layer: f.layer
            })),
            obstacles: b.content.obstacles,
            sub_building: b.content.sub_building,
            loots: b.content.loots,
            floor_image: b.content.floor_image
        }
    }
}
export function building_from_json(b: JSONBuildingDef): BuildingDef {
    return {
        ...b,
        spawnHitbox: b.spawnHitbox ? hitbox_from_json(b.spawnHitbox) : undefined,
        hitbox: b.hitbox ? hitbox_from_json(b.hitbox) : undefined,
        content: {
            ceiling: b.content.ceiling?.map(c => ({
                ...c,
                hitbox: hitbox_from_json(c.hitbox)
            })),

            floors: b.content.floors?.map(f => ({
                ...f,
                hitbox: hitbox_from_json(f.hitbox)
            })),

            obstacles: b.content.obstacles,
            sub_building: b.content.sub_building,
            loots: b.content.loots,
            floor_image: b.content.floor_image
        }
    }
}
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
            const min=v2(-2.44,-1.2)
            const max=v2(2.44,1.2)
            return mergeDeep({
                idString:id,
                reflect_bullets:true,
                hitbox:RectHitbox2D.wall_enabled(min,max,{
                    left:true,
                    bottom:true,
                    right:false,
                    top:true
                },0.4),
                spawnHitbox:new RectHitbox2D(min,max),
                assets:{
                    particles:{
                        particle:"metal_particle",
                        tint:tint
                    },
                    sounds:hit_sounds.heavy_metal,
                },
                content:{
                    floor_image:[
                        {
                            image:settings.floor??"container_floor_1",
                            tint:tint
                        }
                    ],
                    ceiling:[
                        {
                            frame:{
                                image:settings.ceiling??"container_ceiling_1",
                                tint:tint
                            },
                            hitbox:new RectHitbox2D(min,max),
                        }
                    ]
                }
            } as BuildingDef,settings.b??{})
        },
        type_2(id:string,tint:number=0xffffff,settings:{
            floor?:string,
            ceiling?:string,
            b?:DeepPartial<BuildingDef>
        }={}){
            const min=v2(-2.44,-1.2)
            const max=v2(2.44,1.2)
            return mergeDeep({
                idString:id,
                reflect_bullets:true,
                hitbox:RectHitbox2D.wall_enabled(min,max,{
                    left:false,
                    bottom:true,
                    right:false,
                    top:true
                },0.4),
                spawnHitbox:new RectHitbox2D(min,max),
                assets:{
                    particles:{
                        particle:"metal_particle",
                        tint:tint
                    },
                    sounds:hit_sounds.heavy_metal,
                },
                content:{
                    floor_image:[
                        {
                            image:settings.floor??"container_floor_2",
                            tint:tint
                        }
                    ],
                    ceiling:[
                        {
                            frame:{
                                image:settings.ceiling??"container_ceiling_2",
                                tint:tint
                            },
                            hitbox:new RectHitbox2D(min,max),
                        }
                    ]
                }
            } as BuildingDef,settings.b??{})
        },
        simple(id:string,tint:number):BuildingDef[]{
            const b={
                content:{
                    loots:[
                        {table:"normal_loot",position:v2.new(-1,0)},
                        {table:"normal_loot",position:v2.new(1,0)}
                    ]
                }
            }
            return [
                this.type_1(id+"_1",tint,{b}),
                this.type_2(id+"_2",tint,{b}),
                this.type_1(id+"_3",tint,{
                    b,
                    ceiling:"container_ceiling_3"
                }),
                this.type_2(id+"_4",tint,{
                    b,
                    ceiling:"container_ceiling_4"
                }),
            ]
        }
    },
    stairs(id:string,settings:{
        width?:number
        height?:number
        ceiling?:string
        top?:DeepPartial<BuildingDef>
        bottom?:DeepPartial<BuildingDef>
    }={}):BuildingDef[]{
        const width=settings.width??0.83
        const height=settings.height??0.83
        const ceiling=settings.ceiling??"small_iron_stairs_ceiling_1"
        const hb=new RectHitbox2D(v2(-width,-height),v2(width,height))
        const base={
            no_bullet_collision:true,
            no_collisions:true,
            hitbox:hb,
        }
        return [
            mergeDeep({
                idString:id+"_down",
                content:{
                    ceiling:[{
                        frame:{
                            image:ceiling,
                            position:v2(0,0),
                        },
                        hitbox:hb,
                    }],
                    obstacles:[
                        {
                            def:id+"_part",
                            position:v2(0,0),
                            rotation:0,
                            stairs_dest:{0:-1},
                        },
                    ],
                }
            },base,settings.bottom??{}),
            mergeDeep({
                idString:id+"_up",
                content:{
                    ceiling:[{
                        frame:{
                            image:ceiling,
                            position:v2(0,0),
                            rotation:Math.PI
                        },
                        hitbox:hb,
                    }],
                    obstacles:[
                        {
                            def:id+"_part",
                            position:v2(0,0),
                            rotation:0,
                            stairs_dest:{0:1},
                        },
                    ],
                }
            },base,settings.top??{})
        ]
    },
    small_bunker(id:string,settings:{
        top?:DeepPartial<BuildingDef>
        bottom?:DeepPartial<BuildingDef>
        content?:BuildingObstacles[]
    }={}):BuildingDef[]{
        return [
            mergeDeep({
                idString:id,
                content:{
                    sub_building:[
                        {
                            def:"small_iron_stairs_down",
                            position:v2.new(-3.47,0),
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
                no_bullet_collision:true,
                no_collisions:true,
                hitbox:RectHitbox2D.centered(v2(0,0),v2(1,1)),
            },settings.top??{}),
            mergeDeep({
                idString:id+"_bottom",
                reflect_bullets:true,
                content:{
                    sub_building:[
                        {
                            def:"small_iron_stairs_up",
                            position:v2.new(-3.47,0),
                            rotation:2,
                        },
                    ],
                    floor_image:[
                        {
                            image:"small_bunker_floor_1",
                            position:v2(-0.84,0)
                        }
                    ],
                    ceiling:[
                        {
                            frame:{
                                image:"small_bunker_ceiling_1",
                                position:v2(0,0),
                                rotation:Math.PI
                            },
                            hitbox:new RectHitbox2D(v2(-2.65,-2.65),v2(2.65,2.65)),
                        }
                    ],
                    obstacles:[
                        ...settings.content??[]
                    ],
                },
                assets:{
                    particles:{
                        particle:"metal_particle",
                        tint:0x404143
                    },
                    sounds:hit_sounds,
                },
                hitbox:new HitboxGroup2D(
                    RectHitbox2D.wall_enabled(v2(-2.65,-2.65),v2(2.65,2.65),{
                        bottom:true,
                        top:true,
                        left:false,
                        right:true
                    },0.2),
                    new RectHitbox2D(v2(-2.65,-2.65),v2(-2.45,-0.85)),
                    new RectHitbox2D(v2(-2.65,0.85),v2(-2.45,2.65))
                ),
            },settings.bottom??{})
        ]
    },
    house:{
        shed(id:string,settings:{
            walls_tint?:number
            doors_tint?:number
            b?:DeepPartial<BuildingDef>
            content?:BuildingObstacles[]
        }={}){
            const walls_tint=settings.walls_tint??1
            const doors_tint=settings.doors_tint??walls_tint
            return mergeDeep({
                idString:id,
                no_collisions:true,
                no_bullet_collision:true,
                assets:{
                    particles:{
                        particle:"plank_particle",
                        tint:0x656877,
                    }
                },
                content:{
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
                    ceiling:[ 
                        {
                            frame:{
                                image:"shed_ceiling",
                                position:v2.zero(),
                                rotation:0
                            },
                            connections:[10,11,12,13,14],
                            destroy:{
                                frame:"shed_ceiling_break",
                                sound:"ceiling_break_1",
                                count:2,
                                particles:{
                                    count:30
                                }
                            },
                            hitbox:new RectHitbox2D(v2(-1.75,-1.55),v2(1.75,1.55)),
                        }
                    ],
                    floor_image:[
                        {
                            image:"shed_floor",
                            position:v2(0.21,0)
                        }
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
                content:{
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
                            rotation:0,
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
                    floor_image:[
                        {
                            image:"small_house_1_floor",
                        }
                    ],
                    ceiling:[
                        {
                            frame:{image:"small_house_1_ceiling"},
                            hitbox:new RectHitbox2D(min,max),
                        }
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
        const min=v2(-9.47,-4.95)
        const max=v2(9.47,4.95)
        const wall_size=0.31
        const side_wall_size=1.4
        return mergeDeep({
            idString:id,
            reflect_bullets:true,
            hitbox:new HitboxGroup2D(
                new RectHitbox2D(min,v2(min.x+wall_size,min.y+side_wall_size)),
                new RectHitbox2D(v2(min.x,max.y-side_wall_size),v2(min.x+wall_size,max.y)),
                new RectHitbox2D(v2(max.x-wall_size,min.y),v2(max.x,min.y+side_wall_size)),
                new RectHitbox2D(v2(max.x-wall_size,max.y-side_wall_size),v2(max.x,max.y)),
                ...RectHitbox2D.wall_enabled_list(min,max,{
                    left:false,
                    bottom:true,
                    right:false,
                    top:true
                },wall_size),
            ),
            spawnHitbox:new RectHitbox2D(v2(min.x-1,min.y),v2(max.x+1,max.y)),
            assets:{
                particles:{
                    particle:"metal_particle",
                    tint:0x404143
                },
                sounds:hit_sounds.heavy_metal,
            },
            content:{
                floor_image:[
                    {
                        image:settings.floor??"storehouse_floor_1",
                        scale:2.5
                    }
                ],
                ceiling:[
                    {
                        frame:{
                            image:settings.ceiling??"storehouse_ceiling_1",
                            scale:2.5
                        },
                        hitbox:new RectHitbox2D(min,max),
                    }
                ]
            }
        } as BuildingDef,settings.b??{})
    },
}
export function Buildings_Default_Init(buildings:Definitions<BuildingDef,{}>){
    buildings.insert(
        ...buildings_factory.container.simple("blue_container",0x0c40b1),
        ...buildings_factory.container.simple("yellow_container",0xffd900),
        ...buildings_factory.container.simple("red_container",0xb6071e),
        ...buildings_factory.container.simple("green_container",0x00ff0d),
        
        buildings_factory.container.type_1("black_container",0x111620,{
            b:{
                content:{
                    loots:[
                        {table:"black_container",position:v2.new(-2,0)}
                    ]
                }
            }
        }),

        ...buildings_factory.stairs("small_iron_stairs"),
        ...buildings_factory.small_bunker("bunker_1",{
            content:[
                //{def:"md_crate",position:v2.zero},
                {def:"airdrop_locked",position:v2.zero},

                //{def:"barrel",position:v2(1.7,1.7)},
                //{def:"metal_door",position:v2(-2.5,-0.7),rotation:1,variation:7}
            ]
        }),

        buildings_factory.house.shed("shed",{
            walls_tint:2,
            doors_tint:2,
            content:[
                {
                    def:"large_drawer",
                    position:v2(-1.21,0)
                }
            ],
            b:{
                content:{
                    loots:[
                        {table:"normal_loot",position:v2.new(0.5,0)},
                    ]
                }
            }
        }),
        buildings_factory.storehouse("storehouse_1",{
            b:{
                content:{
                    obstacles:[
                        /*{def:buildings_spawns.box,position:v2(-0.5,-4)},
                        {def:buildings_spawns.box,position:v2(0.5,-4)},
                        {def:buildings_spawns.box,position:v2(-0.5,-3)},
                        {def:buildings_spawns.box,position:v2(0.5,-3)},*/

                        {def:buildings_spawns.box,position:v2(-3,-4)},
                        {def:buildings_spawns.box,position:v2(-2,-4)},
                        {def:buildings_spawns.box,position:v2(-3,-3)},
                        {def:buildings_spawns.box,position:v2(-2,-3)},
                        {def:buildings_spawns.box,position:v2(3,-4)},
                        {def:buildings_spawns.box,position:v2(2,-4)},
                        {def:buildings_spawns.box,position:v2(3,-3)},
                        {def:buildings_spawns.box,position:v2(2,-3)},

                        /*{def:buildings_spawns.box,position:v2(-0.5,4)},
                        {def:buildings_spawns.box,position:v2(0.5,4)},
                        {def:buildings_spawns.box,position:v2(-0.5,3)},
                        {def:buildings_spawns.box,position:v2(0.5,3)},*/

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
                            {def:"airdrop_locked",weight:1},
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
        })
    )
}