// deno-lint-ignore-file no-explicit-any
import { cloneDeep, deleteDeep, FileManager, getDeep, Numeric, setDeep } from "common/engine/core.ts";
import { type MenuManager } from "../managers/menuManager.ts";
import { GamemodeConfig } from "common/scripts/config/config.ts";
import { formatToHtml, GameSave } from "common/engine/client.ts";
import { type CModsManager } from "../managers/modsManager.ts";
import { sandbox_version } from "../others/config.ts";
import { exec_server, set_full_screen } from "./go_files.ts";

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
type SettingOption = {
  name: string
  value: string | number
}

type SettingDef =
    {
        type:"input"
        name:string
        var:string
        placeholder?:string
    }|{
        var: string
        name: string
        type: "choose"
        options: SettingOption[]
        on_set?:(val:number|string)=>void
    }|{
        var: string
        name: string
        type: "toggle"
        on_set?:(val:boolean)=>void
    }|{
        var: string
        name: string
        type: "range"
        min: number
        max: number
        step?: number
        on_set?:(val:number)=>void
    }|{
        type:"h1"|"h2"|"h3"|"h4"|"h5"
        name:string
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
function build_setting_input(def: SettingDef,onChange:(val:any)=>void,initial?:any): HTMLElement {
    if(def.type==="h1"||def.type==="h2"||def.type==="h3"||def.type==="h4"||def.type==="h5"){
        const header=document.createElement(def.type)
        header.textContent=def.name
        return header
    }

    const row=document.createElement("div")
    row.className="settings-row"

    const label=document.createElement("span")
    label.textContent=def.name
    row.appendChild(label)

    let el:HTMLElement

    switch(def.type){
        case "input":{
            const i=document.createElement("input")
            i.className="input-green"
            if(def.placeholder)i.placeholder=def.placeholder
            if(initial!==undefined)i.value=initial
            i.onchange=()=>onChange(i.value)
            el=i
            break
        }
        case "toggle":{
            const c=document.createElement("input")
            c.type="checkbox"
            c.className="checkbox-blue"
            if(initial!==undefined){
                c.checked=!!initial
                def.on_set?.(c.checked)
            }
            c.onchange=()=>{
                onChange(c.checked)
                def.on_set?.(c.checked)
            }
            el=c
            break
        }
        case "choose":{
            const s=document.createElement("select")
            s.className="select-blue"

            for(const opt of def.options){
                const o=document.createElement("option")
                o.textContent=opt.name
                o.value=String(opt.value)
                def.on_set?.(opt.value)
                s.appendChild(o)
            }

            if(initial!==undefined){
                s.value=String(initial)
                def.on_set?.(initial)
            }

            s.onchange=()=>onChange(s.value)

            el=s
            break
        }
        case "range":{
            const slider=document.createElement("input")
            slider.type="range"
            slider.className="slider-blue"
            slider.min=String(def.min)
            slider.max=String(def.max)
            slider.step=String(def.step??1)

            if(initial!==undefined){
                slider.value=String(initial)
                def.on_set?.(initial)
            }

            const valueLabel=document.createElement("span")
            valueLabel.textContent=slider.value

            slider.oninput=()=>{
                const val=Number(slider.value)
                valueLabel.textContent=slider.value
                def.on_set?.(val)
                onChange(val)
            }

            const wrap=document.createElement("div")
            wrap.append(slider,valueLabel)

            el=wrap
            break
        }
    }

    row.appendChild(el)
    return row
}

export function game_mode_settings_manager_popup(settings:any,def:ModeSettingsPopupDef){
    return (ctx:GamePopupCTX)=>{
        const parent=ctx.parent
        parent.innerHTML=""

        if(def.title){
            const h=document.createElement("h2")
            h.textContent=def.title
            parent.appendChild(h)
        }

        const container=document.createElement("div")
        parent.appendChild(container)

        for(const input of def.inputs){
            const row=build_setting_input(
                input,
                (val)=>{
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
                // deno-lint-ignore ban-ts-comment
                //@ts-ignore
                input.var?getDeep(settings,input.var):""
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
export function make_menu_settings(save: GameSave, defs: SettingDef[]){
    return (parent:HTMLDivElement)=>{
        parent.innerHTML=""

        for(const def of defs){
            parent.appendChild(
                build_setting_input(
                    def,
                    (val)=>{
                        // deno-lint-ignore ban-ts-comment
                        //@ts-ignore
                        save.set_variable(def.var,val)
                    },
                    // deno-lint-ignore ban-ts-comment
                    //@ts-ignore
                    def.var?save.get_variable(def.var):""
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
            h2.className="span"
            h2.textContent=charpter.name
            parent.appendChild(h2)
            for(const l in charpter.levels){
                const level=charpter.levels[l]
                const level_div = document.createElement("div")
                level_div.className="play-select-item background-menu"
                level_div.innerHTML = `
<h1>${level.meta.name}</h1>
<p>${level.meta.description}</p>
<button class="btn-green">Start Level</button>`
                parent.appendChild(level_div)
                const start_btn = level_div.querySelector(`.btn-green`) as HTMLButtonElement
                start_btn.onclick = () => {
                    if(manager.play_callback)manager.play_callback({type:"campaign",level:l as unknown as number,charpter:c as unknown as number})
                }
            }
        }
    }
}
export function make_menu_modes(modes:GamemodeConfig[]){
    return (parent:HTMLDivElement,manager:MenuManager)=>{
        for(const mode of modes){
            const mb=document.createElement("div")
            mb.innerHTML=`
<div class="play-select-item background-menu">
<h1>${mode.gamemode}</h1>
<button id="btn-join-${mode.gamemode}" class="btn-green">Play</button>
</div>`
            const join_btn=mb.querySelector(`#btn-join-${mode.gamemode}`) as HTMLButtonElement
            join_btn.onclick=()=>{
                console.log(`${mode.gamemode}...`)
                if(manager.play_callback)manager.play_callback({type:"online",mode:mode.gamemode,team_size:1})
            }
            parent.appendChild(mb)
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
                name:"Limit",
                var:"players.limit",
                placeholder:"100"
            },
            {
                type:"input",
                name:"Map",
                var:"map",
                placeholder:"normal"
            },
        ]
    },
    counter_md:{
        title:"Counter MD Settings",
        inputs:[
            //Players
            {type:"h2",name:"Players"},
            {
                type:"input",
                name:"Limit",
                var:"players.limit",
                placeholder:"10"
            },
            //Earns
            {type:"h3",name:"Earns"},
            {
                type:"input",
                name:"Kill",
                var:"players.earns.kill",
                placeholder:"150"
            },
            {
                type:"input",
                name:"Join",
                var:"players.earns.join",
                placeholder:"300"
            },
            {
                type:"input",
                name:"Win",
                var:"players.earns.win",
                placeholder:"500"
            },
            {
                type:"input",
                name:"Lose",
                var:"players.earns.Lose",
                placeholder:"700"
            },
            //Rules
            {type:"h2",name:"Game Rules"},
            {
                type:"input",
                name:"Team Need Win",
                var:"rules.team_need_win",
                placeholder:"5"
            },
            {
                type:"input",
                name:"Freeze Time",
                var:"rules.freeze_time",
                placeholder:"8"
            },
            {
                type:"input",
                name:"Round Time",
                var:"rules.round_time",
                placeholder:"120"
            },
            // Map
            {type:"h2",name:"Map"},
            {
                type:"input",
                name:"Map",
                var:"map",
                placeholder:"counter_md_normal"
            },
        ]
    }
}

export async function MenuInitDefault(menu:MenuManager,fs:FileManager,mods?:CModsManager){
    const campaign=JSON.parse(await fs.read_file("scripts/campaign.json"))
    menu.campaign=cloneDeep(campaign)
    for(const c in campaign.charpters){
        for(const l in campaign.charpters[c].levels){
            campaign.charpters[c].levels[l]=JSON.parse(await fs.read_file(campaign.charpters[c].levels[l]))
        }
    }
    const play_subtabs={
        "campaign_level_selector":{
            generate:make_menu_campaign(campaign)
        },
    } as Record<string,MenuSubTabDef>
    const play_options:SubMenuOption[]=[
        {
            type:"label",
            name:"Campaign",
        },
        {
            type:"button",
            id:"campaign-level-selector",
            name:"Level Selector",
            subtab:"campaign_level_selector"
        },
        {
            type:"label",
            name:"Online",
        },
    ]
    if(sandbox_version){
        play_options.push(
            {
                type:"button",
                id:"host_game",
                name:"Host Game",
                subtab:"host_game"
            },
            {
                type:"button",
                id:"join_game",
                name:"Join Game",
                subtab:"join_game"
            }
        )
        play_subtabs["host_game"]={
            generate:(p,_m)=>{
                p.innerHTML=`
<h3>Server</h3>
<div>Server Port<br><input class="input-green" placeholder="Server Port" id="insert-server-port" value="8080"></input></div>
<div>Server Password<br><input class="input-green" placeholder="Server Password" id="insert-server-password" value=""></input></div>
<h3>Game</h3>
<div>Mode ID<br><input class="input-green" placeholder="Mode ID" id="insert-mode-id" value="normal"></input></div>
<div>Mode Settings<br><input class="input-green" placeholder="Mode Settings" id="insert-game-settings" value="{}"></input></div>
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
                    menu.show_loading_screen()
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
                    game_settings_input.value=await menu.game_popup(game_mode_settings_manager_popup(JSON.parse(game_settings_input.value),DefaultModeSettingsPopup[mode_input.value]))
                }
            }
        }
        play_subtabs["join_game"]={
            generate:(p,_m)=>{
                p.innerHTML=`
<div>Server IP<br><input class="input-green" placeholder="Server IP" id="insert-server-ip" value="localhost:8080"></input></div>
<div>Server Password<br><input class="input-green" placeholder="Server Password" id="insert-server-password" value=""></input></div>
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
    }else{
        play_options.push({
            type:"button",
            id:"play-online",
            name:"Play",
            subtab:"play_online"
        })
        play_subtabs["play_online"]={
            generate:make_menu_modes(menu.api_settings.modes)
        }
    }
    menu.reload_tabs([
        {
            id:"play",
            name:"Play",
            subtabs:play_subtabs,
            options:play_options
        },
        {
            id:"settings",
            name:"Settings",
            options:[
                {
                    id:"game",
                    type:"button",
                    name:"Game",
                    subtab:"game"
                },
                {
                    id:"graphics",
                    type:"button",
                    name:"Graphics",
                    subtab:"graphics"
                },
                {
                    id:"sounds",
                    type:"button",
                    name:"Sounds",
                    subtab:"sounds"
                }
            ],
            subtabs:{
                "game":{
                    generate:make_menu_settings(menu.save,[
                        {
                            type:"toggle",
                            name:"Interpolation",
                            var:"sv_game_interpolation",
                        },
                        {
                            type:"toggle",
                            name:"Client Side Rotation",
                            var:"sv_game_client_rot",
                        },
                        {
                            type:"toggle",
                            name:"Friendly Fire",
                            var:"sv_game_friendly_fire",
                        },
                    ])
                },
                "graphics":{
                    generate:make_menu_settings(menu.save,[
                        {
                            type:"choose",
                            name:"Textures Quality",
                            var:"sv_graphics_resolution",
                            options:[
                                {name:"Low",value:"low"},
                                {name:"Medium",value:"medium"},
                                {name:"High",value:"high"},
                            ],
                        },
                        {
                            type:"choose",
                            name:"Particles",
                            var:"sv_graphics_particles",
                            options:[
                                {name:"No",value:"0"},
                                {name:"Minimum",value:"1"},
                                {name:"Normal",value:"2"},
                            ],
                        },
                        {
                            type:"choose",
                            name:"Lights",
                            var:"sv_graphics_lights",
                            options:[
                                {name:"No",value:"0"},
                                {name:"Minimum",value:"1"},
                                {name:"Normal",value:"2"},
                            ],
                        },
                        {
                            type:"choose",
                            name:"Post Proccess",
                            var:"sv_graphics_post_proccess",
                            options:[
                                {name:"No",value:"0"},
                                {name:"Minimum",value:"1"},
                                {name:"Normal",value:"2"},
                            ],
                        },
                        {
                            type:"toggle",
                            name:"Climate",
                            var:"sv_graphics_climate",
                        },
                        {
                            type:"toggle",
                            name:"Fullscreen",
                            var:"sv_graphics_fullscreen",
                            on_set(enable:boolean){
                                set_full_screen(enable)
                            }
                        },
                    ]),
                },
                "sounds":{
                    generate:make_menu_settings(menu.save,[
                        {
                            type:"range",
                            name:"Master Volume",
                            var:"sv_sounds_master_volume",
                            on_set:(v:number)=>{
                                menu.sounds.masterVolume=Numeric.clamp(v,0,1)
                            },
                            min:0,
                            max:1,
                            step:0.05
                        },
                        {
                            type:"range",
                            name:"Music Volume",
                            var:"sv_sounds_music_volume",
                            on_set:(v:number)=>{
                                menu.sounds.volumes["music"]=Numeric.clamp(v,0,1)
                            },
                            min:0,
                            max:1,
                            step:0.05
                        },
                        {
                            type:"range",
                            name:"Ambient Volume",
                            var:"sv_sounds_ambient_volume",
                            on_set:(v:number)=>{
                                menu.sounds.volumes["ambience"]=Numeric.clamp(v,0,1)
                            },
                            min:0,
                            max:1,
                            step:0.05
                        },
                    ]),
                }
            }
        },
        ((sandbox_version&&mods)?({
            name:"Mods",
            id:"mods",
            options:[
                {
                    id:"mods_list",
                    name:"Mods List",
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
            name:"About",
            subtabs:{
                "social":{
                    generate:(parent:HTMLDivElement,_m:MenuManager)=>{
                        parent.innerHTML=`
<div id="social-links">
<a href="https://discord.gg/7czkBvtmSU" target="_blank" class="social-link">
    <i class="social-icon discord"></i>
</a>
<a href="https://youtube.com/@kazikni" target="_blank" class="social-link">
    <i class="social-icon youtube"></i>
</a>
<a href="https://github.com/kazikni/surgemd" target="_blank" class="social-link">
    <i class="social-icon github"></i>
</a>
<a href="/files/surgemd-windows-lasted.zip" target="_blank" class="social-link">
    <i class="social-icon selfs"></i>
</a>
<a href="/files/surgemd-linux-lasted.zip" target="_blank" class="social-link">
    <i class="social-icon linux"></i>
</a>
</div>
                        `
                    }
                },
                "news":{
                    generate:(parent:HTMLDivElement,_m:MenuManager)=>{
                        parent.innerHTML=``
                    }
                },
                "rules":{
                    generate:(parent:HTMLDivElement,_m:MenuManager)=>{
                        parent.innerHTML=`
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
${formatToHtml(`
# Surgemd.io
___
## Programmers
* @kazikni
* @viktor_hg
___
## Designers
* @kazikni
* @namerio
* @cheerfulbull_29688
* @endermanking
* @littlethief69
___
## Sound Designers
* Free Sounds On Net
* @teardwop
___
## Musics
* @.ryanzero
* @rivals2444
* Wreckfest
* I Wanna Be The Guy
* Some Youtube Musics
* NoCopyrightSound
* LSPLASH
* Pertubaror/Hotline Miami 2
* Wrectfest
___
## Additional Art
* @sentido_ss
* @bien.star
___
## Inspirations
* Surviv.io
* Suroi.io
* Hotline Miami
* Roblox Doors
* Pixel Gun 3D
* Fortnite
___
## Creator
* Kazikni
___
## Special Thanks To
@hasanger
@1092384
`)}
</span>
`
                    }
                }
            },
            options:[
                {
                    type:"button",
                    id:"social",
                    name:"Social",
                    subtab:"social"
                },
                {
                    type:"button",
                    id:"news",
                    name:"News",
                    subtab:"news"
                },
                {
                    type:"button",
                    id:"rules",
                    name:"Rules",
                    subtab:"rules"
                },
                {
                    type:"button",
                    id:"credits",
                    name:"Credits",
                    subtab:"credits"
                },
            ],
        }
    ])
}