import { DeepPartial, Definition, Definitions, FrameDef, FrameTD, Hitbox2D, HitboxGroup2D, mergeDeep, RectHitbox2D, TD, tdm, TDObject, TDType, v2, Vec2, Vec2TD, WeightDefinition } from "../../../engine/core.ts";
import { Spawn, SpawnMode, zIndexes } from "../../others/constants.ts";
import { FloorType } from "../../others/terrain.ts";
import { GameObjectDefTD, hit_sounds, HitParticlesDef, HitSoundsDef, ScopeChange } from "../utils.ts";
import { DecalTint } from "./decals.ts";
//20mm = 0.17619
//2mm  = 0.017619
export const BuildingClientTD: TDObject = {
    type: TDType.object,
    content: [
        ...GameObjectDefTD,

        { name: "no_collisions", content: tdm.boolean },
        { name: "no_bullet_collision", content: tdm.boolean },

        { name: "hitbox", content: tdm.any },
        
        // Ceiling
        {
            name: "ceiling",
            content: {
                type: TDType.onu,
                content: {
                    type: TDType.array,
                    len_bytes: 2,
                    content: {
                        type: TDType.object,
                        content: [
                            { name: "frame", content: FrameTD },
                            { name: "variations", content: tdm.any },
                            { name: "hitbox", content: tdm.any },

                            {
                                name: "below",
                                content: {
                                    type: TDType.onu,
                                    content: {
                                        type: TDType.object,
                                        content: [
                                            { name: "deenabled", content: tdm.boolean },
                                            { name: "duration", content: tdm.float32_onu },
                                            { name: "alpha", content: tdm.float32_onu },
                                        ]
                                    }
                                }
                            },

                            { name: "layer", content: tdm.int8_onu },
                            { name: "connections", content: tdm.any },
                            { name: "scope_change", content: tdm.any },

                            {
                                name: "destroy",
                                content: {
                                    type: TDType.onu,
                                    content: {
                                        type: TDType.object,
                                        content: [
                                            { name: "frame", content: tdm.string1 },
                                            { name: "sound", content: tdm.string1_onu },
                                            { name: "count", content: tdm.uint8 },
                                            {
                                                name: "particles",
                                                content: {
                                                    type: TDType.onu,
                                                    content: {
                                                        type: TDType.object,
                                                        content: [
                                                            { name: "count", content: tdm.uint8 }
                                                        ]
                                                    }
                                                }
                                            }
                                        ]
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        },
        // Floor Images
        {
            name: "floor_image",
            content: {
                type: TDType.onu,
                content: {
                    type: TDType.array,
                    len_bytes: 1,
                    content: {
                        type: TDType.object,
                        content: [
                            ...FrameTD.content,
                            { name: "create_shadow", content: tdm.boolean }
                        ]
                    }
                }
            }
        },
        // Assets
        {
            name: "assets",
            content: {
                type: TDType.onu,
                content: {
                    type: TDType.object,
                    content: [
                        { name: "sounds", content: tdm.any },
                        { name: "particles", content: tdm.any },
                    ]
                }
            }
        }
    ]
}
export const BuildingTD: TDObject={
    type:TDType.object,
    content:[
        ...BuildingClientTD.content,
        { name: "spawnHitbox", content: tdm.any },
        { name: "spawnMode", content: tdm.any },
        { name: "reflect_bullets", content: tdm.boolean },
        {
            name: "generate",
            content: {
                type: TDType.object,
                content: [
                    // Obstacles
                    {
                        name: "obstacles",
                        content: {
                            type: TDType.onu,
                            content: {
                                type: TDType.array,
                                len_bytes: 2,
                                content: {
                                    type: TDType.object,
                                    content: [
                                        { name: "def", content: tdm.any },
                                        { name: "id", content: tdm.uint16_onu },
                                        { name: "position", content: Vec2TD },
                                        { name: "connections", content: tdm.any },
                                        { name: "skin", content: tdm.uint8_onu },
                                        { name: "variation", content: tdm.uint8_onu },
                                        { name: "layer", content: tdm.int8_onu },
                                        { name: "rotation", content: tdm.float32_onu },
                                        { name: "scale", content: tdm.float32_onu },
                                        { name: "stairs_dest", content: tdm.any },
                                        { name: "only_side", content: tdm.uint8_onu },
                                        { name: "allow_biome_skin", content: tdm.boolean },
                                    ]
                                }
                            }
                        }
                    },
                    // Decals
                    {
                        name: "decals",
                        content: {
                            type: TDType.onu,
                            content: {
                                type: TDType.array,
                                len_bytes: 2,
                                content: {
                                    type: TDType.object,
                                    content: [
                                        { name: "def", content: tdm.string1 },
                                        { name: "position", content: Vec2TD },
                                        { name: "rotation", content: tdm.float32_onu },
                                        { name: "scale", content: tdm.float32_onu },
                                        { name: "layer", content: tdm.int8_onu },
                                        { name: "tint", content: tdm.any },
                                    ]
                                }
                            }
                        }
                    },
                    // Sub Buildings
                    {
                        name: "sub_building",
                        content: {
                            type: TDType.onu,
                            content: {
                                type: TDType.array,
                                len_bytes: 2,
                                content: {
                                    type: TDType.object,
                                    content: [
                                        { name: "def", content: tdm.any },
                                        { name: "position", content: Vec2TD },
                                        { name: "layer", content: tdm.int8_onu },
                                        { name: "rotation", content: tdm.uint8_onu },
                                    ]
                                }
                            }
                        }
                    },
                    // Loots
                    {
                        name: "loots",
                        content: {
                            type: TDType.onu,
                            content: {
                                type: TDType.array,
                                len_bytes: 2,
                                content: {
                                    type: TDType.object,
                                    content: [
                                        { name: "table", content: tdm.string1 },
                                        { name: "position", content: Vec2TD },
                                    ]
                                }
                            }
                        }
                    },
                    // Floors
                    {
                        name: "floors",
                        content: {
                            type: TDType.onu,
                            content: {
                                type: TDType.array,
                                len_bytes: 2,
                                content: {
                                    type: TDType.object,
                                    content: [
                                        { name: "hitbox", content: tdm.any },
                                        { name: "type", content: tdm.uint8 },
                                        { name: "layer", content: tdm.int8_onu },
                                    ]
                                }
                            }
                        }
                    },
                    // Stair Data
                    {
                        name: "stair_data",
                        content: {
                            type: TDType.onu,
                            content: {
                                type: TDType.array,
                                len_bytes: 1,
                                content: {
                                    type: TDType.object,
                                    content: [
                                        { name: "hitbox", content: tdm.any },
                                        { name: "dest", content: tdm.uint8 },
                                    ]
                                }
                            }
                        }
                    },
                ]
            }
        },
    ]
}
export type BuildingCeilingDef={
    frame:FrameDef
    variations?:number[]
    hitbox:Hitbox2D
    below?:{
        deenabled?:boolean
        duration?:number
        alpha?:number
    }
    layer?:number
    connections?:number[]
    scope_change?:ScopeChange
    destroy?:{
        frame:string
        sound?:string
        count:number
        particles?:{
            count:number
        }
    }
}
export type PuzzlePiece={
    id?:string
    value?:string
}
export type BuildingObstacles={
    def:string|((WeightDefinition&{def?:string})[])
    id?:number
    position:Vec2
    connections?:number[]
    skin?:number
    variation?:number
    layer?:number
    rotation?:number
    scale?:number
    stairs_dest?:Record<number,number>
    allow_biome_skin?:boolean
    press_data?:{
        activated?:boolean
        locked?:boolean
        allow_switch?:boolean
    }
    door_data?:{
        locked?:boolean
        cant_close?:boolean
        only_side?:-1|1
        open_state?:-1|0|1
    }
    puzzle_piece?:PuzzlePiece
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
export type PuzzleCondition=({
    type:"code"
    value?:string
    dont_need_orden?:boolean
}|{
    type:"break"
    id?:number|number[]
}|{
    type:"press"
    id?:number|number[]
})&{
    negate?:boolean
}
export type PuzzleAction={
    type:"door"
    id:number|number[]
    locked?:boolean
    cant_close?:boolean
    only_side?:-1|1
    open_state?:-1|0|1
}|{
    type:"press"
    id:number|number[]
    locked?:boolean
    can_switch?:boolean
    activated?:boolean
}|{
    type:"wait"
    time:number
}|{
    type:"puzzle"
    id?:string // undefined = self
    lock?:boolean
    solved?:boolean
}|{
    type:"check_fail"
}
export interface BuildingPuzzleDef{
    idString?:string // Default = "main"
    global?:boolean
    code?:{
        value?:string
        size:number
    }

    complete_actions?:PuzzleAction[]
    complete_conditions?:PuzzleCondition[]

    fail_actions?:PuzzleAction[]
    fail_conditions?:PuzzleCondition[]

    check_actions?:PuzzleAction[]
}
export interface BuildingDef extends Definition{
    no_collisions?: boolean
    no_bullet_collision?: boolean
    reflect_bullets?:boolean

    ceiling?:BuildingCeilingDef[]
    floor_image?:(FrameDef&{create_shadow?:boolean})[]

    generate:{
        obstacles?:BuildingObstacles[]
        decals?:BuildingDecal[]
        sub_building?:BuildingSubBuilding[]
        loots?:BuildingLoot[]
        floors?:{hitbox:Hitbox2D,type:FloorType,layer?:number}[]
        stair_data?:{
            hitbox:Hitbox2D
            dest:number
        }[]
        puzzles?:BuildingPuzzleDef[]
    }
    spawnHitbox?:Hitbox2D
    hitbox?:Hitbox2D
    spawnMode?:SpawnMode
    assets?:{
        sounds?:HitSoundsDef
        particles?:HitParticlesDef
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
                floor_image:[
                    {image:settings.floor??"container_floor",tint:tint,scale:3},
                    {image:settings.floor??"container_walls_1",tint:tint,zIndex:zIndexes.BuildingsWalls1}
                ],
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
                    particles:{
                        particle:"metal_particle",
                        tint:tint
                    },
                    sounds:hit_sounds.heavy_metal,
                },
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
                floor_image:[
                    {image:settings.floor??"container_floor",tint:tint,scale:3},
                    {image:settings.floor??"container_walls_2",tint:tint,zIndex:zIndexes.BuildingsWalls1}
                ],
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
        const ceiling=settings.ceiling??id+"_ceiling_1"
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
                floor_image:[
                    {image:floor+"_1"}
                ],
                ceiling:[{
                    frame:{
                        image:ceiling,
                        position:v2(0,0),
                    },
                    hitbox:spawn_hb,
                    scope_change:{}
                }],
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
                ceiling:[{
                    frame:{
                        image:ceiling,
                        position:v2(0,0),
                        rotation:Math.PI
                    },
                    hitbox:spawn_hb,
                    scope_change:{}
                }],
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
        content?:BuildingObstacles[]
    }={}):BuildingDef[]{
        return [
            mergeDeep({
                idString:id,
                generate:{
                    sub_building:[
                        {
                            def:"small_iron_stairs_down",
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
                no_bullet_collision:true,
                no_collisions:true,
                hitbox:RectHitbox2D.centered(v2(0,0),v2(1,1)),
            },settings.top??{}),
            mergeDeep({
                idString:id+"_bottom",
                reflect_bullets:true,
                floor_image:[
                    {image:"small_bunker_floor_2",scale:4,zIndex:zIndexes.BuildingFloor1},
                    {image:"small_bunker_floor_1",zIndex:zIndexes.BuildingsFloor2},
                ],
                ceiling:[
                    {
                        frame:{
                            image:"small_bunker_ceiling_1",
                            position:v2(0,0),
                            rotation:Math.PI
                        },
                        hitbox:new RectHitbox2D(v2(-2.65,-2.65),v2(2.65,2.65)),
                        scope_change:{}
                    }
                ],
                generate:{
                    sub_building:[
                        {
                            def:"small_iron_stairs_up",
                            position:v2.new(-3.28,0),
                            rotation:2,
                        },
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
                    ...RectHitbox2D.wall_enabled_list(v2(-2.65,-2.65),v2(2.65,2.65),{
                        bottom:true,
                        top:true,
                        left:false,
                        right:true
                    },0.22),
                    new RectHitbox2D(v2(-2.65,-2.65),v2(-2.45,-0.85)),
                    new RectHitbox2D(v2(-2.65,0.85),v2(-2.45,2.65))
                ),
            },settings.bottom??{})
        ]
    },
    meat_bunker(id:string,settings:{
        top?:DeepPartial<BuildingDef>
        bottom?:DeepPartial<BuildingDef>
        content?:BuildingObstacles[]
    }={}):BuildingDef[]{
        return [
            mergeDeep({
                idString:id,
                generate:{
                    sub_building:[
                        {
                            def:"small_iron_stairs_down",
                            position:v2.new(-3.5,0),
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
                floor_image:[
                    {image:"meat_bunker_floor_1",zIndex:zIndexes.BuildingsFloor2},
                ],
                ceiling:[
                    {
                        frame:{
                            image:"small_bunker_ceiling_1",
                            position:v2(0,0),
                            rotation:Math.PI
                        },
                        hitbox:new RectHitbox2D(v2(-2.65,-2.65),v2(2.65,2.65)),
                        scope_change:{}
                    }
                ],
                generate:{
                    sub_building:[
                        {
                            def:"small_iron_stairs_up",
                            position:v2.new(-3.28,0),
                            rotation:2,
                        },
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
                ceiling:[
                    {
                        frame:{
                            image:"shed_ceiling_1",
                            position:v2.zero(),
                            rotation:0
                        },
                        connections:[10,11,12,13,14],
                        destroy:{
                            frame:"shed_ceiling_break",
                            sound:"ceiling_break_1",
                            count:3,
                            particles:{
                                count:30
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
            floor_image:[
                {image:settings.floor??"storehouse_floor_1",position:v2(5.85,0),rotation:Math.PI,scale:2.5},
                {image:settings.floor??"storehouse_floor_1",position:v2(-5.85,0),scale:2.5},
            ],
            ceiling:[
                {
                    frame:{image:settings.ceiling??"storehouse_ceiling_1",scale:2.5},
                    hitbox:new RectHitbox2D(min,max),
                    scope_change:{}
                }
            ]
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
                generate:{
                    loots:[
                        {table:"black_container",position:v2.new(-2,0)}
                    ]
                }
            }
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
                {def:"metal_door",position:v2(-2.55,-0.7),rotation:1,variation:7}
            ]
        }),

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
        }),
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
    )
}