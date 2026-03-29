import { Definition, Definitions, v2 } from "../../../engine/core.ts";
import { DefaultFistRig, FistRig, ItemQuality, WeaponAssets, WeaponRig } from "../../others/item.ts"
import { InventoryItemType } from "../utils.ts";
export type GrenadeDef={
    explosion?:string

    gravity:number
    radius:number
    zBaseScale:number
    zScaleAdd:number

    decays:{
        ground_speed:number
        ground_rotation:number
    }

    cook?:{
        allow_hand:boolean
        fuse_time:number
    }
    throw_max_speed?:number

    frames:{
        world:string
    }

    destroy_on_collide?:boolean
    collision_damage?:number

    speed_mod?:number

    arms?:FistRig
    image?:WeaponRig
    assets?:WeaponAssets

    quality:ItemQuality
    item_type?:InventoryItemType.grenade
}&Definition
const GrenadeRig={
    position:v2.new(0.5,0.18),
    rotation:0.2
}
export function Grenades_Default_Init(grenades:Definitions<GrenadeDef,{}>){
    grenades.insert(
        {
            idString:"frag_grenade",
            gravity:2,
            radius:0.25,
            zBaseScale:0.4,
            zScaleAdd:0.7,
            decays:{
                ground_rotation:2,
                ground_speed:2,
            },
            cook:{
                allow_hand:true,
                fuse_time:5
            },
            throw_max_speed:15,
            explosion:"frag_grenade_explosion",
            frames:{
                world:"proj_frag"
            },
            speed_mod:1,
            arms:DefaultFistRig,
            image:GrenadeRig,
            quality:ItemQuality.Common
        },
        //Mirv
        {
            idString:"mirv_grenade",
            gravity:2.5,
            radius:0.25,
            zBaseScale:0.8,
            zScaleAdd:1,
            decays:{
                ground_rotation:2,
                ground_speed:2
            },
            cook:{
                allow_hand:true,
                fuse_time:5
            },
            explosion:"mirv_grenade_explosion",
            throw_max_speed:15,
            frames:{
                world:"proj_mirv"
            },
            arms:DefaultFistRig,
            image:GrenadeRig,
            quality:ItemQuality.Common
        },
        {
            idString:"submirv_grenade",
            gravity:3,
            radius:0.1,
            zBaseScale:1,
            zScaleAdd:1,
            decays:{
                ground_rotation:2,
                ground_speed:2
            },
            cook:{
                allow_hand:false,
                fuse_time:2
            },
            explosion:"submirv_grenade_explosion",
            frames:{
                world:"proj_submirv"
            },
            arms:DefaultFistRig,
            image:GrenadeRig,
            quality:ItemQuality.Common
        },
    )   
}