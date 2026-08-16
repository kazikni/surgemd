import { GunClasses } from "../definitions/items/guns.ts";
import { GameItemType, GasParticles, MuzzleFlash } from "../definitions/utils.ts";
import { FireMode, ItemRank, tracers, WeaponsArmRig, WeaponsRig } from "./item.ts";

export function md_make_globals():Record<string,any>{
    return {
        GunClasses,
        ItemRank,
        GameItemType,
        WeaponsArmRig,
        WeaponsRig,
        tracers,
        GasParticles,
        MuzzleFlash,
        FireMode
    }
}