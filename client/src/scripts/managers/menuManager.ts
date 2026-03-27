import { api, API_BASE } from "../others/config.ts";
import { ApiSettingsS } from "common/scripts/config/config.ts";
import { AccountManager } from "./accountManager.ts";
import { PlayArgs } from "../others/constants.ts";  
import { FileManager, formatToHtml, GameSave, HideElement, InputManager, ManipulativeSoundInstance, ResourcesManager, ShowElement, ShowTab, Sound, SoundManager, typewriter } from "common/engine/client.ts";
import { CModsManager } from "./modsManager.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";
import { GamePopupCTX, MenuInitDefault, MenuTab, MenuTabDef, SubMenuOption } from "../defs/menu.ts";
import { HistoryCommand, HistoryCommandType } from "common/scripts/config/history.ts";
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
        history_dialog_indicator:document.body.querySelector("#history-dialog-indicator") as HTMLDivElement
        //team_options_div:document.body.querySelector("#menu-play-teams") as HTMLSelectElement,
    }

    save!:GameSave
    resources!:ResourcesManager
    sounds!:SoundManager
    submenu_param:boolean

    definitions:GameDefinition

    play_callback?:(play_args:PlayArgs)=>void
    constructor(definitions:GameDefinition){
        const params = new URLSearchParams(self.location.search)

        this.account=new AccountManager(definitions)
        this.definitions=definitions

        this.submenu_param=!!params

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
            regions:{
                "local":{
                    host:"localhost",
                    port:8080
                }
            },
            shop:{
                skins:{

                }
            }
        }

        HideElement(this.content.gameD)
        ShowElement(this.content.menuD)

        HideElement(this.content.loading_screen)
        this.content.loading_screen.style.opacity="0"
        this.set_loading_current=this.set_loading_current.bind(this)

        setTimeout(()=>{
            HideElement(this.content.initial_screen,true)
        },1000)
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
            btn.innerText=t.name
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
            close_btn.className="btn-red close-btn submenu-close-btn"
            close_btn.textContent="X"
            close_btn.onclick=this.load_tab.bind(this,"")

            tab_main.appendChild(options)
            tab_main.appendChild(content)
            tab_main.appendChild(close_btn)
            this.content.menu_content.appendChild(tab_main)

            for(const st of Object.keys(t.subtabs)){
                const extra=document.createElement("kl-md-extra") as HTMLDivElement
                extra.className="background-menu-md background-menu-ss background-menu"
                extra.id=`${t.id}-${st}-sm-extra`

                t.subtabs[st].generate(extra,this)
                tab.tabs[st]=extra

                content.appendChild(extra)
            }

            for(const o of t.options){
                switch(o.type){
                    case "button":{
                        const btn=document.createElement("button")
                        btn.innerText=o.name
                        btn.id=`btn-${t.id}-${o.id}`
                        btn.className="btn-green"
                        btn.onclick=this.opt_click_callback(o,tab)

                        options.appendChild(btn)
                        tab.option.push(btn)
                        break
                    }
                    case "label":{
                        const p=document.createElement("p")
                        p.className="span"
                        p.innerText=o.name
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
        ShowTab(tab,this.tabs_html)
        if(this.current_tab){
            if(this.tabs[this.current_tab].def.on_open)this.tabs[this.current_tab].def.on_open!(this)
        }
        if(tab){
            HideElement(this.content.menu_options)
        }else{
            ShowElement(this.content.menu_options)
        }
    }
    init(save:GameSave,fs:FileManager,resources:ResourcesManager,sounds:SoundManager,mods?:CModsManager){
        this.save=save
        this.resources=resources
        this.sounds=sounds
        this.update_api()

        MenuInitDefault(this,fs,mods)

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

        const newsS=this.content.menu_content.querySelector("#about-news-sm-extra") as HTMLDivElement
        newsS.innerHTML=""
        const news=await(await fetch(`${API_BASE}/news/get`)).json() as {title:string,id:string,content:string}[]
        for(const n of news){
            newsS.innerHTML+=`<h2>${n.title}</h2>`
            const d=document.createElement("div")
            d.classList.add("update-item")
            d.innerHTML=formatToHtml(n.content)
            d.innerHTML+=`<a href="/pages/news/?id=${n.id}"><h3>See More</h3></a>`
            newsS.appendChild(d)
        }
    }
    // Loading Screen
    show_loading_screen(){
        ShowElement(this.content.loading_screen,true)
    }
    hide_loading_screen(){
        HideElement(this.content.loading_screen,true)
    }
    
    set_loading_current(text="",unloading:boolean=false){
        this.content.loading_screen_current.innerHTML=`<p class="span-medium">${unloading?"Unloading":"Loading"}: ${text}</p>`
    }

    show_gameover_text(){
        ShowElement(this.content.gameover_text_screen,true)
    }
    hide_gameover_text(){
        HideElement(this.content.gameover_text_screen,true)
    }
    game_over_messages(text:string[],music:Sound,music_player:ManipulativeSoundInstance,time_per_message:number=3000,opacity_anim:number=1000):Promise<void>{
        return new Promise<void>((resolve) => {
            this.show_gameover_text()

            music_player.set(music)

            const elem = this.content.gameover_text_current
            elem.innerText=""

            let idx = 0
            elem.style.transition=`opacity ${opacity_anim}ms linear`
            const next = () => {
                if(idx >= text.length){
                    this.hide_gameover_text()
                    music_player.set(undefined)
                    resolve()
                    return
                }
                const msg = text[idx++]
                elem.style.opacity = "0"

                setTimeout(()=>{
                    elem.innerText = msg
                    elem.style.opacity = "1"

                    setTimeout(next, time_per_message)
                }, opacity_anim)
            }

            setTimeout(()=>next(),1000)
        })
    }
    game_popup(content:(ctx:GamePopupCTX)=>void):Promise<any>{
        return new Promise((resolve)=>{
            const overlay=document.createElement("div")
            overlay.className="game-popup-overlay"

            const popup=document.createElement("div")
            popup.className="game-popup background-menu"

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
    async show_history(commands: HistoryCommand[],sounds_manager:SoundManager,resources: ResourcesManager,music_player: ManipulativeSoundInstance,input:InputManager,time_scale: number = 1): Promise<void> {
        ShowElement(this.content.history_overlay,true)
        const sleep = (ms: number) => new Promise(res => setTimeout(res, (ms*1000)/time_scale))
        sleep(2)
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
                    this.content.history_frame.style.opacity = "0"
                    await sleep(0.75)
                    this.content.history_frame.src = cmd.frame
                    requestAnimationFrame(() => {
                        this.content.history_frame.style.opacity = "1"
                    })
                    break
                }
                case HistoryCommandType.SetDialog: {
                    if(cmd.text){
                        ShowElement(this.content.history_dialog_text,true)
                        this.content.history_dialog_text.innerHTML = `
                            ${cmd.name?`<p class="name">${cmd.name}</p>`:""}
                            <p class="content"></p>
                        `

                        const content=this.content.history_dialog_text.querySelector(".content") as HTMLSpanElement
                        await typewriter(
                            content,
                            cmd.text,
                            cmd.typewriter_delay
                        )
                        content.style.color = cmd.color ?? "white"
                        
                    }else{
                        HideElement(this.content.history_dialog_text,true)
                    }
                    break
                }
                case HistoryCommandType.SetMusic: {
                    if (music_player && resources) {
                        const s = resources.get_audio(cmd.music)
                        music_player.set(s,cmd.loop!==undefined?cmd.loop:true,cmd.start_at)
                    }
                    break
                }

                case HistoryCommandType.PlaySoundEffect: {
                    if (resources) {
                        const s = resources.get_audio(cmd.sfx)
                        const inst = sounds_manager.play(s,{

                        },cmd.category??"players")
                    }
                    break
                }

                case HistoryCommandType.ShowGameOverMessage: {
                    if(!resources||!music_player)break
                    await this.game_over_messages(
                        cmd.text,
                        resources.get_audio("gameover_music"),
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
    your_skins:string[]=["default_skin"]
    show_your_skins(){
        this.content.submenus.extras.loadout_c.innerHTML=""
        let sel=this.save.get_variable("sv_loadout_skin")
        if(!this.definitions.skins.exist(sel))sel="default_skin"
        for(const s of this.your_skins){
            const skin=document.createElement("div")
            skin.id="skin-sel-"+s
            skin.innerHTML=`
<div class="name text">${s}</div>
<img src="${this.resources.get_sprite(s+"_body").src}" class="simage"></div>
            `
            skin.classList.add("skin-view-menu")
            if(s===sel){
                skin.classList.add("skin-view-menu-selected")
            }
            skin.addEventListener("click",this.update_sel_skin.bind(this,s))
            this.content.submenus.extras.loadout_c.appendChild(skin)
        }
        this.update_ss_view(sel)
    }
    update_sel_skin(sel=""){
        if(!this.definitions.skins.exist(sel))sel="default_skin"
        this.save.set_variable("sv_loadout_skin",sel)
        const ss=this.content.submenus.extras.loadout_c.querySelectorAll(".skin-view-menu-selected")
        ss.forEach((v,_)=>{
            v.classList.remove("skin-view-menu-selected")
        })
        const skin=this.content.submenus.extras.loadout_c.querySelector("#skin-sel-"+sel) as HTMLDivElement
        skin.classList.add("skin-view-menu-selected")
        this.update_ss_view(sel)
    }
    update_ss_view(sel:string){
        this.content.submenus.extras.loadout_v.innerHTML=`
            <img src="${this.resources.get_sprite(sel+"_body").src}" class="simage"></div>
        `
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