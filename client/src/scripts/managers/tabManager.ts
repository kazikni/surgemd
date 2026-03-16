import { HideElement, KDate, ShowElement } from "common/engine/client.ts";
import { type Game } from "../others/game.ts";


export abstract class TabApp {
    name: string
    icon: string
    game: Game
    icon_element: HTMLDivElement
    element?: HTMLDivElement
    tab:TabManager

    get running():boolean{
        return this.element!==undefined
    }

    constructor(name: string, icon: string,tab:TabManager) {
        this.name = name
        this.icon = icon
        this.tab=tab
        this.game=tab.game

        this.icon_element = document.createElement("div")
        this.icon_element.className = "tab-app"
        this.icon_element.innerHTML = `
            <img src="${icon}" draggable="false" alt="${name}" title="${name}" class="tab-app-icon">
        `
    }

    begin():void{
        if(this.running)return
        this.element=document.createElement("div")
        this.element.classList.add("tab-app-content")
        this.on_run()
    }
    stop():void{
        if(this.element)this.element.remove()
        this.on_stop()
    }

    abstract on_run():void
    abstract on_stop():void
    abstract on_tick(dt:number):void

    initialize():void{}
}
export type TabStyle = {
    primary: string
    secondary: string
    text: string
    wallpaper?: string
};
export enum TabState{
    InitialPage,
    App,

}
export class TabManager {
    game: Game
    tab = document.createElement("div")
    appsContainer:HTMLDivElement
    content:Record<string,HTMLElement>

    full_tab: boolean = false
    visible_tab: boolean = false
    enabled:boolean = true
    apps: TabApp[] = []

    state:TabState=TabState.InitialPage

    // deno-lint-ignore no-explicit-any
    variables:Record<string,any>={

    }

    constructor(game: Game) {
        this.game = game
        this.tab.innerHTML=`
<div id="tab-content">
    <div id="tab-apps">
    </div>
    <div id="tab-current-app">

    </div>
</div>
<div id="tab-content-header">
    <p id="tab-header-info-1">4AM 10/03/2010</p>
    <img draggable="false" src="/img/menu/logos/MD/MD.svg">
</div>
<div id="tab-buttons">
    <div id="tab-exit-button"></div>
</div>
`
        this.content = {
            header_text_1: this.tab.querySelector("#tab-header-info-1") as HTMLSpanElement,
            wallpaper: this.tab.querySelector("#tab-content") as HTMLDivElement,
            tab_apps:this.tab.querySelector("#tab-apps") as HTMLDialogElement,
            tab_current_app:this.tab.querySelector("#tab-current-app") as HTMLDivElement,

            back_button:this.tab.querySelector("#tab-exit-button") as HTMLButtonElement,
        };
        this.tab.id="tab-view"
        this.tab.className="tab-view-minimized"
        this.appsContainer=this.tab.querySelector("#tab-apps") as HTMLDivElement
        this.appsContainer.innerHTML=""
        this.set_wallpaper("/img/menu/gui/tab/tab_wallpaper_abstract.png")

        HideElement(this.content.tab_current_app)
        this.content.back_button.onclick=(_e)=>this.back_to_menu()

        this.tab.onmouseover=(_e)=>{
            if(this.full_tab)this.game.input_manager.focus=false
        }
        this.tab.onmouseout=(_e)=>{
            if(this.full_tab)this.game.input_manager.focus=true
        }
        if(this.enabled){
            if(!this.visible_tab)this.toggle_tab_visibility()
        }else{
            if(this.visible_tab)this.toggle_tab_visibility()
        }
    }

    tick(dt:number){
        for(const a of this.apps){
            if(a.running)a.on_tick(dt)
        }
    }
    toggle_tab_full() {
        if(this.enabled){
            this.full_tab = !this.full_tab
            this.tab.className = this.full_tab ? "tab-view-full" : "tab-view-minimized"
        }
    }
    toggle_tab_visibility(){
        if(this.enabled){
            this.visible_tab = !this.visible_tab
            if(this.full_tab)this.toggle_tab_full()
            if(this.visible_tab){
                this.game.ui.content.game_gui.appendChild(this.tab)
            }else{
                this.tab.remove()
            }
        }else{
            this.tab.remove()
        }
    }

    update_header(date: KDate) {
        const tt = date.hour >= 12 ? "PM" : "AM"
        const hours = tt === "PM" ? date.hour - 12 : date.hour
        const minutes = String(Math.floor(date.minute)).padStart(2, "0")

        this.content.header_text_1.innerText = `${hours}:${minutes}${tt} ${date.day}/${date.month}/${date.year}`
    }

    set_wallpaper(src: string) {
        this.content.wallpaper.style.backgroundImage = `url(${src})`
    }
    set_style(style: TabStyle) {
        const root = this.tab

        root.style.setProperty("--tab-primary", style.primary)
        root.style.setProperty("--tab-secondary", style.secondary)
        root.style.setProperty("--tab-text", style.text)

        if (style.wallpaper) {
            this.set_wallpaper(style.wallpaper)
        }
    }
    game_start(){
        if(!this.enabled){
            if(this.visible_tab)this.toggle_tab_visibility()
        }
    }

    back_to_menu(){
        if(this.state===TabState.InitialPage)return
        HideElement(this.content.tab_current_app)
        ShowElement(this.content.tab_apps)
        this.state=TabState.InitialPage
    }

    open_app(app:TabApp){
        if(this.state===TabState.App)return
        app.begin()
        if(app.running){
            HideElement(this.content.tab_apps)
            ShowElement(this.content.tab_current_app)
            this.content.tab_current_app.innerHTML=""
            this.content.tab_current_app.appendChild(app.element!)
            this.state=TabState.App
        }
    }

    add_app(app: TabApp) {
        this.apps.push(app)
        this.appsContainer.appendChild(app.icon_element)

        app.icon_element.onclick=(_e)=>this.open_app(app)
        app.initialize()
    }

    remove_app(name: string) {
        const index = this.apps.findIndex(a => a.name === name)
        if (index >= 0) {
            this.apps[index].stop()
            this.apps[index].icon_element.remove()
            this.apps.splice(index, 1)
        }
    }
    stop_all(){
        for(const a of this.apps){
            a.stop()
        }
    }
}
