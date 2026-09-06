import { BackgroundEDef, BackgroundTransitionType, CutsceneCommand, CutsceneCommandType, Hitbox2D, Numeric, random, Stream } from "../../engine/core.ts";
import { ObstacleBehaviorDoor } from "../definitions/objects/obstacles.ts";
import { DeadZoneStage, DeadZoneState, MakeDeadZoneSettings } from "../packets/general_update.ts";

import { type Game } from "../../../server/src/game/others/game.ts";
import { LootSetting, type LootAditional, type LootData } from "./constants.ts";
import { type GameDefinition } from "../definitions/game_defs.ts";
import { GameItemType } from "../definitions/utils.ts";
import { type GunDef } from "../definitions/items/guns.ts";
import { HelmetDef } from "../definitions/items/equipaments.ts";

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
        damage=Numeric.clamp(damage*settings.damage.advancing_scale,settings.damage.initial,settings.damage.limit)
        stages.push({
            state: DeadZoneState.Advancing,
            damage: damage,
            radius: radius,
            time: adv_time
        })
        damage=Numeric.clamp(damage*settings.damage.waiting_scale,settings.damage.initial,settings.damage.limit)

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
export function loot_table_get_item(item:string,count:number,aditional:LootAditional,settings:LootSetting,game:Game):LootData[]{
    const itemD=(game.definitions as GameDefinition).game_items.valueString[item]
    if(!itemD){
        console.error(item,"Not Founded")
        return []
    }
    let skin:number|undefined=aditional.skin
    if(skin===undefined&&(settings.all_skins||aditional.all_skins)&&(itemD as HelmetDef).skins){
        skin=random.int(0,(itemD as HelmetDef).skins!.length)-1
        if(skin===-1)skin=undefined
        
    }
    if(itemD.item_type===GameItemType.gun){
        const ret:LootData[]=[
            {
                item:itemD,
                count:count,
                skin
            }
        ]
        if(itemD.ammo_spawn&&!(aditional.without_ammo||settings.without_ammo)){
            const ammo_def=(game.definitions as GameDefinition).game_items.valueString[(itemD as unknown as GunDef).ammo_spawn?.type??(itemD as unknown as GunDef).ammo_type]
            
            const data:LootData={
                item:ammo_def,
                count:(itemD as GunDef).ammo_spawn!.amount
            }
            if(itemD.dual_from!==undefined)data.count*=2
            if(settings.hold_ammo){
                ret[0].ammo=itemD.reload?.capacity??0
                data.count-=ret[0].ammo
            }

            if(data.count>0){
                if(settings.include_ammo||aditional.include_ammo){
                    ret[0].aditional=[data]
                }else{
                    ret.push(data)
                }
            }
        }
        return ret
    }else{
        return [
            {
                item:itemD,
                count:count,
                skin
            }
        ]
    }
}

export function encode_loot_data(definitions:GameDefinition,data:LootData,stream:Stream):void{
    stream.write_boolean_group(data.aditional!==undefined,data.skin!==undefined,data.ammo!==undefined,typeof data.ammo==="number",data.ammo===true)
    if(data.ammo!==undefined) if(typeof data.ammo==="number")stream.write_uint16(data.ammo)
    stream.write_uint16(definitions.game_items.keysString[data.item.idString])
    .write_float32(data.count)
    if(data.skin!==undefined)stream.write_uint8(data.skin)
}
export function decode_loot_data(definitions:GameDefinition,stream:Stream):LootData{
    const [has_aditional,has_skin,has_ammo,has_ammo_n,ammo_true]=stream.read_boolean_group()
    let ammo:number|boolean|undefined
    if(has_ammo){
        ammo=ammo_true
        if(has_ammo_n)ammo=stream.read_uint16()
    }
    return {
        item:definitions.game_items.valueNumber[stream.read_uint16()],
        count:stream.read_float32(),
        ammo,
        //aditional:has_aditional?stream.read_array(()=>decode_loot_data(definitions,stream),1):undefined,
        skin:has_skin?stream.read_uint8():undefined
    }
}

export function make_credits_cutscene(credits:{role:string,users:string|string[]}[],background:BackgroundEDef,transition_duration:number=3):CutsceneCommand[]{
    const cred:CutsceneCommand[]=[]
    
    for(const c of credits){
        cred.push({
            type: CutsceneCommandType.SetContentText,
            content: [
                {
                    value: c.role,
                    style: "credits_role"
                },
                ...(
                    typeof c.users==="string"?
                    [{value: c.users,style: "credits"}]:
                    c.users.map((v)=>({value: v,style: "credits"}))
                )
            ]
        },{
            type: CutsceneCommandType.Wait,
            time: 4
        })
    }
    return [
        {type:CutsceneCommandType.SetBackground, background:background,transition:{type:BackgroundTransitionType.Fade,duration:transition_duration}},
        
        ...cred,
        {
            type: CutsceneCommandType.SetContentText,
            content:[]
        },

        {type:CutsceneCommandType.SetBackground, background:undefined,transition:{type:BackgroundTransitionType.Fade,duration:transition_duration}},
        {type:CutsceneCommandType.Wait, time:2},
    ]
}
export function make_credits_markdown(credits: { role: string, users: string | string[] }[]): string {
    const lines: string[] = []

    for(const credit of credits){
        lines.push(`## ${credit.role}`)
        const users=typeof credit.users==="string"?[credit.users]:credit.users

        for(const user of users){
            lines.push(`* ${user}`)
        }
        lines.push("___")
    }

    return lines.join("\n").trim()
}