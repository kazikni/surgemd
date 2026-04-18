import { UIModule } from "common/engine/client.ts";
import { type Game } from "../others/game.ts";
import { type SelfStateUpdate } from "common/scripts/packets/update_packet.ts";

export class HealthModule extends UIModule<Game>{
    bar_interior!:HTMLDivElement
    bar_animation!:HTMLDivElement
    bar_amount!:HTMLSpanElement

    health:number=100
    max_health:number=100

    override on_signal(signal: string, content: SelfStateUpdate): void {
        if(signal==="self_state"){
            if(this.health==content.health&&this.max_health===content.max_health)return

            this.health=content.health
            this.max_health=content.max_health
            this.render()
        }
    }
    override on_init(): void {
        this.bar_interior=document.querySelector("#health-bar") as HTMLDivElement
        this.bar_animation=document.querySelector("#health-bar-animation") as HTMLDivElement
        this.bar_amount=document.querySelector("#health-bar-amount") as HTMLSpanElement

        this.render()
    }
    override on_update(dt: number): void {
    }
    override on_destroy(): void {
    }
    render(){
        const p=this.health/this.max_health
        this.bar_interior.style.width =`${p*100}%`
        this.bar_animation.style.width=`${p*100}%`
        this.bar_amount.innerText=`${this.health}/${this.max_health}`
    }
    override on_clear(): void {
        this.health = 100
        this.max_health = 100
        this.bar_interior.style.width = "100%"
        this.bar_animation.style.width = "100%"
        this.bar_amount.innerText = "100/100"
    }
}