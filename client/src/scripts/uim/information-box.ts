import { HideElement, ShowElement, UIModule } from "common/engine/client.ts";
import { type Game } from "../others/game.ts";

export class InformationBoxModule extends UIModule<Game> {
    container!: HTMLDivElement

    killbox!: HTMLDivElement
    interaction!: HTMLDivElement

    queue: string[] = []
    time = 0

    override on_init(): void {
        this.container = document.querySelector("#information-box-container") as HTMLDivElement
        this.killbox = document.querySelector("#information-killbox") as HTMLDivElement
        this.interaction = document.querySelector("#information-interaction") as HTMLDivElement

        HideElement(this.killbox)
        HideElement(this.interaction)
    }

    push(msg: string) {
        this.queue.push(msg)
    }

    override on_signal(signal: string, state: any): void {
        if(signal === "interaction_hint") {
            if (!state || state === "") {
                HideElement(this.interaction)
            } else {
                this.interaction.innerHTML = state
                ShowElement(this.interaction)
            }
        }else if(signal==="info-kill"){
            this.push(state)
        }
    }

    override on_update(dt: number): void {
        if (this.queue.length > 0) {
            if (this.time <= 0) {
                this.killbox.innerHTML = this.queue[0]
                ShowElement(this.killbox)
            }
            this.time += dt
            if (this.time >= 3) {
                this.time = 0
                this.queue.shift()

                if (this.queue.length === 0) {
                    HideElement(this.killbox)
                }
            }
        }
    }

    override on_clear(): void {
        this.queue = []
        this.time = 0

        HideElement(this.killbox)
        HideElement(this.interaction)
    }

    override on_destroy(): void {}
}