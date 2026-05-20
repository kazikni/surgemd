import { Game } from "../others/game.ts";
import { DamageReason, InventoryItemType } from "common/scripts/definitions/utils.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { KillFeedMessage, KillFeedMessageKillleader, KillFeedMessageType } from "common/scripts/packets/killfeed_packet.ts";
import { Debug, GraphicsDConfig } from "../others/config.ts";
import { SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
import { EmoteDef } from "common/scripts/definitions/loadout/emotes.ts";
import { GameOverPacket } from "common/scripts/packets/gameOver.ts";
import { CrosshairManager, StaticCrosshair } from "./crosshairManager.ts";
import { GameObject } from "../others/gameObject.ts";
import { Angle, disableContextMenuPrevent, enableContextMenuPrevent, HideElement, isMobile, Numeric, ShowElement, v2, Vec2 } from "common/engine/client.ts";
import { InputActionType } from "common/scripts/packets/input_packet.ts";
import { Human } from "../objects/human.ts";
import { JoinnedPacket } from "common/scripts/packets/joinned_packet.ts";
import { DefaultCrosshair } from "../defs/crosshair.ts";
import { type Building } from "../objects/building.ts";
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

        gameOver:document.querySelector("#gameover-container") as HTMLDivElement,
        
        gameover_status_container:document.querySelector("#gameover-status-container") as HTMLDivElement,
        gameOver_main_message:document.querySelector("#gameover-main-message") as HTMLDivElement,
        gameOver_menu_btn:document.querySelector("#gameover-menu-btn") as HTMLButtonElement,

        killfeed:document.querySelector("#killfeed-container") as HTMLDivElement,

        killeader_span:document.querySelector("#killeader-text") as HTMLSpanElement,

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
        }
    }

    mobile_content={
        gui:document.querySelector("#game-mobile-gui") as HTMLDivElement,
        left_joystick:document.querySelector("#left-joystick") as HTMLDivElement,
        right_joystick:document.querySelector("#right-joystick") as HTMLDivElement,

        btn_interact:document.querySelector("#btn-mobile-interact") as HTMLButtonElement,
        btn_reload:document.querySelector("#btn-mobile-reload") as HTMLButtonElement,
    }

    killleader?:{
        id:number
        kills:number
    }

    money:number=0

    constructor(game:Game){
        this.game=game

        HideElement(this.content.gameOver)
        HideElement(this.content.emote_wheel.main)

        if(isMobile||Debug.force_mobile){
            this.mobile_init()
        }

        this.content.gameOver_menu_btn.onclick=this.game.close_game.bind(this.game)

        this.game.ui_manager.add(new HealthModule())
        this.game.ui_manager.add(new BoostModule())
        this.game.ui_manager.add(new AItemsModule())
        this.game.ui_manager.add(new IItemsModule())
        this.game.ui_manager.add(new WeaponsModule())
        this.game.ui_manager.add(new HandInfoModule())
        this.game.ui_manager.add(new ItemsModule())
        this.game.ui_manager.add(new ActionsModule())
        this.game.ui_manager.add(new EquipmentModule())
        this.game.ui_manager.add(new InformationBoxModule())
    }
    clear(){
        this.content.killfeed.innerHTML=""
        this.content.killeader_span.innerText=""
        this.killleader=undefined
        this.content.help_gui.innerText=""

        this.players_name={}

        HideElement(this.content.game_gui)
        HideElement(this.content.gameOver)

        this.enableCrosshair()

        this.game.inventory.clear()
        this.game.ui_manager.clear()
        disableContextMenuPrevent()
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
            this.game.aim_line=true
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
            this.game.aim_line=false
        })
        this.mobile_content.btn_interact.addEventListener("click",()=>{
            this.game.input_manager.listener.emit("actiondown",{action:"interact"})
        })
        this.mobile_content.btn_reload.addEventListener("click",()=>{
            this.game.input_manager.listener.emit("actiondown",{action:"reload"})
        })
    }
    emote_wheel={
        positon:v2(0,0),
        active:false,
        current_side:-1,
        emote:[] as EmoteDef[]
    }
    begin_emote_wheel(position:Vec2,emotes?:EmoteDef[]){
        ShowElement(this.content.emote_wheel.main)
        const ms=this.game.cam2d.meter_size
        this.content.emote_wheel.main.style.left=`${position.x*ms}px`
        this.content.emote_wheel.main.style.top=`${position.y*ms}px`
        this.emote_wheel.positon=position
        this.emote_wheel.active=true

        this.emote_wheel_set_emotes(emotes??[
            this.game.definitions.emotes.getFromString("emote_neutral"), //Right
            this.game.definitions.emotes.getFromString("emote_md_logo"), //Bottom
            this.game.definitions.emotes.getFromString("emote_sad"), //Left
            this.game.definitions.emotes.getFromString("emote_happy"), //Top
        ])
    }
    emote_wheel_set_emotes(emote:EmoteDef[]){
        for(const ev in this.content.emote_wheel.emotes){
            this.content.emote_wheel.emotes[ev].src=this.game.resources.get_frame(emote[ev].idString).src
        }
        this.emote_wheel.emote=emote
    }
    end_emote_wheel(){
        HideElement(this.content.emote_wheel.main)
        this.emote_wheel.active=false
        let selected_emote:EmoteDef|undefined=undefined
        if(this.emote_wheel.current_side!==-1){
            selected_emote=this.emote_wheel.emote[this.emote_wheel.current_side]
        }
        if(selected_emote){
            this.game.input.actions.push({
                type:InputActionType.emote,
                emote:selected_emote.idNumber!
            })
        }
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

        this.content.killeader_span.innerText=this.game.language.get("killleader-wait",{})
        this.enableCrosshair()
        enableContextMenuPrevent()

        ShowElement(this.content.game_gui)
    }
    players_name:Record<number,{name:string,badge:string,full:string}>={}
    proccess_joinned_packet(jp:JoinnedPacket){
        for(const p of jp.players){
            const badge_frame=p.badge!==undefined?this.game.definitions.emotes.getFromNumber(p.badge).idString:""
            const badge_html=badge_frame===""?"":`<img class="badge-icon" src="./img/game/main/loadout/badges/${badge_frame}.svg">`
            this.players_name[p.id]={name:p.name,badge:badge_html,full:`${badge_html}${p.name}`}
        }
        if(jp.kill_leader){
            this.assign_killleader({
                type:KillFeedMessageType.killleader_assigned,
                player:jp.kill_leader
            })
        }
        
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
    assign_killleader(msg:KillFeedMessageKillleader){
        this.killleader={
            id:msg.player.id,
            kills:msg.player.kills
        }
        this.content.killeader_span.innerText=`${this.killleader.kills} - ${this.players_name[msg.player.id].name}`
    }
    killfeed_queue: HTMLDivElement[] = []
    max_killfeed_messages = 7
    add_killfeed_message(msg:KillFeedMessage){
        const elem=document.createElement("div") as HTMLDivElement
        elem.classList.add("killfeed-message")
        this.content.killfeed.appendChild(elem)
        this.killfeed_queue.push(elem)
        while (this.killfeed_queue.length > this.max_killfeed_messages) {
            const old = this.killfeed_queue.shift()
            if (old) {
                old.remove()
            }
        }
        switch(msg.type){
            case KillFeedMessageType.join:{
                const badge_frame=msg.playerBadge!==undefined?this.game.definitions.emotes.getFromNumber(msg.playerBadge).idString:""
                const badge_html=badge_frame===""?"":`<img class="badge-icon" src="./img/game/main/loadout/badges/${badge_frame}.svg">`
                this.players_name[msg.playerId]={badge:badge_html,name:msg.playerName,full:`${badge_html}${msg.playerName}`}
                elem.innerHTML=this.game.language.get("killfeed.join",{"player":this.players_name[msg.playerId].full})
                break
            }
            case KillFeedMessageType.kill:{
                if(!this.players_name[msg.victimId]||(msg.killer&&!this.players_name[msg.killer.id]))break
                switch(msg.damage_reason){
                    case DamageReason.Abstinence:
                        elem.innerHTML=this.game.language.get("killfeed.kill.abstinence",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Explosion:
                    case DamageReason.Human:{
                        if(!msg.killer)break
                        const dsd=this.game.definitions.game_items.valueNumber[msg.killer.used]
                        elem.innerHTML=this.game.language.get("killfeed.kill.player",{
                            player1:this.players_name[msg.killer.id].full,
                            player2:this.players_name[msg.victimId].full,
                            source:this.game.language.get("items."+dsd.idString),
                        })
                        if(msg.victimId===this.game.active_entity?.id){
                            elem.classList.add("killfeed-message-negative")
                        }else if(msg.killer.id===this.game.active_entity?.id){
                            elem.classList.add("killfeed-message-good")
                            this.game.ui_manager.signal("info-kill",`You Killed ${this.game.ui.players_name[msg.victimId].name}<br><p id="infobox-kills">${msg.killer.kills} Kills<p>`)
                        }

                        if(this.killleader&&msg.killer.id===this.killleader.id){
                            this.killleader.kills=msg.killer.kills
                            this.content.killeader_span.innerText=`${this.killleader.kills} - ${this.players_name[msg.killer.id].name}`
                        }
                        break
                    }
                    case DamageReason.DeadZone:
                        elem.innerHTML=this.game.language.get("killfeed.kill.deadzone",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.SideEffect:
                        elem.innerHTML=this.game.language.get("killfeed.kill.side-effect",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Disconnect:
                        elem.innerHTML=this.game.language.get("killfeed.kill.disconnect",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Bleend:
                        elem.innerHTML=this.game.language.get("killfeed.kill.bleend",{player:this.players_name[msg.victimId].full})
                        break
                }
                break
            }
            case KillFeedMessageType.down:{
                if(!this.players_name[msg.victimId]||(msg.killer&&!this.players_name[msg.killer.id]))break
                switch(msg.damage_reason){
                    case DamageReason.Abstinence:
                        elem.innerHTML=this.game.language.get("killfeed.down.abstinence",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Human:
                    case DamageReason.Explosion:{
                        if(!msg.killer)break
                        const dsd=this.game.definitions.game_items.valueNumber[msg.killer.used]
                        elem.innerHTML=this.game.language.get("killfeed.down.player",{
                            player1:this.players_name[msg.killer.id].full,
                            player2:this.players_name[msg.victimId].full,
                            source:this.game.language.get("items."+dsd.idString)
                        })
                        if(msg.victimId===this.game.active_entity?.id){
                            elem.classList.add("killfeed-message-negative")
                        }else if(msg.killer.id===this.game.active_entity?.id){
                            elem.classList.add("killfeed-message-good")
                        }
                        break
                    }
                    case DamageReason.DeadZone:
                        elem.innerHTML=this.game.language.get("killfeed.down.deadzone",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.SideEffect:
                        elem.innerHTML=this.game.language.get("killfeed.down.side-effect",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Disconnect:
                        elem.innerHTML=this.game.language.get("killfeed.down.disconnect",{player:this.players_name[msg.victimId].full})
                        break
                    case DamageReason.Bleend:
                        elem.innerHTML=this.game.language.get("killfeed.down.bleend",{})
                        break
                }
                break
            }
            case KillFeedMessageType.killleader_assigned:{
                if(!this.players_name[msg.player.id])break
                elem.innerHTML=this.game.language.get("killfeed.killleader.assigned",{"player":this.players_name[msg.player.id].full})
                this.assign_killleader(msg)
                this.game.sounds.play(this.game.resources.get_sound("kill_leader_assigned"),{
                    volume:0.4,
                    bus:"ui"
                })
                break
            }
            case KillFeedMessageType.killleader_dead:{
                this.killleader=undefined
                elem.innerHTML=this.game.language.get("killfeed.killleader.dead",{})
                this.content.killeader_span.innerText=this.game.language.get("killleader-wait",{})
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

      this.game.signals.emit("killfeed_message",{obj:msg,text:elem.innerHTML})
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
                    this.game.input.actions.push({type:InputActionType.drop,drop:item_value,drop_kind:item_kind})
                    break
            }
        }else if(e.button===0){
            if(!this.game.save.get_variable("sv_ui_interactive"))return
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
        HideElement(this.content.gameOver)
        ShowElement(this.content.game_gui)
        this.enableCrosshair()
        enableContextMenuPrevent()
    }
    show_game_over(g:GameOverPacket){
        ShowElement(this.content.gameOver)
        HideElement(this.content.game_gui)
        this.disableCrosshair()
        disableContextMenuPrevent()

        this.game.game_over=true
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
                this.content.debug_show.innerHTML=`FPS: ${Math.floor(1/dt)}<br/>PING: ${Math.floor(this.game.client?.ping??0)}`
            }
            if(this.game.active_entity){
                this.update_active_player(this.game.active_entity as Human,dt)
            }
        }
        this.update_crosshair(dt)
    }
    current_interaction?: GameObject
    update_active_player(player: Human,dt:number=0) {
        const old_inter=this.current_interaction

        this.current_interaction = undefined
        this.state.interact = false
        this.state.information_box_message = ""

        const objs = this.game.scene_2d.objects.cells.get_objects(player.hitbox, player.layer)
        for (const o of objs) {
            switch(o.number_type){
                case GameObjectType.Building:{
                    for(const ceiling of (o as Building).ceilings){
                        if(ceiling.alive&&ceiling.hitbox.colliding_with(player.hitbox)){
                            ceiling.container.tint.a=Numeric.lerp(ceiling.container.tint.a,ceiling.opacity,Numeric.dt_expo_inter(5,dt))
                            ceiling.collided=true
                        }
                    }
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
        if (this.emote_wheel.active) {
            const angle = Angle.rad2deg(
                v2.lookTo(this.emote_wheel.positon, this.game.input_manager.position)
            )
            const distance = v2.distance(this.emote_wheel.positon, this.game.input_manager.position)

            const chsrc = "/img/menu/gui/emote_wheel_hover_center.svg"
            const shsrc = "/img/menu/gui/emote_wheel_hover.svg"

            const norm = (angle + 360) % 360

            if (distance > 0.24) {
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

        if(player.backpack?.idString!==this.game.inventory.backpack.idString){
            this.game.inventory.set_backpack(player.backpack)
            this.game.ui_manager.signal("backpack_dirty",player.backpack)
        }
        
        this.game.ui_manager.signal("active_player_update",{dt,player})
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
}