import { gel_events, GELComponent, Stream, v2, v2m, Vec2 } from "../../../engine/core.ts";
import { ObjectType, LootData, object_instance_type } from "../../others/constants.ts";
import { decode_loot_data, encode_loot_data } from "../../others/functions.ts";
import { Floors, FloorType } from "../../others/terrain.ts";
import { CommonObject, SimulatedObject } from "../base.ts";
import { SI_StaticBody } from "./static_body/static_body.ts";

export interface C_Loot extends CommonObject{
    loot_data:LootData
    set_loot_data(loot:LootData):void
}
export const c_loot:GELComponent<C_Loot>={
    id_string:"c_loot",
    events:{
        [gel_events.bind]:function(){
            this.object_type=ObjectType.Loot
            this.instance_type=object_instance_type.loot
        },
        [gel_events.create]:function(args:{data?:LootData,position?:Vec2}={}){
            if(args.position)this.position=args.position
            if(args.data)this.set_loot_data(args.data)
        }
    }
}
export type SI_Loot=C_Loot&SimulatedObject&{
    old_position:Vec2
    velocity:Vec2
    current_floor:FloorType
    push(speed:number,angle:number):void
}

export const si_loot:GELComponent<SI_Loot>={
    id_string:"si_loot",
    extensions:[c_loot],
    events:{
        [gel_events.bind]:function(){
            this.allow_tick=true
            this.old_position=v2(-1,-1)
            this.velocity=v2.zero()
            this.current_floor=FloorType.Water
        },
        [gel_events.tick]:function(dt:number){
            const cf=Floors[this.current_floor]
            const speed=1*(cf.speed_mult??1)
            if(this.current_floor === FloorType.Water){
                for(const river of this.scene.map.rivers){
                    const col=river.get_point_inside(this.position)
                    if(!col?.push){
                        continue
                    }
                    const point=river.get_closest_point(this.position)
                    if(point){
                        v2m.add(this.velocity,this.velocity,v2.scale(point.direction,point.push_force*dt))
                    }
                    break
                }
            }
            const others:SimulatedObject[]=this.manager.cells.get_objects(this.collider,this.layer)
            for(const other of others){
                if(other.__components.has("c_static_body")){
                    if((other as SI_StaticBody).physical.no_collision)break
                    const collisions=this.collider.overlap_collisions(other.collider)
                    for(const col of collisions){
                        v2m.sub(this.position,this.position,v2.scale(col.dir,col.pen))
                    }
                }else if(other.__components.has("c_loot")){
                    if(other.id===this.id)continue
                    const col=this.collider.overlap_collision(other.collider)
                    if(col){
                        const pen=col.pen*2.5*dt
                        if(col.pen<=0.05)col.dir=v2.random(-1,1)

                        const vel=v2.scale(col.dir,pen)
                        v2m.sub(this.velocity,this.velocity,vel)
                        v2m.sub(this.position,this.position,v2.scale(col.dir,pen))
                    }
                    break
                }
            }
            if(!v2.is(this.position,this.old_position)){
                this.old_position=v2.clone(this.position)
                v2m.scale(this.velocity,this.velocity,1/(1+dt*2.5))
                const pos=v2.add(this.position,v2.scale(this.velocity,speed*dt))
                this.position=this.scene.map.clamp_collider(pos,this.base_collider)
                this.current_floor=this.scene.map.terrain.get_floor_type(this.position,this.layer,this.scene.map.default_floor)
                //this.set_dirty_part()
            }
        },
        [gel_events.checkpoint_encode]:function(stream:Stream){
            stream.write_pos2(this.position)
            .write_pos2(this.velocity)
            encode_loot_data(this.app.definitions,this.loot_data,stream)
        },
        [gel_events.checkpoint_decode]:function(stream:Stream){
            this.position=stream.read_pos2()
            this.velocity=stream.read_pos2()
            this.set_loot_data(decode_loot_data(this.app.definitions,stream))
        }
    },
    methods:{
        push(speed:number,angle:number){
            const a=v2.from_RadAngle(angle)
            v2m.add_component(this.velocity,a.x*speed,a.y*speed)
        }
    }
}