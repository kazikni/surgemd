import { InventoryItemType } from "common/scripts/definitions/utils.ts";
import { type LItem, type ConsumibleItem, type GunItem } from "./inventory.ts";
import { ActionsType } from "common/scripts/others/constants.ts";
import { type Human } from "../objects/human.ts";
import { BaseAction, v2, type Slot } from "common/engine/core.ts";
import { ConsumingAction } from "common/scripts/definitions/items/consumibles.ts";

export abstract class Action<User=Human> extends BaseAction<User>{
    action_speed:number=1
}
export class ReloadAction extends Action{
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

        if(this.item.infinity_ammo()){
            this.item.ammo+=request
        }else{
            this.item.ammo+=user.inventory.consume_aitems(def.ammo_type,request)
        }

        if(this.item.ammo>=capacity){
            this.item.reloading=false
        }

        user.inventory.net_sync.hand=true
        user.inventory.net_sync.items=true
        user.animation_data.dirty=true
    }
    type: number=ActionsType.Reload
}
export class ConsumingActionA extends Action{
    delay:number
    item:ConsumibleItem
    type: number=ActionsType.Consuming
    slot:Slot<LItem>
    constructor(item:ConsumibleItem,slot:Slot<LItem>){
        super()
        const consuming=item.def.consuming as (ConsumingAction&{type:0})
        this.item=item
        this.delay=consuming.use_delay
        this.slot=slot
        this.action_speed=0.35
    }
    on_execute(user:Human){
        const consuming=this.item.def.consuming as (ConsumingAction&{type:0})

        for(const s of consuming.side_effects){
            user.side_effect(s)
        }

        user.inventory.net_sync.items=true
        user.animation_data.dirty=true

        this.slot.remove(1)
    }
}
export class HelpupAction extends Action<Human>{
    override type: number=ActionsType.Helpup;
    delay:number
    human:Human
    constructor(human:Human){
        super()
        this.human=human
        this.delay=human.game.modeManager.rules.humans.help_up.time
        this.action_speed=0.35
    }
    override on_begin(user: Human): void {
        this.human.being_helpup_by=user
        this.human.actions.play(new BeingHelpupAction(user))
    }
    override on_cancel(user: Human): void {
        this.human.actions.cancel()
        this.human.being_helpup_by=undefined
    }
    on_execute(user:Human){
        this.human.help_up()
    }
    override update(user: Human, dt: number): void {
        if(v2.distance(user.position,this.human.position)>user.game.modeManager.rules.humans.help_up.distance){
            user.actions.cancel()
        }
    }
}
export class BeingHelpupAction extends Action<Human>{
    override type: number=ActionsType.BeingHelpup;
    delay:number
    constructor(human:Human){
        super()
        this.delay=human.game.modeManager.rules.humans.help_up.time
    }
    override on_begin(user: Human): void {}
    override on_cancel(user: Human): void {
        if(user.being_helpup_by){
            user.being_helpup_by.actions.cancel()
            user.being_helpup_by=undefined
        }
    }
    on_execute(user:Human){}
}