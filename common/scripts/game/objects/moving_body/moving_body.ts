import { gel_events, GELComponent, OverlapCollision2D, v2, v2m, Vec2 } from "../../../../engine/core.ts";
import { ObjectType } from "../../../others/constants.ts";
import { type CommonObject, type SimulatedObject } from "../../base.ts";
import { type SI_StaticBody } from "../static_body/static_body.ts";

export const moving_body_events={
    collided:gel_events.last+1,
    interact:gel_events.last+2,
    moved:gel_events.last+3,
    last:gel_events.last+4,
}

export interface C_MovingBody extends CommonObject{
    physical:{
        velocity:Vec2
        no_collision?:boolean
    }
    rotation:number
    _old_position?:Vec2
}

export const c_moving_body:GELComponent<C_MovingBody>={
    id_string:"c_moving_body",
    events:{
        [gel_events.bind]:function(){
            this.object_type=ObjectType.MovingBody
            this.allow_tick=true
            this.physical={
                velocity:v2.zero()
            }
            this.rotation=0
        },
        [gel_events.tick]:function(){
        }
    }
}
export type SI_MovingBody=C_MovingBody&SimulatedObject&{
    physical:{
        no_collision?:boolean
    }
}

export const si_moving_body:GELComponent<SI_MovingBody>={
    id_string:"si_moving_body",
    extensions:[c_moving_body],
    events:{
        [gel_events.bind]():void{
            this.physical={
                ...this.physical,
            }
        },
        [gel_events.tick](dt:number): void {
            const pos = v2.add(this.position, v2.scale(this.physical.velocity, dt))
            this.position = this.scene.map.clamp_collider(pos, this.collider)

            const objects:SimulatedObject[]=this.manager.cells.get_objects(this.collider,this.layer)
            for(const other of objects){
                let collisions:OverlapCollision2D[]|undefined
                if(!this.physical.no_collision&&other.__components.has("c_static_body")&&!(other as SI_StaticBody).physical.no_collision){
                    collisions=this.collider.overlap_collisions(other.collider)
                    for(const col of collisions){
                        v2m.sub(this.position,this.position,v2.scale(col.dir,col.pen))
                    }
                }
                this.emit_event_arg_sequence(moving_body_events.collided,collisions)
            }
        }
    }
}