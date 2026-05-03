import { UIModule } from "common/engine/client.ts";
import { Game } from "../others/game.ts";
import { SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";
import { InputActionType } from "common/scripts/packets/input_packet.ts";

export class IItemsModule extends UIModule<Game> {
    container!: HTMLDivElement
    elements: Record<string,HTMLDivElement>={}
    currentScope?: string

    override on_init(): void {
        this.container = document.querySelector("#ui-iitems") as HTMLDivElement
    }

    override on_signal(signal: string, state: SelfStateUpdate): void {
        if (signal==="current_scope_dirty"){
            this.update_scope()
            return
        }
        if (signal !== "self_state") return

        if (state.dirty.inventory.iitems) {
            this.render(this.game.inventory.iitems)
        }
    }

    private render(iitems: GameItem[]) {
        this.elements={}
        this.container.innerHTML=""

        for(const s of iitems){
            if(!this.elements[s.idString]){
                const el = document.createElement("div")
                el.className = "scope-slot"
                el.id="scope-"+s.idString
                if(this.currentScope===s.idString)el.classList.add("scope-slot-selected")

                const img = document.createElement("img")
                img.className = "icon"
                img.draggable = false
                img.width = 30
                img.height = 30
                img.src = this.game.resources.get_sprite(s.idString).src

                el.dataset.drop_kind = "3"
                el.dataset.slot = s.idNumber!.toString()

                el.appendChild(img)

                el.addEventListener("mousedown", this.game.ui.handle_slot_click)
                el.addEventListener("touchstart", ()=>{
                    this.game.input.actions.push({
                        type:InputActionType.set_scope,
                        scope_id:s.idNumber!
                    })
                })

                this.elements[s.idString]=el
                this.container.appendChild(el)
            }
        }
    }
    private update_scope() {
        if (this.currentScope) {
            const old = this.elements[this.currentScope]
            old?.classList.remove("scope-slot-selected")
        }
        this.currentScope = this.game.inventory.scope.idString

        const el = this.container.querySelector(`#scope-${this.currentScope}`)
        el?.classList.add("scope-slot-selected")
    }

    
    override on_update(dt: number): void {
    }
    override on_destroy(): void {
    }
    override on_clear(): void {
        this.container.innerHTML = ""
        this.elements = {}
        this.currentScope = undefined
    }
}