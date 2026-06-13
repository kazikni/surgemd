import { Definition, Stream, Vec2, WeightDefinition } from "../../engine/core.ts";
import { type HumanModifiers } from "../others/constants.ts";
import { ItemRank } from "../others/item.ts";
import { BoostType } from "./player/boosts.ts";
export enum PacketType{
    Feed=1,
    GameOver,
    GeneralUpdate,
    Input,
    JMSG,
    Join,
    Joinned,
    Map,
    Start,
    Update,
}
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
        alpha?:number
        color?:number
    }
    reflection?:BulletReflection
    pass_through_humans?:boolean
    obstacleMult?:number
    criticalMult?:number
    on_hit_explosion?:string
}
export type ItemRankSetting={
    name:string
    color1:string
    color2:string
}
export const ItemQualitySettings:Record<ItemRank,ItemRankSetting>={
    [ItemRank.E]:{
        name:"common",
        color1:"#eeeeee",
        color2:"#a0a0a0"
    },
    [ItemRank.D]:{
        name:"uncommon",
        color1:"#11ef45",
        color2:"#0c913a",
    },
    [ItemRank.C]:{
        name:"rare",
        color1:"#3533ee",
        color2:"#15118a"
    },
    [ItemRank.B]:{
        name:"epic",
        color1:"#9309de",
        color2:"#3b0b7d"
    },
    [ItemRank.A]:{
        name:"mythic",
        color1:"#f0d107",
        color2:"#ab8c0f"
    },
    [ItemRank.S]:{
        name:"legendary",
        color1:"#ed092c",
        color2:"#a3050a"
    },
    [ItemRank.Developer]:{
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
    accessory,
    backpack,
    scope
}
export interface GameItemBase extends Definition{
    item_type:InventoryItemType
    rank:ItemRank
}
export enum DamageReason{
    Human,
    Explosion,
    DeadZone,
    Abstinence,
    SideEffect,
    Disconnect,
    Connection,
    Bleend,
    Airdrop,
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
    accessorys?:InventoryPresetItem[][]

    hand?:number
    infinity_ammo?:boolean
    droppables?:Partial<InventoryDroppable>

    boosts?:(WeightDefinition&{
        boost:number
        boost_type:BoostType
    })[]
}
export interface LoadoutPreset{
    badge?:string
    hair?:string
    hair_tint?:number
    body?:string
    body_tint?:number
    eyes?:string
    shirt?:string
    legs?:string
    accessorys?:string[]
    colors?:Record<string,string>
}
export type HumanDefinition={
    name?:string
    position?:Vec2
    loadout?:LoadoutPreset
    inventory?:InventoryPreset
    team?:number
    group?:number
    modifiers?:Partial<HumanModifiers>
}
export type CharacterDefinition=HumanDefinition&{
    description?:string
    icon?:string
}
export function InventoryItemDataEncode(stream:Stream,data:InventoryItemData){
    stream.write_uint16(data.count)
    stream.write_uint16(data.idNumber)
    stream.write_uint8(data.type)
}
export function InventoryItemDataDecode(stream:Stream):InventoryItemData{
    return {
        count:stream.read_uint16(),
        idNumber:stream.read_uint16(),
        type:stream.read_uint8(),
    }
}

export interface HitParticlesDef{
    particle?:string
    variations?:number
    tint?:number|(number[])
}
export interface HitSoundsDef{
    hit?:string
    break?:string
    hit_variations?:number
}

export const hit_sounds:Record<string,HitSoundsDef>={
    tree:{
        hit:"tree_hit",
        hit_variations:2,
        break:"tree_break",
    },
    rock:{
        hit:"rock_hit",
        hit_variations:2,
        break:"rock_break",
    },
    bush:{
        hit:"bush_hit",
        hit_variations:2,
        break:"bush_break",
    },
    light_metal:{
        hit:"light_metal_hit",
        hit_variations:2,
        break:"light_metal_break",
    },
    heavy_metal:{
        hit:"heavy_metal_hit",
        hit_variations:3,
        break:"heavy_metal_break",
    },
    wood:{
        hit:"wood_hit",
        hit_variations:2,
        break:"wood_break",
    },
    plastic:{
        hit:"plastic",
        hit_variations:1
    },
    tissue:{
        hit:"tissue_hit",
        hit_variations:2,
        break:"tissue_break",
    }
}