import { HideElement, ShowElement, UIModule } from "common/engine/client.ts";
import { Game } from "../others/game.ts";
import { type Human } from "../objects/human.ts";
import { HelmetDef, VestDef } from "common/scripts/definitions/items/equipaments.ts";
import { BackpackDef } from "common/scripts/definitions/items/backpacks.ts";

export class EquipmentModule extends UIModule<Game> {
    container!: HTMLDivElement

    helmet?:HelmetDef
    helmet_el!: HTMLDivElement
    vest?:VestDef
    vest_el!: HTMLDivElement
    backpack?:BackpackDef
    backpack_el!: HTMLDivElement

    accessories_container!: HTMLDivElement
    cache: HTMLDivElement[] = []

    override on_init(): void {
        this.container = document.querySelector("#ui-equipment") as HTMLDivElement

        this.container.innerHTML = `
            <div class="equipment-fixed">
                <div class="equipment-slot" data-type="helmet"></div>
                <div class="equipment-slot" data-type="vest"></div>
                <div class="equipment-slot" data-type="backpack"></div>
            </div>
            <div class="equipment-accessories"></div>
        `

        this.helmet_el = this.container.querySelector(`[data-type="helmet"]`)!
        this.vest_el = this.container.querySelector(`[data-type="vest"]`)!
        this.backpack_el = this.container.querySelector(`[data-type="backpack"]`)!
        this.accessories_container = this.container.querySelector(".equipment-accessories")!

        this.helmet_el.dataset.item_kind  = "6"
        this.helmet_el.dataset.item_value = "0"
        this.vest_el.dataset.item_kind  = "6"
        this.vest_el.dataset.item_value = "1"
    }

    override on_signal(signal: string, state: { dt: number, player: Human }): void {
        if (signal !== "active_player_update") return
        this.render(state.player)
    }

    private render(player: Human) {
        const hasAny=player.helmet||player.vest||player.backpack
        this.container.style.display = hasAny ? "" : "none"

        if(player.helmet===this.helmet&&player.vest===this.vest&&player.backpack===this.backpack){
            return
        }
        this.helmet=player.helmet
        this.vest=player.vest
        this.backpack=player.backpack
        if(this.helmet){
            this.render_slot(this.helmet_el,this.helmet.idString,`<span class="span-text-base${this.helmet.special?" item-maximized":""}">Level ${this.helmet.level}</span>`,"items.description.vest",{"reduction":(this.helmet.reduction*100).toString()})
        }else{
            this.render_slot(this.helmet_el,undefined,"")
        }
        if(this.vest){
            this.render_slot(this.vest_el,this.vest.idString,`<span class="span-text-base${this.vest.special?" item-maximized":""}">Level ${this.vest.level}</span>`,"items.description.vest",{"reduction":(this.vest.reduction*100).toString()})
        }else{
            this.render_slot(this.vest_el,undefined,"")
        }
        if(this.backpack){
            this.render_slot(this.backpack_el,this.backpack.idString,`<span class="span-text-base${this.backpack.special?" item-maximized":""}">Level ${this.backpack.level}</span>`,"items.description.backpack")
        }else{
            this.render_slot(this.backpack_el,undefined,"")
        }
    }
    private render_slot(el: HTMLDivElement, id?: string,span="",description_def:string="items.description.vest",replace?:Record<string,string>) {
        if (!id) {
            HideElement(el)
            return
        }
        el.onmousedown=this.game.ui.handle_slot_click.bind(this.game.ui)
        const sprite = this.game.resources.get_frame(id)
        if (!sprite?.src) {
            HideElement(el)
            return
        }
        ShowElement(el)
        el.style.display = ""
        el.innerHTML = `${span}<img class="slot-image" src="${sprite.src}">`

        const description=this.game.language.get(description_def,replace)
        el.onmouseenter=(e)=>{
            this.game.ui.tooltip_show("items."+id,description,el)
        }
        el.onmouseleave=()=>{
            this.game.ui.tooltip_hide()
        }
    }

    override on_update(_dt: number): void {}
    override on_destroy(): void {}

    override on_clear(): void {
        this.render_slot(this.helmet_el)
        this.render_slot(this.vest_el)
        this.render_slot(this.backpack_el)
        this.accessories_container.innerHTML = ""
        this.cache = []
        HideElement(this.container)
    }
}