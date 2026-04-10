import { Orientation, RectHitbox2D, v2 } from "../../engine/core.ts";
import { ObstacleBehaviorDoor } from "../definitions/objects/obstacles.ts";

export function CalculateDoorHitbox(hitbox:RectHitbox2D,side:Orientation,door:ObstacleBehaviorDoor):Record<-1|0|1,RectHitbox2D>{
    return {
        [-1]:hitbox,
        0:hitbox,
        1:hitbox.transform(
            v2(3,0),
            1
        )
    }
}
export function CalculatePlayerLevel(xp:number,base_xp:number=10,factor:number=1.5):number{
    return Math.floor(Math.pow(xp / base_xp, 1 / factor)+1)
}
export function CalculatePlayerLevelProgress(xp:number,base_xp:number=10,factor:number=1.5):number{
    const level=Math.pow(xp / base_xp, 1 / factor)+1
    return level-Math.floor(level)
}