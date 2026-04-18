import { UIModule } from "common/engine/client.ts";
import { type Game } from "../others/game.ts";
import { type SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
import { BoostDef, Boosts, BoostType } from "common/scripts/definitions/player/boosts.ts";

export class BoostModule extends UIModule<Game>{
    bar_interior!:HTMLDivElement
    bar_amount!:HTMLSpanElement

    boost:number=0
    max_boost:number=100
    boost_def:BoostDef=Boosts[BoostType.Null]
        
    override on_signal(signal: string, content: SelfStateUpdate): void {
        if(signal==="self_state"){
            if(this.boost==content.boost&&this.max_boost===content.max_boost&&this.boost_def.type===content.boost_type)return

            this.boost=content.boost
            this.max_boost=content.max_boost
            this.boost_def=Boosts[content.boost_type]

            this.render()
        }
    }
    override on_init(): void {
        this.bar_interior=document.querySelector("#boost-bar") as HTMLDivElement
        this.bar_amount=document.querySelector("#boost-bar-amount") as HTMLSpanElement

        this.render()
    }
    override on_update(dt: number): void {
    }
    override on_destroy(): void {
    }
    render(){
        const p=this.boost/this.max_boost
        this.bar_interior.style.width =`${p*100}%`
        this.bar_amount.innerText=`${this.boost}/${this.max_boost}`
        this.bar_interior.style.backgroundColor=this.boost_def.color
    }
    override on_clear(): void {
        this.boost = 0
        this.max_boost = 100
        this.boost_def = Boosts[BoostType.Null]

        this.bar_interior.style.width = "0%"
        this.bar_amount.innerText = "0/100"
        this.bar_interior.style.backgroundColor = this.boost_def.color
    }
}