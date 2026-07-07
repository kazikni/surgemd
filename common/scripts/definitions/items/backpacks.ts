import { Definition, Definitions } from "../../../engine/core.ts";
import { ItemRank } from "../../others/item.ts";
import { InventoryItemType } from "../utils.ts";

export interface BackpackDef extends Definition{
    max:Record<string,number>
    item_type?:InventoryItemType.backpack
    rank:ItemRank
    level:number
    special?:boolean
    no_world_image?:boolean
    slots:number
}
export function Backpacks_Default_Init(backpacks:Definitions<BackpackDef,{}>){
    backpacks.insert(
        {
            idString:"null_pack",
            level:0,
            max:{
                "12g":20,
                "9mm":100,
                "762mm":80,
                "556mm":80,
                "45acp":80,
                "22lr":120,

                "50cal":40,
                "308sub":15,
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
                "12g":40,
                "9mm":200,
                "762mm":160,
                "556mm":160,
                "45acp":160,
                "22lr":240,

                "50cal":80,
                "308sub":30,
                "explosive_ammo":10,
                "gasoline":10,
            },
            rank:ItemRank.E,
            slots:5,
        },
        {
            idString:"regular_pack",
            level:2,
            max:{
                "12g":60,
                "9mm":300,
                "762mm":240,
                "556mm":240,
                "45acp":240,
                "22lr":360,

                "308sub":45,
                "50cal":120,
                "explosive_ammo":15,
                "gasoline":15,
            },
            rank:ItemRank.D,
            slots:6,
        },
        {
            idString:"military_pack",
            level:3,
            special:true,
            max:{
                "12g":80,
                "9mm":400,
                "762mm":320,
                "556mm":320,
                "45acp":320,
                "22lr":480,

                "308sub":60,
                "50cal":160,
                "explosive_ammo":20,
                "gasoline":20,
            },
            rank:ItemRank.C,
            slots:7,
        }
    )
}