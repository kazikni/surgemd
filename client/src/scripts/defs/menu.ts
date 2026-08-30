// deno-lint-ignore-file no-explicit-any
import { deleteDeep, FileManager, getDeep, Numeric, parseJSONC, setDeep, TranslationManager } from "common/engine/core.ts";
import { PopupFunction, type MenuManager } from "../managers/menuManager.ts";
import { BrowserFileManager, formatToHtml, GameSave, isMobile, ResourcesManager } from "common/engine/web.ts";
import { type CModsManager } from "../managers/modsManager.ts";
import { Debug, sandbox_version, socials } from "../others/config.ts";
import { exec_server, set_full_screen } from "./go_files.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";
import { LoadoutItemKind } from "common/scripts/definitions/loadout/skins.ts";
import { EmoteDef } from "common/scripts/definitions/loadout/emotes.ts";
import { BadgeDef } from "common/scripts/definitions/loadout/badges.ts";
import { build_setting_input, SettingDef, SettingOption } from "./settings.ts";
import { GamePlayOption } from "common/scripts/config/config.ts";
import { PlayArgs } from "../others/constants.ts";
import { GameConstants } from "common/scripts/others/constants.ts";
import { make_credits_markdown } from "common/scripts/others/functions.ts";

export const FinalCredits=[
    {
        role: "Created By",
        users: "Kazikni / Hugo Mendonça Santana"
    },
    {
        role: "Programmed By",
        users: "@kazikni"
    },
    {
        role: "Game Designs / Graphics",
        users: [
            "@kazikni",
            "@cheerfulbull_29688",
            "@endermanking",
            "@littlethief69",
            "Suroi.io",
            "Surviv.io",
            "Survev.io"
        ]
    },

    {
        role: "Menu Design",
        users: [
            "@kazikni",
            "@namerio"
        ]
    },

    {
        role: "Sound Design",
        users: [
            "@kazikni",
            "@teardwop",
            "Surviv.io",
            "Suroi.io",
            "Free Sounds On Net",
            "Half-Life",
            "Postal 2",
            "Fortnite"
        ]
    },

    {
        role: "Music",
        users: [
            "@showusmusic",
            "@rivals2444",
            "Wreckfest",
            "I Wanna Be The Guy",
            "Various YouTube Music",
            "NoCopyrightSounds",
            "Hotline Miami 2",
            "Five Nights at Freddy's"
        ]
    },

    {
        role: "Lore",
        users: "@kazikni"
    },

    {
        role: "Additional Art",
        users: [
            "@sentido_ss",
            "@bien.star",
            "@paoagiota4740"
        ]
    },

    {
        role: "Videos / Trailers",
        users: [
            "@kazikni",
            "@rapxtor_yt"
        ]
    },

    {
        role: "Discord Server",
        users: [
            "@kazikni",
            "@Zahirralt2"
        ]
    },
    {
        role: "Inspirations",
        users: [
            "Surviv.io",
            "Hotline Miami 1 & 2",
            "Suroi.io",
            "Roblox Doors",
            "Pixel Gun 3D",
            "Fortnite"
        ]
    },
    {
        role: "Special Thanks",
        users: [
            "Surviv.io creators",
            "@hasanger",
            "@1092384",
            "@mamoun0",
            "@leia_is_gay",
            "@guiz3rabrr2466._24385",
            "@jgpow",
            "Everyone Who Played",
        ]
    }
]

export type GamePopupCTX={
    parent:HTMLDivElement
    m:MenuManager
    resolve:(val:any)=>void
    close:()=>void
}
export type SubMenuOption={
    type:"button",
    id:string,
    name:string,

    subtab?:string
    onclick?:(e:MouseEvent)=>void
}|{
    type:"label",
    name:string,
}

export type MenuSubTabDef={
    generate:(parent:HTMLDivElement,manager:MenuManager)=>void
    on_open?:(parent:HTMLDivElement,manager:MenuManager)=>void
    on_close?:(parent:HTMLDivElement,manager:MenuManager)=>void
}
export interface MenuTabDef{
    name:string
    id:string

    options:SubMenuOption[]
    subtabs:Record<string,MenuSubTabDef>
    on_open?:(manager:MenuManager)=>void
    on_close?:(manager:MenuManager)=>void
}
export interface MenuTab{
    def:MenuTabDef
    btn:HTMLButtonElement
    option:HTMLElement[]
    tabs:Record<string,HTMLElement>
    current_tab:string
}
export type ModeSettingsPopupDef={
    title?:string
    inputs:SettingDef[]
}
export type PopupButtonDef={
    text:string
    value:any
    class?:string
}

export type PopupBuilderDef={
    title?:string
    text?:string
    html?:string
    buttons?:PopupButtonDef[]
}

export function game_popup_builder(def:PopupBuilderDef){
    return (ctx:GamePopupCTX)=>{
        const parent=ctx.parent
        parent.innerHTML=""

        const make=(tag:string,val?:string,isHTML=false)=>{
            const el=document.createElement(tag)
            if(val) isHTML ? el.innerHTML=val : el.textContent=val
            parent.appendChild(el)
            return el
        }

        if(def.title)make("h2",def.title)
        if(def.text)make("p",def.text)
        if(def.html)make("div",def.html,true)

        const buttons=make("div") as HTMLDivElement
        buttons.style.display="flex"
        buttons.style.gap="10px"

        for(const b of def.buttons??[]){
            const btn=document.createElement("button")
            btn.textContent=b.text
            btn.className=b.class??"btn-green"
            btn.onclick=()=>ctx.resolve(b.value)
            buttons.appendChild(btn)
        }
    }
}

export function game_mode_settings_manager_popup(settings:any,translation:TranslationManager,def?:ModeSettingsPopupDef){
    return (ctx:GamePopupCTX)=>{
        if(!def)def={
            title:"Invalid Mode",
            inputs:[]
        }
        const parent=ctx.parent
        parent.innerHTML=""

        if(def.title){
            const h=document.createElement("h2")
            h.textContent=translation.get(def.title)
            parent.appendChild(h)
        }

        const container=document.createElement("div")
        parent.appendChild(container)

        for(const input of def.inputs){
            const row=build_setting_input(
                input,
                translation,
                // deno-lint-ignore ban-ts-comment
                //@ts-ignore
                input.var?getDeep(settings,input.var):"",
                {
                    on_change(val:any){
                        if(val){
                            // deno-lint-ignore ban-ts-comment
                            //@ts-ignore
                            setDeep(settings,input.var,val)
                        }else{
                            // deno-lint-ignore ban-ts-comment
                            //@ts-ignore
                            deleteDeep(settings,input.var)
                        }
                    },
                },
            )

            container.appendChild(row)
        }

        const buttons=document.createElement("div")
        buttons.style.marginTop="20px"

        const close=document.createElement("button")
        close.className="btn-green"
        close.textContent="Save"
        close.onclick=()=>ctx.resolve(JSON.stringify(settings,null,0))

        buttons.appendChild(close)
        parent.appendChild(buttons)
    }
}
export function yes_no_popup(msg:string,yes_text = "Yes",no_text = "No"): PopupFunction {
    return (popup) => {
        popup.parent.innerHTML=`
<p class="span-text">${msg}</p>
<div style="display:flex;flex-direction:column;gap:3px">
    <button id="popup-yes" class="btn-green">${yes_text}</button>
    <button id="popup-no" class="btn-red">${no_text}</button>
</div>`
        const yes = popup.parent.querySelector("#popup-yes") as HTMLButtonElement
        const no = popup.parent.querySelector("#popup-no") as HTMLButtonElement
        yes.onclick = () => {
            popup.resolve(true)
        }
        no.onclick = () => {
            popup.resolve(false)
        }
    }
}
export function input_popup(msg:string,placeholder="message",enter_msg="Enter",limit?:number): PopupFunction {
    return (popup) => {
        popup.parent.innerHTML=`
<p class="span-text">${msg}</p>
<div style="display:flex;flex-direction:column;gap:3px">
    <input id="popup-input" class="text-input-green" placeholder="${placeholder}"></input>
    <button id="popup-enter" class="btn-green">${enter_msg}</button>
</div>`
        const input = popup.parent.querySelector("#popup-input") as HTMLInputElement
        const enter = popup.parent.querySelector("#popup-enter") as HTMLButtonElement
        input.onkeydown=(e)=>{
            if(e.keyCode===13)popup.resolve(input.value)
        }
        enter.onclick = () => {
            popup.resolve(input.value)
        }
    }
}
export function make_menu_settings(save: GameSave,name:string, defs: (SettingDef|undefined)[],translation:TranslationManager){
    return (parent:HTMLDivElement)=>{
        parent.innerHTML=`<h1 class="span-text-base">${translation.get(name)}</h1>`
        for(const def of defs){
            if(!def)continue
            parent.appendChild(
                build_setting_input(def,translation,
                    // deno-lint-ignore ban-ts-comment
                    //@ts-ignore
                    def.var?save.get_variable(def.var):"",
                    {
                        on_change(val:any){
                            // deno-lint-ignore ban-ts-comment
                            //@ts-ignore
                            save.set_variable(def.var,val)
                        },
                    },
                )
            )
        }
    }
}
export function make_menu_campaign(campaign:Record<string,any>){
    return (parent:HTMLDivElement,manager:MenuManager)=>{
        for(const c in campaign.charpters){
            const charpter=campaign.charpters[c]
            const h2=document.createElement("h2")
            h2.className="span-text"
            h2.textContent=charpter.name
            parent.appendChild(h2)
            for(const l in charpter.levels){
                const level=charpter.levels[l]
                const level_div = document.createElement("div")
                level_div.className="menu-panel-ss menu-panel-blue"
                level_div.innerHTML = `
<h1>${level.meta.name}</h1>
<p>${level.meta.description}</p>
<button class="btn-green">Start Level</button>`
                parent.appendChild(level_div)
                const start_btn = level_div.querySelector(`.btn-green`) as HTMLButtonElement
                start_btn.onclick = async() => {
                    const si=await manager.game_popup(yes_no_popup("Start With Intro?"))
                    if(manager.play_callback)manager.play_callback({type:"campaign",path:"/"+level.path,start_with_intro:si})
                }
            }
        }
    }
}
export function make_menu_play_options(options:GamePlayOption[]){
    return (parent:HTMLDivElement,manager:MenuManager)=>{
        let m=0
        for(const p of options){
            const mb=document.createElement("div")
            mb.className="menu-panel-ss menu-panel-blue"
            mb.innerHTML=`<h1>${manager.translation.get(p.tname??"",{},p.name)}</h1>`
            for(const mode of p.content??[]){
                const btn=document.createElement("button")
                btn.className="btn-green"
                btn.innerText=manager.translation.get("menu.play.play-btn",{group_size:manager.translation.get("modes.group_size."+(mode.group_size??1))})
                const play_a:PlayArgs={type:"online",mode:m}
                btn.onclick=()=>{
                    if(manager.play_callback)manager.play_callback(play_a)
                }
                mb.appendChild(btn)
                parent.appendChild(mb)
                m++
            }
        }
    }
}
export function make_emotes_settings(save: GameSave,resources:ResourcesManager,definitions:GameDefinition,emotes: EmoteDef[],translation: TranslationManager){
    return (parent: HTMLDivElement)=>{
        let selected_elem: HTMLElement|null=null
        let selected_elem_out: HTMLElement|null=null
        const vv:Record<string, HTMLDivElement>={}

        parent.innerHTML=`  
<span class="span-text">Active Emotes</span>
<div class="loadout-icons-group active-emotes"></div>
<span class="span-text">Emotes Inventory</span>
<div class="loadout-icons-group emotes-inventory"></div>
        `

        const emotes_g=parent.querySelector(".emotes-inventory") as HTMLDivElement
        function emote_click(e:MouseEvent){
            if(!selected_elem_out)return
            const t=e.currentTarget as HTMLDivElement
            const id=t.dataset.idString as string

            if(selected_elem)selected_elem.classList.remove("selected")
            selected_elem=t
            selected_elem.classList.add("selected")

            save.set_variable("sv_loadout_emote_"+selected_elem_out.dataset.slot,id)
            ;(selected_elem_out.querySelector(".icon") as HTMLImageElement).src=resources.get_frame("emote_"+id).url!
        }
        for(const e of emotes){
            const frame=resources.get_frame("emote_"+e.idString)
            const container=document.createElement("div")
            container.className="litem"
            if(frame){
                container.innerHTML=`
<span class="name">${translation.get("emotes."+e.idString)}</span>
<img class="icon" src="${frame.src}"/>
`
            }else{
                container.innerHTML=`
<span class="name">${translation.get("emotes."+e.idString)}</span>
`
            }
            container.dataset.idString=e.idString
            container.onclick=emote_click
            emotes_g.appendChild(container)
            vv[e.idString]=container
        }

        const active_g=parent.querySelector(".active-emotes") as HTMLDivElement
        const slots=[
            "top",
            "right",
            "bottom",
            "left",
            "victory",
            "death"
        ]

        for(const slot of slots){
            const cur_emote=definitions.emotes.getFromStringSafe(save.get_variable("sv_loadout_emote_"+slot))
            const container=document.createElement("div")
            container.className="litem emote-slot-"+slot
            container.dataset.slot=slot
            const name=translation.get("loadout.emotes."+slot)
            if(cur_emote){
                container.innerHTML=`
<span class="name">${name}</span>
<img class="icon" src="${resources.get_frame("emote_"+cur_emote.idString).url}"/>
`
            }else{
                container.innerHTML=`
<span class="name">${name}</span>
<img class="icon"/>
`
            }

            container.onclick=(e:MouseEvent)=>{
                const t=e.currentTarget as HTMLDivElement
                if(selected_elem_out===t){
                    selected_elem_out=null
                    t.classList.remove("selected")
                    if(selected_elem)selected_elem.classList.remove("selected")
                }else{
                    if(selected_elem_out)selected_elem_out.classList.remove("selected")
                    selected_elem_out=t
                    t.classList.add("selected")

                    const sv=save.get_variable("sv_loadout_emote_"+container.dataset.slot!)
                    if(selected_elem)selected_elem.classList.remove("selected")
                    selected_elem=vv[sv]
                    selected_elem.classList.add("selected")
                }
            }

            active_g.appendChild(container)
        }
    }
}
export function make_badges_settings(save: GameSave,resources: ResourcesManager,badges:BadgeDef[],translation: TranslationManager) {
    return (parent: HTMLDivElement) => {
        let selected: string=save.get_variable("sv_loadout_badge")

        parent.innerHTML = `
<div class="loadout-icons-group items">
    <div class="litem" idString=""></div>
</div>
`

        const null_elem=parent.querySelector(".litem") as HTMLDivElement
        null_elem.onclick=(e)=>{
            if(selectedElem)selectedElem.classList.remove("selected")
            selected=null_elem.dataset.idString!
            selectedElem=null_elem
            null_elem.classList.add("selected")
            save.set_variable("sv_loadout_badge",selected)
        }
        let selectedElem: HTMLDivElement|null
        if(!selected){
            selectedElem=null_elem
            selectedElem.classList.add("selected")
        }
        const inventory = parent.querySelector(".items") as HTMLDivElement
        for (const b of badges) {
            const div = document.createElement("div")
            div.className = "litem"
            div.dataset.idString = b.idString
            const icon=resources.get_frame("badge_"+b.idString)?.url
            div.innerHTML = `
<span class="name">${translation.get("badges."+b.idString)}</span>
<img class="icon" src="${icon}">`

            if(b.idString===selected){
                selectedElem=div
                div.classList.add("selected")
            }
            div.onclick = () => {
                if(selectedElem)selectedElem.classList.remove("selected")
                selected=div.dataset.idString!
                selectedElem=div
                div.classList.add("selected")
                save.set_variable("sv_loadout_badge",selected)
            }

            inventory.appendChild(div)
        }
    }
}
export function select_loadout_item(save: GameSave,resources: ResourcesManager,items: string[],slots:string[],icon_placeholder:string,variable: string,translation_item_begin: string,translation_slot_begin:string,translation: TranslationManager) {
    return (parent: HTMLDivElement) => {
        let selectedElem: HTMLDivElement | null = null
        let selectedSlot: HTMLDivElement | null = null

        parent.innerHTML = `
<span class="span-text">Active</span>
<div class="loadout-icons-group active-items"></div>
<span class="span-text">Inventory</span>
<div class="loadout-icons-group items"></div>
`
        const inventory = parent.querySelector(".items") as HTMLDivElement
        const vv:Record<string,HTMLDivElement>={}
        for (const id of items) {
            const div = document.createElement("div")
            div.className = "litem"
            div.dataset.idString = id
            const icon=icon_placeholder+id+".svg"
            div.innerHTML = `
<span class="name">${translation.get(translation_item_begin + id)}</span>
<img class="icon" src="${icon}">
`
            div.onclick = () => {
                if(!selectedSlot)return

                const img = selectedSlot.querySelector(".icon") as HTMLImageElement
                img.src = icon_placeholder+id+".svg"

                if(selectedElem)selectedElem.classList.remove("selected")
                selectedElem=div
                div.classList.add("selected")
                save.set_variable(variable+selectedSlot.dataset.slot,id)
            }

            inventory.appendChild(div)
            vv[id]=div
        }
        const active = parent.querySelector(".active-items") as HTMLDivElement

        for (const slot of slots) {
            const value = save.get_variable(variable + slot)
            const div = document.createElement("div")
            div.className = "litem"
            div.dataset.slot = slot
            const icon = (value!=="")?icon_placeholder+value+".svg":""
            div.innerHTML = `
<span class="name">${translation.get(translation_slot_begin + slot)}</span>
<img class="icon" src="${icon}">
`
            div.onclick = () => {
                if (selectedSlot === div) {
                    div.classList.remove("selected")
                    selectedSlot = null
                    if(selectedElem)selectedElem.classList.remove("selected")
                } else {
                    selectedSlot?.classList.remove("selected")
                    selectedSlot = div
                    div.classList.add("selected")
                    
                    const sv=save.get_variable(variable+selectedSlot.dataset.slot)
                    if(selectedElem)selectedElem.classList.remove("selected")
                    selectedElem=vv[sv]
                    selectedElem.classList.add("selected")
                }
            }
            active.appendChild(div)
        }
    }
}
export const DefaultModeSettingsPopup:Record<string,ModeSettingsPopupDef>={
    normal:{
        title:"Normal Mode Settings",
        inputs:[
            {type:"h2",name:"Players"},
            {
                type:"input",
                tname:"Limit",
                var:"players.limit",
                placeholder:"100"
            },
            {
                type:"input",
                tname:"Map",
                var:"map.def",
                placeholder:"normal"
            },
        ]
    },
    debug:{
        title:"Debug",
        inputs:[
            {type:"h2",name:"Players"},
            {
                type:"input",
                tname:"Limit",
                var:"players.limit",
                placeholder:"100"
            },
        ]
    },
    counter_md:{
        title:"Counter MD Settings",
        inputs:[
            //Players
            {type:"h2",tname:"Players"},
            {
                type:"input",
                tname:"Limit",
                var:"players.limit",
                placeholder:"10"
            },
            //Earns
            {type:"h3",tname:"Earns"},
            {
                type:"input",
                tname:"Kill",
                var:"players.earns.kill",
                placeholder:"150"
            },
            {
                type:"input",
                tname:"Join",
                var:"players.earns.join",
                placeholder:"300"
            },
            {
                type:"input",
                tname:"Win",
                var:"players.earns.win",
                placeholder:"500"
            },
            {
                type:"input",
                tname:"Lose",
                var:"players.earns.Lose",
                placeholder:"700"
            },
            //Rules
            {type:"h2",tname:"Game Rules"},
            {
                type:"input",
                tname:"Team Need Win",
                var:"rules.team_need_win",
                placeholder:"5"
            },
            {
                type:"input",
                tname:"Freeze Time",
                var:"rules.freeze_time",
                placeholder:"8"
            },
            {
                type:"input",
                tname:"Round Time",
                var:"rules.round_time",
                placeholder:"120"
            },
            // Map
            {type:"h2",tname:"Map"},
            {
                type:"input",
                tname:"Map",
                var:"map",
                placeholder:"counter_md_normal"
            },
        ]
    }
}

export async function MenuInitDefault(menu:MenuManager,definitions:GameDefinition,fs:FileManager,translation:TranslationManager,resources:ResourcesManager,mods?:CModsManager){
    const campaign_path="scripts/campaign"
    const campaign=parseJSONC(await fs.read_file(campaign_path+"/main.jsonc"))
    for(const c in campaign.charpters){
        for(const l in campaign.charpters[c].levels){
            const path=campaign_path+"/"+campaign.charpters[c].levels[l]
            const txt=await fs.read_file(path+"/level.jsonc")
            campaign.charpters[c].levels[l]=parseJSONC(txt)
            campaign.charpters[c].levels[l].path=path
        }
    }
    const play_subtabs={
        "campaign_level_selector":{
            generate:make_menu_campaign(campaign)
        },
        "editor":{
            generate:(parent,m)=>{
                parent.innerHTML = `
<h2>Start Editor</h2>
<button class="btn-green" id="btn-open-editor">Open Editor</button>
`
                const btn = parent.querySelector("#btn-open-editor") as HTMLButtonElement
                btn.onclick=(_e)=>m.play_callback?.({
                    type:"editor",
                })
            }
        },
        "replays":{
            generate: (parent, manager) => {
                parent.innerHTML = `
                <h2>Play Replay</h2>
                <div class="replay-upload menu-panel-blue">
                    <input type="file" id="replay-file-input" accept=".replay,.repl, .rpl" class="text-input-green"/>
                    <button class="btn-green" id="btn-load-replay">Load Replay</button>
                </div>`

                const input = parent.querySelector("#replay-file-input") as HTMLInputElement
                const btn = parent.querySelector("#btn-load-replay") as HTMLButtonElement

                const fm = new BrowserFileManager()

                const loadReplay = async () => {
                    const file = input.files?.[0]
                    if (!file) return
                    await fm.registerFile("replay", file)
                }

                input.onchange = loadReplay
                btn.onclick = async()=>{
                    const handle = await fm.open("replay", "r")
                    if (manager.play_callback) {
                        manager.play_callback({
                            type: "replay",
                            handle
                        })
                    }
                }
            }
        },
    } as Record<string,MenuSubTabDef>
    const play_options:SubMenuOption[]=[]
    if(sandbox_version){
        play_options.push(
            {
                type:"label",
                name:"menu.play.label-online",
            },
            {
                type:"button",
                id:"host_game",
                name:"menu.play.host-game",
                subtab:"host_game"
            },
            {
                type:"button",
                id:"join_game",
                name:"menu.play.join-game",
                subtab:"join_game"
            }
        )
        play_subtabs["host_game"]={
            generate:(p,_m)=>{
                p.innerHTML=`
<h3>Server</h3>
<div>Server Port<br><input class="text-input-green" placeholder="Server Port" id="insert-server-port" value="8080"></input></div>
<div>Server Password<br><input class="text-input-green" placeholder="Server Password" id="insert-server-password" value=""></input></div>
<h3>Game</h3>
<div>Mode ID<br><input class="text-input-green" placeholder="Mode ID" id="insert-mode-id" value="normal"></input></div>
<div>Mode Settings<br><input class="text-input-green" placeholder="Mode Settings" id="insert-game-settings" value="{}"></input></div>
<button class="btn-green" id="btn-edit-mode-settings">Edit Mode Settings</input>
<button class="btn-green" id="btn-host-join-game">Host And Join</input>
`
                const port_input=p.querySelector("#insert-server-port") as HTMLInputElement
                const password_input=p.querySelector("#insert-server-password") as HTMLInputElement

                const mode_input=p.querySelector("#insert-mode-id") as HTMLInputElement
                const game_settings_input=p.querySelector("#insert-game-settings") as HTMLInputElement

                let btn=p.querySelector("#btn-host-join-game") as HTMLButtonElement
                btn.onclick = async () => {
                    const port=parseInt(port_input.value)
                    const settings = JSON.parse(game_settings_input.value)
                    menu.set_loading_current("Creating Server")
                    await exec_server(
                        port,
                        mode_input.value,
                        settings,
                        password_input.value
                    )
                    if(menu.play_callback){
                        menu.play_callback({
                            type:"join",
                            url:`ws://localhost:${port}/api/ws`,
                            password:password_input.value,
                            attempts:5,
                            delay:500
                        })
                    }
                }
                btn=p.querySelector("#btn-edit-mode-settings") as HTMLButtonElement
                btn.onclick=async()=>{
                    game_settings_input.value=await menu.game_popup(game_mode_settings_manager_popup(JSON.parse(game_settings_input.value),translation,DefaultModeSettingsPopup[mode_input.value]))
                }
            }
        }
        play_subtabs["join_game"]={
            generate:(p,_m)=>{
                p.innerHTML=`
<div>Server IP<br><input class="text-input-green" placeholder="Server IP" id="insert-server-ip" value="localhost:8080"></input></div>
<div>Server Password<br><input class="text-input-green" placeholder="Server Password" id="insert-server-password" value=""></input></div>
<button class="btn-green" id="btn-join-game" value="{}">Play</input>
`
                const ip_input=p.querySelector("#insert-server-ip") as HTMLInputElement
                const password_input=p.querySelector("#insert-server-password") as HTMLInputElement

                const btn=p.querySelector("button") as HTMLButtonElement
                btn.onclick = () => {
                    if(menu.play_callback)menu.play_callback({
                        type:"join",
                        url:(ip_input.value.startsWith("ws://")||ip_input.value.startsWith("wss://"))?ip_input.value:`ws://${ip_input.value}/api/ws`,
                        password:password_input.value,
                        attempts:2,
                        delay:1000,
                    })
                }
            }
        }
    }else if(menu.api_settings){
        play_options.push(
            {
                type:"label",
                name:"menu.play.label-online",
            },
            {
                type:"button",
                id:"play-online",
                name:"menu.play.play-online",
                subtab:"play_online"
            },
            {
                type:"button",
                id:"group",
                name:"menu.play.group",
                subtab:"group"
            }
        )
        play_subtabs["play_online"]={
            generate:make_menu_play_options(menu.api_settings?.play_options??[])
        }
        play_subtabs["group"]={
            generate:(p,m)=>{
                if(!m.group_state){
                    p.innerHTML=`
<div><input class="text-input-green" placeholder="Group ID" id="insert-group-id"></input></div>
<button class="btn-green" id="btn-create-group" value="{}">Create</input>
<button class="btn-green" id="btn-join-game" value="{}">Join</input>
`
                    const id_input=p.querySelector("#insert-group-id") as HTMLInputElement

                    const create_btn=p.querySelector("#btn-create-group") as HTMLButtonElement
                    const joinBtn=p.querySelector("#btn-join-game") as HTMLButtonElement
                    create_btn.onclick=() => {
                        m.create_group()
                    }
                    joinBtn.onclick=()=>{
                        if(!id_input.value.trim())return
                        m.join_group(id_input.value.trim())
                    }
                }else{
                    const g=m.group_state
                    const isLeader=g.self===g.leader

                    p.innerHTML=`
                    <h3>Group ${g.code}
<div style="display:flex;gap:8px;flex-wrap:wrap;">
<button id="btn-copy-code" class="btn-blue">Copy Code</button>
${sandbox_version?"":`<button id="btn-copy-link" class="btn-blue">Copy Invite Link</button></h3>`}
</div>
<p>Leader:${isLeader?"You":"Player "+g.leader}</p>
<div class="settings-row">
    <span class="span-text">Locked</span>
    ${
        isLeader
        ? `<input
            type="checkbox"
            id="group-lock-toggle"
            class="checkbox-blue"
            ${g.locked?"checked":""}
        >`
        : `<span class="span-text">${g.locked?"Yes":"No"}</span>`
    }
</div>

<div class="settings-row">
    <span class="span-text">Autofill</span>
    ${
        isLeader
        ? `<input
            type="checkbox"
            id="group-autofill-toggle"
            class="checkbox-blue"
            ${g.autofill?"checked":""}
        >`
        : `<span class="span-text">${g.autofill?"On":"Off"}</span>`
    }
</div>
<button id="btn-leave" class="btn-red">Leave</button>`;
                    (p.querySelector("#btn-leave") as HTMLButtonElement).onclick=()=>m.leave_group();
                    (p.querySelector("#btn-copy-code") as HTMLButtonElement).onclick=async()=>{
                        await navigator.clipboard.writeText(g.code)
                        alert("Group code copied.")
                    }
                    if(!sandbox_version){
                        (p.querySelector("#btn-copy-link") as HTMLButtonElement).onclick=async()=>{
                            await navigator.clipboard.writeText(`${location.origin}/?group-id=${g.code}`)
                            alert("Invite link copied.")
                        }
                    }
                    if(isLeader){
                        const lockToggle=p.querySelector("#group-lock-toggle") as HTMLInputElement
                        const fillToggle= p.querySelector("#group-autofill-toggle") as HTMLInputElement
                        lockToggle.onchange=()=>{
                            const value=lockToggle.checked
                            g.locked=value
                            m.team_ws?.send(JSON.stringify({type:"lock",value }))
                        }
                        fillToggle.onchange=()=>{
                            const value=fillToggle.checked
                            g.autofill=value
                            m.team_ws?.send(JSON.stringify({type:"autofill",value}))
                        }
                    }
                }
            }
        }
    }
    play_options.push(
        {
            type:"label",
            name:"menu.play.label-campaign",
        },
        {
            type:"button",
            id:"campaign-level-selector",
            name:"menu.play.level-selector",
            subtab:"campaign_level_selector"
        },
        {
            type:"label",
            name:"menu.play.label-files",
        },
        {
            type:"button",
            id:"editor",
            name:"menu.play.editor",
            subtab:"editor"
        },
        {
            type:"button",
            id:"replays",
            name:"menu.play.replay",
            subtab:"replays"
        },
    )
    const hairs_types:SettingOption[]=[]
    const shirts_types:SettingOption[]=[]
    for(const l in definitions.loadout.value){
        if(definitions.loadout.value[l].item===LoadoutItemKind.Hair){
            hairs_types.push({
                name:definitions.loadout.value[l].idString,
                value:definitions.loadout.value[l].idString
            })
        }else if(definitions.loadout.value[l].item===LoadoutItemKind.Shirt){
            shirts_types.push({
                name:definitions.loadout.value[l].idString,
                value:definitions.loadout.value[l].idString
            })
        }
    }
    menu.reload_tabs([
        {
            id:"play",
            name:"menu.options.play",
            subtabs:play_subtabs,
            options:play_options
        },
        {
            id:"settings",
            name:"menu.options.settings",
            options:[
                {
                    id:"game",
                    type:"button",
                    name:"menu.settings.game",
                    subtab:"game"
                },
                {
                    id:"graphics",
                    type:"button",
                    name:"menu.settings.graphics",
                    subtab:"graphics"
                },
                {
                    id:"sounds",
                    type:"button",
                    name:"menu.settings.sounds",
                    subtab:"sounds"
                },
                {
                    id:"ui",
                    type:"button",
                    name:"menu.settings.ui",
                    subtab:"ui"
                },
                {
                    id:"keybinds",
                    type:"button",
                    name:"menu.settings.keybinds",
                    subtab:"keybinds"
                }
            ],
            subtabs:{
                "game":{
                    generate:make_menu_settings(menu.save,"menu.settings.game",[
                        menu.api_settings?{
                            type:"enum",
                            tname:"settings.game.region",
                            var:"sv_game_region",
                            options:menu.api_settings.regions.map((v)=>{
                                return {
                                    name:menu.translation.get("region."+v),
                                    value:v
                                }
                            }),
                        }:undefined,
                        {
                            type:"toggle",
                            tname:"settings.game.interpolation",
                            var:"sv_game_interpolation",
                        },
                        {
                            type:"toggle",
                            tname:"settings.game.client_rot",
                            var:"sv_game_client_rot",
                        },
                        {
                            type:"toggle",
                            tname:"settings.game.friendly_fire",
                            var:"sv_game_friendly_fire",
                        },
                        {
                            type:"toggle",
                            tname:"settings.game.ammo_outline",
                            var:"sv_game_ammo_outline",
                        },
                    ],translation)
                },
                "graphics":{
                    generate:make_menu_settings(menu.save,"menu.settings.graphics",[
                        {
                            type:"enum",
                            tname:"settings.graphics.resolution",
                            var:"sv_graphics_resolution",
                            options:[
                                {name:"Low",value:"low"},
                                {name:"Medium",value:"medium"},
                            ],
                        },
                        {
                            type:"enum",
                            tname:"settings.graphics.particles",
                            var:"sv_graphics_particles",
                            options:[
                                {name:"No",value:"0"},
                                {name:"Minimum",value:"1"},
                                {name:"Normal",value:"2"},
                            ],
                        },
                        {
                            type:"toggle",
                            tname:"settings.graphics.shadows",
                            var:"sv_graphics_shadows",
                        },
                        {
                            type:"toggle",
                            tname:"settings.graphics.perspective",
                            var:"sv_graphics_perspective",
                        },
                        /*{
                            type:"enum",
                            tname:"settings.graphics.lights",
                            var:"sv_graphics_lights",
                            options:[
                                {tname:"No",value:"0"},
                                {tname:"Minimum",value:"1"},
                                {tname:"Normal",value:"2"},
                            ],
                        },*/
                        {
                            type:"enum",
                            tname:"settings.graphics.post_proccess",
                            var:"sv_graphics_post_proccess",
                            options:[
                                {name:"No",value:"0"},
                                {name:"Minimum",value:"1"},
                                {name:"Normal",value:"2"},
                            ],
                        },
                        {
                            type:"toggle",
                            tname:"settings.graphics.climate",
                            var:"sv_graphics_climate",
                        },
                        {
                            type:"toggle",
                            tname:"settings.graphics.fullscreen",
                            var:"sv_graphics_fullscreen",
                            on_set(enable:boolean){
                                set_full_screen(enable)
                            }
                        },
                    ],translation),
                },
                "sounds":{
                    generate:make_menu_settings(menu.save,"menu.settings.sounds",[
                        {
                            type:"range",
                            tname:"settings.sounds.master_volume",
                            var:"sv_sounds_master_volume",
                            on_set:(v:number)=>{
                                menu.sounds.master_bus.set_volume(Numeric.clamp(v,0,1))
                            },
                            min:0,
                            max:1,
                            step:0.05
                        },
                        {
                            type:"range",
                            tname:"settings.sounds.music_volume",
                            var:"sv_sounds_music_volume",
                            on_set:(v:number)=>{
                                menu.sounds.get_bus("music").set_volume(Numeric.clamp(v,0,1))
                            },
                            min:0,
                            max:1,
                            step:0.05
                        },
                        {
                            type:"range",
                            tname:"settings.sounds.ambient_volume",
                            var:"sv_sounds_ambient_volume",
                            on_set:(v:number)=>{
                                menu.sounds.get_bus("ambience").set_volume(Numeric.clamp(v,0,1))
                            },
                            min:0,
                            max:1,
                            step:0.05
                        },
                        {
                            type:"toggle",
                            tname:"settings.sounds.gameplay_music",
                            var:"sv_sounds_gameplay_music",
                        },
                    ],translation),
                },
                "ui":{
                    generate:make_menu_settings(menu.save,"menu.settings.ui",[
                        {
                            type:"color",
                            tname:"settings.ui.primary_color",
                            var:"sv_ui_primary_color",
                        },
                        {
                            type:"color",
                            tname:"settings.ui.secondary_color",
                            var:"sv_ui_secondary_color",
                        },
                        {
                            type:"color",
                            tname:"settings.ui.tertiary_color",
                            var:"sv_ui_tertiary_color",
                        },
                        {
                            type:"color",
                            tname:"settings.ui.positive_color",
                            var:"sv_ui_positive_color",
                        },
                        {
                            type:"color",
                            tname:"settings.ui.negative_color",
                            var:"sv_ui_negative_color",
                        },
                        {
                            type:"color",
                            tname:"settings.ui.special_color",
                            var:"sv_ui_special_color",
                        },
                        {
                            type:"enum",
                            tname:"settings.ui.translation",
                            var:"sv_ui_translation",
                            options:[
                                {name:"English",value:"en"},
                                {name:"Espanhol",value:"es"},
                                {name:"Brazilian Portuguese",value:"pt-br"},
                                {name:"Turkish",value:"tr"},
                                {name:"Ak-47",value:"ak47"},
                            ],
                        },
                        (isMobile||Debug.force_mobile)?undefined:{
                            type:"toggle",
                            tname:"settings.ui.interactive",
                            var:"sv_ui_interactive",
                        },
                        {
                            type:"toggle",
                            tname:"settings.ui.show_intro",
                            var:"sv_ui_show_intro",
                        }
                    ],translation),
                },
                "keybinds":{
                    generate:(parent,_m)=>{
                        const generate_actions=()=>{
                            parent.innerHTML=`<h1 class="span-text-base">${translation.get("menu.settings.keybinds")}</h1>`
                            const actions=menu.save.input_manager?.actions ?? {}
                            for(const [name,action] of Object.entries(actions)){
                                const row=document.createElement("div")
                                row.className="settings-row"

                                const current=document.createElement("span")
                                current.className="span-text"
                                current.textContent=" "+menu.input.action_to_string(name)

                                const btn=document.createElement("button")
                                btn.className="btn-blue"
                                btn.textContent=translation.get("keybinds."+name)

                                btn.onclick=async()=>{
                                    btn.blur()
                                    const key=await menu.game_popup(async(ctx)=>{
                                        ctx.parent.innerHTML=`
                                        <h2>Waiting Key</h2>
                                        <p>Press any key...</p>
                                        `
                                        ctx.resolve(await menu.input.wait_for_any_key())
                                    })
                                    menu.save.set_action(name,{
                                        ...action,
                                        keys:[key]
                                    })
                                    current.textContent=" "+menu.input.action_to_string(name)
                                }
                                row.append(btn,current)
                                parent.appendChild(row)
                            }
                            parent.appendChild(reset)
                        }
                        const reset=document.createElement("button")
                        reset.className="btn-red"
                        reset.textContent="Reset Keybinds"
                        reset.onclick=()=>{
                            menu.save.input_manager?.resetAllActions()
                            if(menu.save.current_save){
                                menu.save.save(menu.save.current_save)
                            }
                            generate_actions()
                        }
                        generate_actions()
                    }
                }
            },
            on_close(_m){
                //self.location.reload()
            }
        },
        {
            id:"loadout",
            name:"menu.options.loadout",
            options:[
                {
                    id:"character",
                    type:"button",
                    name:"menu.loadout.character",
                    subtab:"character"
                },
                {
                    id:"emotes",
                    type:"button",
                    name:"menu.loadout.emotes",
                    subtab:"emotes"
                },
                {
                    id:"wrapping",
                    type:"button",
                    name:"menu.loadout.wrapping",
                    subtab:"wrapping"
                },
                {
                    id:"badge",
                    type:"button",
                    name:"menu.loadout.badges",
                    subtab:"badges"
                },
            ],
            subtabs:{
                "character":{
                    generate:make_menu_settings(menu.save,"menu.loadout.character",[
                        {
                            type:"input",
                            tname:"loadout.character.name",
                            var:"sv_loadout_name",
                            limit:GameConstants.player.max_name_size
                        },
                        {
                            type:"color",
                            tname:"loadout.character.hair_tint",
                            var:"sv_loadout_hair_tint",
                        },
                        {
                            type:"enum",
                            tname:"loadout.character.hair_type",
                            var:"sv_loadout_hair",
                            options:hairs_types,
                        },
                        {
                            type:"enum",
                            tname:"loadout.character.body_tint",
                            var:"sv_loadout_body_tint",
                            options:[
                                {
                                    name:"1",
                                    value:"#f0a93f"
                                },
                                {
                                    name:"2",
                                    value:"#a06e22"
                                },
                                {
                                    name:"3",
                                    value:"#a06e22"
                                },
                                {
                                    name:"4",
                                    value:"#d8a14e"
                                },
                                {
                                    name:"5",
                                    value:"#ffcb7c"
                                },
                                {
                                    name:"6",
                                    value:"#f39f67"
                                }
                            ]
                        },
                        {
                            type:"toggle",
                            tname:"loadout.character.female",
                            var:"sv_loadout_female",
                        },
                        {
                            type:"enum",
                            tname:"loadout.character.shirt",
                            var:"sv_loadout_shirt",
                            options:shirts_types,
                        },
                    ],translation)
                },
                "emotes":{
                    generate:make_emotes_settings(menu.save,resources,definitions,Object.values(definitions.emotes.value),translation)
                },
                "wrapping":{
                    generate:(()=>{
                        const wrapping=Object.values(definitions.wrapping.value)
                        return select_loadout_item(menu.save,resources,["",...wrapping.map((w)=>w.idString)],["weapons"],"/assets/img/menu/loadout/wrapping/wr_","sv_loadout_wrapping_","wrapping.","loadout.wrapping.",translation)
                    })()
                },
                "badges":{
                    generate:(()=>{
                        const badges=Object.values(definitions.badges.value)
                        return make_badges_settings(menu.save,resources,badges,translation)
                    })()
                },
            },
        },
        ((sandbox_version&&mods)?({
            name:"menu.options.mods",
            id:"mods",
            options:[
                {
                    id:"mods_list",
                    name:"menu.mods.mods-list",
                    type:"button",
                    subtab:"mods_list"
                }
            ],
            subtabs:{
                "mods_list":{
                    generate:(_p,_m)=>{

                    },
                    on_open:mods.menu_manage.bind(mods)
                }
            },
            on_close(_m){
                if(mods.state_changed)self.location.reload()
            }
        }):undefined),
        {
            id:"about",
            name:"menu.options.about",
            subtabs:{
                "social":{
                    generate:(parent:HTMLDivElement,_m:MenuManager)=>{
                        parent.innerHTML=`
<h1 class="span-text-base">${translation.get("menu.about.social")}</h1>
<div class="social-links">
    <a href="${socials.discord}" target="_blank" class="social-link">
        <i class="social-icon discord"></i>
    </a>
    <a href="${socials.youtube}" target="_blank" class="social-link">
        <i class="social-icon youtube"></i>
    </a>
    <a href="${socials.github}" target="_blank" class="social-link">
        <i class="social-icon github"></i>
    </a>
</div>`
                    }
                },
                "news":{
                    generate:async(parent:HTMLDivElement,_m:MenuManager)=>{
                        const news_path="/scripts/news/"
                        parent.innerHTML=`<h1 class="span-text-base">${translation.get("menu.about.news")}</h1>`
                        const news=await(await fetch(news_path+"main.json")).json() as {order:{title:string,id:string}[]}
                        for(const n of news.order){
                            parent.innerHTML+=`<h2 class="span-text">${n.title}</h2>`
                            const d=document.createElement("div")
                            d.classList.add("update-item")
                            d.innerHTML=`<div class="menu-panel-blue background-menu-tt">${formatToHtml(await (await fetch(news_path+"content/"+n.id+".md")).text())}</div>`
                            //d.innerHTML+=`<a href="/pages/news/?id=${n.id}"><h3 class="span-text">See More</h3></a>`
                            parent.appendChild(d)
                        }
                    }
                },
                "rules":{
                    generate:(parent:HTMLDivElement,_m:MenuManager)=>{
                        parent.innerHTML=`
<h1 class="span-text-base">${translation.get("menu.about.rules")}</h1>
<span>
<h2>Rules</h2>
<hr>
<h3>- Scripts, Hack, Macro and other</h3>
<h4>What Is A Hack?</h4>
<ul>
<p>
Hack Is An External Program That Gives Super Powers Or Improve Your Skills.
Programs Like Improved Client:
When Increse The Fps, Put Some Tools To Reduce Or Improve Graphics, Features Like A FPS Viewer Or More Interpolation.
Are Allowed. Because Dont Improve Your Skill And Give Powers
(Example: Better Client For Surgemd, Where It Optimizes, Etc.)
</p>
</ul>
<hr>
<h3>- Smurf</h3>
<ul>
<p>Smurf Are Illegal In ChampionShips, But Not In Ranked Matches(But Dont Abuse Of Smurf In Ranked Matches Else Warn)</p>
</ul>
<hr>
<h3>- Account Share</h3>
<ul>
<p>
Account Share Are Allowed.
but remember what the user does with his account is YOUR responsibility.
share your account just with peoples when you trust
</p>
</ul>
<hr>
<h3>Fake News</h3>
<ul>
<p>
content spreading any lie is prohibited.
example: I Play The New Update Of Surgemd.io Before Everyone.
If fake news is something that is not meant to be taken seriously, like jokes and memes: there shouldn't even be a punishment.
But if it's something serious, like: YouTube, Tiktok Or Instagram videos with the sole purpose of making money.
Spreading fake news about the game's future on credible sites, except forums.
menu.rule only applies to fake news. Criticism of the game is not considered fake news.
Without Power Abuse And Censure.
</p>
</ul>
<hr>
<h3>Toxic Behaviour</h3>
<ul>
<p>
Toxic Behaviour Are Not Allowed.
Racism, Xenofoby, Swearing And Another Things.
Toxic Behaviour Is Just Allowed In Private Rooms.
But In Public Rooms No.
</p>
</ul>
<hr>
<h3>Glitchs, Bugs And Exploits</h3>
<ul>
<p>
Bugs And Exploit Are Allowed.
Example Of Bug:
You Are Playing And You Kill Someone hitting the air.
menu.is a bug(luck).
Example Of Exploit:
Quickswitch And Overclock
Glitchs:
Glitchs Are Allowed Just To Report. If You Want Report A Glith For Developers You Have Permition To Do The Glitch.
Example Of Glithcs:
Infinity Ammo. Infinity Consumibles
</p>
</ul>
<hr>
<h3><strong>Most important rule</strong></h3>
<ul>
<p>
do not commit crimes, the punishment will vary depending on how heavy it was on your country
menu.rule is above everyone, even me, everyone has to follow it.
<h4>Examples</h4>
<p>
copyright theft, scan, harassment, doxing
</p>
</p>
</ul>
</span>`
                    }
                },
                "credits":{
                    generate:(parent:HTMLDivElement,_m:MenuManager)=>{
                        parent.innerHTML=`
<span>
${formatToHtml(make_credits_markdown(FinalCredits))}
</span>
`
                    }
                }
            },
            options:[
                {
                    type:"button",
                    id:"social",
                    name:"menu.about.social",
                    subtab:"social"
                },
                {
                    type:"button",
                    id:"news",
                    name:"menu.about.news",
                    subtab:"news"
                },
                {
                    type:"button",
                    id:"rules",
                    name:"menu.about.rules",
                    subtab:"rules"
                },
                {
                    type:"button",
                    id:"credits",
                    name:"menu.about.credits",
                    subtab:"credits"
                },
            ],
        }
    ])
}