import { InventoryItemType } from "common/scripts/definitions/utils.ts";
import { type LItem, type ConsumibleItem, type GunItem } from "./inventory.ts";
import { ActionsType } from "common/scripts/others/constants.ts";
import { type Human } from "../objects/human.ts";
import { Action, type Slot } from "common/engine/core.ts";

export class ReloadAction extends Action<Human>{
    delay:number
    item:GunItem
    alt_reload:boolean=false
    constructor(item:GunItem){
        super()
        if(item.def.reload?.reload_alt&&item.ammo===0){
            this.delay=item.def.reload.reload_alt.delay
            this.alt_reload=true
        }else{
            this.delay=item.def.reload?.delay??1
        }
        this.item=item
    }
    on_execute(user:Human){
        if(this.item.item_type!=InventoryItemType.gun)return
        const def=this.item.def
        const capacity=this.item.get_capacity()
        const request=Math.min(
            this.alt_reload?(def.reload!.reload_alt!.reload_count??capacity):def.reload!.reload_count??capacity,
            capacity - this.item.ammo
        )

        if(this.item.inventory.infinity_ammo){
            this.item.ammo+=request
        }else{
            this.item.ammo+=user.inventory.consume_aitems(def.ammoType,request)
        }

        if(this.item.ammo>=capacity){
            this.item.reloading=false
        }

        user.net_sync.part=true
        user.inventory.net_sync.hand=true
        user.inventory.net_sync.items=true
        user.animation_data.dirty=true
        user.animation_data.current_animation=undefined
    }
    type: number=ActionsType.Reload
}
export class ConsumingAction extends Action<Human>{
    delay:number
    item:ConsumibleItem
    type: number=ActionsType.Consuming
    slot:Slot<LItem>
    constructor(item:ConsumibleItem,slot:Slot<LItem>){
        super()
        this.item=item
        this.delay=item.def.use_delay
        this.slot=slot
    }
    on_execute(user:Human){
        const def=this.item.def

        for(const s of def.side_effects){
            user.side_effect(s)
        }

        user.net_sync.part=true
        user.inventory.net_sync.items=true
        user.animation_data.dirty=true
        user.animation_data.current_animation=undefined

        this.slot.remove(1)
    }
}