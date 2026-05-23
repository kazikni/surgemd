import { HideElement, ShowElement, UIModule } from "common/engine/client.ts";
import { Game } from "../others/game.ts";
import { type Human } from "../objects/human.ts";

export class EquipmentModule extends UIModule<Game> {
    container!: HTMLDivElement

    // slots fixos
    helmet!: HTMLDivElement
    vest!: HTMLDivElement
    backpack!: HTMLDivElement

    // acessórios dinâmicos
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

        this.helmet = this.container.querySelector(`[data-type="helmet"]`)!
        this.vest = this.container.querySelector(`[data-type="vest"]`)!
        this.backpack = this.container.querySelector(`[data-type="backpack"]`)!
        this.accessories_container = this.container.querySelector(".equipment-accessories")!
    }

    override on_signal(signal: string, state: { dt: number, player: Human }): void {
        if (signal !== "active_player_update") return
        this.render(state.player)
    }

    private render(player: Human) {
        const hasAny=player.helmet||player.vest||player.backpack
        this.container.style.display = hasAny ? "" : "none"

        this.render_slot(this.helmet, player.helmet?.idString,player.helmet!==undefined?`<span class="span-text">Level ${player.helmet.level}</span>`:"")
        this.render_slot(this.vest, player.vest?.idString,player.vest!==undefined?`<span class="span-text">Level ${player.vest.level}</span>`:"")
        this.render_slot(this.backpack, player.backpack?.idString,player.backpack!==undefined?`<span class="span-text">Level ${player.backpack.level}</span>`:"")
    }
    private render_slot(el: HTMLDivElement, id?: string,span="") {
        if (!id) {
            HideElement(el)
            return
        }
        const sprite = this.game.resources.get_frame(id, false)
        if (!sprite?.src) {
            HideElement(el)
            return
        }
        ShowElement(el)

        el.style.display = ""
        el.innerHTML = `${span}<img class="slot-image" src="${sprite.src}">`
    }

    override on_update(_dt: number): void {}
    override on_destroy(): void {}

    override on_clear(): void {
        this.container.innerHTML = ""
        this.cache = []
    }
}