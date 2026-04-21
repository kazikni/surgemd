import { ServerGameObject } from "../others/gameObject.ts";
import { NetStream, v2, v2m, Vec2} from "common/engine/core.ts";
import { StaticBody } from "./static_body.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";

export interface MovingBodyPhysicalData{
    velocity:Vec2
    rotation:number
}
export abstract class MovingBody extends ServerGameObject{
    abstract physical_data:MovingBodyPhysicalData

    constructor(){
        super()
    }
    push(speed:number,dir:number){
        const vel=v2.from_RadAngle(dir)
        v2m.scale(vel,vel,speed)
        v2m.add(this.physical_data.velocity,this.physical_data.velocity,vel)
    }
    on_collided(obj:ServerGameObject,dt:number){
        switch(obj.number_type){
            case GameObjectType.Obstacle:
            case GameObjectType.Building:{
                if((obj as StaticBody).physical_data.no_collision)break
                const ov=this.hitbox.overlapCollision((obj as StaticBody).hitbox)
                for(const c of ov){
                    v2m.sub(this.position,this.position,v2.scale(c.dir,c.pen))
                    v2m.scale(this.physical_data.velocity,this.physical_data.velocity,-0.1)
                }
                break
            }
        }
    }
    update(dt:number): void {
        const pos=v2.add(this.position,v2.scale(this.physical_data.velocity,dt))
        this.position=this.game.map.clamp_hitbox(pos,this.hitbox)
        this.manager.cells.updateObject(this)

        const objs:ServerGameObject[]=this.manager.cells.get_objects(this.hitbox,this.layer)
        for(const obj of objs){
            if(obj.id===this.id)continue
            this.on_collided(obj,dt)
        }
    }
    physical_encode(stream:NetStream){
        stream.writePos2(this.position)
        .writeRad(this.physical_data.rotation)
    }
}