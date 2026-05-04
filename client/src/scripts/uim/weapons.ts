import { UIModule } from "common/engine/client.ts";
import { Game } from "../others/game.ts";
import { SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
import { InputActionType } from "common/scripts/packets/input_packet.ts";

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
                const assets = item.assets(this.game.resources)
                name_el.innerText = this.game.language.get("items."+item.def.idString)
                img_el.src = assets.item.src
                console.log(assets.item.src)
                img_el.style.display = "block"
            } else {
                name_el.innerText = ""
                img_el.style.display = "none"
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
        
        el.dataset.drop_kind = "1"
        el.dataset.drop = i.toString()

        el.addEventListener("mousedown", (e: MouseEvent) => {
            if (e.button === 2) {
                this.game.input.actions.push({
                    type:InputActionType.drop,
                    drop:i,
                    drop_kind:1
                })
            } else if (e.button === 0) {
                this.game.input.actions.push({
                    type:InputActionType.set_hand,
                    hand:i
                })
            }
        })

        el.addEventListener("touchstart", () => {
            this.game.input.actions.push({
                type: InputActionType.set_hand,
                hand: i
            })
        })
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