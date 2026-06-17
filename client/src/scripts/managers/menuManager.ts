import { api, API_BASE, api_server } from "../others/config.ts";
import { ApiSettingsS } from "common/scripts/config/config.ts";
import { AccountManager } from "./accountManager.ts";
import { PlayArgs } from "../others/constants.ts";  
import { AudioEngine, FileManager, GameSave, HideElement, ImageBuffer, InputManager, random, ResourcesManager, ShowElement, ShowTab, Sound, SoundController, TranslationManager, typewriter } from "common/engine/client.ts";
import { CModsManager } from "./modsManager.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";
import { GamePopupCTX, MenuInitDefault, MenuTab, MenuTabDef, SubMenuOption } from "../defs/menu.ts";
import { HistoryCommand, HistoryCommandType } from "common/scripts/config/history.ts";
import { OnlineMessageCharacter } from "common/scripts/packets/messages.ts";
type PhaseIntroConfig = {
    location: string
    name: string
    date?: string
    style?: "glitch" | "clean"
    description?: string
    text_speed?: number
    wait_time?:number
}
export class MenuManager{
    api_settings:ApiSettingsS
    account:AccountManager
    tabs:Record<string,MenuTab>={}
    tabs_html:Record<string,HTMLDivElement>={}
    current_tab?:string
    content={
        menuD:document.querySelector("#menu") as HTMLDivElement,
        gameD:document.querySelector("#game") as HTMLDivElement,

        menu_options:document.body.querySelector("#menu-options") as HTMLDivElement,
        menu_content:document.body.querySelector("#menu-content") as HTMLDivElement,

        initial_screen:document.body.querySelector("#initial-screen") as HTMLDivElement,

        loading_screen:document.body.querySelector("#loading-screen") as HTMLDivElement,
        loading_screen_current:document.body.querySelector("#loading-current") as HTMLDivElement,
        
        gameover_text_screen:document.body.querySelector("#text-gameover-container") as HTMLDivElement,
        gameover_text_current:document.body.querySelector("#text-gameover") as HTMLSpanElement,

        select_region:document.body.querySelector("#select-region") as HTMLButtonElement,
        
        history_overlay:document.body.querySelector("#history-overlay") as HTMLDivElement,
        history_container:document.body.querySelector("#history-container") as HTMLDivElement,
        history_frame:document.body.querySelector("#history-frame") as HTMLImageElement,
        history_dialog_text:document.body.querySelector("#history-dialog-text") as HTMLDivElement,
        history_dialog_indicator:document.body.querySelector("#history-dialog-indicator") as HTMLDivElement,
        //team_options_div:document.body.querySelector("#menu-play-teams") as HTMLSelectElement,
    }

    save!:GameSave
    resources!:ResourcesManager
    translation!:TranslationManager
    sounds!:AudioEngine
    submenu_param:boolean
    input!:InputManager

    definitions:GameDefinition

    play_callback?:(play_args:PlayArgs)=>void

    cutscene:HistoryCommand[]=[]

    params:URLSearchParams

    constructor(definitions:GameDefinition){
        this.params = new URLSearchParams(self.location.search)

        this.account=new AccountManager(definitions)
        this.definitions=definitions

        this.submenu_param=!!this.params

        this.api_settings={
            modes:[
                {
                    gamemode:"normal",
                    team_size:[1]
                },
            ],
            debug:{
                debug_menu:true,
            },
            database:{
                enabled:false,
            },
            regions:["local"],
        }

        HideElement(this.content.gameD)
        ShowElement(this.content.menuD)

        HideElement(this.content.loading_screen)
        this.content.loading_screen.style.background=`url("/img/menu/background/${
            random.choose(["normal_background","tundra_background_1"])
        }.png")`
        this.content.loading_screen.style.opacity="0"
        this.set_loading_current=this.set_loading_current.bind(this)
        this.start_intro()
    }
    intro_fineshed:boolean=false
    start_intro(): Promise<void> {
        return new Promise<void>((resolve) => {
            if(this.intro_fineshed){
                resolve()
                return
            }
            const screen = this.content.initial_screen
            const video = document.getElementById("intro-video") as HTMLVideoElement

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
                    this.intro_fineshed=true
                    HideElement(screen, true)
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
                },1000)
            })
        })
    }
    reload_tabs(tabs:(MenuTabDef|undefined)[]){
        this.content.menu_options.innerHTML='<img id="title-section" src="/img/menu/logos/title.png" draggable="false"></img>'
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

            tab_main.appendChild(options)
            tab_main.appendChild(content)
            tab_main.appendChild(close_btn)
            this.content.menu_content.appendChild(tab_main)

            for(const st of Object.keys(t.subtabs)){
                const extra=document.createElement("kl-md-extra") as HTMLDivElement
                extra.className="background-menu-md background-menu-blue"
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
        }else{
            this.content.menu_options.style.opacity="1"
        }
    }
    async init(input:InputManager,save:GameSave,fs:FileManager,resources:ResourcesManager,sounds:AudioEngine,definitions:GameDefinition,transition:TranslationManager,mods?:CModsManager){
        this.save=save
        this.resources=resources
        this.sounds=sounds
        this.translation=transition
        this.input=input
        this.update_api()

        MenuInitDefault(this,definitions,fs,transition,mods)

        ShowElement(this.content.menu_options,true)
    }
    async update_api(){
        if(api){
            let js=this.api_settings
            try{
                js=await(await fetch(`${API_BASE}/get-settings`)).json()
            }catch(e){
                console.log(e)
            }
            this.api_settings=js
        }

        if(this.api_settings.database.enabled){
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
            case "kicked":
                this.leave_group()
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
        ShowElement(this.content.loading_screen,true)
    }
    hide_loading_screen(){
        HideElement(this.content.loading_screen,true)
    }
    
    set_loading_current(text="",unloading:boolean=false){
        this.content.loading_screen_current.innerHTML=`<p class="span-medium">${this.translation.get("menu.loading-screen."+(unloading?"unload":"load"),{text:text})}</p>`
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
    game_popup(content:(ctx:GamePopupCTX)=>void):Promise<any>{
        return new Promise((resolve)=>{
            const overlay=document.createElement("div")
            overlay.className="game-popup-overlay"

            const popup=document.createElement("div")
            popup.className="game-popup background-menu-blue"

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
    history_buffer:ImageBuffer=new ImageBuffer()
    async preload_cutscene(path:string){
        this.cutscene=await this.resources.load_json(path,this.set_loading_current)
        this.history_buffer.clear()
        await this.preload_history_frames(this.cutscene)
    }
    async preload_history_frames(commands: HistoryCommand[], max = 6){
        let count = 0
        for(const cmd of commands){
            if(cmd.type === HistoryCommandType.SetFrame){
                this.set_loading_current(cmd.frame)
                await this.history_buffer.load(cmd.frame)
                count++
                if(count >= max) break
            }
        }
    }
    async show_history(commands: HistoryCommand[],resources: ResourcesManager,music_player: SoundController,ambient_player: SoundController,input:InputManager,time_scale: number = 1): Promise<void> {
        ShowElement(this.content.history_overlay,true)
        music_player.set(undefined)
        ambient_player.set(undefined)
        const sleep = (ms: number) => new Promise(res => setTimeout(res, (ms*1000)/time_scale))
        sleep(1)
        for (const cmd of commands) {
            switch (cmd.type) {
                case HistoryCommandType.Wait: {
                    await sleep(cmd.time)
                    this.content.history_dialog_text.style.opacity="0"
                    break
                }
                case HistoryCommandType.WaitInput: {
                    ShowElement(this.content.history_dialog_indicator)
                    await input.wait_for_action("next")
                    HideElement(this.content.history_dialog_indicator)
                    this.content.history_dialog_text.style.opacity="0"
                    break
                }
                case HistoryCommandType.SetFrame: {
                    const currentIndex = commands.indexOf(cmd)

                    for (let i = 1; i <= 3; i++) {
                        const next = commands[currentIndex + i]
                        if (next?.type === HistoryCommandType.SetFrame) {
                            this.history_buffer.preload(next.frame)
                        }
                    }

                    this.content.history_frame.style.opacity = "0"
                    await sleep(0.4)
 
                    const img = await this.history_buffer.load(cmd.frame)
                    this.content.history_frame.src = img.src

                    requestAnimationFrame(() => {
                        this.content.history_frame.style.opacity = "1"
                    })

                    break
                }
                case HistoryCommandType.SetDialog: {
                    const text=cmd.text??(cmd.text_ln===undefined?"":this.translation.get(cmd.text_ln))
                    if(text){
                        ShowElement(this.content.history_dialog_text,true)

                        const name=cmd.name??(cmd.name_ln===undefined?"":this.translation.get(cmd.name_ln))
                        this.content.history_dialog_text.innerHTML = `
                            ${name?`<p class="name">${name}</p>`:""}
                            <p class="content"></p>
                        `

                        const content=this.content.history_dialog_text.querySelector(".content") as HTMLSpanElement

                        await typewriter(content,text,cmd.typewriter_delay??20)
                        content.style.color = cmd.color ?? "white"
                        
                    }else{
                        HideElement(this.content.history_dialog_text,true)
                    }
                    break
                }
                case HistoryCommandType.SetMusic: {
                    if (music_player && resources) {
                        const s = resources.get_sound(cmd.music)
                        music_player.set(s,{
                            loop:cmd.loop!==undefined?cmd.loop:true,
                            offset:cmd.start_at
                        })
                    }
                    break
                }
                case HistoryCommandType.SetAmbient: {
                    if (ambient_player&&resources) {
                        const s = resources.get_sound(cmd.ambient)
                        ambient_player.set(s,{
                            loop:cmd.loop!==undefined?cmd.loop:true,
                            offset:cmd.start_at
                        })
                    }
                    break
                }
                case HistoryCommandType.PlaySoundEffect: {
                    if (resources) {
                        const s = resources.get_sound(cmd.sfx)
                        const inst = this.sounds.play(s,{
                          bus:cmd.category??"ui"  
                        },)
                    }
                    break
                }

                case HistoryCommandType.ShowGameOverMessage: {
                    if(!resources||!music_player)break
                    await this.game_over_messages(
                        cmd.text,
                        resources.get_sound("gameover_music"),
                        music_player,
                        cmd.time_per_message,
                        cmd.opacity_anim
                    )
                    break
                }
            }
        }
        HideElement(this.content.history_overlay,true)
        if (music_player) music_player.set(undefined)
    }
    select_character_screen(characters: OnlineMessageCharacter[]): Promise<number> {
        return this.game_popup((ctx) => {
            let selected = 0

            ctx.parent.style.width = "95vw"
            ctx.parent.style.height = "90vh"

            ctx.parent.innerHTML = `
                <h1 class="span-text">Character Selection</h1>
                <div class="character-selector-list"></div>
                <div class="character-preview background-menu-blue">
                    <img class="character-icon">
                    <h2 class="character-name"></h2>
                    <p class="character-description"></p>

                    <button class="btn-blue character-select-btn">
                        Select Character
                    </button>
                </div>
            `

            const list = ctx.parent.querySelector(".character-selector-list") as HTMLDivElement
            const childs:HTMLDivElement[]=[]
            const previewIcon=ctx.parent.querySelector(".character-icon") as HTMLImageElement
            const previewName=ctx.parent.querySelector(".character-name") as HTMLHeadingElement
            const previewDesc=ctx.parent.querySelector(".character-description") as HTMLParagraphElement
            const selectBtn=ctx.parent.querySelector(".character-select-btn") as HTMLButtonElement

            const updatePreview = () => {
                const char = characters[selected]
                previewIcon.src = `/img/characters/${char.icon}.png`
                previewName.innerText = char.name ?? "Unknown"
                previewDesc.innerText = char.description ?? ""
                for (const el of childs) {
                    el.classList.remove("selected")
                }
                list.children[selected]?.classList.add("selected")
            }

            for (const idx in characters) {
                const i = Number(idx)
                const char = characters[i]
                const card = document.createElement("div")
                card.className = "character-card background-menu-blue"
                card.innerHTML = `
                    <img src="/img/characters/${char.icon}.png">
                    <span>${char.name ?? "Unknown"}</span>
                `
                card.onclick = () => {
                    selected = i
                    updatePreview()
                }
                list.appendChild(card)
                childs.push(card)
            }
            selectBtn.onclick = () => {
                ctx.resolve(selected)
            }
            updatePreview()
        })
    }
    game_start(){
        ShowElement(this.content.gameD)
        HideElement(this.content.menuD)
    }
    game_end(){
        ShowElement(this.content.menuD)
        HideElement(this.content.gameD)
    }
}