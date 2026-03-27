import { type Game } from "../others/game.ts";
import { GInventory, GunItem, LItem, MeleeItem } from "../others/inventory.ts";
import { InventoryItemData, InventoryItemType, ItemQualitySettings } from "common/scripts/definitions/utils.ts";
import { GunDef } from "common/scripts/definitions/items/guns.ts";
import { ScopeDef } from "common/scripts/definitions/items/scopes.ts";
import { InputActionType } from "common/scripts/packets/input_packet.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";
import { ItemQuality } from "common/scripts/others/item.ts";

export class InventoryManager{
    inventory:GInventory
    game:Game
    scope?:ScopeDef
    constructor(game:Game){
        this.game=game
        this.inventory=new GInventory()
        this.inventory.initialize(game.definitions,{
            0:MeleeItem as (new(item:GameItem)=>LItem),
            1:GunItem as (new(item:GameItem)=>LItem),
            2:GunItem as (new(item:GameItem)=>LItem)
        })
        //this.inventory.on_dirty=this.inventory_dirty.bind(this)
        this.inventory.clear_weapons()
        this.handle_slot_click=this.handle_slot_click.bind(this)
    }
    content={
        weapons:document.querySelector("#ui-weapons") as HTMLDivElement,
        aitems:document.querySelector("#ui-aitems") as HTMLDivElement,
        items: document.querySelector("#ui-items") as HTMLDivElement,
        iitems:document.querySelector("#ui-iitems") as HTMLDivElement,
        hand_info:{
            count:document.querySelector("#hand-info-count") as HTMLSpanElement,
            consume_type:document.querySelector("#hand-info-consume-type")as HTMLImageElement,
        }
    }
    weapons_html:Partial<Record<number,{
        main:HTMLDivElement,
        name:HTMLSpanElement,
        image:HTMLImageElement
    }>>={}
    current_weapon:number=-1

    drop_weapon=(w:number)=>{
        return (e:MouseEvent)=>{
            if(e.button==2){
                this.game.input.actions.push({type:InputActionType.drop,drop:w,drop_kind:1})
            }
        }
    }
    select_weapon=(w:number)=>{
        return ()=>{
            this.game.input.actions.push({type:InputActionType.set_hand,hand:w})
        }
    }
    update_weapons(){
        for(const k of Object.keys(this.inventory.weapons)){
            if(this.weapons_html[k as unknown as number]===undefined){
                const w={
                    main:document.createElement("div"),
                    number:document.createElement("span"),
                    image:document.createElement("img"),
                    name:document.createElement("span"),
                }
                w.main.className="weapon-slot"
                w.number.className="weapon-slot-number"
                w.number.innerHTML=`${parseInt(k)+1}`
                w.main.appendChild(w.number)
                w.name.className="weapon-slot-name"
                w.main.appendChild(w.name)
                w.image.className="weapon-slot-image"
                w.main.appendChild(w.image)

                w.main.id="inventoy-weapon-slot-"+k

                w.main.addEventListener("mousedown",this.drop_weapon(k as unknown as number))
                w.main.addEventListener("touchstart",this.select_weapon(k as unknown as number))

                this.content.weapons.append(w.main)
                this.weapons_html[k as unknown as number]=w
            }
            const item=this.inventory.weapons[k as unknown as number]
            const w=this.weapons_html[k as unknown as number]!
            if(item){
                const assets=item.assets(this.game.resources)
                w.name.innerText=this.game.language.get(this.inventory.weapons[k as unknown as number]!.def.idString)
                w.image.src=assets["item"].src
                w.image.style.display="block"
                w.main.style.background=`linear-gradient(to right,${ItemQualitySettings[item.def.quality as ItemQuality].color1}42,${ItemQualitySettings[item.def.quality as ItemQuality].color2}42)`
            }else{
                w.name.innerText=""
                w.image.style.display="none"
                w.main.style.background=""
            }
        }
    }
    update_hand(ammo:number,widx:number,liquid:boolean){
        this.inventory.weapon_idx=widx
        if(this.current_weapon!==-1&&this.weapons_html[this.current_weapon]){
            this.weapons_html[this.current_weapon]!.main.classList.remove("weapon-slot-selected")
            this.weapons_html[this.current_weapon]!.main.style.border=""
        }
        const weapon=this.inventory.weapons[this.inventory.weapon_idx]
        if(!weapon)return
        if(weapon.item_type===InventoryItemType.melee){
            //
        }else if(weapon.item_type===InventoryItemType.gun&&(weapon.def as GunDef).reload){
            this.content.hand_info.count.innerText=`${ammo}/${(weapon.def as GunDef).reload?.capacity}`

            this.content.hand_info.consume_type.src=this.game.resources.get_sprite((weapon.def as GunDef).ammoType).src
            this.content.hand_info.consume_type.style.display=""
        }
        this.current_weapon=this.inventory.weapon_idx
        this.weapons_html[this.current_weapon]!.main.style.border=`3px solid ${ItemQualitySettings[weapon.def.quality as ItemQuality].color2}`
        this.weapons_html[this.current_weapon]!.main.classList.add("weapon-slot-selected")
    }
    melee_free():boolean{
        return this.inventory.weapon_is_free(0)
    }
    gun_free():boolean{
        return this.inventory.weapon_is_free(1)||this.inventory.weapon_is_free(2)
    }
    handle_slot_click(e:MouseEvent){
        const t=e.currentTarget as HTMLDivElement
        if(e.button==2){
            if(t.dataset.drop_kind==="2"){
                this.game.input.actions.push({type:InputActionType.drop,drop:parseInt(t.dataset.drop!),drop_kind:2})
            }else if(t.dataset.drop_kind==="3"){
                this.game.input.actions.push({type:InputActionType.drop,drop:parseInt(t.dataset.slot!),drop_kind:3})
            }
        }else if(e.button===0){
            if(t.dataset.drop_kind==="3"){
                this.game.input.actions.push({type:InputActionType.use_item,slot:parseInt(t.dataset.slot!)})
            }
        }
    }
    handle_slot_touch(e:TouchEvent){
        const t=e.currentTarget as HTMLDivElement
        if(t.dataset.drop_kind==="3"){
            this.game.input.actions.push({type:InputActionType.use_item,slot:parseInt(t.dataset.slot!)})
        }
    }
    aitems_cache: Map<string, HTMLDivElement> = new Map()
    update_aitems(force = false) {
        const keys = Object.keys(this.inventory.aitems)
        for (const k of this.aitems_cache.keys()) {
            if (!keys.includes(k)) {
                this.aitems_cache.get(k)!.remove()
                this.aitems_cache.delete(k)
            }
        }
        if (!force && keys.length === this.aitems_cache.size) {
            for (const k of keys) {
                if (!this.aitems_cache.has(k)) continue
                this.update_aitem(k)
            }
            return
        }
        this.content.aitems.innerHTML = ""
        this.aitems_cache.clear()
        for (const k of keys) {
            this.create_aitem_entry(k)
        }
    }
    private create_aitem_entry(key: string) {
        const def = this.game.definitions.ammos.getFromString(key)
        const el = document.createElement("div")
        el.className = "aitem-slot"
        el.id = `ammo-${key}`
        el.innerHTML = `
            <image class="icon" src="img/game/main/items/ammos/${key}.svg"></image>
            <span class="count"></span>
        `
        el.dataset.drop_kind = "2"
        el.dataset.drop = def.idNumber!.toString()
        el.addEventListener("mousedown", this.handle_slot_click)
        el.addEventListener("touchstart", this.handle_slot_touch)
        this.content.aitems.appendChild(el)
        this.aitems_cache.set(key, el)
        this.update_aitem(key)
    }
    private update_aitem(key: string) {
        const el = this.aitems_cache.get(key)
        if (!el) return
        const def = this.game.definitions.ammos.getFromString(key)
        const count = this.inventory.aitems[key]
        const span = el.querySelector(".count") as HTMLSpanElement
        span.innerText = `${count}${def.liquid ? "l" : ""}`
        span.classList.toggle(
            "item-maximized",
            count >= this.inventory.item_limit(def)
        )
    }
    update_iitems(iitems:GameItem[]){
        iitems.sort((a, b) => a.idNumber! - b.idNumber!)
        this.inventory.iitems=iitems
        this.content.iitems.innerHTML=""
        for(const def of iitems){
            const div=document.createElement("div")
            div.className="scope-slot"
            if(def==this.scope){
                div.classList.add("scope-slot-selected")
            }
            div.id="scope-"+def.idString
            div.innerHTML=`<img class="icon" src="${this.game.resources.get_sprite(def.idString).src}" draggable="false" width="30" height="30"/>`
            this.content.iitems.appendChild(div)

            div.addEventListener("touchstart",(e)=>{
                this.game.input.actions.push({type:InputActionType.set_scope,scope_id:def.idNumber!})
            })
        }
    }
    update_current_scope(scope:number){
        if(!this.scope||this.scope.idNumber!==scope){
            if(this.scope){
                const old_s=document.querySelector(`#scope-${this.scope?.idString}`)
                if(old_s){
                    old_s.classList.remove("scope-slot-selected")
                }
            }
            this.scope=this.game.definitions.scopes.getFromNumber(scope)
            const sc=document.querySelector(`#scope-${this.scope!.idString}`)
            if(sc){
                sc.classList.add("scope-slot-selected")
            }
            this.game.set_scope(this.scope)
        }
    }
    items_cache: HTMLDivElement[] = []
    items_map: Record<string, number> = {}
    update_items(slots: InventoryItemData[]) {
        const res = this.game.resources
        const container = this.content.items
    
        while (this.items_cache.length < slots.length) {
            const el = document.createElement("div")
            el.className = "inventory-item-slot"
    
            const number = document.createElement("div")
            number.className = "slot-number"
            el.appendChild(number)
    
            const count = document.createElement("div")
            count.className = "slot-count"
            el.appendChild(count)
    
            const img = document.createElement("img")
            img.className = "slot-image"
            el.appendChild(img)
    
            el.dataset.drop_kind = "3"
            el.addEventListener("mousedown", this.handle_slot_click)
            el.addEventListener("touchstart",this.handle_slot_touch)
    
            this.items_cache.push(el)
            container.appendChild(el)
        }
    
        this.items_map = {}
    
        for (let i = 0; i < slots.length; i++) {
            const s = slots[i]
            const el = this.items_cache[i]
    
            const number = el.children[0] as HTMLDivElement
            const count = el.children[1] as HTMLDivElement
            const img = el.children[2] as HTMLImageElement
    
            number.textContent = `${i + 4}`
            el.dataset.slot = i.toString()
    
            if (s.count > 0) {
                const def = this.game.definitions.game_items.valueNumber[s.idNumber]
    
                count.textContent = `${s.count}`
                img.src = res.get_sprite(def.idString).src
                img.style.display = "block"
    
                el.classList.remove("slot-empty")
                count.classList.toggle(
                    "item-maximized",
                    s.count>=this.inventory.item_limit(def)
                )
    
                this.items_map[def.idString] =
                    (this.items_map[def.idString] ?? 0) + s.count
            } else {
                count.textContent = ""
                img.style.display = "none"
                el.classList.add("slot-empty")
                el.classList.remove("item-maximized")
            }
        }
    }
    clear() {
        this.items_cache.length = 0
        this.items_map = {}
        this.content.items.innerHTML = ""
        this.inventory.clear()
    }
}