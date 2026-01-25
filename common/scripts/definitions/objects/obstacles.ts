import { v2 } from "../../engine/geometry.ts";
import { CircleHitbox2D,Hitbox2D,Definitions,Definition, RotationMode, FrameTransform } from "../../engine/mod.ts";
import { Spawn, SpawnMode, zIndexes } from "../../others/constants.ts";
import { RectHitbox2D } from "../../engine/hitbox.ts";
import { DeepPartial, mergeDeep } from "../../engine/utils.ts";

export interface ObstacleBehaviorDoor{
    type:0,
    open_delay?:number
    cant_close?:boolean
    open_duration:number
    offset:number
}
export interface ObstacleDoorStatus{
    open:-1|0|1
    locked:boolean
}
export interface ObstacleBehaviorPlaySound{
    type:1
    duration:number
    click_sound:string
    delay:number
}
export interface ObstacleDef extends Definition{
    health:number
    hitbox?:Hitbox2D
    spawnHitbox?:Hitbox2D
    no_collision?:boolean
    no_bullet_collision?:boolean
    imortal?:boolean
    resistence?:number
    invisibleOnMap?:boolean
    scale?:{
        min?:number
        max?:number
        destroy?:number
    }
    frame_transform?:FrameTransform
    frame?:{
        base?:string
        dead?:string
        particle?:string
    }
    particles?:{
        variations?:number
        tint?:number
    }
    variations?:number
    biome_skins?:string[]
    zIndex?:number
    rotationMode?:number

    onDestroyExplosion?:string
    material?:string

    lootTable?:string

    interactDestroy?:boolean
    reflect_bullets?:boolean

    spawnMode:SpawnMode

    sounds?:{
        hit:string
        break:string
        hit_variations?:number
    }

    height?:0|1|2 // 0 = Invisible | 1 = Mayble | 2 = All

    expanded_behavior?:(
        ObstacleBehaviorDoor|ObstacleBehaviorPlaySound
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
function CreateStone(id:string,hitbox:Hitbox2D=new CircleHitbox2D(v2.new(0,0),0.82),o:DeepPartial<ObstacleDef>={}):ObstacleDef{
    return mergeDeep({
        idString:id,
        health:170,
        hitbox:hitbox,
        scale:{
            destroy:0.65,
        },
        frame:{
            particle:"stone_particle",
        },
        biome_skins:[
            "snow"
        ],
        frame_transform:{
            scale:2
        },
        rotationMode:RotationMode.full,
        zIndex:zIndexes.Obstacles1,
        material:"stone",
        particles:{
            variations:2
        },
        spawnMode:Spawn.grass,
        height:1,
    },o)
}
function CreateCrate(id:string,tint:number,o:DeepPartial<ObstacleDef>={},particle:string="metal_particle",interactDestroy:boolean=false):ObstacleDef{
    return mergeDeep({
        idString:id,
        health:70,
        hitbox:new RectHitbox2D(v2.new(-0.71,-0.71),v2.new(0.71,0.71)),
        scale:{
            destroy:0.6,
        },
        frame_transform:{
            scale:2,
            hotspot:v2.new(0.5,0.5)
        },
        rotationMode:RotationMode.null,
        zIndex:zIndexes.Obstacles3,
        material:"wood",
        interactDestroy:interactDestroy,
        lootTable:id,
        frame:{
            particle:particle
        },
        particles:{
            tint:tint
        },
        spawnMode:Spawn.grass,
        height:1,
    },o)
}
export const Obstacles=new Definitions<ObstacleDef,null>((_v)=>{})
Obstacles.insert(
    CreateStone("stone",undefined,{
        variations:2
    }),
    {
        idString:"barrel",
        health:110,
        hitbox:new CircleHitbox2D(v2.new(0,0),0.57),
        scale:{
            destroy:0.6
        },
        frame_transform:{
            scale:2,
        },
        rotationMode:RotationMode.full,
        zIndex:zIndexes.Obstacles1,
        onDestroyExplosion:"barrel_explosion",
        material:"metal",
        reflect_bullets:true,
        frame:{
            particle:"metal_particle"
        },
        particles:{
            tint:0x484848
        },
        spawnMode:Spawn.grass
    },
    {
        idString:"sillo",
        health:1,
        imortal:true,
        hitbox:new CircleHitbox2D(v2.new(0,0),2.8),
        rotationMode:RotationMode.full,
        zIndex:zIndexes.Obstacles1,
        onDestroyExplosion:"barrel_explosion",
        material:"metal",
        reflect_bullets:true,
        frame:{
            particle:"metal_particle"
        },
        frame_transform:{
            scale:2,
        },
        particles:{
            tint:0x484848
        },
        spawnMode:Spawn.grass
    },
    {
        idString:"oak_tree",
        health:120,
        hitbox:new CircleHitbox2D(v2.new(0,0),0.4),
        spawnHitbox:new CircleHitbox2D(v2.new(0,0),1),
        scale:{
            destroy:0.9,
        },
        frame_transform:{
            scale:2
        },
        rotationMode:RotationMode.full,
        zIndex:zIndexes.Obstacles4,
        material:"tree",
        biome_skins:["snow"],
        frame:{
            particle:"oak_tree_particle"
        },
        spawnMode:Spawn.grass
    },
    CreateCrate("wood_crate",0x583b08,{},"plank_particle",true),
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
        reflect_bullets:true,
    }),
    {
        idString:"bush",
        health:70,
        hitbox:new CircleHitbox2D(v2.new(0,0),0.8),
        no_collision:true,
        scale:{
            destroy:0.8
        },
        frame_transform:{
            scale:2
        },
        rotationMode:RotationMode.full,
        zIndex:zIndexes.Obstacles3,
        material:"bush",
        frame:{
            particle:"leaf_01_particle_1"
        },
        biome_skins:["snow"],
        spawnMode:Spawn.grass,
        height:2
    },
    {
        idString:"wood_door",
        health:180,
        hitbox:new RectHitbox2D(v2.new(-0.87,-0.15),v2.new(0.87,0.15)),
        frame_transform:{
            hotspot:v2.new(0.1,.5),
            position:v2.new(0.13,0.15),
            scale:1.5
        },
        rotationMode:RotationMode.limited,
        zIndex:zIndexes.Obstacles3,
        material:"tree",
        spawnMode:Spawn.grass,
        expanded_behavior:{
            type:0,
            open_duration:0.15,
            offset:0
        }
    },

    //Christmas
    {
        idString:"christmas_tree",
        health:300,
        hitbox:new CircleHitbox2D(v2.new(0,0),0.6),
        spawnHitbox:new CircleHitbox2D(v2.new(0,0),1),
        scale:{
            destroy:0.9,
            max:1.2,
            min:1
        },
        frame_transform:{
            scale:2
        },
        lootTable:"christmas_tree",
        rotationMode:RotationMode.full,
        zIndex:zIndexes.Obstacles4,
        material:"tree",
        frame:{
            particle:"oak_tree_particle"
        },
        spawnMode:Spawn.grass
    },
    {
        idString:"recorded_tape",
        health:1,
        imortal:true,
        hitbox:new RectHitbox2D(v2.new(-0.71,-0.71),v2.new(0.26,0.48)),
        frame_transform:{
            hotspot:v2.new(0.5,0.5),
            scale:1.5,
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
        frame:{
            particle:"metal_particle"
        },
        particles:{
            tint:0x656877
        },
        spawnMode:Spawn.grass
    },
)