import { c_moving_body, C_MovingBody } from "common/scripts/game/objects/moving_body/moving_body.ts";
import { GameObject } from "../../main/gel.ts";
import { gel_events, GELComponent, v2 } from "common/engine/core.ts";

export type CC_MovingBody=GameObject&C_MovingBody&{
    distance_walked:number
    moving_dir:number
}

export const cc_moving_body:GELComponent<CC_MovingBody>={
    id_string:"cc_moving_body",
    extensions:[c_moving_body],
    events:{
        [gel_events.bind](){
            this.distance_walked=0
        },
        [gel_events.tick](dt:number){
            this.distance_walked=0
            this.moving_dir=this.rotation
            if(!this._old_position||!v2.is(this.position,this._old_position)){
                if(this._old_position){
                    this.distance_walked=v2.distance(this._old_position, this.position)
                    this.moving_dir=v2.lookTo(this._old_position,this.position)
                }
                this._old_position=v2.clone(this.position)
                //this.emit_event(moving_body_events.moved)
            }
        }
    }
}