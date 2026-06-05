import { UIModule } from "common/engine/client.ts";
import { Game } from "../others/game.ts";
import { SelfStateUpdate } from "common/scripts/packets/update_packet.ts";

export class AItemsModule extends UIModule<Game> {
    container!: HTMLDivElement
    cache: Map<string, HTMLDivElement> = new Map()

    override on_init(): void {
        this.container = document.querySelector("#ui-aitems") as HTMLDivElement
    }

    override on_signal(signal: string, state: SelfStateUpdate): void {
        if (signal==="backpack_dirty"){
            this.render(this.game.inventory.aitems)
            return
        }
        if (signal !== "self_state") return
        if (!state.dirty.inventory.aitems) return

        this.render(this.game.inventory.aitems)
    }
    private sort_html(keys:string[]){
        for(const key of keys){
            const el=this.cache.get(key)
            if(el){
                this.container.appendChild(el)
            }
        }
    }
    private render(items: Record<string, number>) {
        const keys = Object.keys(items)

        keys.sort((a, b) => {
            return this.game.definitions.game_items.keysString[a]-this.game.definitions.game_items.keysString[b]
        })
        for (const k of this.cache.keys()) {
            if (!keys.includes(k)) {
                this.cache.get(k)!.remove()
                this.cache.delete(k)
            }
        }
        for (const k of keys) {
            if (!this.cache.has(k)) {
                this.create(k)
            }

            this.update_one(k, items[k])

            const el = this.cache.get(k)
            if (el) {
                this.container.appendChild(el)
            }
        }
        this.sort_html(keys)
    }

    private create(key: string) {
        const def = this.game.definitions.ammos.getFromString(key)

        const el = document.createElement("div")
        el.className = "aitem-slot"

        el.innerHTML = `
            <img class="icon" src="${this.game.resources.get_frame(def.idString).src}">
            <span class="count"></span>
        `

        el.dataset.item_kind = "2"
        el.dataset.item_value = def.idNumber!.toString()

        el.addEventListener("mousedown", this.game.ui.handle_slot_click.bind(this.game.ui))
        el.addEventListener("touchstart", this.game.ui.handle_slot_touch.bind(this.game.ui))

        el.onmouseenter = (e) => {
            this.game.ui.tooltip_show(el.dataset.item_name,el.dataset.item_description ?? "")
        }
        el.onmouseleave = () => {
            this.game.ui.tooltip_hide()
        }

        this.container.appendChild(el)
        this.cache.set(key, el)
    }

    private update_one(key: string, count: number) {
        const el = this.cache.get(key)
        if (!el) return
        const def = this.game.definitions.ammos.getFromString(key)
        const span = el.querySelector(".count") as HTMLSpanElement
        span.innerText = `${count}${def.liquid ? "L" : ""}`
        span.classList.toggle("item-maximized",count >= this.game.inventory.item_limit(def))
        el.dataset.item_name = "items." + def.idString
        let description = ""
        if (def.description) {
            let descriptionKey = typeof def.description==="string"?def.description:`items.description.${def.idString}`
            if (typeof def.description === "string") {
                descriptionKey = def.description
            }
            description = this.game.language.get(descriptionKey)
        }
        el.dataset.item_description = description
    }

    
    override on_update(dt: number): void {
    }
    override on_destroy(): void {
    }
    override on_clear(): void {
        this.container.innerHTML=""
        this.cache.clear()
    }
}