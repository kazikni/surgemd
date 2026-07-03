import { ColorM, HideElement, ShowElement, UIModule } from "common/engine/client.ts"
import { Game } from "../others/game.ts"
import { Boosts, BoostType } from "common/scripts/definitions/player/boosts.ts";
import { GroupMemberState } from "common/scripts/packets/update_packet.ts";

type GroupElement = {
    container: HTMLDivElement
    health: HTMLDivElement
    boost: HTMLDivElement
    name: HTMLSpanElement
    color: HTMLDivElement
    downed:boolean
    boost_type:number
}

export class GroupMembersModule extends UIModule<Game>{
    container!: HTMLDivElement

    members = new Map<number, GroupElement>()

    override on_init(): void {
        this.container = document.querySelector("#groups-info") as HTMLDivElement
    }

    create_member(id:number,state:GroupMemberState){
        const el = document.createElement("div")
        el.className = "group-human"

        el.innerHTML = `
            <div class="group-info">
                <div class="member-color"></div>
                <span>${id}</span>
            </div>

            <div class="boost-bar-container">
                <div class="boost-bar-bg"></div>
                <div class="boost-bar"></div>
            </div>

            <div class="health-bar-container">
                <div class="health-bar-bg"></div>
                <div class="health-bar"></div>
            </div>
        `
        this.container.appendChild(el)
        const data: GroupElement = {
            container: el,
            name: el.querySelector("span")!,
            color: el.querySelector(".member-color")!,
            boost: el.querySelector(".boost-bar")!,
            health: el.querySelector(".health-bar")!,
            boost_type:-1,
            downed:false,
        }

        data.name.innerHTML=this.game.ui.players_name[id]?.full??"unknown"
        data.color.style.background=ColorM.number2hex(state.color)

        this.members.set(id,data)
        return data
    }
    update_members(){
        const alive = new Set<number>()
        for(const [idString,state] of Object.entries(this.game.ui.group_members)){
            const id = Number(idString)
            alive.add(id)
            let member = this.members.get(id)
            if(!member){
                member = this.create_member(id,state)
            }
            
            const mh=this.game.ui.map_humans.find((v)=>v.id===id)
            if(mh){
                if(mh.downed!==member.downed){
                    member.downed=mh.downed
                    member.health.style.background=mh.downed?"#e33":"#fff"
                }
            }
            member.health.style.width = `${state.health*100}%`
            member.boost.style.width = `${state.boost*100}%`
            if(member.boost_type!==state.boost_type){
                member.boost_type=state.boost_type
                member.boost.style.backgroundColor=Boosts[member.boost_type as BoostType].color
            }
        }

        for(const [id,member] of this.members){
            if(!alive.has(id)){
                member.container.remove()
                this.members.delete(id)
            }
        }

        if(alive.size > 0){
            ShowElement(this.container)
        }else{
            HideElement(this.container)
        }
    }

    override on_update(dt: number): void {}
    override on_signal(signal:string,data:any): void {
        if(signal==="update_group_members"){
            this.update_members()
        }
    }
    override on_clear(): void {
        for(const member of this.members.values()){
            member.container.remove()
        }
        this.members.clear()
    }

    override on_destroy(): void {}
}