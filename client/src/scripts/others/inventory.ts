import { GInventoryBase, GunItemBase, MDItem, MeleeItemBase } from "common/scripts/others/inventory.ts";
import { Frame, ResourcesManager, Sound } from "common/engine/web.ts";
import { ScopeDef } from "common/scripts/definitions/items/scopes.ts";
import { GameDefinition, GameItem } from "common/scripts/definitions/game_defs.ts";
import { SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
export abstract class LItem extends MDItem{
    declare inventory:GInventory
    abstract assets(resources:ResourcesManager):Record<string,Sound|Frame>
}
export class GunItem extends GunItemBase implements LItem{
    declare inventory:GInventory
    assets(resources:ResourcesManager):Record<string,Sound|Frame>{
        return {
            "item":resources.get_frame(this.def.assets?.item??this.def.idString)
        }
    }
}
export class MeleeItem extends MeleeItemBase implements LItem{
    declare inventory:GInventory
    assets(resources:ResourcesManager):Record<string,Sound|Frame>{
        return {
            "item":resources.get_frame(this.def.assets?.item??this.def.idString)
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

    definitions:GameDefinition

    _items: {id:number,count:number}[] = []
    constructor(definitions:GameDefinition){
        super()
        this.definitions=definitions
        this.initialize(this.definitions,{
            0:MeleeItem as (new(item:GameItem)=>LItem),
            1:GunItem as (new(item:GameItem)=>LItem),
            2:GunItem as (new(item:GameItem)=>LItem)
        })
    }

    update_self_state(state:SelfStateUpdate){
        if(state.dirty.inventory.aitems){
            this.aitems={}
            for (const a of Object.keys(state.inventory.aitems)) {
                const def = this.definitions.ammos.getFromNumber(a as unknown as number)
                this.aitems[def.idString] = state.inventory.aitems[a as unknown as number]
            }
        }
        if(state.dirty.inventory.iitems) {
            this.iitems = state.inventory.iitems
        }
        
        if(!this.scope||this.scope.idNumber!==state.current_scope){
            this.scope=this.definitions.scopes.getFromNumber(state.current_scope)
        }
        if(state.dirty.inventory.weapons){
            for(const idx in state.inventory.weapons){
                this.set_weapon(idx as unknown as number,state.inventory.weapons[idx])
            }
        }
        if(state.dirty.inventory.hand){
            this.hand_settings=state.inventory.hand
            if(state.inventory.hand)this.set_weapon_index(state.inventory.hand.slot,true)
        }
        if(state.dirty.inventory.items) {
            this._items.length=0
            for (let i = 0; i < state.inventory.items.length; i++) {
                this._items.push({id:state.inventory.items[i].idNumber,count:state.inventory.items[i].count})
            }
        }
    }


    free_slot(id:string,limit:number):boolean{
        return this._items.some((v)=>{
            return v.count===0||(v.id===this.definitions.game_items.keysString[id]&&v.count<limit)
        })
    }
    melee_free():boolean{
        return this.weapon_is_free(0)
    }
    gun_free():boolean{
        return this.weapon_is_free(1)||this.weapon_is_free(2)
    }
}