import { Definition, Definitions, FrameDef, Hitbox2D, HitboxGroup2D, mergeDeep, RectHitbox2D, v2, Vec2 } from "../../../engine/core.ts";
import { Spawn, SpawnMode } from "../../others/constants.ts";
import { FloorType } from "../../others/terrain.ts";
//20mm = 0.17619
//2mm  = 0.017619

export type BuildingObstacles={
    id:string
    position:Vec2
    skin?:number
    variation?:number
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
            {position:v2(-1,0),table:"normal_loot"},
            {position:v2(1,0),table:"normal_loot"}
        ],
        hitbox:RectHitbox2D.wall_enabled(v2(-2.85,-1.42),v2(2.85,1.42),{
            left:true,
            bottom:true,
            right:false,
            top:true
        },0.5),
        spawnHitbox:new RectHitbox2D(v2(-2.85,-1.42),v2(2.85,1.42)),
        material:"iron",
        assets:{
            particles:"metal_particle",
            particles_tint:0x00359f
        },
        floor_image:[
            {
                image:"container_floor_1",
                position:v2(0,0),
                hotspot:v2(.5,.5),
                scale:2,
                tint:0x00359f
            }
        ],
        ceiling:[
            {
                frame:{
                    image:"container_ceiling_1",
                    position:v2(0,0),
                    hotspot:v2(.5,.5),
                    scale:2,
                    tint:0x00359f
                },
                hitbox:new RectHitbox2D(v2(-2.8,-1.3),v2(2.8,1.3)),
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
            {position:v2(-1,0),table:"ground_loot"},
            {position:v2(1,0),table:"ground_loot"}
        ],
        hitbox:RectHitbox2D.wall_enabled(v2(-2.85,-1.42),v2(2.85,1.42),{
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
                position:v2(0,0),
                hotspot:v2(.5,.5),
                scale:2,
                tint:0x00359f
            }
        ],
        ceiling:[
            {
                frame:{
                    image:"container_ceiling_2",
                    position:v2(0,0),
                    hotspot:v2(.5,.5),
                    scale:2,
                    tint:0x00359f
                },
                hitbox:new RectHitbox2D(v2(-2.8,-1.3),v2(2.8,1.3)),
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
                    position:v2(-7.6,-6.1),
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
            hitbox:RectHitbox2D.centered(v2(0,0),v2(6,6)),
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
                    position:v2(-7.6,-6.1),
                    rotation:0,
                }
            ],
            floor_image:[
                {
                    image:"watch_tower_floor_1",
                    position:v2(0,0),
                    hotspot:v2(.5,.5),
                    scale:2,
                }
            ],
            hitbox:new HitboxGroup2D(
                new RectHitbox2D(v2(-10,-10),v2(10,-10)),

                /*new RectHitbox2D(v2(-5.5,-5.5),v2(5.5,-5.24)),
                new RectHitbox2D(v2(5.24,-5.5),v2(5.5,5.24)),
                new RectHitbox2D(v2(-5.5,5.24),v2(5.5,5.5)),
                RectHitbox2D.centered(v2(0,0),v2(7.8,7.8))*/
            ),
            spawnMode:Spawn.grass,
        },
        {
            idString:"small_house_1",
            obstacles:[
                {
                    id:"wood_door",
                    position:v2(-7.37,-6.7),
                    rotation:0
                },
                {
                    id:"wood_door",
                    position:v2(-0.54,-4.03),
                    rotation:2
                },

                {
                    id:"wood_column",
                    position:v2(-0.54,-0.59),
                },
                {
                    id:"wood_wall_8x1",
                    position:v2(-0.54,-6.3),
                    rotation:1
                },
                {
                    id:"wood_wall_14x1",
                    position:v2(-0.54,-2.4),
                    rotation:1
                },

                {
                    id:"wood_wall_28x1",
                    position:v2(-3.85,-0.59),
                    rotation:0
                },
            ],
            floor_image:[
                {
                    image:"small_house_1_floor",
                    position:v2(0,0),
                    hotspot:v2(.5,.5),
                    scale:2,
                }
            ],
            sub_building:[
            ],
            hitbox:new HitboxGroup2D(
                new RectHitbox2D(v2(-7.5,-7.5),v2(7.5,-7.25)),
                new RectHitbox2D(v2(-7.5,-7.5),v2(-7.25,-6.65)),
                new RectHitbox2D(v2(-7.5,-5.44),v2(-7.25,7.5)),

                new RectHitbox2D(v2(7.25,-7.5),v2(7.5,7.5)),
                new RectHitbox2D(v2(-7.5,7.25),v2(7.5,7.5)),
            ),
            spawnMode:Spawn.grass,
        },
    )
}