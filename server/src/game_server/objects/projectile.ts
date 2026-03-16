import { ExplosionDef } from "common/scripts/definitions/objects/explosions.ts";
import { NetStream, Numeric, v2 } from "common/engine/core.ts";
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { type Human } from "./human.ts";
import { type Obstacle } from "./obstacle.ts";
import { DamageReason } from "common/scripts/definitions/utils.ts";
import { DamageSourceDef } from "common/scripts/definitions/game_defs.ts";
export type ProjectilePhysicalData=MovingBodyPhysicalData&{
    angular_velocity:number
}
export interface ProjectileData{
    explosion?:ExplosionDef
    collision_damage?:number
    collision_damage_resistence?:number
}
export abstract class Projectile extends MovingBody{
    owner?:Human
    source?:DamageSourceDef

    abstract projectile_data: ProjectileData
    abstract override physical_data: ProjectilePhysicalData

    constructor(){
        super()
    }
    kill(){
        this.destroy()
        if(this.projectile_data.explosion)this.game.add_explosion(this.position,this.projectile_data.explosion,this.owner,this.source,this.layer)
    }
    override push(speed:number=3,dir:number,angular_velocity:number=10){
        super.push(speed,dir)
        this.physical_data.angular_velocity=Numeric.clamp(this.physical_data.angular_velocity+angular_velocity,-40,40)
    }
    override on_collided(obj: ServerGameObject): void {
        super.on_collided(obj)
        if(this.projectile_data.collision_damage&&[GameObjectType.Human,GameObjectType.Obstacle].includes(obj.number_type)){
            (obj as Human|Obstacle).damage({amount:this.projectile_data.collision_damage,critical:false,position:this.position,reason:DamageReason.Human,owner:this.owner,resistence:this.projectile_data.collision_damage_resistence})
        }
    }
    override update(dt:number): void {
        if(!v2.is(this.physical_data.velocity,v2.zero)){
            this.net_sync.part=true
            super.update(dt)
        }
        this.physical_data.rotation+=this.physical_data.angular_velocity*dt
    }
    override encode(stream: NetStream, full: boolean): void {
        this.physical_encode(stream)
    }

    override interact(user: Human): void {}
    override can_interact(user: Human): boolean {
        return false
    }
}