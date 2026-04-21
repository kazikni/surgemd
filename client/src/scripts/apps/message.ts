import { GameApp } from "../managers/deviceManager.ts";

type MessageData = {
    from:string
    text:string
    sent?:boolean
}

export class MessageApp extends GameApp {
    messages:MessageData[]=[]

    contacts_panel!:HTMLDivElement
    chat_messages!:HTMLDivElement

    input!:HTMLInputElement
    send_btn!:HTMLButtonElement
    constructor(){
        super({
            name:"Chitchat",
            icon:"/img/menu/icons/chat.svg"
        })
    }
    on_init(){
        this.element.className="message-app"

        this.element.innerHTML=`
<div class="contacts-panel">
    <div class="contact">
        <div class="avatar">R</div>
        <div class="contact-info">
            <div class="contact-name">Radio</div>
            <div class="contact-last">System channel</div>
        </div>
        <div class="contact-time">Now</div>
    </div>
</div>
<div class="chat-panel">
    <div class="chat-header">Radio</div>
    <div class="chat-messages"></div>
    <div class="chat-input">
        <input type="text" placeholder="Type message...">
        <button>></button>
    </div>
</div>
`
        this.chat_messages=this.element.querySelector(".chat-messages") as HTMLDivElement

        this.input=this.element.querySelector("input") as HTMLInputElement

        this.send_btn=
            this.element.querySelector(
                "button"
            ) as HTMLButtonElement

        this.send_btn.onclick=()=>{

            if(!this.input.value.trim()) return

            this.add_message({
                from:"You",
                text:this.input.value,
                sent:true
            })

            this.input.value=""
        }
    }

    on_open(){
    }
    on_close(){
    }

    on_clear(){
        this.messages=[]
        this.chat_messages.innerHTML=""
    }

    on_event(type:string,data:any){
        switch(type){
            case "chat_message":
                this.add_message({
                    from:data.from,
                    text:data.text,
                    sent:false
                })
                break
            case "radio_message":
                this.add_message({
                    from:"Radio",
                    text:data.text,
                    sent:false
                })
                break
        }
    }
    on_tick(_dt:number){

    }
    add_message(msg:MessageData){
        this.messages.push(msg)
        const div=document.createElement("div")
        div.className=msg.sent?"msg sent":"msg received"
        div.innerHTML=msg.text
        this.chat_messages.appendChild(div)
        this.chat_messages.scrollTop=this.chat_messages.scrollHeight
    }
}