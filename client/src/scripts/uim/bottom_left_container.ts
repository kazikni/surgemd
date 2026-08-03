import { HideElement, ShowElement, UIModule } from "common/engine/client.ts";
import { type Game } from "../others/game.ts";
import { type SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
import { BoostDef } from "common/scripts/definitions/player/boosts.ts";
import { InputActionType } from "common/scripts/packets/input_packet.ts";
import { GameItemType } from "common/scripts/definitions/utils.ts";
import { GunDef } from "common/scripts/definitions/items/guns.ts";
import { ActionsType } from "common/scripts/others/constants.ts";
import { Numeric } from "common/engine/core.ts";

export class BottomLeftModule extends UIModule<Game>{
    container!:HTMLDivElement

    hand_info_container!:HTMLDivElement
    hand_info_count!:HTMLSpanElement
    hand_info_consume_type!:HTMLImageElement

    action_container!: HTMLDivElement
    action_text!: HTMLSpanElement
    current_action?: { delay: number; start: number; type: ActionsType }

    health_bar_container!:HTMLDivElement
    health_bar_interior!:HTMLDivElement
    health_bar_animation!:HTMLDivElement
    health_bar_amount!:HTMLSpanElement

    boost_bar_container!:HTMLDivElement
    boost_bar_interior!:HTMLDivElement
    boost_bar_amount!:HTMLSpanElement

    downed:boolean=false
    health:number=100
    max_health:number=100

    boost:number=0
    max_boost:number=100
    boost_def!:BoostDef

    override on_signal(signal: string, content: SelfStateUpdate): void {
        if(signal==="self_state"){
            const downed=!!(this.game.active_entity?.downed&&!this.game.active_entity?.swimming)
            if(this.health!==content.health||this.max_health!==content.max_health||this.downed!==downed){
                this.health=content.health
                this.max_health=content.max_health
                this.downed=downed
                this.render_health()
            }
            if(this.boost!==content.boost||this.max_boost!==content.max_boost||this.boost_def.idNumber===content.boost_def){
                this.boost=content.boost
                this.max_boost=content.max_boost
                this.boost_def=this.game.definitions.boosts.getFromNumber(content.boost_def)
                this.render_boost()
            }
            if(content.dirty.inventory.hand)this.render_hand_info()
            if(content.dirty.action){
                if(content.action){
                    this.current_action = {
                        delay:content.action.delay,
                        type:content.action.type,
                        start:performance.now(),
                    }
                }else{
                    this.current_action = undefined
                    HideElement(this.action_container)
                }
            }
        }
    }
    override on_init(): void {
        this.container=document.querySelector("#bottom-left-container") as HTMLDivElement

        this.hand_info_container=document.querySelector("#hand-info") as HTMLDivElement
        this.hand_info_count=document.querySelector("#hand-info-count") as HTMLDivElement
        this.hand_info_consume_type=document.querySelector("#hand-info-consume-type") as HTMLImageElement
        this.hand_info_consume_type.onclick=(e)=>{
            const def=this.game.definitions.game_items.keysString[this.hand_info_consume_type.dataset.item_id as string]
            if(!def)return
            this.game.input.actions.push({type:InputActionType.emote_item,item:def})
        }

        this.action_container = document.querySelector("#action-info") as HTMLDivElement
        this.action_text = document.querySelector("#action-info-delay") as HTMLSpanElement
        HideElement(this.action_container)

        this.health_bar_container=document.querySelector("#health-bar-container") as HTMLDivElement
        this.health_bar_interior=document.querySelector("#health-bar") as HTMLDivElement
        this.health_bar_animation=document.querySelector("#health-bar-animation") as HTMLDivElement
        this.health_bar_amount=document.querySelector("#health-bar-amount") as HTMLSpanElement

        this.boost_bar_container=document.querySelector("#boost-bar-container") as HTMLDivElement
        this.boost_bar_interior=document.querySelector("#boost-bar") as HTMLDivElement
        this.boost_bar_amount=document.querySelector("#boost-bar-amount") as HTMLSpanElement

        this.clear()
    }
    
    override on_update(dt: number): void {
        if (this.current_action){
            const elapsed = (performance.now()-this.current_action.start)/1000
            if (elapsed < this.current_action.delay) {
                ShowElement(this.action_container)
                this.action_text.innerText = `${Numeric.maxDecimals(this.current_action.delay - elapsed, 1)}s`
            } else {
                this.current_action = undefined
                HideElement(this.action_container)
            }
        }
    }
    override on_destroy(): void {
    }
    render_hand_info(){
        const weapon=this.game.inventory.weapons[this.game.inventory.weapon_idx]
        if(this.game.inventory.hand_settings&&weapon&&weapon.item_type!==GameItemType.melee){
            this.hand_info_container.style.visibility=""
            this.hand_info_container.style.display=""
            this.hand_info_count.innerText=`${this.game.inventory.hand_settings.ammo}/${(weapon.def as GunDef).reload?.capacity}`
            this.hand_info_consume_type.src=this.game.resources.get_frame((weapon.def as GunDef).ammo_type).url!
            this.hand_info_consume_type.style.display=""
            this.hand_info_consume_type.dataset.item_id=(weapon.def as GunDef).ammo_type
        }else{
            this.hand_info_container.style.visibility="hidden"
            this.hand_info_container.style.display="none"
        }
    }
    render_health(){
        const p=this.health/this.max_health
        this.health_bar_interior.style.width =`${p*100}%`
        this.health_bar_animation.style.width=`${p*100}%`
        this.health_bar_amount.innerText=`${this.health}/${this.max_health}`
        this.health_bar_interior.style.background=this.downed?"#e33":"linear-gradient(90deg, #fff,#dfdfdf)"
    }
    render_boost(){
        const p=this.boost/this.max_boost
        this.boost_bar_interior.style.width =`${p*100}%`
        this.boost_bar_amount.innerText=`${this.boost}/${this.max_boost}`
        this.boost_bar_interior.style.backgroundColor=this.boost_def.color
    }
    override on_clear(): void {
        this.hand_info_count.innerText = ""
        this.hand_info_consume_type.src = ""
        this.hand_info_consume_type.style.display = "none"
        this.hand_info_container.style.visibility = "hidden"
        this.hand_info_container.style.display = "none"

        this.current_action = undefined
        this.action_text.innerText = ""
        HideElement(this.action_container)

        this.downed=false

        this.health=100
        this.max_health=100

        this.boost=0
        this.max_boost=0
        this.boost_def=this.game.definitions.boosts.getFromNumber(0)

        this.health_bar_interior.style.width = "100%"
        this.health_bar_animation.style.width = "100%"
        this.health_bar_amount.innerText = "100/100"
        this.health_bar_interior.style.background="linear-gradient(90deg, #fff,#dfdfdf)"

        this.boost_bar_interior.style.width = "0%"
        this.boost_bar_interior.style.backgroundColor = this.boost_def.color
        this.boost_bar_amount.innerText = "0/100"
    }
}