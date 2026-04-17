import { UIModule } from "common/engine/client.ts";
import { Game } from "../others/game.ts";
import { SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
import { InventoryItemData } from "common/scripts/definitions/utils.ts";

export class ItemsModule extends UIModule<Game> {
    container!: HTMLDivElement
    cache: HTMLDivElement[] = []

    override on_init(): void {
        this.container = document.querySelector("#ui-items") as HTMLDivElement
    }

    override on_signal(signal: string, state: SelfStateUpdate): void {
        if (signal !== "self_state") return
        if (!state.dirty.inventory.items) return

        this.render(state.inventory.items)
    }

    private render(slots: InventoryItemData[]) {
        while (this.cache.length < slots.length) {
            this.cache.push(this.create(this.cache.length))
        }

        for (let i = 0; i < slots.length; i++) {
            this.update_one(this.cache[i], slots[i], i)
        }
    }

    private create(index: number): HTMLDivElement {
        const el = document.createElement("div")
        el.className = "inventory-item-slot"

        el.innerHTML = `
            <div class="slot-number"></div>
            <div class="slot-count"></div>
            <img class="slot-image">
        `

        el.dataset.drop_kind = "3"
        el.dataset.slot = index.toString()

        el.addEventListener("mousedown", this.game.ui.handle_slot_click.bind(this.game.ui))
        el.addEventListener("touchstart", this.game.ui.handle_slot_touch.bind(this.game.ui))

        this.container.appendChild(el)
        return el
    }

    private update_one(el: HTMLDivElement, slot: InventoryItemData, index: number) {
        const number = el.children[0] as HTMLDivElement
        const count = el.children[1] as HTMLDivElement
        const img = el.children[2] as HTMLImageElement

        number.textContent = `${index + 4}`

        if (slot.count > 0) {
            const def = this.game.definitions.game_items.valueNumber[slot.idNumber]

            count.textContent = `${slot.count}`
            img.src = this.game.resources.get_sprite(def.idString).src
            img.style.display = "block"

            el.classList.remove("slot-empty")

            count.classList.toggle(
                "item-maximized",
                slot.count >= this.game.inventory.item_limit(def)
            )
        } else {
            count.textContent = ""
            img.style.display = "none"

            el.classList.add("slot-empty")
            count.classList.remove("item-maximized")
        }
    }

    override on_update(dt: number): void {}
    override on_dirty(): void {}
    override on_destroy(): void {}
}