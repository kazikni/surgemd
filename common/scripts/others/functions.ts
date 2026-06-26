import { Hitbox2D } from "../../engine/core.ts";
import { ObstacleBehaviorDoor } from "../definitions/objects/obstacles.ts";
import { DeadZoneStage, DeadZoneState, MakeDeadZoneSettings } from "../packets/general_update.ts";
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
export function MakeDeadZoneStages(settings: MakeDeadZoneSettings): DeadZoneStage[] {
    const stages: DeadZoneStage[] = []

    let radius = settings.radius.initial
    let wait_time = settings.wait_time.initial
    let adv_time = settings.advancing_time.initial
    let damage=0
    for (let i = 0; i < settings.count-1; i++){
        stages.push({
            state: DeadZoneState.Waiting,
            damage: damage,
            radius: radius,
            time: wait_time
        })
        stages.push({
            state: DeadZoneState.Advancing,
            damage: damage,
            radius: radius,
            time: adv_time
        })
        damage+=settings.damage.add
        radius*=settings.radius.decay
        wait_time=Math.max(wait_time*settings.wait_time.decay,settings.wait_time.min)
        adv_time=Math.max(adv_time*settings.advancing_time.decay,settings.advancing_time.min)
    }
    stages.push({
        state: DeadZoneState.Waiting,
        damage: damage,
        radius: 0,
        time: settings.wait_time.min
    })
    stages.push({
        state: DeadZoneState.Advancing,
        damage: damage,
        radius: 0,
        time: settings.advancing_time.min
    })

    return stages
}