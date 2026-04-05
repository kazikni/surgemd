import { Definition, Definitions, FrameDef, Hitbox2D, HitboxGroup2D, mergeDeep, RectHitbox2D, v2, Vec2 } from "../../../engine/core.ts";
import { Spawn, SpawnMode } from "../../others/constants.ts";
import { FloorType } from "../../others/terrain.ts";

export type BuildingObstacles={
    id:string
    position:Vec2
    layer?:number
    rotation?:number
    scale?:number
}
export type BuildingLoot={
    table:string
    position:Vec2
}
export type BuildingSubBuilding={
    id:string
    position:Vec2
    layer?:number
    rotation?:0|1|2|3
}
export interface BuildingDef extends Definition{
    no_collisions?: boolean
    no_bullet_collision?: boolean
    reflect_bullets?:boolean
    obstacles?:BuildingObstacles[]
    sub_building?:BuildingSubBuilding[]
    loots?:BuildingLoot[]
    spawnHitbox?:Hitbox2D
    spawnMode:SpawnMode
    hitbox?:Hitbox2D
    floors?:{hitbox:Hitbox2D,type:FloorType,layer?:number}[]
    floor_image?:(FrameDef&{layer?:number})[]
    ceiling?:{frame:FrameDef,hitbox:Hitbox2D,visible_opacity?:number,layer?:number}[]
    material?:string
    assets?:{
        particles?:string
        particles_variation?:number
        particles_tint?:number
        sounds?:{
            hit:string
            break:string
            hit_variations?:number
        }
    }
}
const Templates={
    container_1:{
        idString:"container_1",
        obstacles:[
            
        ],
        spawnMode:Spawn.grass,
        reflect_bullets:true,
        loots:[
            {position:v2.new(-1,0),table:"ground_loot"},
            {position:v2.new(1,0),table:"ground_loot"}
        ],
        hitbox:RectHitbox2D.wall_enabled(v2.new(-2.85,-1.42),v2.new(2.85,1.42),{
            left:true,
            bottom:true,
            right:false,
            top:true
        },0.5),
        spawnHitbox:new RectHitbox2D(v2.new(-2.85,-1.42),v2.new(2.85,1.42)),
        material:"iron",
        assets:{
            particles:"metal_particle",
            particles_tint:0x00359f
        },
        floor_image:[
            {
                image:"container_floor_1",
                position:v2.new(0,0),
                hotspot:v2.new(.5,.5),
                scale:2,
                tint:0x00359f
            }
        ],
        ceiling:[
            {
                frame:{
                    image:"container_ceiling_1",
                    position:v2.new(0,0),
                    hotspot:v2.new(.5,.5),
                    scale:2,
                    tint:0x00359f
                },
                hitbox:new RectHitbox2D(v2.new(-2.8,-1.3),v2.new(2.8,1.3)),
            }
        ]
    } satisfies BuildingDef,
    container_2:{
        idString:"container_2",
        obstacles:[
            
        ],
        spawnMode:Spawn.grass,
        reflect_bullets:true,
        loots:[
            {position:v2.new(-1,0),table:"ground_loot"},
            {position:v2.new(1,0),table:"ground_loot"}
        ],
        hitbox:RectHitbox2D.wall_enabled(v2.new(-2.85,-1.42),v2.new(2.85,1.42),{
            left:false,
            bottom:true,
            right:false,
            top:true
        },0.5),
        material:"iron",
        assets:{
            particles:"metal_particle",
            particles_tint:0x00359f
        },
        floor_image:[
            {
                image:"container_floor_2",
                position:v2.new(0,0),
                hotspot:v2.new(.5,.5),
                scale:2,
                tint:0x00359f
            }
        ],
        ceiling:[
            {
                frame:{
                    image:"container_ceiling_2",
                    position:v2.new(0,0),
                    hotspot:v2.new(.5,.5),
                    scale:2,
                    tint:0x00359f
                },
                hitbox:new RectHitbox2D(v2.new(-2.8,-1.3),v2.new(2.8,1.3)),
            }
        ]
    } satisfies BuildingDef,
}
export function Buildings_Default_Init(buildings:Definitions<BuildingDef,{}>){
    buildings.insert(
        mergeDeep({},Templates.container_1) as BuildingDef,
        mergeDeep({},Templates.container_2) as BuildingDef,
        {
            idString:"watchtower",
            obstacles:[
                {
                    id:"iron_ladder_bottom",
                    position:v2.new(-5.6,-4.55),
                    rotation:0
                }
            ],
            floor_image:[],
            sub_building:[
                {
                    id:"watchtower_top",
                    position:v2.zero(),
                    layer:1
                }
            ],
            hitbox:RectHitbox2D.centered(v2.new(0,0),v2.new(6,6)),
            spawnMode:Spawn.grass,
        },
        {
            idString:"watchtower_top",
            floors:[
                {hitbox:RectHitbox2D.centered(v2(0,0),v2(11,11)),type:FloorType.Metal}
            ],
            obstacles:[
                {
                    id:"iron_ladder_top",
                    position:v2.new(-5.6,-4.55),
                    rotation:0,
                }
            ],
            floor_image:[
                {
                    image:"watch_tower_floor_1",
                    position:v2.new(0,0),
                    hotspot:v2.new(.5,.5),
                    scale:2.3,
                }
            ],
            hitbox:new HitboxGroup2D(
                new RectHitbox2D(v2.new(-5.5,-5.5),v2.new(-5.25,-5.01)),
                new RectHitbox2D(v2.new(-5.5,-4.1),v2.new(-5.25,5.5)),

                new RectHitbox2D(v2.new(-5.5,-5.5),v2.new(5.5,-5.24)),
                new RectHitbox2D(v2.new(5.24,-5.5),v2.new(5.5,5.24)),
                new RectHitbox2D(v2.new(-5.5,5.24),v2.new(5.5,5.5)),
                RectHitbox2D.centered(v2.new(0,0),v2.new(7.8,7.8))
            ),
            spawnMode:Spawn.grass,
        }
    )
}