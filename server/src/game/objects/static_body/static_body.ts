import { Collider2D } from "common/engine/core.ts";
import { ObjectType } from "common/scripts/others/constants.ts";
import { SimObject } from "../../main/base.ts";

export class StaticBody extends SimObject{
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
    spawn_collider?:Collider2D
    constructor(){
        super()
        this.object_type=ObjectType.StaticBody
        this.physical={
            collider:this.collider
        }
    }

    override update_collider(): void {
        super.update_collider()
        if(this.physical.spawn_collider)this.spawn_collider=this.physical.spawn_collider.transform(this.position)
        else delete this.spawn_collider
    }
}