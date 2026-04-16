import { CircleHitbox2D, DeepPartial, Definition, Definitions, FrameTransform, Hitbox2D, LootTable, mergeDeep, model2d, type Model2D, RectHitbox2D, RotationMode, v2, Vec2 } from "../../../engine/core.ts";
import { Spawn, SpawnMode, zIndexes } from "../../others/constants.ts";
export interface ObstacleBehaviorDoor{
    type:0,
    open_delay?:number
    cant_close?:boolean
    open_duration:number
    offset:number

    open_sound?:string
    close_sound?:string
}
export interface ObstacleDoorData{
    open:-1|0|1
    hitboxes:Record<number,Hitbox2D>
    locked:boolean
    opening:boolean
}
export interface ObstacleBehaviorPlaySound{
    type:1
    duration:number
    click_sound:string
    delay:number
}
export interface ObstacleBehaviorScalable{
    type:2
    floor_walk:number
    action_time:number
    interact_side:{pos:Vec2,rot?:number,dest_rot?:number,dest_pos?:Vec2}[]
}
export interface ObstacleDef extends Definition{
    // Life
    health:number
    imortal?:boolean
    resistence?:number

    //Collisions
    hitbox?:Hitbox2D
    spawnHitbox?:Hitbox2D
    no_collision?:boolean
    no_bullets_collision?:boolean

    invisibleOnMap?:boolean
    scale?:{
        min?:number
        max?:number
        destroy?:number
    }
    world_shadow?:{
        model:Model2D
    }

    assets?:{
        frame?:{
            base?:string
            dead?:string
            particle?:string

            variations?:number
            biome_skins?:string[]
            transform?:FrameTransform
        }
        sounds?:{
            hit:string
            break:string
            hit_variations?:number
        }
    }
    particles?:{
        variations?:number
        tint?:number
    }
    zIndex?:number
    rotationMode?:number

    onDestroyExplosion?:string
    material?:string

    lootTable?:LootTable

    interactDestroy?:boolean
    reflect_bullets?:boolean

    spawnMode:SpawnMode

    height?:0|1|2 // 0 = Invisible | 1 = Mayble | 2 = All
    hover_alpha?:number

    expanded_behavior?:(
        ObstacleBehaviorDoor|ObstacleBehaviorPlaySound|ObstacleBehaviorScalable
    )
}
export interface MaterialDef{
    sounds:string
    hit_variations?:number
}
export const Materials:Record<string,MaterialDef>={
    tree:{
        sounds:"tree",
        hit_variations:2
    },
    stone:{
        sounds:"stone",
        hit_variations:2
    },
    bush:{
        sounds:"bush",
        hit_variations:2
    },
    metal:{
        sounds:"metal",
        hit_variations:3
    },
    wood:{
        sounds:"wood",
        hit_variations:2
    },
    iron:{
        sounds:"iron",
        hit_variations:2
    },
}
function CreateStone(id:string,hitbox:Hitbox2D=new CircleHitbox2D(v2(0,0),0.82),o:DeepPartial<ObstacleDef>={}):ObstacleDef{
    return mergeDeep({
        idString:id,
        health:170,
        hitbox:hitbox,
        scale:{
            destroy:0.65,
        },
        assets:{
            frame:{
                particle:"stone_particle",
                transform:{
                    scale:2
                },
                biome_skins:[
                    "snow"
                ],
            }
        },
        rotationMode:RotationMode.full,
        zIndex:zIndexes.Obstacles1,
        material:"stone",
        particles:{
            variations:2
        },
        spawnMode:Spawn.grass,
        height:1,
        world_shadow:{
            model:model2d.circle(0.82)
        }
    },o)
}
function CreateCrate(id:string,tint:number,o:DeepPartial<ObstacleDef>={},particle:string="metal_particle",interactDestroy:boolean=false):ObstacleDef{
    return mergeDeep({
        idString:id,
        health:70,
        hitbox:new RectHitbox2D(v2(-0.71,-0.71),v2(0.71,0.71)),
        scale:{
            destroy:0.6,
        },
        assets:{
            frame:{
                particle:particle,
                transform:{
                    scale:2,
                    hotspot:v2(0.5,0.5)
                },
            }
        },
        rotationMode:RotationMode.null,
        zIndex:zIndexes.Obstacles3,
        material:"wood",
        interactDestroy:interactDestroy,
        lootTable:id,
        particles:{
            tint:tint
        },
        spawnMode:Spawn.grass,
        height:1,
    },o)
}
export const create_wall={
    wall(id:string,frame:string,tint:number,width:number=0.2466,height:number=0.1233,particle:string="metal_particle",material:string="wood",o:DeepPartial<ObstacleDef>={}):ObstacleDef{
        return mergeDeep({
            health:130,
            idString:id,
            hitbox:new RectHitbox2D(v2(-width,-height),v2(width,height)),
            assets:{
                frame:{
                    base:frame,
                    particle:particle,
                    transform:{
                        hotspot:v2(0.5,0.5),
                        scale:2,
                        tint:tint
                    },
                }
            },
            particles:{
                tint:tint
            },
            rotationMode:RotationMode.limited,
            zIndex:zIndexes.Obstacles1,
            material:material,
            spawnMode:Spawn.grass,
        },o)
    },
    column_1(id:string,tint:number,particle:string="metal_particle",material:string="wood",o:DeepPartial<ObstacleDef>={}):ObstacleDef{
        return mergeDeep({
            imortal:true,
            health:1,
            idString:id,
            hitbox:new RectHitbox2D(v2(-0.21,-0.21),v2(0.21,0.21)),
            assets:{
                frame:{
                    base:"column_1",
                    particle:particle,
                    transform:{
                        hotspot:v2(0.5,0.5),
                        scale:2,
                        tint:tint
                    },
                }
            },
            particles:{
                tint:tint
            },
            rotationMode:RotationMode.limited,
            zIndex:zIndexes.Obstacles1,
            material:material,
            spawnMode:Spawn.grass,
        },o)
    }
}
export function Obstacles_Default_Init(obstacles:Definitions<ObstacleDef,{}>){
    obstacles.insert(
        CreateStone("stone",undefined,{
            assets:{
                frame:{
                    variations:2
                }
            }
        }),
        {
            idString:"barrel",
            health:140,
            hitbox:new CircleHitbox2D(v2(0,0),0.57),
            scale:{
                destroy:0.5
            },
            assets:{
                frame:{
                    particle:"metal_particle",
                    transform:{
                        scale:2,
                    },
                }
            },
            rotationMode:RotationMode.full,
            zIndex:zIndexes.Obstacles1,
            onDestroyExplosion:"barrel_explosion",
            material:"metal",
            reflect_bullets:true,
            particles:{
                tint:0x484848
            },
            spawnMode:Spawn.grass
        },
        {
            idString:"sillo",
            health:1,
            imortal:true,
            hitbox:new CircleHitbox2D(v2(0,0),3),
            rotationMode:RotationMode.full,
            zIndex:zIndexes.Obstacles1,
            onDestroyExplosion:"barrel_explosion",
            material:"metal",
            reflect_bullets:true,
            assets:{
                frame:{
                    particle:"metal_particle",
                    transform:{
                        scale:2,
                    },
                },
            },
            particles:{
                tint:0x484848
            },
            spawnMode:Spawn.grass,
        },
        {
            idString:"oak_tree",
            health:120,
            hitbox:new CircleHitbox2D(v2(0,0),0.4),
            spawnHitbox:new CircleHitbox2D(v2(0,0),1.5),
            scale:{
                destroy:0.9,
            },
            assets:{
                frame:{
                    particle:"oak_tree_particle",
                    biome_skins:["snow"],
                    transform:{
                        scale:2
                    },
                }
            },
            rotationMode:RotationMode.full,
            zIndex:zIndexes.Obstacles4,
            material:"tree",
            spawnMode:Spawn.grass,
            world_shadow:{
                model:model2d.circle(2,20)
            }
        },
        CreateCrate("wood_crate",0x583b08,{},"plank_particle",true),
        CreateCrate("md_crate",0x7021d3,{},"plank_particle",true),
        CreateCrate("tundra_crate",0x3e58c4,{},"plank_particle",true),
        CreateCrate("copper_crate",0xcc742d,{
            health:160,
            material:"iron",
            reflect_bullets:true,
        }),
        CreateCrate("iron_crate",0x656877,{
            health:170,
            material:"iron",
            reflect_bullets:true,
        }),
        CreateCrate("gold_crate",0xffd92b,{
            health:180,
            material:"iron",
            reflect_bullets:true
        }),
        CreateCrate("platinum_crate",0x468edb,{
            health:500,
            material:"iron",
            reflect_bullets:true,
            scale:{
                destroy:0.75,
            },
            hitbox:RectHitbox2D.centered(v2.zero(),v2(3,3))
        }),
        {
            idString:"bush",
            health:70,
            hitbox:new CircleHitbox2D(v2(0,0),0.8),
            no_collision:true,
            scale:{
                destroy:0.8
            },
            assets:{
                frame:{
                    particle:"leaf_01_particle_1",
                    biome_skins:["snow"],
                    transform:{
                        scale:2
                    },
                }
            },
            rotationMode:RotationMode.full,
            zIndex:zIndexes.Obstacles3,
            material:"bush",
            spawnMode:Spawn.grass,
            height:2
        },
        {
            idString:"wood_door",
            health:80,
            hitbox:new RectHitbox2D(v2(-0.15,0),v2(0.15,1.35)),
            assets:{
                frame:{
                    base:"door",
                    particle:"plank_particle",
                    transform:{
                        hotspot:v2(0.5,0),
                        scale:2,
                        tint:0x583b08
                    },
                }
            },
            particles:{
                tint:0x583b08
            },
            rotationMode:RotationMode.limited,
            zIndex:zIndexes.Obstacles3,
            material:"tree",
            spawnMode:Spawn.grass,
            expanded_behavior:{
                type:0,
                open_duration:0.15,
                offset:0,

                open_sound:"wood_door_open",
                close_sound:"wood_door_close"
            },
        },
        create_wall.column_1("wood_column",0x583b08),

        create_wall.wall("wood_wall_2x1","wall_size_2x1",0x583b08),
        create_wall.wall("wood_wall_4x1","wall_size_4x1",0x583b08,0.4933),
        create_wall.wall("wood_wall_6x1","wall_size_6x1",0x583b08,0.739998),
        create_wall.wall("wood_wall_8x1","wall_size_8x1",0x583b08,0.986664),
        create_wall.wall("wood_wall_10x1","wall_size_10x1",0x583b08,1.23333),
        create_wall.wall("wood_wall_12x1","wall_size_12x1",0x583b08,1.47999),
        create_wall.wall("wood_wall_14x1","wall_size_14x1",0x583b08,1.72666),
        create_wall.wall("wood_wall_16x1","wall_size_16x1",0x583b08,1.97332),
        create_wall.wall("wood_wall_20x1","wall_size_20x1",0x583b08,2.46666),
        create_wall.wall("wood_wall_24x1","wall_size_24x1",0x583b08,2.95999),
        create_wall.wall("wood_wall_28x1","wall_size_28x1",0x583b08,3.45332),

        //Christmas
        {
            idString:"christmas_tree",
            health:300,
            hitbox:new CircleHitbox2D(v2(0,0),0.6),
            spawnHitbox:new CircleHitbox2D(v2(0,0),1),
            scale:{
                destroy:0.9,
                max:1.2,
                min:1
            },
            assets:{
                frame:{
                    particle:"oak_tree_particle",
                    transform:{
                        scale:2
                    },
                }
            },
            lootTable:"christmas_tree",
            rotationMode:RotationMode.full,
            zIndex:zIndexes.Obstacles4,
            material:"tree",
            spawnMode:Spawn.grass
        },
        {
            idString:"recorded_tape",
            health:1,
            imortal:true,
            hitbox:new RectHitbox2D(v2(-0.71,-0.71),v2(0.26,0.48)),
            assets:{
                frame:{
                    particle:"metal_particle",
                    transform:{
                        hotspot:v2(0.5,0.5),
                        scale:1.5,
                    },
                }
            },
            rotationMode:RotationMode.null,
            zIndex:zIndexes.Obstacles3,
            material:"metal",
            reflect_bullets:true,
            expanded_behavior:{
                type:1,
                duration:40,
                click_sound:"click_play",
                delay:1.2
            },
            particles:{
                tint:0x656877
            },
            spawnMode:Spawn.grass
        },
        {
            idString:"iron_ladder_bottom",
            health:1,
            hitbox:new RectHitbox2D(v2(-0.15,-0.5),v2(0.15,0.5)),
            imortal:true,

            material:"metal",
            assets:{
                frame:{
                    particle:"metal_particle",
                    transform:{
                        hotspot:v2(0.5,0.5),
                        scale:2,
                    },
                }
            },
            particles:{
                tint:0x656877
            },

            reflect_bullets:true,

            rotationMode:RotationMode.limited,
            zIndex:zIndexes.Obstacles3,
            spawnMode:Spawn.grass,

            expanded_behavior:{
                type:2,
                action_time:1,
                interact_side:[{
                    pos:v2(-0.7,0),
                    rot:0,
                    dest_pos:v2(0.7,0)
                }],
                floor_walk:1,
            }
        },
        {
            idString:"iron_ladder_top",
            health:1,
            hitbox:new RectHitbox2D(v2(-0.15,-0.5),v2(0.15,0.5)),
            imortal:true,

            material:"metal",
            assets:{
                frame:{
                    particle:"metal_particle",
                    transform:{
                        hotspot:v2(0.5,0.5),
                        scale:2,
                    },
                }
            },
            particles:{
                tint:0x656877
            },

            reflect_bullets:true,

            rotationMode:RotationMode.limited,
            zIndex:zIndexes.Obstacles3,
            spawnMode:Spawn.grass,

            expanded_behavior:{
                type:2,
                action_time:1,
                interact_side:[{
                    pos:v2(0.8,0),
                    rot:180,
                    dest_pos:v2(-0.7,0)
                }],
                floor_walk:-1,
            }
        }
    )
}