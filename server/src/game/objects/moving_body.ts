import { ServerGameObject } from "../others/gameObject.ts";
import { Stream, v2, v2m, Vec2} from "common/engine/core.ts";
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
        this.allow_tick=true
    }
    push(speed:number,dir:number){
        const vel=v2.from_RadAngle(dir,speed)
        v2m.add(this.physical_data.velocity,this.physical_data.velocity,vel)
    }
    on_collided(obj:ServerGameObject,dt:number){
        switch(obj.number_type){
            // deno-lint-ignore no-fallthrough
            case GameObjectType.Obstacle:
            case GameObjectType.Building:{
                if((obj as StaticBody).physical_data.stairs.length>0){
                    for(const s of (obj as StaticBody).physical_data.stairs){
                        if(s.hitbox.colliding_with(this.hitbox))this.manager.set_layer(this,obj.layer+s.dest_layer)
                    }
                }
                if((obj as StaticBody).physical_data.no_collision)break
                const collision=this.hitbox.overlap_collisions(obj.hitbox)
                for(const col of collision){
                    v2m.sub(this.position,this.position,v2.scale(col.dir,col.pen))
                    v2m.scale(this.physical_data.velocity,this.physical_data.velocity,-0.1)
                }
                break
            }
        }
    }
    override on_tick(dt: number): void {
        const pos = v2.add(this.position, v2.scale(this.physical_data.velocity, dt))
        this.position = this.scene.map.clamp_hitbox(pos, this.hitbox)
        const objs = this.manager.cells.get_objects(this.hitbox, this.layer)
        for (const obj of objs) {
            if (obj.id === this.id) continue
            this.on_collided(obj, dt)
        }
        if(v2.len(this.physical_data.velocity)<=0.000001){
            v2m.zero(this.physical_data.velocity)
        }
    }
    physical_encode(stream:Stream){
        stream.write_pos2(this.position)
        .write_rad(this.physical_data.rotation)
    }
}