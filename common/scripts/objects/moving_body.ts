import { GameObjectType, type LootData } from "../others/constants.ts";
import { DefaultObjec2DEvents, ObjectComponent2D } from "../../engine/core/game/gameObject.ts"
import { BaseGameObject2D, v2, v2m, Vec2 } from "../../engine/core.ts";
import { Floors, FloorType } from "../others/terrain.ts";


export interface MovingBodyBase{
    rotation:number
}
export interface LootBase{
    loot_data:LootData
}
export interface LootBasePhysics extends LootBase{
    old_position:Vec2
    velocity:Vec2
    current_floor:FloorType
}

export const loot_physics:ObjectComponent2D<LootBasePhysics&BaseGameObject2D>={
    number_name:1,
    string_name:"loot_physics", // Loot Network Client
    events:{
        [DefaultObjec2DEvents.bind]:[
            (obj)=>{
                obj.allow_tick=true

                obj.old_position=v2(-1,-1)
                obj.velocity=v2.zero()
                obj.current_floor=FloorType.Water
            }
        ],
        [DefaultObjec2DEvents.create]:[
            (obj,args)=>{
            }
        ],
        [DefaultObjec2DEvents.tick]:[
            (obj,dt:number)=>{
                const cf=Floors[obj.current_floor]
                const speed=1*(cf.speed_mult??1)
                if(obj.current_floor === FloorType.Water){
                    for(const river of obj.scene.map.rivers){
                        const col=river.get_point_inside(obj.position)
                        if(!col?.push){
                            continue
                        }
                        const point=river.get_closest_point(obj.position)
                        if(point){
                            v2m.add(obj.velocity,obj.velocity,v2.scale(point.direction,point.push_force*dt))
                        }
                        break
                    }
                }
                const others=obj.manager.cells.get_objects(obj.hitbox,obj.layer)
                for(const other of others){
                    switch(other.number_type){
                        case GameObjectType.Loot:{
                            if(other.id===obj.id)continue
                            const col=obj.hitbox.overlap_collision(other.hitbox)
                            if(col){
                                obj.velocity=v2.sub(obj.velocity,v2.scale((col.dir.x===1&&col.dir.y===0)?v2.random(-1,1):col.dir,3.4*dt))
                            }
                            break
                        }
                        // deno-lint-ignore no-fallthrough
                        case GameObjectType.Obstacle:
                        case GameObjectType.StaticBody:
                        case GameObjectType.Building:{
                            if((other as StaticBody).physical_data.stairs.length>0){
                                for(const s of (other as StaticBody).physical_data.stairs){
                                    if(s.hitbox.colliding_with(obj.hitbox))obj.manager.set_layer(this,other.layer+s.dest_layer)
                                }
                            }
                            if((other as StaticBody).physical_data.no_collision)break
                            const collisions=obj.hitbox.overlap_collisions(other.hitbox)
                            for(const col of collisions){
                                obj.position=v2.sub(obj.position,v2.scale(col.dir,col.pen))
                                obj.velocity=v2.sub(obj.velocity,v2.scale((col.dir.x===1&&col.dir.y===0)?v2.random(-1,1):col.dir,0.03))
                            }
                            break
                        }
                    }
                }
                if(obj.velocity.x!=0||obj.velocity.y!=0){
                    v2m.scale(obj.velocity,obj.velocity,1/(1+dt*3.5))
                    const pos=v2.add(obj.position,v2.scale(obj.velocity,speed*dt))
                    obj.position=obj.scene.map.clamp_hitbox(pos,obj.base_hitbox)
                }
                if(!v2.is(obj.position,obj.old_position)||obj.velocity.x!=0||obj.velocity.y!=0){
                    obj.old_position=v2.clone(obj.position)
                    obj.current_floor=obj.scene.map.terrain.get_floor_type(obj.position,obj.layer,obj.scene.map.default_floor)
                    obj.set_dirty_part()
                }
            }
        ],
    }
}