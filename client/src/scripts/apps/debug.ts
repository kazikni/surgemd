import { InputActionType } from "common/scripts/packets/input_packet.ts";
import { GameApp } from "../managers/deviceManager.ts";
export class DebugApp extends GameApp {
    stats!:HTMLDivElement
    idInput!:HTMLInputElement
    countInput!:HTMLInputElement
    resultsBox!:HTMLDivElement
    filtered:string[]=[]
    selectedIndex=-1

    constructor(){
        super({
            name:"Debug",
            icon:"/assets/img/menu/gui/tab/icons/debug.svg"
        })
    }

    on_init(){
        this.element.className="debug-app"
        this.element.innerHTML=`
<div class="debug-container">
    <h2>Debug Tools</h2>
    <div class="debug-section search-section">
        <label>Item ID</label>
        <input class="text-input" id="debug-item-id" placeholder="Search item...">
        <div class="search-results"></div>
    </div>
    <div class="debug-section">
        <label>Item Count</label>
        <input class="text-input" id="debug-item-count" value="1" type="number">
    </div>
    <div class="debug-actions">
        <button id="debug-give-item" class="btn-blue">Give Item</button>
        <button id="debug-spawn-item" class="btn-blue">Spawn Item</button>
    </div>
    <div class="debug-info">
        <div id="debug-stats"></div>
    </div>
</div>
`

        this.idInput=this.element.querySelector("#debug-item-id") as HTMLInputElement
        this.countInput=this.element.querySelector("#debug-item-count") as HTMLInputElement
        this.resultsBox=this.element.querySelector(".search-results") as HTMLDivElement
        this.stats=this.element.querySelector("#debug-stats") as HTMLDivElement
        const giveBtn=this.element.querySelector("#debug-give-item") as HTMLButtonElement
        const spawnBtn=this.element.querySelector("#debug-spawn-item") as HTMLButtonElement
        const allItems=Object.keys(
            this.device.game.definitions
            .game_items
            .keysString
        )

        this.idInput.addEventListener("input",()=>{
                const v=this.idInput.value.toLowerCase()

                if(!v){
                    this.filtered=[]
                    this.renderResults()
                    return
                }

                const starts=allItems.filter(x=>x.startsWith(v))
                const contains=allItems.filter(x=>x.includes(v)&&!x.startsWith(v))

                this.filtered=[...starts,...contains]
                this.selectedIndex=-1

                this.renderResults()
            }
        )

        this.idInput.addEventListener(
            "keydown",
            (e)=>{
                if(!this.filtered.length)return

                if(e.key==="ArrowDown"){
                    this.selectedIndex=(this.selectedIndex+1)%this.filtered.length
                    this.renderResults()
                    e.preventDefault()
                }
                if(e.key==="ArrowUp"){
                    this.selectedIndex=(this.selectedIndex-1+this.filtered.length)%this.filtered.length
                    this.renderResults()
                    e.preventDefault()
                }
                if(e.key==="Enter"&&this.selectedIndex>=0){
                    this.idInput.value=this.filtered[this.selectedIndex]
                    this.resultsBox.style.display="none"
                }
            }
        )

        this.idInput.onfocus=()=>{
            this.device.game.can_act=false
        }

        this.idInput.onblur=()=>{
            setTimeout(()=>{
                    this.resultsBox.style.display="none"
            },100)
            this.device.game.can_act=true
        }

        giveBtn.onclick=()=>{
            this.device.game.input.actions.push({
                type:InputActionType.debug_give,
                item:this.idInput.value,
                count:parseInt(this.countInput.value)||1
            })
        }

        spawnBtn.onclick=()=>{
            this.device.game.input.actions.push({
                type:InputActionType.debug_spawn,
                item:this.idInput.value,
                count:parseInt(
                    this.countInput.value
                )||1
            })

        }
    }

    renderResults(){
        this.resultsBox.innerHTML=""
        if(!this.filtered.length){
            this.resultsBox.style.display="none"
            return
        }
        this.resultsBox.style.display="block"
        this.filtered.slice(0,20).forEach((item,i)=>{
            const div=document.createElement("div")

            div.className="search-item"+(i===this.selectedIndex?" active":"")
            div.innerText=item
            div.onclick=()=>{
                this.idInput.value=item
                this.resultsBox.style.display="none"
            }

            this.resultsBox.appendChild(div)

        })
    }

    on_open(){}
    on_close(){}
    on_clear(){}
    on_event(_type:string,_data:any){}

    on_tick(_dt:number){
        if(!this.stats)return

        this.stats.innerHTML=`
FPS:${Math.floor(1/this.device.game.delta_time)}<br>
Ping:
${this.device.game.client?.ping??0}<br>
X:${this.device.game.active_entity?.position.x}<br>
Y:${this.device.game.active_entity?.position.y}<br>`
    }
}