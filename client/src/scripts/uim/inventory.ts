import { Frame, HideElement, ShowElement, UIModule } from "common/engine/web.ts";
import { Game } from "../others/game.ts";
import { InventoryItemData, GameItemType } from "common/scripts/definitions/utils.ts";
import { GameItem, WeaponDef } from "common/scripts/definitions/game_defs.ts";
import { GunDef } from "common/scripts/definitions/items/guns.ts";
import { HelmetDef, VestDef } from "common/scripts/definitions/items/equipaments.ts";
import { BackpackDef } from "common/scripts/definitions/items/backpacks.ts";
import { type Human } from "../objects/human.ts";

export class InventoryModule extends UIModule<Game> {
    items_container!: HTMLDivElement
    items_cache: HTMLDivElement[] = []

    weapons_container!: HTMLDivElement
    weapons_elements: Record<number, HTMLDivElement> = {}
    current_weapon: number = -1

    aitems_container!: HTMLDivElement
    aitems_cache: Map<string, HTMLDivElement> = new Map()
    
    iitems_container!: HTMLDivElement
    iitems_elements: Record<string,HTMLDivElement>={}
    current_scope?: string
    
    equipments_container!: HTMLDivElement

    helmet?:HelmetDef
    helmet_skin?:number
    helmet_el!: HTMLDivElement

    vest?:VestDef
    vest_el!: HTMLDivElement

    backpack?:BackpackDef
    backpack_el!: HTMLDivElement

    override on_init(): void {
        this.items_container = document.querySelector("#ui-items") as HTMLDivElement
        this.weapons_container = document.querySelector("#ui-weapons") as HTMLDivElement
        this.aitems_container = document.querySelector("#ui-aitems") as HTMLDivElement
        this.iitems_container = document.querySelector("#ui-iitems") as HTMLDivElement
        
        this.equipments_container = document.querySelector("#ui-equipment") as HTMLDivElement
        this.equipments_container.innerHTML = `
            <div class="equipment-fixed">
                <div class="equipment-slot" data-type="helmet"></div>
                <div class="equipment-slot" data-type="vest"></div>
                <div class="equipment-slot" data-type="backpack"></div>
            </div>
        `
        this.helmet_el = this.equipments_container.querySelector(`[data-type="helmet"]`)!
        this.vest_el = this.equipments_container.querySelector(`[data-type="vest"]`)!
        this.backpack_el = this.equipments_container.querySelector(`[data-type="backpack"]`)!

        this.helmet_el.dataset.item_kind  = "6"
        this.helmet_el.dataset.item_value = "0"
        this.vest_el.dataset.item_kind  = "6"
        this.vest_el.dataset.item_value = "1"
    }
    override on_signal(signal: string, state: any): void {
        switch(signal){
            case "self_state":
                if(state.dirty.inventory.items)this.render_items(state.inventory.items)
                if(state.dirty.inventory.aitems)this.render_aitems(this.game.inventory.aitems)
                if(state.dirty.inventory.iitems)this.render_iitems(this.game.inventory.iitems)
                if(state.dirty.inventory.weapons)this.render_weapons()
                if(state.dirty.inventory.hand)this.update_current_weapon()
                break
            case "backpack_dirty":
                this.render_aitems(this.game.inventory.aitems)
                break
            case "active_player_update":
                this.render_equipments(state.player)
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
            img.src = this.game.resources.get_frame(def.idString).url!
            img.style.display = "block"

            el.classList.remove("slot-empty")
            el.dataset.item_name=this.game.language.get(def.tname??("items."+def.idString),undefined,def.name)

            count.classList.toggle("item-maximized",slot.count >= this.game.inventory.item_limit(def))

            if(def.item_type===GameItemType.consumible||def.item_type===GameItemType.grenade){
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
    private render_weapons() {
        for(const idx in this.game.inventory.weapons){
            const i=parseInt(idx)
            if(!this.weapons_elements[i]){
                this.create_weapon_element(i)
            }

            const item=this.game.inventory.weapons[i]

            const name_el=this.weapons_elements[i].querySelector(".weapon-slot-name") as HTMLSpanElement
            const img_el=this.weapons_elements[i].querySelector(".weapon-slot-image") as HTMLImageElement
            if (item) {
                const name=this.game.language.get(item.def.tname??("items."+item.def.idString),undefined,item.def.name)
                const assets = item.assets(this.game.resources)
                if((item.def as WeaponDef).description){
                    let descriptionKey = `items.description.${(item.def as WeaponDef).idString}`
                    if(typeof (item.def as WeaponDef).description === "string"){
                        descriptionKey = (item.def as WeaponDef).description as string
                    }
                    this.weapons_elements[i].dataset.item_description=this.game.language.get(descriptionKey)
                }else{
                    this.weapons_elements[i].dataset.item_description=""
                }
                name_el.innerText = name
                this.weapons_elements[i].dataset.item_name=this.game.language.get(item.def.tname??("items."+item.def.idString),undefined,item.def.name)
                img_el.src = (assets.item as Frame).url
                img_el.style.display = "block"
            } else {
                name_el.innerText = ""
                img_el.style.display = "none"
                this.weapons_elements[i].dataset.item_name=""
                this.weapons_elements[i].dataset.item_description=""
            }
        }
    }
    create_weapon_element(i:number):HTMLDivElement{
        const el = document.createElement("div")
        el.className = "weapon-slot"
        el.id = "weapon-slot-" + i

        const number = document.createElement("span")
        number.className = "weapon-slot-number"
        number.innerText = (i + 1).toString()
        el.appendChild(number)

        const name = document.createElement("span")
        name.className = "weapon-slot-name"
        el.appendChild(name)

        const img = document.createElement("img")
        img.className = "weapon-slot-image"
        el.appendChild(img)
        
        el.dataset.item_kind = "1"
        el.dataset.item_value = i.toString()

        el.addEventListener("mousedown", this.game.ui.handle_slot_click.bind(this.game.ui))
        el.addEventListener("touchstart", this.game.ui.handle_slot_touch.bind(this.game.ui))
        el.onmouseenter=(e)=>{
            this.game.ui.tooltip_show(el.dataset.item_name,el.dataset.item_description??"")
        }
        el.onmouseleave=()=>{
            this.game.ui.tooltip_hide()
        }

        if (this.current_weapon === i) {
            el.classList.add("weapon-slot-selected")
        }
        this.weapons_elements[i] = el
        this.weapons_container.appendChild(el)
        return el
    }

    private update_current_weapon() {
        if (this.current_weapon !== -1) {
            this.weapons_elements[this.current_weapon]?.classList.remove("weapon-slot-selected")
        }

        this.current_weapon = this.game.inventory.weapon_idx
        const item=this.game.inventory.weapons[this.game.inventory.weapon_idx]
        this.weapons_elements[this.current_weapon]?.classList.add("weapon-slot-selected")

        if(item&&item.item_type===GameItemType.gun){
            const def=(item.def as GunDef)
            this.game.aim_line.width=((def.bullet?.def.range??1000)*0.43)
            /*const spread=def.spread??0
            const jr=def.jitter_radius??0
            this.game.aim_line.height=(spread*0.33)+jr*/
        }else{
            this.game.aim_line.width=10
            this.game.aim_line.height=0.1
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
            <img class="icon" draggable="false" src="${this.game.resources.get_frame(def.idString).url}">
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
        el.dataset.item_name = this.game.language.get(def.tname??("items."+def.idString),undefined,def.name)
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
                img.src = this.game.resources.get_frame(s.idString).url

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
    private render_equipments(player: Human) {
        const hasAny=player.helmet||player.vest||player.backpack
        this.equipments_container.style.display = hasAny ? "" : "none"

        if(player.helmet===this.helmet&&player.helmet_skin===this.helmet_skin&&player.vest===this.vest&&player.backpack===this.backpack){
            return
        }
        this.helmet=player.helmet
        this.helmet_skin=player.helmet_skin
        this.vest=player.vest
        this.backpack=player.backpack
        if(this.helmet){
            this.render_equipment_slot(this.helmet_el,this.helmet,this.helmet_skin!==undefined&&this.helmet.skins?.[this.helmet_skin]?this.helmet.skins![this.helmet_skin]:this.helmet.idString,`<span class="span-text-base${this.helmet.special?" item-maximized":""}">Level ${this.helmet.level}</span>`,"items.description.vest",{"reduction":(this.helmet.reduction*100).toString()})
        }else{
            this.render_equipment_slot(this.helmet_el,undefined,undefined,"")
        }
        if(this.vest){
            this.render_equipment_slot(this.vest_el,this.vest,this.vest.idString,`<span class="span-text-base${this.vest.special?" item-maximized":""}">Level ${this.vest.level}</span>`,"items.description.vest",{"reduction":(this.vest.reduction*100).toString()})
        }else{
            this.render_equipment_slot(this.vest_el,undefined,undefined,"")
        }
        if(this.backpack){
            this.render_equipment_slot(this.backpack_el,this.backpack,this.backpack.idString,`<span class="span-text-base${this.backpack.special?" item-maximized":""}">Level ${this.backpack.level}</span>`,"items.description.backpack")
        }else{
            this.render_equipment_slot(this.backpack_el,undefined,undefined,"")
        }
    }
    
    private render_equipment_slot(el: HTMLDivElement, def?:GameItem,frame?:string,span="",description_def:string="items.description.vest",replace?:Record<string,string>) {
        if (!def||!frame) {
            el.onmousedown = null
            el.onmouseenter = null
            el.onmouseleave = null
            el.innerHTML = ""
            HideElement(el)
            return
        }
        const description=this.game.language.get(description_def,replace)
        el.onmousedown=this.game.ui.handle_slot_click.bind(this.game.ui)
        el.onmouseenter=(e)=>{
            this.game.ui.tooltip_show(this.game.language.get(def.tname??("items."+def.idString),undefined,def.name),description,el)
        }
        el.onmouseleave=()=>{
            this.game.ui.tooltip_hide()
        }
        const sprite = this.game.resources.get_frame(frame)
        if (!sprite?.url) {
            HideElement(el)
            return
        }
        ShowElement(el)
        el.style.display = ""
        el.innerHTML = `${span}<img class="slot-image" draggable="false" src="${sprite.url}">`
    }
    override on_update(dt: number): void {}
    override on_destroy(): void {}
    override on_clear(): void {
        this.items_container.innerHTML = ""
        this.items_cache = []
        
        this.weapons_container.innerHTML = ""
        this.weapons_elements = {}
        this.current_weapon = -1

        this.aitems_container.innerHTML=""
        this.aitems_cache.clear()

        this.iitems_container.innerHTML = ""
        this.iitems_elements = {}
        this.current_scope = undefined

        this.helmet=undefined
        this.helmet_skin=undefined
        this.vest=undefined
        this.backpack=undefined
        this.render_equipment_slot(this.helmet_el,undefined,"")
        this.render_equipment_slot(this.vest_el,undefined,"")
        this.render_equipment_slot(this.backpack_el,undefined,"")
        HideElement(this.equipments_container)
    }
}