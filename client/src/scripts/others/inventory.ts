import { GInventoryBase, GunItemBase, MDItem, MeleeItemBase } from "common/scripts/others/inventory.ts";
import { Frame, ResourcesManager, Sound } from "common/engine/client.ts";
import { ScopeDef } from "common/scripts/definitions/items/scopes.ts";
export abstract class LItem extends MDItem{
    declare inventory:GInventory
    abstract assets(resources:ResourcesManager):Record<string,Sound|Frame>
}
export class GunItem extends GunItemBase implements LItem{
    declare inventory:GInventory
    assets(resources:ResourcesManager):Record<string,Sound|Frame>{
        return {
            "item":resources.get_sprite(this.def.assets?.item??this.def.idString)
        }
    }
}
export class MeleeItem extends MeleeItemBase implements LItem{
    declare inventory:GInventory
    assets(resources:ResourcesManager):Record<string,Sound|Frame>{
        return {
            "item":resources.get_sprite(this.def.assets?.item??this.def.idString)
        }
    }
}
export class GInventory extends GInventoryBase<LItem>{
    scope!:ScopeDef

    hand_settings?:{
        slot:number
        liquid:boolean
        ammo:number
    }
}