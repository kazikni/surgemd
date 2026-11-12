import { OverlapCollision2D, v2, v2m, Vec2 } from "../../../engine/core.ts";
import { ObjectType } from "../../others/constants.ts";
import { SimObject } from "../base.ts";
import { type SI_StaticBody } from "./static_body/static_body.ts";

export abstract class MovingBody extends SimObject{
    velocity:Vec2=v2.zero()
    rotation:number=0

    push(speed:number,direction:number){
        v2m.add(this.velocity,this.velocity,v2.from_RadAngle(direction,speed))
    }
    on_collided(obj:SimObject,_dt:number){
        if(obj.object_type!==ObjectType.StaticBody||(obj as unknown as SI_StaticBody).physical.no_collision)return
        const collisions:OverlapCollision2D[]=this.collider.overlap_collisions(obj.collider)
        for(const col of collisions)v2m.sub(this.position,this.position,v2.scale(col.dir,col.pen))
    }
    move(dt:number){
        this.position=this.scene.map.clamp_collider(v2.add(this.position,v2.scale(this.velocity,dt)),this.collider)
        for(const obj of this.manager.cells.get_objects(this.collider,this.layer) as SimObject[]){
            if(obj.id!==this.id)this.on_collided(obj,dt)
        }
    }
}
