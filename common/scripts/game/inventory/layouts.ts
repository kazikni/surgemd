import { GameItemType } from "../../definitions/utils.ts";
import { default_can_change, InventoryDisplay, type InventoryChangeContext, type InventoryGroupDef } from "./inventory.ts";

export function equipment_can_change(ctx:InventoryChangeContext):boolean{
    return default_can_change(ctx)
}

export function HumanInventoryLayout():InventoryGroupDef[]{
    return [
        {
            id:"melee",
            type:"change",
            display:InventoryDisplay.Weapon,
            accept:[GameItemType.melee],
            hand:true,
            replace:"first",
            default:"fist",
        },
        {
            id:"guns",
            type:"change",
            count:2,
            display:InventoryDisplay.Weapon,
            accept:[GameItemType.gun],
            hand:true,
            replace:"hand",
        },
        {
            id:"ammo",
            type:"amount",
            display:InventoryDisplay.Amount,
            accept:[GameItemType.ammo],
        },
        {
            id:"scopes",
            type:"include",
            display:InventoryDisplay.Scope,
            accept:[GameItemType.scope],
            default:"scope_1",
        },
        {
            id:"items",
            type:"normal",
            display:InventoryDisplay.Items,
            accept:[GameItemType.consumible,GameItemType.grenade],
            hand:true,
            get_count:(inventory)=>inventory.backpack?.slots??4,
        },
        {
            id:"helmet",
            type:"change",
            display:InventoryDisplay.Equipament,
            accept:[GameItemType.helmet],
            can_change:equipment_can_change,
        },
        {
            id:"vest",
            type:"change",
            display:InventoryDisplay.Equipament,
            accept:[GameItemType.vest],
            can_change:equipment_can_change,
        },
        {
            id:"backpack",
            type:"change",
            display:InventoryDisplay.Equipament,
            accept:[GameItemType.backpack],
            default:"null_pack",
            can_change:equipment_can_change,
            on_change:(ctx)=>ctx.inventory.refresh(),
        },
        {
            id:"accessory",
            type:"change",
            display:InventoryDisplay.Accessory,
            accept:[GameItemType.accessory],
        },
    ]
}

export function SimpleEnemyInventoryLayout():InventoryGroupDef[]{
    return [
        {
            id:"weapon",
            type:"change",
            display:InventoryDisplay.Weapon,
            accept:[GameItemType.melee,GameItemType.gun],
            hand:true,
            replace:"first",
            default:"fist",
        },
        {
            id:"ammo",
            type:"amount",
            display:InventoryDisplay.Amount,
            accept:[GameItemType.ammo],
        },
    ]
}
