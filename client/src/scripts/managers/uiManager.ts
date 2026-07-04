import { Game } from "../others/game.ts";
import { DamageReason, InventoryItemType } from "common/scripts/definitions/utils.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { FeedMessage, FeedMessageLeader, FeedMessageType } from "common/scripts/packets/feed_packet.ts";
import { Debug, GraphicsDConfig } from "../others/config.ts";
import { GroupMemberState, MapHumanData, PrivateUpdate, SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
import { EmoteDef } from "common/scripts/definitions/loadout/emotes.ts";
import { GameOverPacket } from "common/scripts/packets/gameOver.ts";
import { CrosshairManager, StaticCrosshair } from "./crosshairManager.ts";
import { GameObject } from "../others/gameObject.ts";
import { Angle, ColorM, disableContextMenuPrevent, enableContextMenuPrevent, HideElement, isMobile, ShowElement, v2, v2m, Vec2 } from "common/engine/client.ts";
import { InputActionType } from "common/scripts/packets/input_packet.ts";
import { Human } from "../objects/human.ts";
import { JoinnedPacket } from "common/scripts/packets/joinned_packet.ts";
import { DefaultCrosshair } from "../defs/crosshair.ts";
import { BuildingCeiling, type Building } from "../objects/building.ts";
import { HealthModule } from "../uim/health.ts";
import { BoostModule } from "../uim/boosts.ts";
import { AItemsModule } from "../uim/aitems.ts";
import { IItemsModule } from "../uim/iitems.ts";
import { WeaponsModule } from "../uim/weapons.ts";
import { HandInfoModule } from "../uim/hand_info.ts";
import { ItemsModule } from "../uim/items.ts";
import { ActionsModule } from "../uim/actions.ts";
import { EquipmentModule } from "../uim/equipment.ts";
import { InformationBoxModule } from "../uim/information-box.ts";
import { MinimapModule } from "../uim/minimap.ts";
import { GeneralUpdate } from "common/scripts/packets/general_update.ts";
import { AdditionalInfoModule } from "../uim/additional_info.ts";
import { type Obstacle } from "../objects/obstacle.ts";
import { GameOverScreen, GameOverScreenType } from "common/scripts/config/level_definition.ts";
import { GroupMembersModule } from "../uim/groups.ts";
import { PingDef } from "common/scripts/definitions/loadout/ping.ts";
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

        content_creators:document.querySelector("#featured-content-creators") as HTMLDivElement,

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
    leader?:{
        id:number
        kills:number
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

        this.content.gameOver_menu_btn.onclick=this.game.finish_game_over.bind(this.game)

        this.game.ui_manager.add(new HealthModule())
        this.game.ui_manager.add(new BoostModule())
        this.game.ui_manager.add(new AItemsModule())
        this.game.ui_manager.add(new IItemsModule())
        this.game.ui_manager.add(new WeaponsModule())
        this.game.ui_manager.add(new HandInfoModule())
        this.game.ui_manager.add(new ItemsModule())
        this.game.ui_manager.add(new ActionsModule())
        this.game.ui_manager.add(new EquipmentModule())
        this.game.ui_manager.add(new MinimapModule())
        this.game.ui_manager.add(new InformationBoxModule())
        this.game.ui_manager.add(new AdditionalInfoModule())
        this.game.ui_manager.add(new GroupMembersModule())

        this.update_content_creators([
            {
                name:"Kazikni",
                url:"https://youtube.com/@kazikni",
            },
        ])
    }
    clear(){
        this.content.feed.innerHTML=""
        this.content.leader_span.innerText=""
        this.leader=undefined
        this.content.help_gui.innerText=""

        this.players_name={}
        this.group_members={}
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
        this.content.game_gui.style.setProperty("--ui-theme-primary",this.game.get_theme_color("primary"))
        this.content.game_gui.style.setProperty("--ui-theme-secondary",this.game.get_theme_color("secondary"))
        this.content.game_gui.style.setProperty("--ui-theme-tertiary",this.game.get_theme_color("tertiary"))
        this.content.game_gui.style.setProperty("--ui-theme-positive",this.game.get_theme_color("positive"))
        this.content.game_gui.style.setProperty("--ui-theme-negative",this.game.get_theme_color("negative"))
        this.content.game_gui.style.setProperty("--ui-theme-special",this.game.get_theme_color("special"))
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
            /*if(!this.game.active_entity?.current_weapon||this.game.active_entity.current_weapon.item_type!==InventoryItemType.gun||!this.game.active_entity.current_weapon.fireOnRelease){
                
            }*/

            if(this.game.active_entity?.current_weapon){
                if(this.game.active_entity.current_weapon.item_type===InventoryItemType.gun){
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
        active:false,
        up_enable:true,
        current_side:-1,
        emotes:[] as (EmoteDef|PingDef)[],
    }
    begin_emote_wheel(position:Vec2,up_enable:boolean=true,emotes?:(EmoteDef|PingDef)[]){
        ShowElement(this.content.emote_wheel.main)
        HideElement(this.mobile_content.btn_emotes)
        this.content.emote_wheel.main.style.left=`${position.x}px`
        this.content.emote_wheel.main.style.top=`${position.y}px`
        this.emote_wheel.positon=position
        this.emote_wheel.active=true
        this.emote_wheel.up_enable=up_enable

        if(!emotes){
            if(this.game.comunication_mode){
                emotes=[
                    this.game.definitions.ping.getFromString("ping_alert"), //Right
                ]
            }else{
                emotes=[
                    this.game.definitions.emotes.getFromString(this.game.save.get_variable("sv_loadout_emote_right")), //Right
                    this.game.definitions.emotes.getFromString(this.game.save.get_variable("sv_loadout_emote_bottom")), //Bottom
                    this.game.definitions.emotes.getFromString(this.game.save.get_variable("sv_loadout_emote_left")), //Left
                    this.game.definitions.emotes.getFromString(this.game.save.get_variable("sv_loadout_emote_top")), //Top
                ]
            }
            
        }
        this.emote_wheel_set_emotes(emotes)
    }
    end_emote_wheel(force:boolean=false){
        if(!this.emote_wheel.up_enable&&!force)return
        HideElement(this.content.emote_wheel.main)
        ShowElement(this.mobile_content.btn_emotes)
        this.emote_wheel.active=false
        let selected_emote:EmoteDef|PingDef|undefined=undefined
        if(this.emote_wheel.current_side!==-1){
            selected_emote=this.emote_wheel.emotes[this.emote_wheel.current_side]
        }
        if(selected_emote){
            if(this.game.definitions.ping.exist(selected_emote.idString)){
                const pos=v2.dscale(this.emote_wheel.positon,this.game.cam2d.meter_size*this.game.cam2d.zoom)
                v2m.add(pos,pos,this.game.cam2d.visual_position)
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
            const angle = Angle.rad2deg(
                v2.lookTo(this.emote_wheel.positon, this.game.input_manager.mouse_position)
            )
            const distance = v2.distance(this.emote_wheel.positon, this.game.input_manager.mouse_position)

            const chsrc = "/img/menu/gui/emote_wheel_hover_center.svg"
            const shsrc = "/img/menu/gui/emote_wheel_hover.svg"

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
    emote_wheel_set_emotes(emotes:(EmoteDef|PingDef)[]){
        for(const ev in this.content.emote_wheel.emotes){
            const emote=emotes[ev]
            if(emote){
                ShowElement(this.content.emote_wheel.emotes[ev])
                this.content.emote_wheel.emotes[ev].style.setProperty("--ping-color","#eeeeee")
                this.content.emote_wheel.emotes[ev].src=this.game.resources.get_frame("emote_"+emote.idString).src
                this.content.emote_wheel.emotes[ev].draggable=false
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
    proccess_joinned_packet(jp:JoinnedPacket){
        for(const p of jp.players){
            const badge_frame=p.badge!==undefined?this.game.definitions.badges.getFromNumber(p.badge).idString:""
            const badge_html=badge_frame===""?"":`<img class="badge-icon" src="/img/game/main/loadout/badges/${badge_frame}.svg">`
            this.players_name[p.id]={name:p.name,badge:badge_html,full:`${badge_html}${p.name}`}
        }
        if(jp.leader){
            this.assign_leader({
                type:FeedMessageType.leader_assigned,
                player:jp.leader
            })
        }
    }
    proccess_general_update(up:GeneralUpdate){
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
    assign_leader(msg:FeedMessageLeader){
        this.leader={
            id:msg.player.id,
            kills:msg.player.kills
        }
        this.content.leader_span.innerText=`${this.leader.kills} - ${this.players_name[msg.player.id].name}`
    }
    feed_queue: HTMLDivElement[] = []
    max_feed_messages = 7
    add_feed_message(msg:FeedMessage){
        const elem=document.createElement("div") as HTMLDivElement
        elem.classList.add("feed-message")
        this.content.feed.appendChild(elem)
        this.feed_queue.push(elem)
        let block_message:boolean=false
        while (this.feed_queue.length > this.max_feed_messages) {
            const old = this.feed_queue.shift()
            if (old) {
                old.remove()
            }
        }
        switch(msg.type){
            // deno-lint-ignore no-fallthrough
            case FeedMessageType.set_name:
                block_message=true
            case FeedMessageType.join:{
                const badge_frame=msg.playerBadge!==undefined?this.game.definitions.badges.getFromNumber(msg.playerBadge).idString:""
                const badge_html=badge_frame===""?"":`<img class="badge-icon" src="/img/game/main/loadout/badges/${badge_frame}.svg">`
                this.players_name[msg.playerId]={badge:badge_html,name:msg.playerName,full:`${badge_html}${msg.playerName}`}
                elem.innerHTML=this.game.language.get("feed.join",{"player":this.players_name[msg.playerId].full})
                break
            }
            case FeedMessageType.kill:{
                if(!this.players_name[msg.victimId]||(msg.killer&&!this.players_name[msg.killer.id]))break
                switch(msg.damage_reason){
                    case DamageReason.Abstinence:
                        elem.innerHTML=this.game.language.get("feed.kill.abstinence",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Explosion:
                    case DamageReason.Human:{
                        if(!msg.killer)break
                        const dsd=this.game.definitions.game_items.valueNumber[msg.killer.used]
                        elem.innerHTML=this.game.language.get("feed.kill.player",{
                            player1:this.players_name[msg.killer.id].full,
                            player2:this.players_name[msg.victimId].full,
                            source:this.game.language.get("items."+dsd.idString),
                        })
                        if(msg.victimId===this.game.active_entity?.id){
                            elem.classList.add("feed-message-negative")
                        }else if(msg.killer.id===this.game.active_entity?.id){
                            elem.classList.add("feed-message-good")
                            this.game.ui_manager.signal("info-kill",{msg:`You Killed ${this.game.ui.players_name[msg.victimId].name}<br><p id="infobox-kills">${msg.killer.kills} Kills<p>`,kills:msg.killer.kills})
                        }

                        if(this.leader&&msg.killer.id===this.leader.id){
                            this.leader.kills=msg.killer.kills
                            this.content.leader_span.innerText=`${this.leader.kills} - ${this.players_name[msg.killer.id].name}`
                        }
                        break
                    }
                    case DamageReason.DeadZone:
                        elem.innerHTML=this.game.language.get("feed.kill.deadzone",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.SideEffect:
                        elem.innerHTML=this.game.language.get("feed.kill.side-effect",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Disconnect:
                        elem.innerHTML=this.game.language.get("feed.kill.disconnect",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Bleend:
                        elem.innerHTML=this.game.language.get("feed.kill.bleend",{player:this.players_name[msg.victimId].full})
                        break
                }
                break
            }
            case FeedMessageType.down:{
                if(!this.players_name[msg.victimId]||(msg.killer&&!this.players_name[msg.killer.id]))break
                switch(msg.damage_reason){
                    case DamageReason.Abstinence:
                        elem.innerHTML=this.game.language.get("feed.down.abstinence",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Human:
                    case DamageReason.Explosion:{
                        if(!msg.killer)break
                        const dsd=this.game.definitions.game_items.valueNumber[msg.killer.used]
                        elem.innerHTML=this.game.language.get("feed.down.player",{
                            player1:this.players_name[msg.killer.id].full,
                            player2:this.players_name[msg.victimId].full,
                            source:this.game.language.get("items."+dsd.idString)
                        })
                        if(msg.victimId===this.game.active_entity?.id){
                            elem.classList.add("feed-message-negative")
                        }else if(msg.killer.id===this.game.active_entity?.id){
                            elem.classList.add("feed-message-good")
                        }
                        break
                    }
                    case DamageReason.DeadZone:
                        elem.innerHTML=this.game.language.get("feed.down.deadzone",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.SideEffect:
                        elem.innerHTML=this.game.language.get("feed.down.side-effect",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Disconnect:
                        elem.innerHTML=this.game.language.get("feed.down.disconnect",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Bleend:
                        elem.innerHTML=this.game.language.get("feed.down.bleend",{})
                        break
                }
                break
            }
            case FeedMessageType.leader_assigned:{
                if(!this.players_name[msg.player.id])break
                elem.innerHTML=this.game.language.get("feed.leader.assigned",{"player":this.players_name[msg.player.id].full})
                this.assign_leader(msg)
                this.game.sounds.play(this.game.resources.get_sound("kill_leader_assigned"),{
                    volume:0.4,
                    bus:"ui"
                })
                break
            }
            case FeedMessageType.leader_dead:{
                this.leader=undefined
                elem.innerHTML=this.game.language.get("feed.leader.dead",{})
                this.content.leader_span.innerText=this.game.language.get("leader-wait",{})
                this.game.sounds.play(this.game.resources.get_sound("kill_leader_dead"),{
                    volume:0.6,
                    bus:"ui"
                })
                break
            }
        }
        this.game.add_timeout(()=>{
            elem.remove()
        },4)
        if(!block_message)this.game.signals.emit("feed_message",{obj:msg,text:elem.innerHTML})
    }
    crosshair=false
    crosshair_manager:CrosshairManager=new CrosshairManager(document.body)
    enableCrosshair() {
        //CrosshairManager.setCursor(this.content.gameD,DynamicCrosshair)
        this.crosshair_manager.set(new StaticCrosshair(document.body,DefaultCrosshair))
        //this.crosshair_manager.set(new AnimatedCrosshair(document.body,DefaultCrosshair))
        this.crosshair=true
    }
    disableCrosshair() {
        document.body.style.cursor = this.game.cursors.default
        this.crosshair=false
    }
    update_crosshair(dt:number){
        if(!this.crosshair)return
        this.crosshair_manager.tick(dt)
    }
    proccess_private(priv:PrivateUpdate){
        this.game.ui.map_humans=priv.map_humans
        if(priv.self_state){
            this.update_self_state(priv.self_state)
            this.game.device.update_self_state(priv.self_state)
        }
    }
    update_self_state(state:SelfStateUpdate){
        if (state.dirty.inventory.aitems) {
            this.game.inventory.aitems = {}
            for (const a of Object.keys(state.inventory.aitems)) {
                const def = this.game.definitions.ammos.getFromNumber(a as unknown as number)
                this.game.inventory.aitems[def.idString] = state.inventory.aitems[a as unknown as number]
            }
        }
        if(state.dirty.inventory.iitems) {
            this.game.inventory.iitems = state.inventory.iitems
        }
        this.game.set_scope(this.game.definitions.scopes.getFromNumber(state.current_scope),state.force_default_scope)
        if(state.dirty.inventory.weapons){
            for(const idx in state.inventory.weapons){
                this.game.inventory.set_weapon(idx as unknown as number,state.inventory.weapons[idx])
            }
        }
        if(state.dirty.inventory.hand){
            this.game.inventory.hand_settings=state.inventory.hand
            if(state.inventory.hand)this.game.inventory.set_weapon_index(state.inventory.hand.slot,true)
        }
        if(state.dirty.inventory.items) {
            this.items.length=0
            for (let i = 0; i < state.inventory.items.length; i++) {
                this.items.push({id:state.inventory.items[i].idNumber,count:state.inventory.items[i].count})
            }
        }
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

        this.money=state.money
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
                        if(this.items[item_value].count>0)this.game.input.actions.push({type:InputActionType.emote_item,item:this.items[item_value].id})
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
                HideElement(this.content.game_gui)
                this.content.restart_gameOver.classList.remove("hidden")
                await this.game.input_manager.wait_for_action("reload")
                this.game.finish_game_over()
                break
            case GameOverScreenType.Light:
                break
        }
    }
    normal_game_over(g:GameOverPacket){
        ShowElement(this.content.normal_gameOver)
        HideElement(this.content.game_gui)
        this.disableCrosshair()
        disableContextMenuPrevent()
        if(g.status.win){
            this.content.gameOver_main_message.innerHTML=this.game.language.get("gameover.you-win",{})
        }else{
            this.game.ambient.last_music_pos=this.game.ambient.music.offset
            this.game.ambient.music.set(null)
            if(!this.players_name[g.status.eliminator])return
            this.content.gameOver_main_message.innerHTML=this.game.language.get("gameover.eliminated-by",{
                player:`<span id="gameover-eliminator">${this.players_name[g.status.eliminator].full}</span>`
            })
        }
        let content=""
        for(const status of g.status.status){
            content+=`
<div class="background-menu-blue">
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
        }
        this.update_emote_wheel()
        this.update_crosshair(dt)
    }
    current_interaction?: GameObject
    update_active_player(player: Human,dt:number=0) {
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
        this.state.gun=player.current_weapon?.item_type===InventoryItemType.gun
        this.update_hint()

        if(player.backpack?.idString!==this.game.inventory.backpack.idString){
            this.game.inventory.set_backpack(player.backpack)
            this.game.ui_manager.signal("backpack_dirty",player.backpack)
        }
        
        this.game.ui_manager.signal("active_player_update",{dt,player})
    }
    update_content_creators(content_creators:{name:string,url:string}[]){
        this.content.content_creators.innerHTML+="<span>Featured Content-Creators</span>"
        for(const creator of content_creators){
            this.content.content_creators.innerHTML+=`
<a href="${creator.url}" target="_blank">
    <div class="background-menu content-creator">
        <img id="youtube-logo" src="./img/menu/thirdpartys/youtube-icon.svg" alt="YouTube icon" width="36" height="25">
        <span>${creator.name}</span>
    </div>
</a>`
        }
    }

    items: {id:number,count:number}[] = []
    free_slot(id:string,limit:number):boolean{
        return this.items.some((v)=>{
            return v.count===0||(v.id===this.game.definitions.game_items.keysString[id]&&v.count<limit)
        })
    }
    melee_free():boolean{
        return this.game.inventory.weapon_is_free(0)
    }
    gun_free():boolean{
        return this.game.inventory.weapon_is_free(1)||this.game.inventory.weapon_is_free(2)
    }

    tooltip_show(title:string|null|undefined,description:string,element?:HTMLElement){
        if(!title)return
        this.content.tooltip_title.innerText=this.game.language.get(title)
        this.content.tooltip_description.innerHTML=description
        this.tooltip_element=element
        this.content.tooltip.classList.add("tooltip-visible")
    }
    tooltip_hide(){
        this.content.tooltip.classList.remove("tooltip-visible")
        this.tooltip_element=undefined
    }
}