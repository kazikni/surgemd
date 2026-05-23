import { UIModule } from "common/engine/client.ts";
import { type Game } from "../others/game.ts";
import { type SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
import { InventoryItemType } from "common/scripts/definitions/utils.ts";
import { GunDef } from "common/scripts/definitions/items/guns.ts";

export class HandInfoModule extends UIModule<Game>{
    container!:HTMLDivElement
    count!:HTMLSpanElement
    consume_type!:HTMLImageElement

    override on_signal(signal: string, content: SelfStateUpdate): void {
        if(signal==="self_state"){
            if(content.dirty.inventory.hand)this.render()
        }
    }
    override on_init(): void {
        this.container=document.querySelector("#hand-info") as HTMLDivElement
        this.count=document.querySelector("#hand-info-count") as HTMLDivElement
        this.consume_type=document.querySelector("#hand-info-consume-type") as HTMLImageElement

        this.render()
    }
    override on_update(dt: number): void {
    }
    override on_destroy(): void {
    }
    render(){
        const weapon=this.game.inventory.weapons[this.game.inventory.weapon_idx]
        if(this.game.inventory.hand_settings&&weapon&&weapon.item_type!==InventoryItemType.melee){
            this.container.style.visibility=""
            this.container.style.display=""
            this.count.innerText=`${this.game.inventory.hand_settings.ammo}/${(weapon.def as GunDef).reload?.capacity}`
            this.consume_type.src=this.game.resources.get_frame((weapon.def as GunDef).ammo_type).src
            this.consume_type.style.display=""
        }else{
            this.container.style.visibility="hidden"
            this.container.style.display="none"
        }
    }
    override on_clear(): void {
        this.count.innerText = ""
        this.consume_type.src = ""
        this.consume_type.style.display = "none"

        this.container.style.visibility = "hidden"
        this.container.style.display = "none"
    }
}