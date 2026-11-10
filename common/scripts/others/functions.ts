import { CutsceneCommand, CutsceneCommandType, Collider2D, random, Stream, Numeric } from "../../engine/core.ts";
import { ObstacleBehaviorDoor } from "../definitions/objects/obstacles.ts";

import { LootSetting, type LootAditional, type LootData } from "./constants.ts";
import { type GameDefinition } from "../definitions/game_defs.ts";
import { GameItemType } from "../definitions/utils.ts";
import { type GunDef } from "../definitions/items/guns.ts";
import { HelmetDef } from "../definitions/items/equipaments.ts";

export function CalculateDoorCollider(collider:Collider2D,door:ObstacleBehaviorDoor):Record<-1|0|1,Collider2D>{
    return {
        [-1]:collider.transform(undefined,undefined,undefined,1),
        0:collider,
        1:collider.transform(undefined,undefined,undefined,3)
    }
}
export function CalculatePlayerLevel(xp:number,base_xp:number=10,factor:number=1.5):number{
    return Math.floor(Math.pow(xp / base_xp, 1 / factor)+1)
}
export function CalculatePlayerLevelProgress(xp:number,base_xp:number=10,factor:number=1.5):number{
    const level=Math.pow(xp / base_xp, 1 / factor)+1
    return level-Math.floor(level)
}
export function loot_table_get_item(item:string,count:number,aditional:LootAditional,settings:LootSetting):LootData[]{
    const itemD=settings.definitions.game_items.valueString[item]
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
            const ammo_def=settings.definitions.game_items.valueString[(itemD as unknown as GunDef).ammo_spawn?.type??(itemD as unknown as GunDef).ammo_type]
            
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
    stream.write_uint16(definitions.game_items.keysString[data.item.id_string])
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

export function make_credits_cutscene(credits:{role:string,users:string|string[]}[]):CutsceneCommand[]{
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
        ...cred,
        {
            type: CutsceneCommandType.SetContentText,
            content:[]
        },
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
export function apply_modifiers(base:Record<string,number>,mods:Record<string,number>){
    for(const m in mods){
        if(base[m]===undefined)base[m]=mods[m]
        else base[m]*=mods[m]
    }
}