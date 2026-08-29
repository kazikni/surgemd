import { api, API_BASE, api_server, socials } from "../others/config.ts";
import { ApiSettings, FindGameResult } from "common/scripts/config/config.ts";
import { AccountManager } from "./accountManager.ts";
import { PlayArgs } from "../others/constants.ts";  
import { AudioEngine, Camera2D, GameSave, HideElement,InputManager, ResourcesManager, ShowElement, ShowTab, Sound, SoundController } from "common/engine/web.ts";
import { CModsManager } from "./modsManager.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";
import { GamePopupCTX, MenuInitDefault, MenuTab, MenuTabDef, SubMenuOption } from "../defs/menu.ts";
import { OnlineMessageCharacter } from "common/scripts/packets/messages.ts";
import { FileManager, random, TranslationManager } from "common/engine/core.ts";
import { CutsceneManager } from "common/engine/web/misc/cutscene.ts";
import { backgrounds, default_cutscene_theme } from "common/scripts/config/background_effect.ts";
import { BackgroundManager } from "common/engine/web/misc/background.ts";
export type PopupFunction=(ctx:GamePopupCTX)=>void

export class MenuManager{
    api_settings?:ApiSettings
    account:AccountManager
    tabs:Record<string,MenuTab>={}
    tabs_html:Record<string,HTMLDivElement>={}
    current_tab?:string
    cam2d!:Camera2D
    content={
        menuD:document.querySelector("#menu") as HTMLDivElement,
        gameD:document.querySelector("#game") as HTMLDivElement,
        gameCanvas:document.querySelector("#game-canvas") as HTMLDivElement,

        menu_options:document.body.querySelector("#menu-options") as HTMLDivElement,
        menu_content:document.body.querySelector("#menu-content") as HTMLDivElement,

        initial_screen:document.body.querySelector("#initial-screen") as HTMLDivElement,

        loading_screen:document.body.querySelector("#loading-screen") as HTMLDivElement,
        loading_screen_current:document.body.querySelector("#loading-current") as HTMLDivElement,
        loading_screen_logo:document.body.querySelector("#loading-screen-logo") as HTMLDivElement,

        loading_minigame:document.body.querySelector("#loading-minigame") as HTMLDivElement,
        loading_target:document.querySelector("#loading-target") as HTMLDivElement,
        loading_score:document.querySelector("#loading-score") as HTMLDivElement,
        
        gameover_text_screen:document.body.querySelector("#text-gameover-container") as HTMLDivElement,
        gameover_text_current:document.body.querySelector("#text-gameover") as HTMLSpanElement,

        select_region:document.body.querySelector("#select-region") as HTMLButtonElement,
        
        history_overlay:document.body.querySelector("#history-overlay") as HTMLDivElement,
        history_container:document.body.querySelector("#history-container") as HTMLDivElement,
        history_frame:document.body.querySelector("#history-frame") as HTMLImageElement,
        history_dialog_text:document.body.querySelector("#history-dialog-text") as HTMLDivElement,
        history_dialog_indicator:document.body.querySelector("#history-dialog-indicator") as HTMLDivElement,
        history_content:document.body.querySelector("#history-content") as HTMLDivElement,

        main_social:document.body.querySelector("#main-social") as HTMLDivElement,
        content_creators:document.querySelector("#featured-content-creators") as HTMLDivElement,
        //team_options_div:document.body.querySelector("#menu-play-teams") as HTMLSelectElement,

        menu_background_night:document.querySelector(".night-background") as HTMLDivElement,
        menu_background_day:document.querySelector(".day-background") as HTMLDivElement,
    }

    save!:GameSave
    resources!:ResourcesManager
    translation!:TranslationManager
    sounds!:AudioEngine
    submenu_param:boolean
    input!:InputManager

    background:BackgroundManager

    definitions:GameDefinition

    play_callback?:(play_args:PlayArgs)=>void
    play_callback_hard?:(play:FindGameResult)=>void

    cutscene!:CutsceneManager

    params:URLSearchParams

    menu_time_state=0
    menu_time_timer:number=0
    menu_time_delay:number=30

    loading={
        enabled:true,
        screens:[] as [string,string,Blob][],
        game:{
            enabled:false,
            clicks:0,
            score:0,
            target_x:0,
            target_y:0,
        }
    }

    constructor(definitions:GameDefinition){
        this.params = new URLSearchParams(self.location.search)

        this.account=new AccountManager(definitions)
        this.definitions=definitions

        this.submenu_param=!!this.params

        this.set_loading_current=this.set_loading_current.bind(this)

        this.content.main_social.innerHTML=`
<a href="${socials.discord}" target="_blank" class="social-link">
    <i class="social-icon discord"></i>
</a>
<a href="${socials.youtube}" target="_blank" class="social-link">
    <i class="social-icon youtube"></i>
</a>
<a href="${socials.github}" target="_blank" class="social-link">
    <i class="social-icon github"></i>
</a>
`
        this.update_content_creators([
            random.choose([
                {name:"Kazikni",url:"https://youtube.com/@kazikni"},
                {name:"Namerio",url:"https://youtube.com/@namerio1"},
            ]),
        ])


        this.content.loading_screen_logo.onclick=()=>{
            this.enable_loading_game()
        }
        this.content.loading_target.onclick=()=>{
            this.loading.game.score++
            this.content.loading_score.innerText = this.loading.game.score.toString()
            this.spawn_target()
        }

        this.background=new BackgroundManager()
        this.background.initialize(this.content.menuD.querySelector("#menu-background") as HTMLDivElement)
    }
    intro_fineshed:boolean=false
    start_intro(): Promise<void> {
        return new Promise<void>((resolve) => {
            const finish=()=>{
                this.intro_fineshed=true
                HideElement(screen, true)
                screen.remove()
                const invite = this.params.get("group-id")
                if (invite) {
                    this.join_group(invite)
                    this.load_tab("play")
                    const playTab = this.tabs["play"]
                    if (playTab) {
                        const groupOption = playTab.def.options.find(
                            o => o.type === "button" && o.subtab === "group"
                        )
                        if (groupOption) {
                            this.opt_click_callback(groupOption, playTab)(new MouseEvent("click"))
                        }
                    }
                }
                resolve()
            }
            if(this.intro_fineshed){
                resolve()
                return
            }
            const screen = this.content.initial_screen
            const video = document.getElementById("intro-video") as HTMLVideoElement

            if(!this.save.get_variable("sv_ui_show_intro")){
                screen.style.opacity = "0"
                finish()
                return
            }
            ShowElement(screen)

            screen.style.opacity = "0"
            screen.offsetHeight
            screen.style.opacity = "1"

            const start = () => {
                video.currentTime = 0
                video.play().catch(() => {
                    this.intro_fineshed=true
                    console.warn("Video play blocked")
                    resolve()
                })
            }

            if (video.readyState >= 4) {
                start()
            } else {
                video.addEventListener("canplaythrough", start, { once: true })
            }

            video.addEventListener("ended",() => {
                screen.style.opacity = "0"
                setTimeout(() => {
                    finish()
                },1000)
            })
        })
    }
    reload_tabs(tabs:(MenuTabDef|undefined)[]){
        this.content.menu_options.innerHTML='<img id="title-section" src="/assets/img/menu/logos/title.svg" draggable="false"></img>'
        this.content.menu_content.innerHTML=""
        this.tabs={}
        this.tabs_html={}
        for(const t of tabs){
            if(!t)continue
            const btn=document.createElement("button") as HTMLButtonElement
            btn.className="btn-blue menu-options-btn"
            btn.id=`${t.id}-menu-option`
            btn.innerText=this.translation.get(t.name)
            this.content.menu_options.appendChild(btn)

            btn.addEventListener("click",this.load_tab.bind(this,t.id))

            const tab:MenuTab={
                btn:btn,
                def:t,
                option:[],
                tabs:{},
                current_tab:""
            }

            const tab_main=document.createElement("kl-md-submenu") as HTMLDivElement
            tab_main.id=`menu-${t.id}-submenu`
            tab_main.className="md-menu-game"
            tab_main.style="display: none; user-select: none;"
            const options=document.createElement("kl-md-submenu-options") as HTMLDivElement
            const content=document.createElement("kl-md-submenu-content") as HTMLDivElement

            const close_btn=document.createElement("button") as HTMLButtonElement
            close_btn.className="close-btn submenu-close-btn btn-red"
            close_btn.textContent="X"
            close_btn.onclick=this.load_tab.bind(this,"")

            const tab_title=document.createElement("span") as HTMLButtonElement
            tab_title.className="tab-title span-text-base"
            tab_title.textContent=btn.innerText

            tab_main.appendChild(options)
            tab_main.appendChild(content)
            tab_main.appendChild(close_btn)
            tab_main.appendChild(tab_title)
            this.content.menu_content.appendChild(tab_main)

            for(const st of Object.keys(t.subtabs)){
                const extra=document.createElement("kl-md-extra") as HTMLDivElement
                extra.className="background-menu-md menu-panel-blue"
                extra.id=`${t.id}-${st}-sm-extra`

                t.subtabs[st].generate(extra,this)
                tab.tabs[st]=extra

                content.appendChild(extra)
            }

            for(const o of t.options){
                switch(o.type){
                    case "button":{
                        const btn=document.createElement("button")
                        btn.innerText=this.translation.get(o.name)
                        btn.id=`btn-${t.id}-${o.id}`
                        btn.className="btn-blue"
                        btn.onclick=this.opt_click_callback(o,tab)

                        options.appendChild(btn)
                        tab.option.push(btn)
                        break
                    }
                    case "label":{
                        const p=document.createElement("p")
                        p.className="span-text-base"
                        p.innerText=this.translation.get(o.name)
                        options.appendChild(p)
                        break
                    }
                }
            }
            const dk=Object.keys(t.subtabs)[0]
            tab.current_tab=dk
            ShowTab(dk,tab.tabs)
            if(t.subtabs[dk].on_open)t.subtabs[dk].on_open(tab.tabs[dk] as HTMLDivElement,this)
            this.tabs[t.id]=tab
            this.tabs_html[t.id]=tab_main
        }
    }
    opt_click_callback(o:SubMenuOption,tab:MenuTab):(e:MouseEvent)=>void{
        return (e)=>{
            if(o.type==="button"){
                if(o.subtab){
                    const ot=tab.def.subtabs[tab.current_tab]
                    if(ot.on_close)ot.on_close(tab.tabs[o.subtab] as HTMLDivElement,this)
                    const t=tab.def.subtabs[o.subtab]
                    if(t.on_open)t.on_open(tab.tabs[o.subtab] as HTMLDivElement,this)
                    tab.current_tab=o.subtab!
                    ShowTab(o.subtab,tab.tabs)
                }
                if(o.onclick)o.onclick(e)
            }
        }
    }
    load_tab(tab:string){
        if(this.current_tab){
            if(this.tabs[this.current_tab].def.on_close)this.tabs[this.current_tab].def.on_close!(this)
        }
        this.current_tab=tab
        ShowTab(tab,this.tabs_html,true)
        if(this.current_tab){
            if(this.tabs[this.current_tab].def.on_open)this.tabs[this.current_tab].def.on_open!(this)
        }
        if(tab){
            this.content.menu_options.style.opacity="0"
            this.content.menu_options.style.pointerEvents="none"
        }else{
            this.content.menu_options.style.opacity="1"
            this.content.menu_options.style.pointerEvents=""
        }
    }
    async init(input:InputManager,save:GameSave,fs:FileManager,resources:ResourcesManager,sounds:AudioEngine,cam2d:Camera2D,definitions:GameDefinition,transition:TranslationManager,mods?:CModsManager,music?:SoundController,ambient?:SoundController){
        this.save=save
        this.resources=resources
        this.sounds=sounds
        this.translation=transition
        this.input=input
        this.cam2d=cam2d
        this.cam2d.visible=false
        this.start_intro()

        await this.update_api()

        this.game_end()
        ShowElement(this.content.menu_options,true)
        if(this.interval===undefined){
            this.interval=setInterval(this.update.bind(this),1000)
        }
        this.cutscene=new CutsceneManager(resources,sounds,input,transition)
        this.cutscene.initialize(this.content.history_overlay)
        this.cutscene.default_theme=default_cutscene_theme
        this.cutscene.controllers={
            music:music!,
            ambience:ambient!
        }
    }
    async reload(definitions:GameDefinition,fs:FileManager,mods?:CModsManager){
        await MenuInitDefault(this,definitions,fs,this.translation,this.resources,mods)
    }
    async update_api(){
        if(api){
            let js=this.api_settings
            try{
                js=await(await fetch(`${API_BASE}/get-settings`)).json()
            }catch(e){
                console.log(e)
                js=undefined
            }
            this.api_settings=js
        }

        if(this.api_settings?.database.enabled){
            this.account.enable(this)
        }
    }
    team_ws?:WebSocket
    group_state?:{
        code:string
        leader:number
        self:number
        locked:boolean
        autofill:boolean
    }
    manage_team_message(ev:MessageEvent){
        const msg = JSON.parse(ev.data)
        switch(msg.type){
            case "snapshot":
                this.group_state = {
                    code:msg.code,
                    leader:msg.leader,
                    self:msg.self,
                    locked:msg.locked,
                    autofill:msg.autofill
                }
                this.reload_group_ui()
                break
            case "lock_changed":
                if(this.group_state){
                    this.group_state.locked=msg.locked
                }
                this.reload_group_ui()
                break
            case "autofill_changed":
                if(this.group_state){
                    this.group_state.autofill=msg.autofill
                }
                this.reload_group_ui()
                break
            case "start_game":{
                if(this.play_callback_hard)this.play_callback_hard({
                    ...msg,
                })
                break
            }
            case "kicked":
                this.leave_group()
                break
            case "play_failed":
                this.hide_loading_screen()
                alert(msg.reason)
                break
        }
    }
    create_group():WebSocket|undefined{
        if(api){
            const ws:WebSocket=new WebSocket(`${api_server.toString("ws")}/group/create`)
            ws.addEventListener("message",this.manage_team_message.bind(this))
            ws.addEventListener("close",this.leave_group.bind(this))
            this.team_ws=ws
            return ws
        }
    }
    join_group(code:string){
        if(!api)return
        const ws=new WebSocket(`${api_server.toString("ws")}/group/join/?code=${code}`)
        ws.addEventListener("message",this.manage_team_message.bind(this))
        ws.addEventListener("close",this.leave_group.bind(this))
        this.team_ws=ws
    }
    reload_group_ui(){
        const tab=this.tabs["play"]
        if(!tab) return
        const panel=tab.tabs["group"] as HTMLDivElement
        if(!panel) return
        tab.def.subtabs["group"].generate(
            panel,
            this
        )
    }
    leave_group(){
        this.group_state=undefined
        if(this.team_ws){
            this.team_ws.close()
            this.team_ws=undefined
        }
        this.reload_group_ui()
    }
    
    // Loading Screen
    show_loading_screen(){
        if(this.loading.enabled)return
        this.loading.enabled=true
        this.loading.game.enabled=false
        HideElement(this.content.loading_minigame)
        ShowElement(this.content.loading_screen,true)
        ShowElement(this.content.loading_screen_logo)
        this.change_loading_screen()
    }
    hide_loading_screen(){
        if(!this.loading.enabled)return
        this.loading.enabled=false
        this.loading.game.enabled=false
        HideElement(this.content.loading_screen,true)
        HideElement(this.content.loading_minigame)
        ShowElement(this.content.loading_screen_logo)
    }
    set_loading_current(text="",unloading:boolean=false){
        this.content.loading_screen_current.innerHTML=`<p class="span-medium">${this.translation.get("menu.loading-screen."+(unloading?"unload":"load"),{text:text})}</p>`
    }

    change_loading_screen(){
        if(this.loading.screens.length === 0)return
        const v=random.choose(this.loading.screens)
        this.content.loading_screen.style.backgroundImage=`url(${v[0]})`
    }
    async preload_loading_screens(paths: string[]) {
        for(const l of this.loading.screens){
            URL.revokeObjectURL(l[0])
        }
        this.loading.screens.length=0
        for(const path of paths){
            try {
                const response = await fetch(path)
                if (!response.ok) {
                    throw new Error(`${response.status} ${response.statusText}`)
                }
                const b=await response.blob()
                const url=URL.createObjectURL(b)
                this.loading.screens.push([url,path,b])
            } catch (e) {
                console.warn("Failed to preload loading screen:", path, e)
                return undefined
            }
        }
    }
    enable_loading_game(){
        this.loading.game.enabled=true
        ShowElement(document.querySelector("#loading-minigame") as HTMLDivElement,true)
        this.spawn_target()
    }
    spawn_target(){
        const size = 80
        const x = Math.random() * (self.innerWidth-size)
        const y = Math.random() * (self.innerHeight-size)
        this.content.loading_target.style.left=x+"px"
        this.content.loading_target.style.top=y+"px"
        HideElement(this.content.loading_screen_logo)
    }

    show_gameover_text(){
        ShowElement(this.content.gameover_text_screen,true)
    }
    hide_gameover_text(){
        HideElement(this.content.gameover_text_screen,true)
    }
    game_over_messages(text:string[],music:Sound,music_player:SoundController,time_per_message:number=3000,opacity_anim:number=1000):Promise<void>{
        return new Promise<void>((resolve) => {
            this.show_gameover_text()
            music_player.set(music)

            const elem = this.content.gameover_text_current
            elem.innerText=""
            elem.style.transition=`opacity ${opacity_anim}ms linear`

            const baseTime = time_per_message
            let speed = 1
            let runId = 0

            const onmousedown=()=> speed = 0.2
            const onmouseup=()=> speed = 1

            this.content.gameover_text_screen.addEventListener("mousedown",onmousedown)
            this.content.gameover_text_screen.addEventListener("mouseup",onmouseup)

            const next = (idx:number) => {
                if(idx >= text.length){
                    this.hide_gameover_text()
                    music_player.set(undefined)

                    this.content.gameover_text_screen.removeEventListener("mousedown",onmousedown)
                    this.content.gameover_text_screen.removeEventListener("mouseup",onmouseup)

                    resolve()
                    return
                }

                const currentRun = ++runId
                const msg = text[idx]

                elem.style.opacity = "0"

                setTimeout(()=>{
                    if(currentRun !== runId) return

                    elem.innerText = msg
                    elem.style.opacity = "1"

                    const delay = baseTime * speed

                    setTimeout(()=>{
                        if(currentRun !== runId) return
                        next(idx+1)
                    }, delay)

                }, opacity_anim)
            }

            requestAnimationFrame(()=>next(0))
        })
    }
    game_popup(content:PopupFunction):Promise<any>{
        return new Promise((resolve)=>{
            const overlay=document.createElement("div")
            overlay.className="game-popup-overlay"

            const popup=document.createElement("div")
            popup.className="game-popup menu-panel-blue"

            overlay.appendChild(popup)
            document.body.appendChild(overlay)

            const close=()=>{
                overlay.style.opacity="0"
                setTimeout(()=>{
                    overlay.remove()
                },200)
            }

            const ctx:GamePopupCTX={
                parent:popup,
                m:this,
                resolve:(val:any)=>{
                    close()
                    resolve(val)
                },
                close:()=>{
                    close()
                    resolve(undefined)
                }
            }
            content(ctx)
            requestAnimationFrame(()=>{
                overlay.style.opacity="1"
            })
        })
    }
    select_character_screen(characters: OnlineMessageCharacter[]): Promise<number> {
        return this.game_popup((ctx) => {
            let selected = 0

            ctx.parent.innerHTML = `
                <div class="character-selector-screen">
                    <div class="character-main menu-panel-blue">
                        <h1 class="character-name"></h1>
                        <div class="character-image-wrapper">
                            <img class="character-icon">
                        </div>
                        <div class="character-description"></div>
                        <button class="btn-blue character-select-btn">
                            Select Character
                        </button>
                    </div>
                    <div class="character-selector-list"></div>
                </div>
            `

            const list = ctx.parent.querySelector(".character-selector-list") as HTMLDivElement
            const icon = ctx.parent.querySelector(".character-icon") as HTMLImageElement
            const name = ctx.parent.querySelector(".character-name") as HTMLHeadingElement
            const desc = ctx.parent.querySelector(".character-description") as HTMLDivElement
            const button = ctx.parent.querySelector(".character-select-btn") as HTMLButtonElement

            const cards: HTMLDivElement[] = []

            const update = () => {
                const char = characters[selected]

                icon.src = char.icon!
                name.innerText = char.name ?? "Unknown"
                desc.innerText = char.description ?? ""

                for (const c of cards) {
                    c.classList.remove("selected")
                }

                cards[selected]?.classList.add("selected")
            }

            for (let i = 0; i < characters.length; i++) {
                const char = characters[i]

                const card = document.createElement("div")
                card.className = "character-card"

                card.innerHTML = `
                    <img src="${char.icon}">
                `

                card.onclick = () => {
                    selected = i
                    update()
                }

                list.appendChild(card)
                cards.push(card)
            }

            button.onclick = () => {
                ctx.resolve(selected)
            }

            update()
        })
    }
    update_content_creators(content_creators:{name:string,url:string}[]){
        this.content.content_creators.innerHTML+="<span>Featured Content-Creators</span>"
        for(const creator of content_creators){
            this.content.content_creators.innerHTML+=`<div class="btn-blue content-creator" onclick="location.href='${creator.url}'">${creator.name}</div>`
        }
    }

    interval?:any
    update(){
        /*this.menu_time_timer-=1
        if(this.menu_time_timer<=0){
            this.menu_time_timer+=this.menu_time_delay
            if(this.menu_time_state===0){
                this.content.menu_background_day.style.opacity="0"
                this.content.menu_background_night.style.opacity="1"
                this.menu_time_state=0
            }else{
                this.content.menu_background_day.style.opacity="1"
                this.content.menu_background_night.style.opacity="0"
                this.menu_time_state=0
            }
        }*/
    }
    game_start(){
        ShowElement(this.content.gameD)
        ShowElement(this.content.gameCanvas)
        HideElement(this.content.menuD)
        this.cam2d.visible=true
        if(this.interval!==undefined){
            clearInterval(this.interval)
            this.interval=undefined
        }
    }
    game_end(){
        ShowElement(this.content.menuD)
        HideElement(this.content.gameD)
        HideElement(this.content.gameCanvas)
        this.cam2d.visible=false
        if(this.interval===undefined){
            this.interval=setInterval(this.update.bind(this),1)
        }
        this.background.set_def(backgrounds.city_river)
        this.background.show()
    }
}
