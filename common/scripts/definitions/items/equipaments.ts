import { GameItemDefTD, type GameItemType, type GameObjectDefinitionType } from "../utils.ts";
import { ItemRank } from "../../others/item.ts";
import { DeepPartial, Definition, mergeDeep, TD, tdm, TDType, v2, Vec2, Vec2TD } from "../../../engine/core.ts";
import { SideEffectType } from "../player/effects.ts";
export const equipment_factorys={
    vest_1(id:string,e:DeepPartial<VestDef>={}):VestDef{
        return mergeDeep({
            idString:id+"_vest",
            defence:0,
            level:1,
            reduction:0.1,
            rank:ItemRank.E,

            tint:0xffffff
        },e)
    },
    vest_2(id:string,e:DeepPartial<VestDef>={}):VestDef{
        return mergeDeep({
            idString:id+"_vest",
            defence:0,
            level:2,
            reduction:0.15,
            rank:ItemRank.E,

            tint:0x556655
        },e)
    },
    vest_3(id:string,e:DeepPartial<VestDef>={}):VestDef{
        return mergeDeep({
            idString:id+"_vest",
            defence:0,
            level:3,
            reduction:0.2,
            rank:ItemRank.E,

            special:true,
            tint:0x111122
        },e)
    },
    vest_4(id:string,e:DeepPartial<VestDef>={}):VestDef{
        return mergeDeep({
            idString:id+"_vest",
            defence:0,
            level:4,
            reduction:0.25,
            rank:ItemRank.E,

            special:true,
            tint:0x5C322E
        },e)
    },

    helmet_1(id:string,e:DeepPartial<HelmetDef>={}):HelmetDef{
        return mergeDeep({
            idString:id+"_helmet",
            defence:0,
            level:1,
            reduction:0.1,
            position:v2(0,0),
            rank:ItemRank.E
        },e)
    },
    helmet_2(id:string,e:DeepPartial<HelmetDef>={}):HelmetDef{
        return mergeDeep({
            idString:id+"_helmet",
            defence:0,
            level:2,
            reduction:0.15,
            position:v2(0,0),
            rank:ItemRank.D
        },e)
    },
    helmet_3(id:string,e:DeepPartial<HelmetDef>={}):HelmetDef{
        return mergeDeep({
            idString:id+"_helmet",
            defence:0,
            level:3,
            reduction:0.2,
            position:v2(0,0),
            special:true,
            rank:ItemRank.A
        },e)
    },
    helmet_4(id:string,e:DeepPartial<HelmetDef>={}):HelmetDef{
        return mergeDeep({
            idString:id+"_helmet",
            defence:0,
            level:4,
            reduction:0.25,
            position:v2(0,0),
            special:true,
            rank:ItemRank.S
        },e)
    },
    helmet_5(id:string,e:DeepPartial<HelmetDef>={}):HelmetDef{
        return mergeDeep({
            idString:id+"_helmet",
            defence:0,
            level:5,
            reduction:0.3,
            position:v2(0,0),
            special:true,
            rank:ItemRank.S
        },e)
    }
}
export interface VestDef extends Definition{
    def_type?:GameObjectDefinitionType.item
    item_type?:GameItemType.vest
    name?:string
    tname?:string
    rank:ItemRank

    defence:number
    reduction:number
    health?:number
    level:number
    special?:boolean
    tint:number
    reflect_bullets?:boolean

    property?:string[]
    events?:Record<string,(e:any)=>void>
    modifiers?:Record<string,number>
}
export const HelmetTD:TD={
    type:TDType.object,
    content:[
        ...GameItemDefTD,

        {name:"defence",content:tdm.float32},
        {name:"reduction",content:tdm.float32},
        {name:"health",content:tdm.float32},

        {name:"level",content:tdm.uint8},
        {name:"special",content:tdm.boolean},

        {name:"position",content:Vec2TD},

        {
            name:"skins",
            content:{
                type:TDType.array,
                len_bytes:1,
                content:tdm.string1
            }
        },
        {
            name:"property",
            content:{
                type:TDType.array,
                len_bytes:1,
                content:tdm.string1
            }
        },

        {name:"modifiers",content:tdm.any},
    ]
}
export const VestTD:TD={
    type:TDType.object,
    content:[
        ...GameItemDefTD,

        {name:"defence",content:tdm.float32},
        {name:"reduction",content:tdm.float32},
        {name:"health",content:tdm.float32},

        {name:"level",content:tdm.uint8},
        {name:"special",content:tdm.boolean},
        {name:"tint",content:tdm.uint32},
        {name:"reflect_bullets",content:tdm.boolean},

        {
            name:"property",
            content:{
                type:TDType.array,
                len_bytes:1,
                content:tdm.string1
            }
        },

        {name:"modifiers",content:tdm.any},
    ]
}
export interface HelmetDef extends Definition{
    def_type?:GameObjectDefinitionType.item
    item_type?:GameItemType.helmet
    name?:string
    tname?:string
    rank:ItemRank

    defence:number
    reduction:number
    health?:number
    health_frames?:{frame:string,health:number}[]
    level:number
    special?:boolean
    position?:Vec2

    skins?:string[]

    property?:string[]
    events?:Record<string,(e:any)=>void>
    modifiers?:Record<string,number>
}
export function Helmets_Default_Init():HelmetDef[]{
    return [
        equipment_factorys.helmet_1("bike",{
            skins:["red_bike_helmet","yellow_bike_helmet","green_bike_helmet"]
        }),
        equipment_factorys.helmet_2("military"),
        equipment_factorys.helmet_3("tactical"),

        equipment_factorys.helmet_5("lastman",{
            modifiers:{
                health:2
            },
            property:["extended_capacity","infinity_ammo"],
            events:{
                "kill":(e)=>{
                    e.owner.give_boost(25)
                    e.owner.health.value+=25
                    e.owner.side_effect({
                        type:SideEffectType.AddEffect,
                        duration:4,
                        effect:"kill_haste"
                    })
                },
                "pickup":(e)=>{
                    e.user.inventory.extended_capacity=e.user.inventory.accessorys.has_property("extended_capacity")
                    e.user.inventory.infinity_ammo=e.user.inventory.accessorys.has_property("infinity_ammo")
                },
                "drop":(e)=>{
                    e.user.inventory.extended_capacity=e.user.inventory.accessorys.has_property("extended_capacity")
                    e.user.inventory.infinity_ammo=e.user.inventory.accessorys.has_property("infinity_ammo")
                },
            }
        }),
        equipment_factorys.helmet_4("medic",{
            property:["self_revive"],
            events:{
                "pickup":(e)=>{
                    e.user.human_data.self_revive=e.user.inventory.accessorys.has_property("self_revive")
                },
                "drop":(e)=>{
                    e.user.human_data.self_revive=e.user.inventory.accessorys.has_property("self_revive")
                }
            }
        })
    ]
}
export function Vests_Default_Init():VestDef[]{
    return [
        //Normals Vest
        equipment_factorys.vest_1("civil"),
        equipment_factorys.vest_2("military"),
        equipment_factorys.vest_3("tactical"),
        equipment_factorys.vest_4("elite",{
            reflect_bullets:true
        }),
    ]
}