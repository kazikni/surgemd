import { FinalScreenDef, FinalScreenLayer, FinalScreenLayerType } from "common/scripts/config/final_screen.ts";
import { HideElement, Numeric, ShowElement, sleep } from "common/engine/client.ts";
import { type Game } from "../others/game.ts";
import { PlayerStatus } from "common/scripts/others/constants.ts";
import { LeaderboardPlayer } from "common/scripts/packets/gameOver.ts";

interface FSLayer {
    def: FinalScreenLayer
    content: (HTMLImageElement|HTMLDivElement)[]
}

export class FinalScreenManager {
    root!: HTMLDivElement

    background!: HTMLDivElement
    foreground!: HTMLDivElement
    scoreContainer!: HTMLDivElement
    leaderboardContainer!: HTMLDivElement

    current?: FinalScreenDef;

    time = 0;
    enabled = false;

    layers: FSLayer[] = [];

    constructor(public game: Game) {
        this.create_html();
    }

    private create_html() {
        this.root = document.createElement("div");
        this.root.id = "final-screen";

        this.root.innerHTML = `
            <div class="final-background"></div>
            <div class="final-score"></div>
            <div class="final-leaderboard"></div>
            <div class="final-foreground"></div>
        `;

        document.body.appendChild(this.root);

        this.background = this.root.querySelector(".final-background")!
        this.scoreContainer = this.root.querySelector(".final-score")!
        this.leaderboardContainer = this.root.querySelector(".final-leaderboard")!
        this.foreground = this.root.querySelector(".final-foreground")!

        this.root.style.opacity = "0"
        this.scoreContainer.style.opacity = "0"
        this.leaderboardContainer.style.opacity = "0"

        HideElement(this.root, true)
    }
    set_final_screen(def: FinalScreenDef) {
        this.current = def;
        this.time = 0;

        this.background.innerHTML = ""
        this.foreground.innerHTML = ""
    
        this.layers.length = 0
        if (def.theme.accent) {
            this.root.style.setProperty("--fs-accent", def.theme.accent)
        }
        this.root.style.cssText=`
            opacity: 0;
            ${def.theme.accent===undefined?"":"--fs-accent: "+def.theme.accent+";"}
            ${def.theme.css??""}
        `
        if (def.theme.class_name) {
            this.root.className = def.theme.class_name;
        }
        for (const layer of def.background??[]) {
            this.create_layer(this.background, layer);
        }
        for (const layer of def.foreground??[]) {
            this.create_layer(this.foreground, layer);
        }
    }

    private create_layer(parent: HTMLDivElement, layer: FinalScreenLayer): FSLayer {
        const fsLayer: FSLayer = {
            def: layer,
            content: []
        }
        
        switch(layer.type){
            case FinalScreenLayerType.Static:{
                const img = new Image()
                img.src = layer.image
                img.draggable = false
                img.className = `final-screen-layer-image ${layer.class_name ?? ""}`
                if (layer.css) {
                    img.style.cssText = layer.css
                }
                parent.appendChild(img)
                fsLayer.content.push(img)
                break
            }
            case FinalScreenLayerType.Walk:{
                const count=(layer.count ?? 1)
                const gap=layer.gap ?? 0
                for (let i = 0; i < count; i++) {
                    const img = new Image()
                    img.src = layer.image
                    img.draggable = false
                    img.className = `final-screen-layer-image ${layer.class_name ?? ""}`
                    if (layer.css) {
                        img.style.cssText = layer.css
                    }
                    parent.appendChild(img)

                    const dir=layer.inverted?1:-1
                    img.style.left=(layer.begin_x??this.root.clientWidth)+(i*gap*dir)+"px";
                    fsLayer.content.push(img)
                }
                break
            }
            case FinalScreenLayerType.Tile:{
                const tile=document.createElement("div")
                tile.className=`final-screen-layer-tile ${layer.class_name??""}`
                tile.style.cssText=`
                    position:absolute;
                    left:0;
                    width:100%;
                    background-image:url("${layer.image}");
                    background-repeat:repeat-x;
                    background-position-x:0px;
                    background-size:auto 100%;
                    ${layer.css??""}
                `
                parent.appendChild(tile)
                fsLayer.content.push(tile)
                break
            }
        }
        this.layers.push(fsLayer)
        return fsLayer
    }
    async show_final_screen() {
        if (!this.current) return;
        this.game.ambient.music.stop()
        if (this.current.theme.music) {
            this.game.resources.unload_sound("gameplay_music")
            this.game.ambient.music.set(
                await this.game.resources.load_sound("gameplay_music", {
                    src: this.current.theme.music,
                    volume: 1
                })
            );
        }
        ShowElement(this.root, true)
        this.root.style.opacity="0"
        await sleep(0.01)
        this.enabled = true
        this.time = 0
    }
    async hide_final_screen() {
        await sleep(1)
        this.game.ambient.music.stop()
        HideElement(this.root)
        this.scoreContainer.innerHTML = ""
        this.leaderboardContainer.innerHTML = ""
        this.enabled = false
    }
    update(dt: number) {
        if (!this.enabled || !this.current) {
            return;
        }
        this.time += dt
        const root_width = this.root.clientWidth
        for (const layer of this.layers) {
            switch(layer.def.type){
                case FinalScreenLayerType.Static:
                    break
                case FinalScreenLayerType.Walk:{
                    const screen_width=root_width+(layer.def.gap??0)
                    const speed = (layer.def.speed ?? 0)*dt*1000
                    if (!speed) {
                        continue
                    }
                    for (let c=0;c<layer.content.length;c++) {
                        const content=layer.content[c]
                        let x = parseFloat(content.style.left.replace("px",""))
                        const dir=layer.def.inverted?-1:1
                        x+=speed*dir
                        let c_width=content.clientWidth
                        if(content instanceof HTMLImageElement){
                            c_width=content.naturalWidth||content.width|512
                        }
                        if (layer.def.inverted) {
                            if (x<-c_width) {
                                x=root_width+c_width;
                            }
                        } else {
                            if (x>screen_width) {
                                x=-c_width
                            }
                        }
                        content.style.left=`${x}px`;
                    }
                    break
                }
                case FinalScreenLayerType.Tile:{
                    const speed=(layer.def.speed??0)*this.time*1000
                    for(const tile of layer.content){
                        const dir=layer.def.inverted?1:-1
                        tile.style.backgroundPositionX=`${speed*dir}px`
                    }
                    break
                }
            }
            if (layer.def.type !== FinalScreenLayerType.Walk&&layer.def.type !== FinalScreenLayerType.Tile) {
                continue
            }
        }
    }
    async show_status(status: PlayerStatus): Promise<void> {
        this.scoreContainer.innerHTML = ""
        this.scoreContainer.style.opacity = "1"
        const scoreFloat = document.createElement("div")
        scoreFloat.className = "score-float"
        const scoreAp = document.createElement("div")
        scoreAp.className = "score-ap"

        this.scoreContainer.appendChild(scoreFloat)
        this.scoreContainer.appendChild(scoreAp)

        const scoreList: HTMLSpanElement[] = []
        let score = 0

        for (const applier of status.score_applyer) {
            await sleep(0.22)
            if (scoreList.length > 0) {
                scoreList[scoreList.length - 1].classList.remove("last");
            }
            if (scoreList.length > 12) {
                const old = scoreList.shift()
                if (old) {
                    old.classList.add("last");
                    setTimeout(() => old.remove(), 200);
                }
            }
            const row = document.createElement("span")
            row.className = "score-row last"
            row.innerHTML = `${this.game.language.get("score_applier."+applier.type)}: `+`${Math.floor(applier.amount)}`+(applier.multiplier !== 1 && applier.amount > 0? ` * ${Numeric.maxDecimals(applier.multiplier, 2)}`:"")
            scoreAp.appendChild(row)
            score += applier.amount * applier.multiplier
            scoreFloat.innerText = Math.floor(score).toString()
            scoreList.push(row)
        }
        if (scoreList.length > 0) {
            scoreList[scoreList.length - 1].classList.remove("last")
        }
        await sleep(0.5)
        scoreFloat.innerText = `${status.score}`
        await this.game.input_manager.wait_for_action("next")
        this.scoreContainer.style.opacity = "0"
        await sleep(0.2)
        this.scoreContainer.innerHTML = "";
    }

    async show_leaderboards(players: LeaderboardPlayer[]) {
        this.leaderboardContainer.innerHTML = ""
        this.leaderboardContainer.style.opacity = "1"
        const leaderboardPlayers = document.createElement("div")
        leaderboardPlayers.className = "leaderboards-players"
        this.leaderboardContainer.appendChild(leaderboardPlayers)
        players.sort((a, b) => b.rank-a.rank)
        const header = document.createElement("div");
        header.className = "leaderboard-row leaderboard-header";
        header.innerHTML = `
            <span class="place">Rank</span>
            <span class="name">Name</span>
            <span class="status">Kills</span>
            <span class="status">Score</span>
        `
        this.leaderboardContainer.prepend(header)
        const rows: HTMLDivElement[] = []
        for (const player of players) {
            if (rows.length > 0) {
                rows[rows.length - 1].classList.remove("current");
            }

            const row = document.createElement("div");

            row.className =
                "leaderboard-row hidden" +
                (player.rank <= 1 ? " winner" : "");

            row.innerHTML = `
                <span class="place">#${player.rank}</span>
                <span class="name">${this.game.ui.players_name[player.id]?.full ?? "Unknown"}</span>
                <span class="status">${player.kills}</span>
                <span class="status">${player.score}</span>
            `;

            leaderboardPlayers.appendChild(row);

            rows.push(row);

            row.classList.remove("hidden");
            row.classList.add("current");

            await sleep(0.03);
        }

        if (rows.length > 0) {
            rows[rows.length - 1].classList.remove("current");
        }

        await this.game.input_manager.wait_for_action("next");

        this.leaderboardContainer.style.opacity = "0";

        await sleep(0.2);

        this.leaderboardContainer.innerHTML = "";
    }
}