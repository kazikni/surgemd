import { Collider2D, gel_events, GELComponent } from "../../../../engine/core.ts";
import { ObjectType } from "../../../others/constants.ts";
import { CommonObject, SimulatedObject } from "../../base.ts";

export const static_body_events={
    collided:gel_events.last+1,
    interact:gel_events.last+2,
    last:gel_events.last+3,
}

export interface C_StaticBody extends CommonObject{
    physical:{
        no_collision?:boolean
        no_projectiles_collision?:boolean
        no_pathfinding_collision?:boolean
        passable_by_projectiles?:boolean

        collider:Collider2D
        interaction_collider?:Collider2D
    }
    interaction_collider?:Collider2D
}

export const c_static_body:GELComponent<C_StaticBody>={
    id_string:"c_static_body",
    extensions:[],
    events:{
        [gel_events.bind]:function(){
            this.object_type=ObjectType.StaticBody
            this.physical={
                collider:this.collider
            }
        },
        [gel_events.update_collider](): void {
            if(this.physical.interaction_collider)this.interaction_collider=this.physical.interaction_collider.transform(this.position)
            else delete this.interaction_collider
        }
    }
}
export type SI_StaticBody=C_StaticBody&SimulatedObject&{
    physical:{
        no_spawn_collision?:boolean
        spawn_collider?:Collider2D
    }
    spawn_collider?:Collider2D
}

export const si_static_body:GELComponent<SI_StaticBody>={
    id_string:"si_static_body",
    extensions:[c_static_body],
    events:{
        [gel_events.update_collider](): void {
            if(this.physical.spawn_collider)this.spawn_collider=this.physical.spawn_collider.transform(this.position)
            else delete this.spawn_collider
        }
    }
}