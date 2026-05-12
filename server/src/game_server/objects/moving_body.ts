import { ServerGameObject } from "../others/gameObject.ts";
import { NetStream, v2, v2m, Vec2} from "common/engine/core.ts";
import { StaticBody } from "./static_body.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { type Obstacle } from "./obstacle.ts";

export interface MovingBodyPhysicalData{
    velocity:Vec2
    rotation:number
    substeps?:number
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
            // deno-lint-ignore no-fallthrough
            case GameObjectType.Obstacle:
                if((obj as Obstacle).physical_data.stairs.length>0){
                    for(const s of (obj as Obstacle).physical_data.stairs){
                        if(s.hitbox.colliding_with(this.hitbox))this.set_layer(obj.layer+s.dest_layer)
                    }
                }
            case GameObjectType.Building:{
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
    update(dt: number): void {
        const substeps = this.physical_data.substeps ?? 0
        if (substeps > 1) {
            const objs = this.manager.cells.get_objects(this.hitbox, this.layer)
            const step_dt = dt / substeps
            for (let i = 0; i < substeps; i++) {
                const pos = v2.add(this.position, v2.scale(this.physical_data.velocity, step_dt))
                this.position = this.game.map.clamp_hitbox(pos, this.hitbox)
                for (const obj of objs) {
                    if (obj.id === this.id) continue
                    this.on_collided(obj, step_dt)
                }
            }
        } else {
            const pos = v2.add(this.position, v2.scale(this.physical_data.velocity, dt))
            this.position = this.game.map.clamp_hitbox(pos, this.hitbox)
            const objs = this.manager.cells.get_objects(this.hitbox, this.layer)
            for (const obj of objs) {
                if (obj.id === this.id) continue
                this.on_collided(obj, dt)
            }
        }
    }
    physical_encode(stream:NetStream){
        stream.writePos2(this.position)
        .writeRad(this.physical_data.rotation)
    }
}