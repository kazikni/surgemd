import { UIModule } from "common/engine/client.ts";
import { Game } from "../others/game.ts";
import { SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
import { InventoryItemData, InventoryItemType } from "common/scripts/definitions/utils.ts";

export class InventoryModule extends UIModule<Game> {
    items_container!: HTMLDivElement
    items_cache: HTMLDivElement[] = []

    override on_init(): void {
        this.items_container = document.querySelector("#ui-items") as HTMLDivElement
    }
    override on_signal(signal: string, state: SelfStateUpdate): void {
        if(signal==="self_state"){
            if(state.dirty.inventory.items){
                this.render_items(state.inventory.items)
            }
        }
    }

    private render_items(slots: InventoryItemData[]) {
        while(this.items_cache.length<slots.length) {
            this.items_cache.push(this.create_item(this.items_cache.length))
        }
        for (let i = 0; i < slots.length; i++) {
            this.items_update_one(this.items_cache[i], slots[i], i)
        }
    }
    private create_item(index: number): HTMLDivElement {
        const el = document.createElement("div")
        el.className = "inventory-item-slot"

        el.innerHTML = `
            <div class="slot-number"></div>
            <div class="slot-count"></div>
            <img class="slot-image">
        `

        el.dataset.item_kind = "3"
        el.dataset.item_value = index.toString()

        el.addEventListener("mousedown", this.game.ui.handle_slot_click.bind(this.game.ui))
        el.addEventListener("touchstart", this.game.ui.handle_slot_touch.bind(this.game.ui))

        el.onmouseenter=(e)=>{
            this.game.ui.tooltip_show(el.dataset.item_name,el.dataset.item_description??"",el)
        }
        el.onmouseleave=()=>{
            this.game.ui.tooltip_hide()
        }

        this.items_container.appendChild(el)
        return el
    }
    private items_update_one(el: HTMLDivElement, slot: InventoryItemData, index: number) {
        const number = el.children[0] as HTMLDivElement
        const count = el.children[1] as HTMLDivElement
        const img = el.children[2] as HTMLImageElement

        number.textContent = `${index + 4}`

        el.dataset.item_description=""
        if (slot.count > 0) {
            const def = this.game.definitions.game_items.valueNumber[slot.idNumber]

            count.textContent = `${slot.count}`
            img.src = this.game.resources.get_frame(def.idString).src
            img.style.display = "block"

            el.classList.remove("slot-empty")
            el.dataset.item_name="items."+def.idString

            count.classList.toggle("item-maximized",slot.count >= this.game.inventory.item_limit(def))

            if(def.item_type===InventoryItemType.consumible||def.item_type===InventoryItemType.grenade){
                if(def.description){
                    let descriptionKey = `items.description.${def.idString}`
                    if(typeof def.description === "string"){
                        descriptionKey = def.description
                    }
                    el.dataset.item_description=this.game.language.get(descriptionKey)
                }
            }
        } else {
            count.textContent = ""
            img.style.display = "none"

            el.classList.add("slot-empty")
            count.classList.remove("item-maximized")
            el.dataset.item_name=""

            if(this.game.ui.tooltip_element===el){
                this.game.ui.hide_game_over()
            }
        }
    }

    override on_update(dt: number): void {}
    override on_destroy(): void {}
    override on_clear(): void {
        this.items_container.innerHTML = ""
        this.items_cache = []
    }
}