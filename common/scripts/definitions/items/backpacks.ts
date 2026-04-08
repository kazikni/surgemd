import { Definition, Definitions } from "../../../engine/core.ts";
import { ItemQuality } from "../../others/item.ts";
import { InventoryItemType } from "../utils.ts";

export interface BackpackDef extends Definition{
    max:Record<string,number>
    item_type?:InventoryItemType.backpack
    quality:ItemQuality
    level:number
    no_world_image?:boolean
    slots:number
}
export function Backpacks_Default_Init(backpacks:Definitions<BackpackDef,{}>){
    backpacks.insert(
        {
            idString:"null_pack",
            level:0,
            max:{
                "12g":15,
                "9mm":100,
                "762mm":80,
                "556mm":80,

                "45acp":80,
                "22lr":110,

                "50cal":50,
                "308sub":10,
                "explosive_ammo":5,
                "gasoline":5,

                "frag_grenade":9,
                "smoke_grenade":12,
                "red_flare":2,
                "blue_flare":2,

                "gauze":15,
                "yellow_soda":5,
                "blue_soda":5,
                "purple_soda":5,
                "red_soda":5,
                "green_soda":5,
                "black_soda":5,
                "small_red_crystal":5,

                "inhaler":4,
                "blue_potion":4,
                "purple_potion":4,
                "red_crystal":4,

                "medikit":4,
                "blue_pills":2,
                "yellow_pills":2,
                "purple_pills":2,
                "red_pills":2,
                "green_pills":2,
                "pocket_portal":3,
            },
            quality:ItemQuality.Common,
            no_world_image:true,
            slots:3,
        },
        {
            idString:"basic_pack",
            level:1,
            max:{
                "12g":30,
                "9mm":200,
                "762mm":140,
                "556mm":140,

                "45acp":140,
                "22lr":220,

                "50cal":80,
                "308sub":20,
                "explosive_ammo":10,
                "gasoline":10,
            },
            quality:ItemQuality.Common,
            slots:4,
        },
        {
            idString:"regular_pack",
            level:2,
            max:{
                "12g":45,
                "9mm":300,
                "762mm":220,
                "556mm":220,

                "45acp":220,
                "22lr":330,

                "308sub":40,
                "50cal":130,
                "explosive_ammo":15,
                "gasoline":15,
            },
            quality:ItemQuality.Uncommon,
            slots:5,
        },
        {
            idString:"tactical_pack",
            level:3,
            max:{
                "12g":60,
                "9mm":400,
                "762mm":300,
                "556mm":300,
    
                "45acp":300,
                "22lr":440,

                "308sub":80,
                "50cal":160,
                "explosive_ammo":20,
                "gasoline":20,
            },
            quality:ItemQuality.Rare,
            slots:6,
        }
    )
}