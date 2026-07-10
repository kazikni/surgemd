import { UIModule } from "common/engine/client.ts";
import { Game } from "../others/game.ts";
import { SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
import { InventoryItemData, InventoryItemType } from "common/scripts/definitions/utils.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";

export class InventoryModule extends UIModule<Game> {
    items_container!: HTMLDivElement
    items_cache: HTMLDivElement[] = []

    aitems_container!: HTMLDivElement
    aitems_cache: Map<string, HTMLDivElement> = new Map()
    
    iitems_container!: HTMLDivElement
    iitems_elements: Record<string,HTMLDivElement>={}
    current_scope?: string

    override on_init(): void {
        this.items_container = document.querySelector("#ui-items") as HTMLDivElement
        this.aitems_container = document.querySelector("#ui-aitems") as HTMLDivElement
        this.iitems_container = document.querySelector("#ui-iitems") as HTMLDivElement
    }
    override on_signal(signal: string, state: SelfStateUpdate): void {
        switch(signal){
            case "self_state":
                if(state.dirty.inventory.items)this.render_items(state.inventory.items)
                if(state.dirty.inventory.aitems)this.render_aitems(this.game.inventory.aitems)
                if(state.dirty.inventory.iitems)this.render_iitems(this.game.inventory.iitems)
                break
            case "backpack_dirty":
                this.render_aitems(this.game.inventory.aitems)
                break
            case "current_scope_dirty":
                this.update_scope()
                break
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

    
    private sort_html_aitems(keys:string[]){
        for(const key of keys){
            const el=this.aitems_cache.get(key)
            if(el){
                this.aitems_container.appendChild(el)
            }
        }
    }
    private render_aitems(items: Record<string, number>) {
        const keys = Object.keys(items)

        keys.sort((a, b) => {
            return this.game.definitions.game_items.keysString[a]-this.game.definitions.game_items.keysString[b]
        })
        for (const k of this.aitems_cache.keys()) {
            if (!keys.includes(k)) {
                if(this.game.ui.tooltip_element===this.aitems_cache.get(k)!){
                    this.game.ui.tooltip_hide()
                }
                this.aitems_cache.get(k)!.remove()
                this.aitems_cache.delete(k)
            }
        }
        for (const k of keys) {
            if (!this.aitems_cache.has(k)) {
                this.create_aitem(k)
            }
            this.aitem_update_one(k, items[k])
            const el = this.aitems_cache.get(k)
            if (el) {
                this.aitems_container.appendChild(el)
            }
        }
        this.sort_html_aitems(keys)
    }
    private create_aitem(key: string) {
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
            this.game.ui.tooltip_show(el.dataset.item_name,el.dataset.item_description ?? "",el)
        }
        el.onmouseleave = () => {
            this.game.ui.tooltip_hide()
        }

        this.aitems_container.appendChild(el)
        this.aitems_cache.set(key, el)
    }
    private aitem_update_one(key: string, count: number) {
        const el = this.aitems_cache.get(key)
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
    private render_iitems(iitems: GameItem[]) {
        this.iitems_elements={}
        this.iitems_container.innerHTML=""
        for(const s of iitems){
            if(!this.iitems_elements[s.idString]){
                const el = document.createElement("div")
                el.className = "scope-slot"
                el.id="scope-"+s.idString
                if(this.current_scope===s.idString)el.classList.add("scope-slot-selected")

                const img = document.createElement("img")
                img.className = "icon"
                img.draggable = false
                img.width = 30
                img.height = 30
                img.src = this.game.resources.get_frame(s.idString).src

                el.dataset.item_kind = "5"
                el.dataset.item_value = s.idNumber!.toString()

                el.appendChild(img)

                el.addEventListener("mousedown", this.game.ui.handle_slot_click.bind(this.game.ui))
                el.addEventListener("touchstart", this.game.ui.handle_slot_touch.bind(this.game.ui))

                this.iitems_elements[s.idString]=el
                this.iitems_container.appendChild(el)
            }
        }
    }
    private update_scope() {
        if (this.current_scope) {
            const old = this.iitems_elements[this.current_scope]
            old?.classList.remove("scope-slot-selected")
        }
        this.current_scope = this.game.inventory.scope.idString

        const el = this.iitems_container.querySelector(`#scope-${this.current_scope}`)
        el?.classList.add("scope-slot-selected")
    }
    override on_update(dt: number): void {}
    override on_destroy(): void {}
    override on_clear(): void {
        this.items_container.innerHTML = ""
        this.items_cache = []

        this.aitems_container.innerHTML=""
        this.aitems_cache.clear()

        this.iitems_container.innerHTML = ""
        this.iitems_elements = {}
        this.current_scope = undefined
    }
}