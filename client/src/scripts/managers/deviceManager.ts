import { HideElement, KDate, ShowElement } from "common/engine/client.ts";
import { type Game } from "../others/game.ts";
import { PrivateUpdate, SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
export interface GameAppMeta{
    name:string
    icon?:string
}
export abstract class GameApp {
    initialized=false

    device!:GameDeviceManager
    element!:HTMLDivElement
    icon_element!:HTMLDivElement

    meta:GameAppMeta
    constructor(meta:GameAppMeta){
        this.meta=meta
    }

    init(){
        this.element=document.createElement("div")
        this.element.className="game-device-app-content"

        this.icon_element = document.createElement("div")
        this.icon_element.className = "game-device-app"
        this.icon_element.innerHTML = `
            <img src="${this.meta.icon}" draggable="false" alt="${this.meta.name}" title="${this.meta.name}" class="game-device-app-icon">
        `

        this.on_init()
    }
    event(type:string,data:any){
        this.on_event(type,data)
    }

    open(){
        this.on_open()
    }
    close(){
        this.on_close()
    }
    clear(){
        this.on_clear()
    }

    abstract on_init():void
    abstract on_open():void
    abstract on_close():void
    abstract on_clear():void
    abstract on_event(type:string,data:any):void
    abstract on_tick(dt:number):void
}
export type GameDeviceSettings = {
    name: string
    width: number
    height: number
    screen: {
        x: number
        y: number
        width: number
        height: number
        radius: number
    }
    frame:string
    theme?:GameDeviceTheme
    buttons?:[]
}
export type GameDeviceTheme = {
    primary?: string
    secondary?: string
    text?: string

    wallpaper?: string

    blur?: number
    opacity?: number

    border?: string
    shadow?: string
}
const MDTabDevice:GameDeviceSettings={
    name: "tablet",
    width: 1400,
    height: 780,
    frame: "/img/menu/gui/tab/tab_border.svg",
    theme:{
        wallpaper:"/img/menu/gui/tab/tab_wallpaper_abstract.png"
    },
    screen: {
        x: 85,
        y: 30,
        width: 1280,
        height: 720,
        radius: 50
    },
}
export class GameDeviceManager {
    game: Game
    container = document.createElement("div")
    content!:{
        header_text_1: HTMLSpanElement
        wallpaper: HTMLDivElement
        apps:HTMLDivElement
        current_app:HTMLDivElement
    };

    full: boolean = false
    visible: boolean = false
    enabled:boolean = true

    apps: GameApp[] = []
    state:number=0

    // deno-lint-ignore no-explicit-any
    variables:Record<string,any>={}
    device_settings!: GameDeviceSettings
    constructor(game: Game) {
        this.game = game
        this.container.id="game-device-view"
        this.container.className="game-device-view-minimized"

        this.container.onmouseover=(_e)=>{
            if(this.full)this.game.input_manager.focus=false
        }
        this.container.onmouseout=(_e)=>{
            if(this.full)this.game.input_manager.focus=true
        }

        if(this.enabled){
            if(!this.visible)this.toggle_visibility()
        }else{
            if(this.visible)this.toggle_visibility()
        }

        this.set_device(MDTabDevice)
    }

    update_private(priv:PrivateUpdate){
        this.signal("private",priv)
    }
    update_self_state(state:SelfStateUpdate){
        this.signal("self_state",state)
    }
    signal(type:string,data:any){
        for(const app of this.apps){
            app.event(type,data)
        }
    }
    tick(dt:number){
        for(const a of this.apps){
            if(a)a.on_tick(dt)
        }
    }
    toggle_full() {
        if(this.enabled){
            this.full = !this.full
            this.container.className = this.full ? "game-device-view-full" : "game-device-view-minimized"
        }
    }
    toggle_visibility(){
        if(this.enabled){
            this.visible = !this.visible
            if(this.full)this.toggle_full()
            if(this.visible){
                this.game.ui.content.game_gui.appendChild(this.container)
            }else{
                this.container.remove()
            }
        }else{
            this.container.remove()
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
    set_theme(theme: GameDeviceTheme) {
        const root = this.container

        if(theme.primary)root.style.setProperty("--game-device-primary", theme.primary)
        if(theme.secondary)root.style.setProperty("--game-device-secondary", theme.secondary)
        if(theme.text)root.style.setProperty("--game-device-text", theme.text)
        if(theme.blur !== undefined)root.style.setProperty("--game-device-blur", `${theme.blur}px`)
        if(theme.opacity !== undefined)root.style.setProperty("--game-device-opacity", `${theme.opacity}`)
        if(theme.border)root.style.setProperty("--game-device-border", theme.border)
        if(theme.shadow)root.style.setProperty("--game-device-shadow", theme.shadow)
        if(theme.wallpaper)this.set_wallpaper(theme.wallpaper)
    }
    set_device(device: GameDeviceSettings) {
        this.device_settings = device

        this.container.innerHTML=`
<div id="screen">
    <div id="content-header">
        <p id="game-device-header-info-1">4AM 10/03/2010</p>
        <img draggable="false" src="/img/menu/logos/MD/MD.svg">
    </div>
    <div id="screen-content">
        <div id="screen-apps"></div>
        <div id="screen-current-app"></div>
    </div>
</div>
<div id="game-device-buttons"></div>`

        this.content = {
            header_text_1: this.container.querySelector("#game-device-header-info-1") as HTMLSpanElement,
            wallpaper: this.container.querySelector("#screen-content") as HTMLDivElement,
            apps:this.container.querySelector("#screen-apps") as HTMLDivElement,
            current_app:this.container.querySelector("#screen-current-app") as HTMLDivElement,
        };
        this.content.apps.innerHTML=""
        HideElement(this.content.current_app)

        const screen = this.container.querySelector("#screen") as HTMLDivElement

        this.container.style.width = device.width + "px"
        this.container.style.height = device.height + "px"
        this.container.style.backgroundImage = `url(${device.frame})`

        screen.style.left = device.screen.x + "px"
        screen.style.top = device.screen.y + "px"
        screen.style.width = device.screen.width + "px"
        screen.style.height = device.screen.height + "px"
        screen.style.borderRadius = device.screen.radius + "px"

        this.container.style.bottom=""
        this.container.style.right=""

        if(device.theme)this.set_theme(device.theme)
    }
    game_start(){
        if(!this.enabled){
            if(this.visible)this.toggle_visibility()
        }
    }

    back_to_menu(){
        if(this.state===0)return
        HideElement(this.content.current_app)
        ShowElement(this.content.apps)
        this.state=1
    }

    open_app(app:GameApp){
        if(this.state===1)return

        HideElement(this.content.apps)
        ShowElement(this.content.current_app)
        this.content.current_app.innerHTML=""
        this.content.current_app.appendChild(app.element!)
        this.state=1

        app.open()
    }

    add_app(app: GameApp) {
        app.device=this

        this.apps.push(app)
        app.init()

        this.content.apps.appendChild(app.icon_element)
        app.icon_element.onclick=(_e)=>this.open_app(app)
    }

    remove_app(name: string) {
        const index = this.apps.findIndex(a => a.name === name)
        /*if (index >= 0) {
            this.apps[index].stop()
            this.apps[index].icon_element.remove()
            this.apps.splice(index, 1)
        }*/
    }
}
