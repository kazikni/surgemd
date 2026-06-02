import { FinalScreenDef, FinalScreenLayer } from "common/scripts/config/final_screen.ts"
import { HideElement,Numeric,ShowElement, sleep } from "common/engine/client.ts"
import { type Game } from "../others/game.ts";
import { PlayerStatus } from "common/scripts/others/constants.ts";
import { LeaderboardPlayer } from "common/scripts/packets/gameOver.ts";

interface FSLayer{
    def:FinalScreenLayer
    content:{
        el:HTMLImageElement
        x:number
    }[]
}
export class FinalScreenManager{
    root!:HTMLDivElement

    viewport!:HTMLDivElement

    background!:HTMLDivElement
    effects!:HTMLDivElement
    foreground!:HTMLDivElement

    scoreContainer!:HTMLDivElement
    leaderboardContainer!:HTMLDivElement

    current?:FinalScreenDef

    time=0
    enabled:boolean=false

    layers:FSLayer[]=[]

    constructor(public game:Game){
        this.create_html()
    }
    private create_html(){
        this.root=document.createElement("div")
        this.root.id="final-screen"
        this.root.innerHTML=`
            <div class="final-background"></div>
            <div class="final-effects"></div>
            <div class="final-title"></div>
            <div class="final-score"></div>
            <div class="final-leaderboard"></div>
            <div class="final-foreground"></div>
        `
        document.body.appendChild(this.root)
        this.background=this.root.querySelector(".final-background")!
        this.effects=this.root.querySelector(".final-effects")!
        this.scoreContainer=this.root.querySelector(".final-score")!
        this.leaderboardContainer=this.root.querySelector(".final-leaderboard")!
        this.foreground=this.root.querySelector(".final-foreground")!
        HideElement(this.root,true)
    }
    
    set_final_screen(def:FinalScreenDef){
        this.current=def
        this.time=0
        this.background.innerHTML=""
        this.effects.innerHTML=""
        this.foreground.innerHTML=""
        this.layers.length=0
        this.root.style.opacity="0"
        this.root.style.background=def.theme.background
        this.root.style.color=def.theme.text
        this.root.style.setProperty("--fs-accent",def.theme.accent)

        for(const layer of def.background){
            this.create_layer(this.background,layer)
        }
        for(const layer of def.foreground){
            this.create_layer(this.background,layer)
        }
        /*
        for(const effect of def.effects){
            this.create_effect(effect)
        }*/
    }

    create_layer(el:HTMLDivElement,layer:FinalScreenLayer){
        const la:FSLayer={
            def:layer,
            content:[],
        }
        const count=layer.count??1
        for(let c=0;c<count;c++){
            const img=new Image()
            img.className="final-screen-layer-image"
            img.style.top=layer.y+"px"
            img.draggable=false
            if(layer.x){
                img.style.left=layer.x;
            }
            if(layer.transform){
                img.style.transform=layer.transform
            }
            img.src=layer.image
            el.appendChild(img)
            const gap=(c*(layer.gap??5))
            la.content.push({
                el:img,
                x:this.root.clientWidth+100+gap
            })
        }
        this.layers.push(la)
        return la
    }

    async show_final_screen(){
        if(!this.current)return
        this.game.ambient.music.stop()
        if(this.current.theme.music){
            this.game.resources.unload_sound("gameplay_music")
            this.game.ambient.music.set(await this.game.resources.load_sound("gameplay_music",{
                src:this.current.theme.music,
                volume:1
            }))
        }
        this.root.style.opacity="1"
        await sleep(1)
        this.enabled=true
        this.time=0
        ShowElement(this.root,true)
    }
    async hide_final_screen(){
        this.root.style.opacity="0"
        await sleep(1)
        this.game.ambient.music.stop()
        HideElement(this.root)
        this.scoreContainer.innerHTML=""
        this.leaderboardContainer.innerHTML=""
        this.enabled=false
    }
    update(dt:number){
        if(!this.current&&this.enabled)return
        const time=dt*1000
        for(const layer of this.layers){
            const speed=(layer.def.speed===undefined?0:layer.def.speed)*time
            if(speed){
                for(const img of layer.content){
                    img.x-=speed
                    if(img.x<=-img.el.width){
                        img.x=this.root.clientWidth+(img.el.width)+100
                    }
                    img.el.style.left=`${img.x}px`
                }
            }
        }
    }
    async show_status(status:PlayerStatus):Promise<void>{
        this.scoreContainer.innerHTML=""
        this.scoreContainer.style.opacity="1"
        const score_float=document.createElement("div")
        score_float.className="score-float"
        const score_ap=document.createElement("div")
        score_ap.className="score-ap"
        this.scoreContainer.appendChild(score_float)
        this.scoreContainer.appendChild(score_ap)

        const score_list:HTMLSpanElement[]=[]
        let score=0
        for(const applier of status.score_applyer){
            await sleep(0.2)
            if(score_list.length>0){
                score_list[score_list.length-1].classList.remove("last")
            }
            if(score_list.length>12){
                const v=score_list.shift()
                if(v){
                    v.classList.add('last')
                    setTimeout(()=>v.remove(),200)
                }
            }

            const row=document.createElement("span")
            row.className="score-row last"
            row.innerHTML=`${this.game.language.get("score_applier."+applier.type)}: ${Math.floor(applier.amount)}${applier.multiplier!==1&&applier.amount>0?(" * "+Numeric.maxDecimals(applier.multiplier,2)):""}`
            score_ap.appendChild(row)
            score+=applier.amount*applier.multiplier
            score_float.innerText=Math.floor(score).toString()
            score_list.push(row)
        }
        score_list[score_list.length-1].classList.remove("last")
        await sleep(0.5)
        score_float.innerText=`${status.score}`
        await this.game.input_manager.wait_for_action("next")
        this.scoreContainer.style.opacity="0"
        await sleep(0.2)
        this.scoreContainer.innerHTML=""
    }
    async show_leaderboards(players:LeaderboardPlayer[]) {
        players.sort((a,b)=>b.id-b.id||a.rank-b.rank)
        this.leaderboardContainer.innerHTML=""
        this.leaderboardContainer.style.opacity="1"
        const leaderboard_players=document.createElement("div")
        this.leaderboardContainer.appendChild(leaderboard_players)
        
        const row=document.createElement("div")
        row.className="leaderboard-row leaderboard-header"
        row.innerHTML=`
            <span class="place">Rank</span>
            <span class="name">Name</span>
            <span class="status">Kills</span>
            <span class="status">Score</span>
        `
        this.leaderboardContainer.prepend(row)

        const rows:HTMLDivElement[]=[]
        for(let i=players.length-1;i>=0;i--){
            if(rows.length>0){
                rows[rows.length-1].classList.remove("current")
            }
            const row=document.createElement("div")
            row.className="leaderboard-row hidden"+(players[i].rank<=1?" winner":"")
            row.innerHTML=`
                <span class="place">#${players[i].rank}</span>
                <span class="name">${this.game.ui.players_name[players[i].id]?.full??"Unknown"}</span>
                <span class="status">${players[i].kills}</span>
                <span class="status">${players[i].score}</span>
            `
            leaderboard_players.prepend(row)
            rows.push(row)
            row.classList.remove("hidden")
            row.classList.add("current")
            await sleep(0.03)
        }
        if(rows.length>0){
            rows[rows.length-1].classList.remove("current")
        }
        await this.game.input_manager.wait_for_action("next")
        this.leaderboardContainer.style.opacity="0"
        await sleep(0.2)
        this.leaderboardContainer.innerHTML=""
    }
}