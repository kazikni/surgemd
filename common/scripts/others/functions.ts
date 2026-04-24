import { Hitbox2D } from "../../engine/core.ts";
import { ObstacleBehaviorDoor } from "../definitions/objects/obstacles.ts";

export function CalculateDoorHitbox(hitbox:Hitbox2D,door:ObstacleBehaviorDoor):Record<-1|0|1,Hitbox2D>{
    return {
        [-1]:hitbox.transform(undefined,undefined,undefined,1),
        0:hitbox,
        1:hitbox.transform(undefined,undefined,undefined,3)
    }
}
export function CalculatePlayerLevel(xp:number,base_xp:number=10,factor:number=1.5):number{
    return Math.floor(Math.pow(xp / base_xp, 1 / factor)+1)
}
export function CalculatePlayerLevelProgress(xp:number,base_xp:number=10,factor:number=1.5):number{
    const level=Math.pow(xp / base_xp, 1 / factor)+1
    return level-Math.floor(level)
}