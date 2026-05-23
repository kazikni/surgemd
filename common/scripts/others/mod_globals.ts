import { GasParticles, GunClasses, MuzzleFlash } from "../definitions/items/guns.ts";
import { InventoryItemType } from "../definitions/utils.ts";
import { FireMode, ItemRank, tracers, WeaponsArmRig, WeaponsRig } from "./item.ts";

export function md_make_globals():Record<string,any>{
    return {
        GunClasses,
        ItemRank,
        InventoryItemType,
        WeaponsArmRig,
        WeaponsRig,
        tracers,
        GasParticles,
        MuzzleFlash,
        FireMode
    }
}