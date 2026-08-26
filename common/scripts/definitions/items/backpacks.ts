import { Definition, TD, tdm, TDType } from "../../../engine/core.ts";
import { ItemRank } from "../../others/item.ts";
import { GameItemDefTD, type GameItemType, type GameObjectDefinitionType } from "../utils.ts";

export interface BackpackDef extends Definition{
    item_type?:GameItemType.backpack
    def_type?:GameObjectDefinitionType.item
    name?:string
    tname?:string
    rank:ItemRank

    max:Record<string,number>
    level:number
    special?:boolean
    no_world_image?:boolean
    slots:number
}
export const BackpackTD:TD={
    type:TDType.object,
    content:[
        ...GameItemDefTD,

        {name:"max",content:tdm.any},
        {name:"level",content:tdm.uint8},
        {name:"special",content:tdm.boolean},
        {name:"no_world_image",content:tdm.boolean},
        {name:"slots",content:tdm.uint8},
    ]
}
export function Backpacks_Default_Init():BackpackDef[]{
    return [
        {
            idString:"null_pack",
            level:0,
            max:{
                "p76":20,
                "l19":120,
                "c51":80,
                "c45":80,
                "c22":80,
                "l15":150,

                "p99":40,
                "p51":15,
                "explosive_ammo":5,
                "gasoline":5,

                "frag_grenade":12,
                "smoke_grenade":12,
                "mirv_grenade":10,
                "molotov":5,
                "red_flare":6,
                "blue_flare":6,
                "yellow_flare":6,

                "gauze":15,
                "yellow_soda":6,
                "blue_soda":6,
                "purple_soda":6,
                "red_soda":6,
                "green_soda":6,
                "black_soda":6,
                "small_red_crystal":6,

                "inhaler":3,
                "blue_potion":3,
                "purple_potion":3,
                "red_crystal":3,

                "medikit":4,
                "blue_pills":2,
                "yellow_pills":2,
                "purple_pills":2,
                "red_pills":2,
                "green_pills":2,
                "pocket_portal":3,
            },
            rank:ItemRank.E,
            no_world_image:true,
            slots:4,
        },
        {
            idString:"basic_pack",
            level:1,
            max:{
                "p76":40,
                "l19":240,
                "c51":160,
                "c45":160,
                "c22":160,
                "l15":300,

                "p99":80,
                "p51":30,
                "explosive_ammo":10,
                "gasoline":10,
            },
            rank:ItemRank.E,
            slots:5,
        },
        {
            idString:"military_pack",
            level:2,
            max:{
                "p76":60,
                "l19":360,
                "c51":240,
                "c45":240,
                "c22":240,
                "l15":450,

                "p51":45,
                "p99":120,
                "explosive_ammo":15,
                "gasoline":15,
            },
            rank:ItemRank.D,
            slots:6,
        },
        {
            idString:"tactical_pack",
            level:3,
            special:true,
            max:{
                "p76":80,
                "l19":480,
                "c51":320,
                "c45":320,
                "c22":320,
                "l15":600,

                "p51":60,
                "p99":160,
                "explosive_ammo":20,
                "gasoline":20,
            },
            rank:ItemRank.C,
            slots:7,
        }
    ]
}