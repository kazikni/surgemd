import { HideElement, ShowElement, UIModule } from "common/engine/web.ts";
import { Game } from "../others/game.ts";
import { DeadZoneState, DeadZoneUpdate, GeneralUpdate } from "common/scripts/packets/general_update.ts";
import { format_time } from "common/engine/core.ts";

export class AdditionalInfoModule extends UIModule<Game> {
    content={
        living_count:document.querySelector("#living-count-main") as HTMLSpanElement,
        kills_count:document.querySelector("#kills-info") as HTMLSpanElement,
        additional_info:document.querySelector("#additional-info") as HTMLDivElement,
        deadzone_info:document.querySelector("#deadzone-info") as HTMLDivElement,
        deadzone_info_timer:document.querySelector("#deadzone-info-timer") as HTMLSpanElement,
        deadzone_info_icon:document.querySelector("#deadzone-info-icon") as HTMLImageElement,
    }

    living_count:number[]=[]
    old_deadzone_update?:DeadZoneUpdate
    override on_init(): void {
    }

    override on_signal(signal: string, val:any): void {
        if(signal==="general_update"){
            this.proccess_general_update(val as GeneralUpdate)
        }else if(signal==="info-kill"){
            this.content.kills_count.innerText=val.kills
        }
    }

    update_living_count(count:number[]){
        if(count.length===this.living_count.length){
            let ok=true
            for(const i in count){
                if(this.living_count[i]!==count[i]){
                    ok=false
                }
            }
            if(ok)return
        }
        this.living_count=count
        this.content.living_count.innerHTML=`<span class="span-text-base">${count[0]}</span>`
    }
    proccess_general_update(gu:GeneralUpdate){
        this.update_living_count(gu.living_count)
        if(gu.deadzone&&gu.deadzone.state!==DeadZoneState.Deenabled){
            if(this.content.deadzone_info.style.visibility==="hidden"){
                ShowElement(this.content.deadzone_info)
            }
            this.content.deadzone_info_timer.innerText=format_time(gu.deadzone.timer)
            if(!this.old_deadzone_update||this.old_deadzone_update.state!==gu.deadzone.state){
                this.content.deadzone_info_icon.src=`/assets/img/menu/gui/deadzone/deadzone_state_${gu.deadzone.state}.svg`
            }
        }else if(!this.old_deadzone_update||gu.deadzone?.state!==this.old_deadzone_update.state){ 
            HideElement(this.content.deadzone_info)
        }
        this.old_deadzone_update=gu.deadzone
    }
    
    override on_update(dt: number): void {
    }
    override on_destroy(): void {
    }
    override on_clear(): void {
        this.content.kills_count.innerText=""
        this.old_deadzone_update=undefined
    }
}