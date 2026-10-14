import { DefaultGELvents, ObjectComponent, Stream, v2, v2m, Vec2 } from "../../../engine/core.ts";
import { GameObjectType, LootData } from "../../others/constants.ts";
import { decode_loot_data, encode_loot_data } from "../../others/functions.ts";
import { Floors, FloorType } from "../../others/terrain.ts";
import { type SimulatedObject } from "./base.ts";

export interface Loot_CData{
    loot_data:LootData
    set_loot_data(loot:LootData):void
}
export interface LootEntity_CData extends Loot_CData{
    old_position:Vec2
    velocity:Vec2
    current_floor:FloorType
    push(speed:number,angle:number):void
}

export const c_loot_entity:ObjectComponent<LootEntity_CData&SimulatedObject>={
    number_name:1,
    string_name:"loot_entity", // Loot Entity
    events:{
        [DefaultGELvents.bind]:[
            (obj)=>{
                obj.allow_tick = true
                obj.old_position=v2(-1,-1)
                obj.velocity=v2.zero()
                obj.current_floor=FloorType.Water
            }
        ],
        [DefaultGELvents.tick]:[
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
                                const vel=v2.scale((col.dir.x===1&&col.dir.y===0)?v2.random(-1,1):col.dir,3*dt)
                                v2m.sub(obj.velocity,obj.velocity,vel)
                                obj.position=v2.sub(obj.position,v2.scale(col.dir,col.pen*dt*2.5))
                            }
                            break
                        }
                        // deno-lint-ignore no-fallthrough
                        case GameObjectType.Obstacle:
                        case GameObjectType.StaticBody:
                        case GameObjectType.Building:
                        case GameObjectType.Walls:{
                            if(other.physical_data.stairs.length>0){
                                for(const s of other.physical_data.stairs){
                                    if(s.hitbox.colliding_with(obj.hitbox))obj.manager.set_layer(obj,other.layer+s.dest_layer)
                                }
                            }
                            if(other.physical_data.no_collision)break
                            const collisions=obj.hitbox.overlap_collisions(other.hitbox)
                            for(const col of collisions){
                                obj.position=v2.sub(obj.position,v2.scale(col.dir,col.pen))
                            }
                            break
                        }
                    }
                }
                if(obj.velocity.x!=0||obj.velocity.y!=0){
                    v2m.scale(obj.velocity,obj.velocity,1/(1+dt*2.5))
                    const pos=v2.add(obj.position,v2.scale(obj.velocity,speed*dt))
                    obj.position=obj.scene.map.clamp_hitbox(pos,obj.base_hitbox)
                }
                if(!v2.is(obj.position,obj.old_position)){
                    obj.old_position=v2.clone(obj.position)
                    obj.current_floor=obj.scene.map.terrain.get_floor_type(obj.position,obj.layer,obj.scene.map.default_floor)
                    obj.set_dirty_part()
                }
            }
        ],
        [DefaultGELvents.checkpoint_encode]:[
            (obj,stream:Stream)=>{
                stream.write_pos2(obj.position)
                .write_pos2(obj.velocity)
                encode_loot_data(obj.game.definitions,obj.loot_data,stream)
            }
        ],
        [DefaultGELvents.checkpoint_decode]:[
            (obj,stream:Stream)=>{
                obj.position=stream.read_pos2()
                obj.velocity=stream.read_pos2()
                obj.set_loot_data(decode_loot_data(obj.game.definitions,stream))
            }
        ]
    },
    methods:{
        push(ctx,speed:number,angle:number){
            const a=v2.from_RadAngle(angle)
            v2m.add_component(ctx.object.velocity,a.x*speed,a.y*speed)
        }
    }
}