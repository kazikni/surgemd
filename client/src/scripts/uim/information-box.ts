import { HideElement, ShowElement, UIModule } from "common/engine/web.ts";
import { type Game } from "../others/game.ts";
import { FeedMessage, FeedMessageType, GeneralUpdate, GlobalMessage } from "common/scripts/packets/general_update.ts";

export interface GlobalMessageInstance{
    elem:HTMLSpanElement
    timer:number
}
export class InformationBoxModule extends UIModule<Game> {
    container!: HTMLDivElement

    killbox!: HTMLDivElement
    interaction!: HTMLDivElement
    global_messages!: HTMLDivElement

    gmsg:GlobalMessageInstance[]=[]
    queue: {msg:string,player_id?:number}[] = []
    time = 0

    override on_init(): void {
        this.container = document.querySelector("#information-box-container") as HTMLDivElement
        this.killbox = this.container.querySelector("#information-killbox") as HTMLDivElement
        this.interaction = this.container.querySelector("#information-interaction") as HTMLDivElement
        this.global_messages = document.querySelector("#information-global-messages") as HTMLDivElement

        HideElement(this.killbox)
        HideElement(this.interaction)
    }

    push_infobox(msg: string,player_id?:number) {
        if(player_id!==undefined){
            for(let i=0;i<this.queue.length;i++){
                if(this.queue[i].player_id===player_id){
                    this.queue.splice(i,1)
                    i--
                }
            }
        }
        if(this.queue.length===0)this.time=0
        this.queue.push({
            msg:msg,
            player_id:player_id
        })
    }
    push_msg(msg:GlobalMessage){
        const mi:GlobalMessageInstance={
            elem:document.createElement("span"),
            timer:msg.lifetime??3
        }
        mi.elem.innerHTML=msg.lvalue?this.game.language.get(msg.lvalue,{},msg.value):(msg.value??"")
        this.global_messages.appendChild(mi.elem)
        this.gmsg.push(mi)
    }

    override on_signal(signal: string, state: any): void {
        switch(signal){
            case "interaction_hint":{
                if (!state || state === "") {
                    HideElement(this.interaction)
                } else {
                    this.interaction.innerHTML = state
                    ShowElement(this.interaction)
                }
                break
            }
            case "feed_message":{
                const msg=(state.obj as FeedMessage)
                if(msg.type===FeedMessageType.kill&&msg.killer?.id===this.game.active_entity_id){
                    this.push_infobox(this.game.language.get("infobox.kill",{kills:(msg.killer?.kills??0).toString(),victim:this.game.ui.players_name[msg.victimId].name}),msg.victimId)
                }else if(msg.type===FeedMessageType.down&&msg.killer?.id===this.game.active_entity_id){
                    this.push_infobox(this.game.language.get("infobox.knock",{kills:(msg.killer?.kills??0).toString(),victim:this.game.ui.players_name[msg.victimId].name}),msg.victimId)
                }
                break
            }
            case "general_update":{
                for(const msg of (state as GeneralUpdate).global_message){
                    this.push_msg(msg)
                }
                break
            }
        }
    }

    override on_update(dt: number): void {
        if(this.queue.length > 0) {
            if (this.time <= 0) {
                this.killbox.innerHTML = this.queue[0].msg
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
        for(let i=0;i<this.gmsg.length;i++){
            this.gmsg[i].timer-=dt
            if(this.gmsg[i].timer<=0){
                this.gmsg[i].elem.remove()
                this.gmsg.splice(i,1)
                i--
            }
        }
    }

    override on_clear(): void {
        this.queue = []
        this.gmsg.length=0
        this.time = 0

        this.global_messages.innerHTML=""
        HideElement(this.killbox)
        HideElement(this.interaction)
    }

    override on_destroy(): void {}
}