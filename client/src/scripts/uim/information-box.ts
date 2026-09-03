import { HideElement, ShowElement, UIModule } from "common/engine/web.ts";
import { type Game } from "../others/game.ts";
import { FeedMessage, FeedMessageKill, FeedMessageType } from "common/scripts/packets/general_update.ts";

export class InformationBoxModule extends UIModule<Game> {
    container!: HTMLDivElement

    killbox!: HTMLDivElement
    interaction!: HTMLDivElement

    queue: {msg:string,player_id?:number}[] = []
    time = 0

    override on_init(): void {
        this.container = document.querySelector("#information-box-container") as HTMLDivElement
        this.killbox = document.querySelector("#information-killbox") as HTMLDivElement
        this.interaction = document.querySelector("#information-interaction") as HTMLDivElement

        HideElement(this.killbox)
        HideElement(this.interaction)
    }

    push(msg: string,player_id?:number) {
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

    override on_signal(signal: string, state: any): void {
        if(signal === "interaction_hint") {
            if (!state || state === "") {
                HideElement(this.interaction)
            } else {
                this.interaction.innerHTML = state
                ShowElement(this.interaction)
            }
        }else if(signal==="feed_message"){
            const msg=(state.obj as FeedMessage)
            if(msg.type===FeedMessageType.kill&&msg.killer?.id===this.game.active_entity_id){
                this.push(this.game.language.get("infobox.kill",{kills:(msg.killer?.kills??0).toString(),victim:this.game.ui.players_name[msg.victimId].name}),msg.victimId)
            }else if(msg.type===FeedMessageType.down&&msg.killer?.id===this.game.active_entity_id){
                this.push(this.game.language.get("infobox.knock",{kills:(msg.killer?.kills??0).toString(),victim:this.game.ui.players_name[msg.victimId].name}),msg.victimId)
            }
        }
    }

    override on_update(dt: number): void {
        if (this.queue.length > 0) {
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
    }

    override on_clear(): void {
        this.queue = []
        this.time = 0

        HideElement(this.killbox)
        HideElement(this.interaction)
    }

    override on_destroy(): void {}
}