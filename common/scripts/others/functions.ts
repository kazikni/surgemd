import { Hitbox2D } from "../../engine/core.ts";
import { ObstacleBehaviorDoor } from "../definitions/objects/obstacles.ts";
import { DeadZoneStage, DeadZoneState, MakeDeadZoneSettings } from "../packets/general_update.ts";

import { type Game } from "../../../server/src/game/others/game.ts";
import { type LootAditional, type LootData } from "./constants.ts";
import { type GameDefinition } from "../definitions/game_defs.ts";
import { InventoryItemType } from "../definitions/utils.ts";
import { type GunDef } from "../definitions/items/guns.ts";

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
        damage*=settings.damage.add
        if(damage===0)damage=settings.damage.initial
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
export function loot_table_get_item(item:string,count:number,aditional:LootAditional,settings:LootAditional,game:Game):LootData[]{
    const itemD=(game.definitions as GameDefinition).game_items.valueString[item]
    if(!itemD){
        console.error(item,"Not Founded")
        return []
    }
    if(itemD.item_type===InventoryItemType.gun){
        const ret:LootData[]=[
            {
                item:itemD,
                count:count
            }
        ]
        if(itemD.ammo_spawn&&!(aditional.without_ammo||settings.without_ammo)){
            const ammo_def=(game.definitions as GameDefinition).game_items.valueString[(itemD as unknown as GunDef).ammo_spawn?.type??(itemD as unknown as GunDef).ammo_type]
            
            const data={
                item:ammo_def,
                count:(itemD as GunDef).ammo_spawn!.amount
            }
            if(settings.include_ammo||aditional.include_ammo){
                ret[0].aditional=[data]
            }else{
                ret.push(data)
            }
        }
        return ret
    }else{
        return [
            {
                item:itemD,
                count:count
            }
        ]
    }
}