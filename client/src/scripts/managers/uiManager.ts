import { Game } from "../others/game.ts";
import { DamageReason, GameItemType, GameObjectDefinitionType } from "common/scripts/definitions/utils.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { Debug, GraphicsDConfig } from "../others/config.ts";
import { GroupMemberState, MapHumanData, PrivateUpdate, SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
import { EmoteDef } from "common/scripts/definitions/loadout/emotes.ts";
import { GameOverPacket } from "common/scripts/packets/gameOver.ts";
import { CrosshairManager, StaticCrosshair } from "./crosshairManager.ts";
import { GameObject } from "../others/gameObject.ts";
import { disableContextMenuPrevent, enableContextMenuPrevent, HideElement, isMobile, ShowElement } from "common/engine/web.ts";
import { InputActionType } from "common/scripts/packets/input_packet.ts";
import { Human } from "../objects/human.ts";
import { AimCrosshair, DefaultCrosshair } from "../defs/crosshair.ts";
import { BuildingCeiling, type Building } from "../objects/building.ts";
import { InformationBoxModule } from "../uim/information-box.ts";
import { MinimapModule } from "../uim/minimap.ts";
import { FeedMessage, FeedMessageType, GeneralFullMainState, GeneralUpdate } from "common/scripts/packets/general_update.ts";
import { AdditionalInfoModule } from "../uim/additional_info.ts";
import { type Obstacle } from "../objects/obstacle.ts";
import { GameOverScreen, GameOverScreenType } from "common/scripts/config/level_definition.ts";
import { GroupMembersModule } from "../uim/groups.ts";
import { PingDef } from "common/scripts/definitions/loadout/pings.ts";
import { BottomLeftModule } from "../uim/bottom_left_container.ts";
import { InventoryModule } from "../uim/inventory.ts";
import { DamageSourceDef } from "common/scripts/definitions/game_defs.ts";
import { Angle, ColorM, random, v2, v2m, Vec2 } from "common/engine/core.ts";
export interface HelpGuiState{
    driving:boolean
    gun:boolean
    interact:boolean
    information_box_message:string
}
export class UiManager{
    game!:Game

    content={
        menuD:document.querySelector("#menu") as HTMLDivElement,
        gameD:document.querySelector("#game") as HTMLDivElement,
        game_gui:document.querySelector("#game-gui") as HTMLDivElement,

        action_info_delay:document.querySelector("#action-info-delay") as HTMLSpanElement,
        action_info:document.querySelector("#action-info") as HTMLDivElement,

        helmet_slot:document.querySelector("#helmet-slot") as HTMLImageElement,
        vest_slot:document.querySelector("#vest-slot") as HTMLImageElement,

        normal_gameOver:document.querySelector("#normal-gameover-container") as HTMLDivElement,
        restart_gameOver:document.querySelector("#restart-gameover-container") as HTMLDivElement,

        gameover_status_container:document.querySelector("#gameover-status-container") as HTMLDivElement,
        gameOver_main_message:document.querySelector("#gameover-main-message") as HTMLDivElement,
        gameOver_menu_btn:document.querySelector("#gameover-menu-btn") as HTMLButtonElement,

        feed:document.querySelector("#feed-container") as HTMLDivElement,

        leader_container:document.querySelector("#leader-container") as HTMLSpanElement,
        leader_span:document.querySelector("#leader-text") as HTMLSpanElement,

        help_gui:document.querySelector("#help-gui") as HTMLDivElement,

        debug_show:document.querySelector("#debug-show") as HTMLDivElement,

        post_proccess:{
            vignetting:document.querySelector("#vignetting-gfx") as HTMLDivElement,
            tiltshift:document.querySelector("#tiltshift-gfx") as HTMLDivElement,
        },
        emote_wheel:{
            main:document.querySelector("#emote-wheel") as HTMLDivElement,
            hover:document.querySelector("#emote-wheel-hover") as HTMLImageElement,

            emotes:[
                document.querySelector("#emote-wheel-right") as HTMLImageElement,
                document.querySelector("#emote-wheel-bottom") as HTMLImageElement,
                document.querySelector("#emote-wheel-left") as HTMLImageElement,
                document.querySelector("#emote-wheel-top") as HTMLImageElement
            ]
        },

        tooltip:document.querySelector("#item-tooltip") as HTMLDivElement,
        tooltip_title:document.querySelector("#item-tooltip-title") as HTMLDivElement,
        tooltip_description:document.querySelector("#item-tooltip-description") as HTMLDivElement,
    }
    tooltip_element?:HTMLElement
    mobile_content={
        gui:document.querySelector("#game-mobile-gui") as HTMLDivElement,
        left_joystick:document.querySelector("#left-joystick") as HTMLDivElement,
        right_joystick:document.querySelector("#right-joystick") as HTMLDivElement,

        btn_interact:document.querySelector("#btn-mobile-interact") as HTMLButtonElement,
        btn_reload:document.querySelector("#btn-mobile-reload") as HTMLButtonElement,
        btn_emotes:document.querySelector("#btn-mobile-emotes") as HTMLButtonElement,
    }

    feed_enabled:boolean=false

    leader_enabled:boolean=true
    old_leader_enabled:boolean=true
    leader={
        id:-1,
        kills:0
    }
    money:number=0

    hover_objects:Set<GameObject|BuildingCeiling>=new Set()

    game_over_screen:GameOverScreen={
        type:GameOverScreenType.Normal
    }

    group_members:Record<number,GroupMemberState>={}
    map_humans:MapHumanData[]=[]
    constructor(game:Game){
        this.game=game

        HideElement(this.content.normal_gameOver)
        HideElement(this.content.emote_wheel.main)

        if(isMobile||Debug.force_mobile){
            this.mobile_init()
        }

        this.content.gameOver_menu_btn.onclick=this.game.finish_game_over.bind(this.game,false)

        this.game.ui_manager.add(new BottomLeftModule())
        this.game.ui_manager.add(new InventoryModule())
        this.game.ui_manager.add(new MinimapModule())
        this.game.ui_manager.add(new InformationBoxModule())
        this.game.ui_manager.add(new AdditionalInfoModule())
        this.game.ui_manager.add(new GroupMembersModule())
    }
    clear_top_right(){
        this.content.feed.innerHTML=""
        this.content.leader_span.innerText=""
        this.leader={
            id:-1,
            kills:0
        }
        this.content.help_gui.innerText=""
    }
    clear(){
        this.clear_top_right()

        this.players_name={}
        this.group_members={}
        this.game.theme_colors={}
        this.map_humans.length=0

        HideElement(this.content.game_gui)
        HideElement(this.content.normal_gameOver)

        this.enableCrosshair()
        enableContextMenuPrevent()

        this.game.inventory.clear()
        this.game.ui_manager.clear()
        this.hover_objects.clear()
    }
    update_theme(){
        const primary=this.game.get_theme_color("primary")
        const secondary=this.game.get_theme_color("secondary")
        const tertiary=this.game.get_theme_color("tertiary")

        this.content.game_gui.style.setProperty("--ui-theme-primary",primary)
        this.content.game_gui.style.setProperty("--ui-theme-secondary",secondary)
        this.content.game_gui.style.setProperty("--ui-theme-tertiary",tertiary)
        this.content.game_gui.style.setProperty("--ui-theme-positive",this.game.get_theme_color("positive"))
        this.content.game_gui.style.setProperty("--ui-theme-negative",this.game.get_theme_color("negative"))
        this.content.game_gui.style.setProperty("--ui-theme-special",this.game.get_theme_color("special"))

        let color=ColorM.hex(secondary)
        color=ColorM.mult_rgba(color,1,1,1,0.4)
        this.content.game_gui.style.setProperty("--ui-panel-background",ColorM.rgba2hex(color))
        this.content.game_gui.style.setProperty("--ui-panel-border",`0.2vh solid ${primary}`)
        this.content.game_gui.style.setProperty("--ui-panel-box-shadow",this.game.save.get_variable("sv_ui_simple_mode")?"":`0 0 0.5vh ${primary}`)

        this.game.ui_manager.signal("update_theme",{})
    }
    _makeHint(texts: string[]) {
        const div = document.createElement("div")
        for (const t of texts) {
            const span = document.createElement("span")
            span.classList="span-text"
            span.textContent = t
            div.appendChild(span)
        }
        this.content.help_gui.appendChild(div)
        return div
    }
    helpTexts = {
        driving: this._makeHint(["R - Reverse", "E - Leave"]),
        gun: this._makeHint(["R - Reload"]),
        loot: this._makeHint(["E - Take Loot"]),
        interact: this._makeHint(["E - Interact"]),
    }
    mobile_init(){
        this.mobile_open()
        let rotating=false
        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        this.mobile_content.left_joystick.addEventListener("joystickmove",(e:JoystickEvent)=>{
            this.game.input.movement.dir=Math.atan2(e.detail.y,e.detail.x)
            this.game.input.movement.scale=v2.len(e.detail)
            if(!rotating){
                this.game.set_lookTo_angle(this.game.input.movement.dir,2)
            }
        })
        this.mobile_content.left_joystick.addEventListener("joystickend",()=>{
            this.game.input.movement.scale=0
        })
        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        this.mobile_content.right_joystick.addEventListener("joystickmove",(e:JoystickEvent)=>{
            rotating=true
            this.game.aim_line.enabled=true
            const dist=Math.sqrt(e.detail.x*e.detail.x+e.detail.y*e.detail.y)
            /*if(!this.game.active_entity?.current_weapon||this.game.active_entity.current_weapon.item_type!==GameItemType.gun||!this.game.active_entity.current_weapon.fireOnRelease){
                
            }*/

            if(this.game.active_entity?.current_weapon){
                if(this.game.active_entity.current_weapon.item_type===GameItemType.gun){
                    if(dist>0.9){
                        this.game.input.use_weapon=true
                    }else{
                        this.game.input.use_weapon=false
                    }
                }else{
                    this.game.input.use_weapon=true
                }
            }
            this.game.set_lookTo_angle(Math.atan2(e.detail.y,e.detail.x),dist)
        })
        this.mobile_content.right_joystick.addEventListener("joystickend",()=>{
            this.game.input.use_weapon=false
            rotating=false
            this.game.aim_line.enabled=false
        })
        this.mobile_content.btn_interact.addEventListener("click",()=>{
            this.game.input_manager.listener.emit("actiondown",{action:"interact"})
        })
        this.mobile_content.btn_reload.addEventListener("click",()=>{
            this.game.input_manager.listener.emit("actiondown",{action:"reload"})
        })
        this.mobile_content.btn_emotes.addEventListener("click",(e)=>{
            this.begin_emote_wheel(v2(this.game.renderer.canvas.clientWidth/2,this.game.renderer.canvas.clientHeight/2),false)
        })
    }
    emote_wheel={
        positon:v2(0,0),
        world_position:undefined as Vec2|undefined,
        active:false,
        up_enable:true,
        current_side:-1,
        emotes:[] as (EmoteDef|PingDef|undefined)[],
    }
    begin_emote_wheel(position:Vec2,up_enable:boolean=true,emotes?:(EmoteDef|PingDef|undefined)[],world_position?:Vec2,comunication_mode?:boolean){
        if(this.emote_wheel.active)return
        ShowElement(this.content.emote_wheel.main)
        HideElement(this.mobile_content.btn_emotes)
        this.content.emote_wheel.main.style.left=`${position.x}px`
        this.content.emote_wheel.main.style.top=`${position.y}px`
        this.emote_wheel.world_position=world_position  
        this.emote_wheel.positon=position
        this.emote_wheel.active=true
        this.emote_wheel.up_enable=up_enable

        if(!emotes){
            if(this.game.comunication_mode||comunication_mode){
                emotes=[
                    this.game.definitions.pings.getFromString("ping_alert"), // Right
                    this.game.definitions.pings.getFromString("ping_here"),  // Bottom
                    this.game.definitions.pings.getFromString("ping_heal"),  // Left
                    this.game.definitions.pings.getFromString("ping_gift"),  // Top
                ]
            }else{
                emotes=[
                    this.game.definitions.emotes.getFromString(this.game.save.get_variable("sv_loadout_emote_right")),  // Right
                    this.game.definitions.emotes.getFromString(this.game.save.get_variable("sv_loadout_emote_bottom")), // Bottom
                    this.game.definitions.emotes.getFromString(this.game.save.get_variable("sv_loadout_emote_left")),   // Left
                    this.game.definitions.emotes.getFromString(this.game.save.get_variable("sv_loadout_emote_top")),    // Top
                ]
            }
            
        }
        this.emote_wheel_set_emotes(emotes)
    }
    end_emote_wheel(force:boolean=false){
        if(!this.emote_wheel.active)return
        if(!this.emote_wheel.up_enable&&!force)return
        HideElement(this.content.emote_wheel.main)
        ShowElement(this.mobile_content.btn_emotes)
        this.emote_wheel.active=false
        let selected_emote:EmoteDef|PingDef|undefined=undefined
        if(this.emote_wheel.current_side!==-1){
            selected_emote=this.emote_wheel.emotes[this.emote_wheel.current_side]
        }
        if(selected_emote){
            if(this.game.definitions.pings.exist(selected_emote.idString)){
                let pos:Vec2|undefined=this.emote_wheel.world_position
                if(!pos){
                    pos=this.game.scene_2d.camera.to_world(this.emote_wheel.positon)
                    v2m.add(pos,pos,this.game.scene_2d.camera.position)
                }
                this.game.input.actions.push({
                    type:InputActionType.ping,
                    ping:selected_emote.idNumber!,
                    position:pos
                })
            }else{
                this.game.input.actions.push({
                    type:InputActionType.emote_emote,
                    emote:selected_emote.idNumber!
                })
            }
        }
    }
    update_emote_wheel(){
        if (this.emote_wheel.active) {
            const angle = Angle.rad2deg(v2.lookTo(this.emote_wheel.positon, this.game.input_manager.mouse_position))
            const distance = v2.distance(this.emote_wheel.positon, this.game.input_manager.mouse_position)

            const chsrc = "/assets/img/menu/gui/emote_wheel_hover_center.svg"
            const shsrc = "/assets/img/menu/gui/emote_wheel_hover.svg"

            const norm = (angle + 360) % 360

            if (distance > 18) {
                if (this.content.emote_wheel.hover.src !== shsrc) {
                    this.content.emote_wheel.hover.src = shsrc
                }
                let sideClass = "wheel-hover"
                if (norm >= 45 && norm < 135) {
                    sideClass += " wheel-hover-bottom"
                    this.emote_wheel.current_side=1
                } else if (norm >= 135 && norm < 225) {
                    sideClass += " wheel-hover-left"
                    this.emote_wheel.current_side=2
                } else if (norm >= 225 && norm < 315) {
                    sideClass += " wheel-hover-top"
                    this.emote_wheel.current_side=3
                } else {
                    sideClass += " wheel-hover-right"
                    this.emote_wheel.current_side=0
                }
                if (this.content.emote_wheel.hover.className !== sideClass) {
                    this.content.emote_wheel.hover.className = sideClass
                }
            } else {
                this.emote_wheel.current_side=-1
                if (this.content.emote_wheel.hover.src !== chsrc) {
                    this.content.emote_wheel.hover.src = chsrc
                    this.content.emote_wheel.hover.className = "wheel-hover wheel-hover-center"
                }
            }
        }
    }
    emote_wheel_set_emotes(emotes:(EmoteDef|PingDef|undefined)[]){
        for(const ev in this.content.emote_wheel.emotes){
            const emote=emotes[ev]
            if(emote){
                const frame=this.game.resources.get_frame("emote_"+emote.idString)
                if(frame){
                    ShowElement(this.content.emote_wheel.emotes[ev])
                    this.content.emote_wheel.emotes[ev].style.setProperty("--ping-color","#eeeeee")
                    this.content.emote_wheel.emotes[ev].src=this.game.resources.get_frame("emote_"+emote.idString).url!
                    this.content.emote_wheel.emotes[ev].draggable=false
                }
            }else{
                HideElement(this.content.emote_wheel.emotes[ev])
            }
        }
        this.content.emote_wheel.main.onclick=(e)=>this.end_emote_wheel(true)
        this.emote_wheel.emotes=emotes
    }
    mobile_enabled:boolean=isMobile||Debug.force_mobile
    mobile_close(){
        HideElement(this.mobile_content.gui)
        ShowElement(this.content.help_gui)
        this.mobile_enabled=false
    }
    mobile_open(){
        ShowElement(this.mobile_content.gui)
        HideElement(this.content.help_gui)
        this.mobile_enabled=true
    }
    start(){
        HideElement(this.content.post_proccess.tiltshift)
        HideElement(this.content.post_proccess.vignetting)
        if(this.game.save.get_variable("sv_graphics_post_proccess")>=GraphicsDConfig.Advanced){
            ShowElement(this.content.post_proccess.tiltshift)
        }
        if(this.game.save.get_variable("sv_graphics_post_proccess")>=GraphicsDConfig.Normal){
            ShowElement(this.content.post_proccess.vignetting)
        }
        this.game.renderer.canvas.focus()

        this.content.leader_span.innerText=this.game.language.get("leader-wait",{})
        this.enableCrosshair()
        enableContextMenuPrevent()

        this.update_theme()
        ShowElement(this.content.game_gui)
    }
    players_name:Record<number,{name:string,badge:string,full:string}>={}
    proccess_general_main_state(state:GeneralFullMainState){
        this.clear_top_right()
        for(const p of state.players){
            const badge_frame=this.game.resources.get_frame(p.badge!==undefined?"badge_"+this.game.definitions.badges.getFromNumber(p.badge).idString:"")
            const badge_html=badge_frame?`<img class="badge-icon" src="${badge_frame.src}">`:""
            this.players_name[p.id]={name:p.name,badge:badge_html,full:`${badge_html}${p.name}`}
        }
    }
    proccess_general_update(up:GeneralUpdate){
        const leader_enabled=up.leader_enabled&&up.leader!==undefined
        this.feed_enabled=up.feed_enabled
        this.leader_enabled=leader_enabled
        if(this.leader_enabled!==this.old_leader_enabled){
            this.old_leader_enabled=this.leader_enabled
            if(this.leader_enabled)ShowElement(this.content.leader_container)
            else HideElement(this.content.leader_container)
        }

        if(leader_enabled){
            if(this.leader.id!==up.leader!.id||this.leader.kills!==up.leader!.kills){
                this.leader.id=up.leader!.id
                this.leader.kills=up.leader!.kills
                if(up.leader!.id===0){
                    this.content.leader_span.innerText=this.game.language.get("leader-wait")
                }else{
                    this.content.leader_span.innerText=`${this.leader.kills} - ${this.players_name[up.leader!.id]?.name}`
                }
            }
        }

        for(const msg of up.feed){
            this.add_feed_message(msg)
        }
        this.game.ui_manager.signal("general_update",up)
    }
    state:HelpGuiState={
        driving:false,
        interact:false,
        gun:false,
        information_box_message:""
    }
    update_hint(){
        for (const [key, el] of Object.entries(this.helpTexts)) {
            el.style.display = this.state[key as keyof HelpGuiState] ? "" : "none";
        }
        if(this.mobile_enabled){
            if(this.current_interaction){
                ShowElement(this.mobile_content.btn_interact)
            }else{
                HideElement(this.mobile_content.btn_interact)
            }
            if(this.state.gun){
                ShowElement(this.mobile_content.btn_reload)
            }else{
                HideElement(this.mobile_content.btn_reload)
            }
        }else{
            HideElement(this.mobile_content.btn_reload)
            HideElement(this.mobile_content.btn_interact)
        }
    }
    feed_queue: HTMLDivElement[] = []
    max_feed_messages = 13
    add_feed_message(msg:FeedMessage){
        const elem=document.createElement("div") as HTMLDivElement
        elem.classList.add("feed-message")
        let block_message:boolean=!this.feed_enabled
        switch(msg.type){
            // deno-lint-ignore no-fallthrough
            case FeedMessageType.set_name:
                block_message=true
            case FeedMessageType.join:{
                const badge_frame=this.game.resources.get_frame(msg.playerBadge!==undefined?"badge_"+this.game.definitions.badges.getFromNumber(msg.playerBadge).idString:"")
                const badge_html=badge_frame?`<img class="badge-icon" src="${badge_frame.src}">`:""
                this.players_name[msg.playerId]={badge:badge_html,name:msg.playerName,full:`${badge_html}${msg.playerName}`}
                elem.innerHTML=this.game.language.get("feed.join",{"player":this.players_name[msg.playerId].full})
                break
            }
            case FeedMessageType.kill:{
                if(!this.players_name[msg.victimId]||(msg.killer&&!this.players_name[msg.killer.id]))break
                let text=""
                switch(msg.damage_reason){
                    case DamageReason.Abstinence:
                        text=this.game.language.get("feed.death.abstinence",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Explosion:
                    case DamageReason.Human:{
                        if(!msg.killer)break
                        const dsd=this.game.definitions.game_objects.valueNumber[msg.used??0] as DamageSourceDef
                        text=this.game.language.get("feed.kill.player",{
                            player1:this.players_name[msg.killer.id].full,
                            player2:this.players_name[msg.victimId].full,
                            source:this.game.language.get(dsd.tname??(dsd.def_type===GameObjectDefinitionType.item?"items."+dsd.idString:"objects."+dsd.idString),undefined,dsd.name),
                        })
                        break
                    }
                    case DamageReason.VehicleCollision:{
                        const dsd=this.game.definitions.vehicles.getFromNumberSafe(msg.used??0)
                        const sn=dsd?this.game.language.get("vehicles."+dsd.idString):""
                        if(msg.killer){
                            text=this.game.language.get("feed.kill.vehicle_collision_direct",{
                                player1:this.players_name[msg.killer.id].full,
                                player2:this.players_name[msg.victimId].full,
                                source:sn,
                            })
                        }else{
                            text=this.game.language.get("feed.kill.vehicle_collision_indirect",{
                                player:this.players_name[msg.victimId].full,
                                source:sn,
                            })
                        }
                        break
                    }
                    case DamageReason.DeadZone:
                        text=this.game.language.get("feed.death.deadzone",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.SideEffect:
                        if(msg.killer){
                            text=this.game.language.get("feed.kill.side-effect",{
                                player1:this.players_name[msg.killer.id].full,
                                player2:this.players_name[msg.victimId].full,
                            })
                        }else{
                            text=this.game.language.get("feed.death.side-effect",{player:this.players_name[msg.victimId].full})
                        }
                        break
                    case DamageReason.Disconnect:
                        text=this.game.language.get("feed.death.disconnect",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Bleend:
                        text=this.game.language.get("feed.death.bleend",{player:this.players_name[msg.victimId].full})
                        break
                }

                elem.innerHTML=text
                if(msg.victimId===this.game.active_entity?.id){
                    elem.classList.add("feed-message-negative")
                }else if(msg.killer&&msg.killer.id===this.game.active_entity?.id){
                    elem.classList.add("feed-message-good")
                }
                break
            }
            case FeedMessageType.down:{
                if(!this.players_name[msg.victimId]||(msg.killer&&!this.players_name[msg.killer.id]))break
                let text=""
                switch(msg.damage_reason){
                    case DamageReason.Abstinence:
                        text=this.game.language.get("feed.down.abstinence",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Human:
                    case DamageReason.Explosion:{
                        if(!msg.killer)break
                        const dsd=this.game.definitions.game_objects.valueNumber[msg.used??0] as DamageSourceDef
                        text=this.game.language.get("feed.down.player",{
                            player1:this.players_name[msg.killer.id].full,
                            player2:this.players_name[msg.victimId].full,
                            source:this.game.language.get(dsd.tname??(dsd.def_type===GameObjectDefinitionType.item?"items."+dsd.idString:"objects."+dsd.idString),undefined,dsd.name),
                        })
                        break
                    }
                    case DamageReason.VehicleCollision:{
                        const dsd=this.game.definitions.vehicles.getFromNumberSafe(msg.used??0)
                        const sn=dsd?this.game.language.get("vehicles."+dsd.idString):""
                        if(msg.killer){
                            text=this.game.language.get("feed.down.vehicle_collision_direct",{
                                player1:this.players_name[msg.killer.id].full,
                                player2:this.players_name[msg.victimId].full,
                                source:sn,
                            })
                        }else{
                            text=this.game.language.get("feed.down.vehicle_collision_indirect",{
                                player:this.players_name[msg.victimId].full,
                                source:sn,
                            })
                        }
                        break
                    }
                    case DamageReason.DeadZone:
                        text=this.game.language.get("feed.down.deadzone",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.SideEffect:
                        text=this.game.language.get("feed.down.side-effect",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Disconnect:
                        text=this.game.language.get("feed.down.disconnect",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Bleend:
                        text=this.game.language.get("feed.down.bleend",{})
                        break
                    case DamageReason.VehicleJump:
                        text=this.game.language.get("feed.down.vehicle_jump",{player:this.players_name[msg.victimId].full})
                        break
                }
                elem.innerHTML=text
                if(msg.victimId===this.game.active_entity?.id){
                    elem.classList.add("feed-message-negative")
                }else if(msg.killer&&msg.killer.id===this.game.active_entity?.id){
                    elem.classList.add("feed-message-good")
                    this.game.ui_manager.signal("info-down",{player_id:msg.victimId,msg:`You Knockout ${this.game.ui.players_name[msg.victimId].name}`})
                }
                break
            }
            case FeedMessageType.leader_assigned:{
                if(!this.players_name[msg.player])break
                elem.innerHTML=this.game.language.get("feed.leader.assigned",{"player":this.players_name[msg.player].full})
                this.game.sounds.play(this.game.resources.get_sound("kill_leader_assigned"),{
                    volume:0.4,
                    bus:"ui"
                })
                break
            }
            case FeedMessageType.leader_dead:{
                elem.innerHTML=this.game.language.get("feed.leader.dead",{})
                this.content.leader_span.innerText=this.game.language.get("leader-wait",{})
                this.game.sounds.play(this.game.resources.get_sound("kill_leader_dead"),{
                    volume:0.6,
                    bus:"ui"
                })
                break
            }
        }
        this.game.ui_manager.signal("feed_message",{obj:msg,text:elem.innerHTML})
        this.game.signals.emit("feed_message",{obj:msg,text:elem.innerHTML})
        if(!block_message){
            this.content.feed.appendChild(elem)
            this.feed_queue.push(elem)
            while (this.feed_queue.length > this.max_feed_messages) {
                const old = this.feed_queue.shift()
                if (old) {
                    old.remove()
                }
            }
            this.game.clock.add_timeout(()=>{
                elem.remove()
            },4)
        }
    }
    crosshair=false
    crosshair_manager:CrosshairManager=new CrosshairManager(document.body)
    enableCrosshair() {
        const v=new StaticCrosshair(document.body,random.choose([DefaultCrosshair,AimCrosshair]))
        v.rainbow=Math.random()<=0.01
        this.crosshair_manager.set(v)
        this.crosshair=true
    }
    disableCrosshair() {
        document.body.style.cursor = this.game.cursors.default
        this.crosshair=false
        this.crosshair_manager.clear("")
    }
    update_crosshair(dt:number){
        if(!this.crosshair)return
        this.crosshair_manager.tick(dt)
    }
    proccess_private(priv:PrivateUpdate){
        this.game.ui.map_humans=priv.map_humans
    }
    update_self_state(state:SelfStateUpdate){
        this.game.device.update_self_state(state)
        if(state.dirty.group){
            this.group_members=state.group??{}
            this.game.ui_manager.signal("update_group_members",null)
        }
        if(state.colors!==undefined){
            this.game.theme_colors={}
            for(const c of Object.entries(state.colors)){
                this.game.theme_colors[c[0]]=ColorM.number2hex(c[1])
            }
            this.update_theme()
        }

        this.game.ui_manager.signal("self_state",state)
    }
    handle_slot_click(e:MouseEvent){
        const t=e.currentTarget as HTMLDivElement
        const item_kind=parseInt(t.dataset.item_kind!)
        const item_value=parseInt(t.dataset.item_value!)
        if(e.button==2){
            switch(item_kind){
                case 1:
                case 2:
                case 3:
                case 5:
                case 6:
                    this.game.input.actions.push({type:InputActionType.drop,drop:item_value,drop_kind:item_kind})
                    break
            }
        }else if(e.button===0){
            if(!this.game.save.get_variable("sv_ui_interactive"))return
            switch(item_kind){
                case 1:
                    if(this.game.comunication_mode){
                        const def=this.game.inventory.weapons[item_value]?.def
                        if(def)this.game.input.actions.push({type:InputActionType.emote_item,item:this.game.definitions.game_items.keysString[def.idString]})
                    }else{
                        this.game.input.actions.push({
                            type:InputActionType.set_hand,
                            hand:item_value
                        })
                    }
                    break
                case 2:
                    if(this.game.comunication_mode){
                        const def=this.game.definitions.ammos.getFromNumber(item_value)
                        this.game.input.actions.push({type:InputActionType.emote_item,item:this.game.definitions.game_items.keysString[def.idString]})
                    }
                    break
                case 3:
                    if(this.game.comunication_mode){
                        if(this.game.inventory._items[item_value].count>0)this.game.input.actions.push({type:InputActionType.emote_item,item:this.game.inventory._items[item_value].id})
                    }else{
                        this.game.input.actions.push({type:InputActionType.use_item,slot:item_value})
                    }
                    break
                case 5:
                    if(this.game.comunication_mode){
                        const def=this.game.definitions.scopes.getFromNumber(item_value)
                        this.game.input.actions.push({type:InputActionType.emote_item,item:this.game.definitions.game_items.keysString[def.idString]})
                    }else{
                        this.game.input.actions.push({type:InputActionType.set_scope,scope_id:item_value})
                    }
                    break
            }
        }
    }
    handle_slot_touch(e:TouchEvent){
        const t=e.currentTarget as HTMLDivElement
        const item_kind=parseInt(t.dataset.item_kind!)
        const item_value=parseInt(t.dataset.item_value!)
        switch(item_kind){
            case 1:
                this.game.input.actions.push({
                    type:InputActionType.set_hand,
                    hand:item_value
                })
                break
            case 3:
                this.game.input.actions.push({type:InputActionType.use_item,slot:parseInt(t.dataset.item_value!)})
                break
            case 5:
                this.game.input.actions.push({type:InputActionType.set_scope,scope_id:parseInt(t.dataset.item_value!)})
                break
        }
    }
    hide_game_over(){
        ShowElement(this.content.game_gui)
        HideElement(this.content.normal_gameOver)
        this.content.restart_gameOver.classList.add("hidden")
    }
    async show_game_over(g:GameOverPacket){
        switch(this.game_over_screen.type){
            case GameOverScreenType.Normal:{
                this.normal_game_over(g)
                break
            }
            case GameOverScreenType.Restart:
                if(!g.status.win){
                    HideElement(this.content.game_gui)
                    this.game.sounds.play(this.game.resources.get_sound("ui_death"),{
                        bus:"ui"
                    })
                    this.content.restart_gameOver.classList.remove("hidden")
                    this.game.scope_zoom*=0.75
                    this.game.zoom_speed*=0.05
                    await this.game.input_manager.wait_for_action("reload")
                }
                this.game.finish_game_over(g.status.win)
                break
            case GameOverScreenType.Light:
                break
        }
    }
    normal_game_over(g:GameOverPacket){
        HideElement(this.content.game_gui)
        this.disableCrosshair()
        disableContextMenuPrevent()
        if(g.status.win){
            this.content.gameOver_main_message.innerHTML=this.game.language.get("gameover.you-win",{})
            ShowElement(this.content.normal_gameOver)
            this.content.normal_gameOver.style.opacity="1"
        }else{
            this.game.ambient.clear()
            this.game.sounds.play(this.game.resources.get_sound("ui_death"),{
                bus:"ui"
            })
            if(!this.players_name[g.status.eliminator])return
            this.content.gameOver_main_message.innerHTML=this.game.language.get("gameover.eliminated-by",{
                player:`<span id="gameover-eliminator">${this.players_name[g.status.eliminator].full}</span>`
            })
            this.game.scope_zoom*=0.75
            this.game.zoom_speed*=0.05
            this.content.normal_gameOver.style.opacity="0"
            this.game.clock.add_timeout(()=>{
                ShowElement(this.content.normal_gameOver)
                self.requestAnimationFrame(()=>this.content.normal_gameOver.style.opacity="1")
            },3)
        }
        let content=""
        for(const status of g.status.status){
            content+=`
<div class="menu-panel-blue">
    <h1>${this.players_name[status.id].full}</h1>
    <span>Kills: ${status.kills}</span>
    <span>Damage: ${status.damage}</span>
    <span>Damage Taken: ${status.damage_taken}</span>
    <span>Final Score: ${status.score}</span>
</div>
`
        }
        this.content.gameover_status_container.innerHTML=content
    }
    ping_time:number=0
    update(dt:number){
        if(this.game.client&&this.game.client.opened){
            this.ping_time-=dt
            if(this.ping_time<=0){
                this.ping_time=1
                this.game.client.send_ping()
                this.content.debug_show.innerHTML=`FPS: ${Math.floor(1/dt)}<br/>PING-PONG: ${Math.floor(this.game.client?.ping??0)}`
            }
            if(this.game.active_entity){
                this.update_active_player(this.game.active_entity as Human,dt)
            }
        }
        if(this.content.tooltip.classList.contains("tooltip-visible")){
            this.content.tooltip.style.left=`${this.game.input_manager.real_mouse_position.x-10}px`
            this.content.tooltip.style.top=`${this.game.input_manager.real_mouse_position.y-10}px`
            if(this.tooltip_element&&(this.tooltip_element.style.visibility==="hidden"||!this.tooltip_element.isConnected)){
                this.tooltip_hide()
            }
        }
        this.update_emote_wheel()
        this.update_crosshair(dt)
    }
    current_interaction?: GameObject
    update_active_player(player: Human,dt:number=0) {
        if(player.dead){
            HideElement(this.content.game_gui)
        }
        const old_inter=this.current_interaction

        this.current_interaction = undefined
        this.state.interact = false
        this.state.information_box_message = ""

        const objs = this.game.scene_2d.objects.cells.get_objects(player.hitbox, player.layer)
        for(const o of this.hover_objects){
            if(o instanceof GameObject){
                switch(o.number_type){
                    case GameObjectType.Obstacle:{
                        if(!(o as Obstacle).can_below(player.hitbox)){
                            (o as Obstacle).set_below(false)
                            this.hover_objects.delete(o)
                        }
                        break
                    }
                }
            }else if(o instanceof BuildingCeiling){
                if(!o.can_below(player.hitbox)){
                    o.set_below(false)
                    this.hover_objects.delete(o)
                }
            }
        }
        for (const o of objs) {
            switch(o.number_type){
                case GameObjectType.Building:{
                    for(const ceiling of (o as Building).ceilings){
                        if(ceiling.can_below(player.hitbox)&&!this.hover_objects.has(ceiling)){
                            ceiling.set_below(true)
                            this.hover_objects.add(ceiling)
                        }
                    }
                    break
                }
                case GameObjectType.Obstacle:{
                    if((o as Obstacle).can_below(player.hitbox)&&!this.hover_objects.has(o)){
                        (o as Obstacle).set_below(true)
                        this.hover_objects.add(o)
                    }
                    break
                }
            }
            if(!o.can_interact(player)) continue
            this.current_interaction = o
            if(this.current_interaction!==old_inter){
                if(this.game.save.get_variable("sv_mobile_auto_pickup")&&this.current_interaction.auto_interact(player)){
                    this.game.input_manager.listener.emit("actiondown",{action:"interact"})
                }
                const hint = o.get_interact_hint(player)
                if(hint){
                    this.game.ui_manager.signal("interaction_hint", hint)
                }
            }
            break
        }
        if(!this.current_interaction&&old_inter){
            this.game.ui_manager.signal("interaction_hint", "")
        }
        this.state.gun=player.current_weapon?.item_type===GameItemType.gun
        this.update_hint()

        if(player.backpack?.idString!==this.game.inventory.backpack.idString){
            this.game.inventory.set_backpack(player.backpack)
            this.game.ui_manager.signal("backpack_dirty",player.backpack)
        }
        
        this.game.ui_manager.signal("active_player_update",{dt,player})
    }

    tooltip_show(title:string|null|undefined,description:string,element?:HTMLElement){
        if(!title)return
        this.content.tooltip_title.innerText=title
        this.content.tooltip_description.innerHTML=description
        this.tooltip_element=element
        this.content.tooltip.classList.add("tooltip-visible")
    }
    tooltip_hide(){
        this.content.tooltip.classList.remove("tooltip-visible")
        this.tooltip_element=undefined
    }
}