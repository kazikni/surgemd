import { Collider2D, gel_events, GELComponent } from "common/engine/core.ts";
import { ObjectType } from "common/scripts/others/constants.ts";
import { SimulatedObject } from "../../base.ts";

export const static_body_events={
    collided:gel_events.last+1,
    interact:gel_events.last+2,
    last:gel_events.last+3,
}

export type SI_StaticBody=SimulatedObject&{
    physical:{
        no_collision?:boolean
        no_projectiles_collision?:boolean
        no_pathfinding_collision?:boolean
        passable_by_projectiles?:boolean
        reflect_projectiles?:boolean
        no_spawn_collision?:boolean
        spawn_collider?:Collider2D

        collider:Collider2D
    }
    interaction_collider?:Collider2D
    spawn_collider?:Collider2D
}

export const si_static_body:GELComponent<SI_StaticBody>={
    id_string:"si_static_body",
    events:{
        [gel_events.bind]:function(){
            this.object_type=ObjectType.StaticBody
            this.physical={
                collider:this.collider
            }
        },
        [gel_events.update_collider](): void {
            if(this.physical.spawn_collider)this.spawn_collider=this.physical.spawn_collider.transform(this.position)
            else delete this.spawn_collider
        }
    }
}
