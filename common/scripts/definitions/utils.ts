import { Definition, NetStream, WeightDefinition } from "../../engine/core.ts";
import { ItemQuality } from "../others/item.ts";
import { BoostType } from "./player/boosts.ts";
export enum BulletReflection{
    All=0,
    Only_Reflective=1,
    None=2
}
export interface BulletDef{
    damage:number
    falloff?:number
    range:number
    speed:number
    radius:number
    effect?:{id:string,time:number}[]
    tracer:{
        width:number
        height:number
        particles?:{
            frame:number
        }
        proj:{
            img:number
            width:number
            height:number
            color?:number
        }
        color?:number
    }
    reflection?:BulletReflection
    obstacleMult?:number
    criticalMult?:number
    on_hit_explosion?:string
}
export type ItemQualitySetting={
    name:string
    color1:string
    color2:string
}
export const ItemQualitySettings:Record<ItemQuality,ItemQualitySetting>={
    [ItemQuality.Common]:{
        name:"common",
        color1:"#eeeeee",
        color2:"#a0a0a0"
    },
    [ItemQuality.Uncommon]:{
        name:"uncommon",
        color1:"#11ef45",
        color2:"#0c913a",
    },
    [ItemQuality.Rare]:{
        name:"rare",
        color1:"#3533ee",
        color2:"#15118a"
    },
    [ItemQuality.Epic]:{
        name:"epic",
        color1:"#9309de",
        color2:"#3b0b7d"
    },
    [ItemQuality.Mythic]:{
        name:"mythic",
        color1:"#f0d107",
        color2:"#ab8c0f"
    },
    [ItemQuality.Legendary]:{
        name:"legendary",
        color1:"#ed092c",
        color2:"#a3050a"
    },
    [ItemQuality.Developer]:{
        name:"developer",
        color1:"#eeeeee",
        color2:"#eeeeee"
    },
}
export enum InventoryItemType{
    gun,
    ammo,
    consumible,
    helmet,
    vest,
    grenade,
    melee,
    accessorie,
    backpack,
    skin,
    scope
}
export interface GameItemBase extends Definition{
    item_type:InventoryItemType
    quality:ItemQuality
}
export enum DamageReason{
    Human,
    Explosion,
    DeadZone,
    Abstinence,
    SideEffect,
    Disconnect,
    Bleend
}
export interface InventoryItemData{
    count:number
    type:InventoryItemType
    idNumber:number
}
export interface InventoryDroppable{
    helmet:boolean
    vest:boolean
    backpack:boolean
}
export interface InventoryPresetItem{
    item:string
    weight:number
    droppable?:boolean
    drop_chance?:number
    count?:number
}
export interface InventoryPreset{
    helmet?:InventoryPresetItem[]//Will Choose one of these helmets
    vest?:InventoryPresetItem[]//Will Choose one of these vest
    backpack?:InventoryPresetItem[]//Will Choose one of these backpacks

    skin?:InventoryPresetItem[]//Will Choose one of these skins

    melee?:InventoryPresetItem[]//Will Choose one of these melees
    gun1?:InventoryPresetItem[]//Will Choose one of these guns
    gun2?:InventoryPresetItem[]//Will Choose one of these guns

    items?:InventoryPresetItem[][]
    aitems?:Record<string,number>
    iitems?:string[]
    acessories:Record<number,string>

    hand?:number
    infinity_ammo?:boolean
    droppables?:Partial<InventoryDroppable>

    boosts?:(WeightDefinition&{
        boost:number
        boost_type:BoostType
    })[]
}
export function InventoryItemDataEncode(stream:NetStream,data:InventoryItemData){
    stream.writeUint16(data.count)
    stream.writeUint16(data.idNumber)
    stream.writeUint8(data.type)
}
export function InventoryItemDataDecode(stream:NetStream):InventoryItemData{
    return {
        count:stream.readUint16(),
        idNumber:stream.readUint16(),
        type:stream.readUint8(),
    }
}
