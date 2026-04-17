import { UIModule, HideElement, ShowElement, Numeric } from "common/engine/client.ts";
import { Game } from "../others/game.ts";
import { SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
import { ActionsType } from "common/scripts/others/constants.ts";

export class ActionsModule extends UIModule<Game> {
    container!: HTMLDivElement
    text!: HTMLSpanElement

    action?: { delay: number; start: number; type: ActionsType }

    override on_init(): void {
        this.container = document.querySelector("#action-info") as HTMLDivElement
        this.text = document.querySelector("#action-info-delay") as HTMLSpanElement

        HideElement(this.container)
    }

    override on_signal(signal: string, state: SelfStateUpdate): void {
        if (signal !== "self_state") return
        if (!state.dirty.action) return
        if (state.action) {
            this.action = {
                delay: state.action.delay,
                start: Date.now(),
                type: state.action.type
            }
        } else {
            this.action = undefined
            HideElement(this.container)
        }
    }

    override on_update(dt: number): void {
        if (!this.action) return

        const elapsed = (Date.now() - this.action.start) / 1000

        if (elapsed < this.action.delay) {
            ShowElement(this.container)
            this.text.innerText = `${Numeric.maxDecimals(this.action.delay - elapsed, 1)}s`
        } else {
            this.action = undefined
            HideElement(this.container)
        }
    }

    override on_dirty(): void {}
    override on_destroy(): void {}
}