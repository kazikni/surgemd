import { UIModule } from "common/engine/client.ts";
import { Game } from "../others/game.ts";
import { SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
import { WeaponDef } from "common/scripts/definitions/game_defs.ts";

export class WeaponsModule extends UIModule<Game> {
    container!: HTMLDivElement

    elements: Record<number, HTMLDivElement> = {}
    currentWeapon: number = -1

    override on_init(): void {
        this.container = document.querySelector("#ui-weapons") as HTMLDivElement
    }

    override on_signal(signal: string, state: SelfStateUpdate): void {
        if(signal !== "self_state") return

        if(state.dirty.inventory.weapons)this.render()
        if(state.dirty.inventory.hand)this.update_current_weapon()
    }

    private render() {
        for(const idx in this.game.inventory.weapons){
            const i=parseInt(idx)
            if(!this.elements[i]){
                this.create_element(i)
            }

            const item=this.game.inventory.weapons[i]

            const name_el=this.elements[i].querySelector(".weapon-slot-name") as HTMLSpanElement
            const img_el=this.elements[i].querySelector(".weapon-slot-image") as HTMLImageElement
            if (item) {
                const name=this.game.language.get("items."+item.def.idString)
                const assets = item.assets(this.game.resources)
                
                if((item.def as WeaponDef).description){
                    let descriptionKey = `items.description.${(item.def as WeaponDef).idString}`
                    if(typeof (item.def as WeaponDef).description === "string"){
                        descriptionKey = (item.def as WeaponDef).description as string
                    }
                    this.elements[i].dataset.item_description=this.game.language.get(descriptionKey)
                }
                name_el.innerText = name
                this.elements[i].dataset.item_name=name
                img_el.src = assets.item.src
                img_el.style.display = "block"
            } else {
                name_el.innerText = ""
                img_el.style.display = "none"
                this.elements[i].dataset.item_name=""
                this.elements[i].dataset.item_description=""
            }
        }
    }
    create_element(i:number):HTMLDivElement{
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

        if (this.currentWeapon === i) {
            el.classList.add("weapon-slot-selected")
        }
        this.elements[i] = el
        this.container.appendChild(el)
        return el
    }

    private update_current_weapon() {
        if (this.currentWeapon !== -1) {
            this.elements[this.currentWeapon]?.classList.remove("weapon-slot-selected")
        }

        this.currentWeapon = this.game.inventory.weapon_idx
        this.elements[this.currentWeapon]?.classList.add("weapon-slot-selected")
    }
    override on_update(dt: number): void {
    }
    override on_destroy(): void {
    }
    override on_clear(): void {
        this.container.innerHTML = ""
        this.elements = {}
        this.currentWeapon = -1
    }
}