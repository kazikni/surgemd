import { ClientGame, Graphics2D, InputActionEvent, InputAxisEvent, InputEventType, InputMouseMoveEvent, isMobile, Key, Sound, WebglRenderer } from "common/engine/web.ts";
import { InputActionType, InputPacket } from "common/scripts/packets/input_packet.ts";
import { GameObject } from "./gameObject.ts";
import { UiManager } from "../managers/uiManager.ts";
import { TerrainM } from "../managers/terrainManager.ts";
import { MenuManager } from "../managers/menuManager.ts";
import { DeadZoneManager } from "../managers/deadZoneManager.ts";
import { AmbientManager } from "../managers/ambientManager.ts";
import { Human } from "../objects/human.ts";
import { PrivateUpdate, SelfStateUpdate, UpdatePacket } from "common/scripts/packets/update_packet.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { Layers, zIndexes } from "common/scripts/others/constants.ts";
import { API_BASE, ConfigCasters, ConfigDefaultActions, ConfigDefaultValues } from "./config.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { Loot } from "../objects/loot.ts";
import { Obstacle } from "../objects/obstacle.ts";
import { Bullet } from "../objects/bullet.ts";
import { Explosion } from "../objects/explosion.ts";
import { Grenade } from "../objects/grenade.ts";
import { GeneralFullMainState, GeneralUpdate, GeneralUpdatePacket } from "common/scripts/packets/general_update.ts";
import { GameOverScreenType } from "common/scripts/config/level_definition.ts";
import { Building } from "../objects/building.ts";
import { DamageSplashOBJ } from "../objects/damageSplash.ts";
import { Vehicle } from "../objects/vehicle.ts";
import { MinimapManager } from "../managers/miniMapManager.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";
import { GameOverPacket } from "common/scripts/packets/gameOver.ts";
import { LocalGameServer } from "./offline_game.ts";
import { is_binary } from "../defs/go_files.ts";
import { Creature } from "../objects/creature.ts";
import { Parachute } from "../objects/parachute.ts";
import { SyncedParticle } from "../objects/synced_particle.ts";
import { GInventory } from "./inventory.ts";
import { GameDeviceManager } from "../managers/deviceManager.ts";
import { Floors, FloorType } from "common/scripts/others/terrain.ts";
import { LoadoutShirtDef } from "common/scripts/definitions/loadout/skins.ts";
import { Plane } from "../objects/plane.ts";
import { Decal } from "../objects/decals.ts";
import { HumanBody } from "../objects/human_body.ts";
import { OnlineMessage, OnlineMessageType } from "common/scripts/packets/messages.ts"
import { StartPacket, StartSettings } from "common/scripts/packets/start_packet.ts";
import { input_popup, yes_no_popup } from "../defs/menu.ts";
import { Matrix, matrix4 } from "common/engine/core/math/matrix.ts";
import { BasicSocket, Client, Color, ColorM, ConnectPacket, DisconnectPacket, FileManager, Language, Numeric, Path, TranslationManager, v2, v2m, Vec2 } from "common/engine/core.ts";
import { Drone } from "../objects/drone.ts";
import { decode_map_config } from "common/scripts/packets/map_message.ts";
import { FindGameResult } from "common/scripts/config/config.ts";
import { GameState, PlayArgs } from "./constants.ts";
import { Scene2D } from "./scene.ts";
import { JoinnedPacket } from "common/scripts/packets/joinned.ts";
import { Wall } from "../objects/walls.ts";
export class Game extends ClientGame<GameObject>{
    state:GameState=GameState.Idle

    declare scene_2d: Scene2D
    client?:Client
    input:InputPacket=new InputPacket()
    comunication_mode:boolean=false
    showing_menu:boolean=false

    offline:boolean=false
    can_act:boolean=true
    get play_sounds():boolean{
        return this.menu.content.gameover_text_screen.style.opacity=="0"
    }
    match_started:boolean=false

    local_server:LocalGameServer
    start_with_intro:boolean=false

    group_token:string=""

    cursors={
        default:"url('/assets/img/menu/icons/mouse.svg') 0 0, default",
        pointer:"url('/assets/img/menu/icons/pointer.svg') 21 21, pointer"
    }

    terrain:TerrainM=new TerrainM(this)

    scope_zoom:number=0.5
    zoom_speed:number=4

    ui:UiManager
    menu:MenuManager
    inventory:GInventory
    dead_zone:DeadZoneManager
    ambient:AmbientManager
    device:GameDeviceManager
    minimap:MinimapManager

    active_entity?:Human
    active_entity_id?:number

    global_interpolation:number=1

    loaded=false

    definitions!:GameDefinition

    world_shadow: {
        enabled:boolean
        color: Color
        matrix: Matrix
        offset: Vec2
        scale: Vec2
    }
    fs?:FileManager
    cam_type:number=0

    free_cam_pos=v2(0,0)
    free_cam_speed=2
    free_cam_zoom=0.5

    hitboxes_gfx:Graphics2D=new Graphics2D()
    ui_gfx:Graphics2D=new Graphics2D()
    aim_line:{
        enabled:boolean
        width:number
        height:number
        color:Color
    }={
        enabled:false,
        width:1000,
        height:0.1,
        color:{r:255,g:255,b:255,a:229}
    }

    theme_colors:Record<string,string>={}
    ntps:number=30

    constructor(definitions:GameDefinition,menu:MenuManager,canvas:HTMLCanvasElement,translation:TranslationManager,objects:Array<new ()=>GameObject>=[]){
        super(
            new WebglRenderer(canvas),
            translation,
            [...objects,Human,Loot,Building,Obstacle,Bullet,Decal,Explosion,Grenade,Vehicle,Creature,Parachute,SyncedParticle,Plane,HumanBody,Drone],
        )
        this.set_scene2d(new Scene2D())
        this.scene_2d.camera.visible_callback=(o)=>o.layer<=this.scene_2d.camera.layer
        this.scene_2d.camera.aspect_lock=true

        this.local_server=new LocalGameServer(this)

        this.definitions=definitions
        this.renderer.set_background_color(ColorM.number(Floors[FloorType.Void].default_color))

        this.sounds.create_bus("music")
        this.sounds.create_bus("ambience")
        this.sounds.create_bus("ui")
        this.sounds.create_bus("humans")
        this.sounds.create_bus("loots")
        this.sounds.create_bus("obstacles")
        this.sounds.create_bus("explosions")

        this.save.casters=ConfigCasters
        this.save.default_values=ConfigDefaultValues
        this.save.default_actions=ConfigDefaultActions

        this.ui=new UiManager(this)
        this.menu=menu

        this.inventory=new GInventory(this.definitions)
        this.dead_zone=this.add_component(new DeadZoneManager()) as DeadZoneManager
        this.ambient=this.add_component(new AmbientManager()) as AmbientManager
        this.device=new GameDeviceManager(this)
        this.minimap=new MinimapManager(this)

        this.scene_2d.camera.add_object(this.hitboxes_gfx)
        this.scene_2d.camera.add_object(this.ui_gfx)

        this.ui_gfx.zIndex=zIndexes.UI
        this.hitboxes_gfx.zIndex=zIndexes.UI

        this.world_shadow={
            enabled:true,
            color:ColorM.hex("#0013"),
            matrix:matrix4.translation_2d(v2(0.1,0.1)),//matrix4.mul(),matrix4.translation_2d(v2(0.9,0.9)))
            offset:v2(0.1,0.1),
            scale:v2(1,1)
        }

        this.hitboxes_gfx.initialize(this.scene_2d.camera.ctx)
        this.ui_gfx.initialize(this.scene_2d.camera.ctx)
        this.terrain.append()
    }
    get_theme_color(name:string):string{
        if(this.theme_colors[name])return this.theme_colors[name]
        switch(name){
            case "primary":
                return this.save.get_variable("sv_ui_primary_color")
            case "secondary":
                return this.save.get_variable("sv_ui_secondary_color")
            case "tertiary":
                return this.save.get_variable("sv_ui_tertiary_color")
            case "positive":
                return this.save.get_variable("sv_ui_positive_color")
            case "negative":
                return this.save.get_variable("sv_ui_negative_color")
            case "special":
                return this.save.get_variable("sv_ui_special_color")
        }
        return "#ffffff"
    }
    override listeners_init(): void {
        this.input_manager.add_axis("movement","move_up","move_down","move_left","move_right","left")
        this.input_manager.add_axis("aim","aim_up","aim_down","aim_left","aim_right","right")
        this.input_manager.listener.on(InputEventType.Axis,(a:InputAxisEvent)=>{
            if(a.action==="movement"){
                if(!this.can_act||this.state!==GameState.Playing){
                    this.input.movement={dir:0,scale:0}
                    return
                }
                if(a.value.x==0&&a.value.y==0){
                    this.input.movement={dir:0,scale:0}
                }else{
                    this.input.movement={dir:Math.atan2(a.value.y,a.value.x),scale:1}
                }
            }else if(a.action==="aim"){
                if(a.value.x!==0||a.value.y!==0)this.set_lookTo_angle(Math.atan2(a.value.y,a.value.x),1)
            }
        })
        this.input_manager.listener.on(InputEventType.ActionDown,(a:InputActionEvent)=>{
            if(!this.can_act||!(this.state===GameState.Playing))return
            switch(a.action){
                case "fire":
                    if(a.element!==this.renderer.canvas)break
                    this.input.use_weapon=true
                    break
                case "alt_fire":
                    if(a.element!==this.renderer.canvas)break
                    this.input.alt_use_weapon=true
                    break
                case "emote_wheel":
                    this.ui.begin_emote_wheel(this.input_manager.mouse_position)
                    break
                case "message":
                    if(!this.showing_menu){
                        this.showing_menu=true
                        this.can_act=false
                        this.input.movement={dir:0,scale:0}
                        this.menu.game_popup(input_popup("Message")).then((v)=>{
                            this.can_act=true
                            this.showing_menu=false
                            if(v.length>0){
                                this.input.actions.push({
                                    type:InputActionType.message,
                                    value:v
                                })
                            }
                        })
                    }
                    break
                case "comunication_mode":
                    this.comunication_mode=true
                    break
                case "reload":
                    this.input.reload=true
                    break
                case "interact":
                    this.interact()
                    break
                case "cancel":
                    this.input.cancel=true
                    break
                case "swamp_guns":
                    this.input.swamp_guns=true
                    break
                case "weapon1":
                    this.input.actions.push({type:InputActionType.set_hand,hand:0})
                    break
                case "weapon2":
                    this.input.actions.push({type:InputActionType.set_hand,hand:1})
                    break
                case "weapon3":
                    this.input.actions.push({type:InputActionType.set_hand,hand:2})
                    break
                case "use_item1":
                    this.input.actions.push({type:InputActionType.use_item,slot:0})
                    break
                case "use_item2":
                    this.input.actions.push({type:InputActionType.use_item,slot:1})
                    break
                case "use_item3":
                    this.input.actions.push({type:InputActionType.use_item,slot:2})
                    break
                case "use_item4":
                    this.input.actions.push({type:InputActionType.use_item,slot:3})
                    break
                case "use_item5":
                    this.input.actions.push({type:InputActionType.use_item,slot:4})
                    break
                case "use_item6":
                    this.input.actions.push({type:InputActionType.use_item,slot:5})
                    break
                case "use_item7":
                    this.input.actions.push({type:InputActionType.use_item,slot:6})
                    break
                case "previous_weapon":
                    this.input.actions.push({type:InputActionType.set_hand,hand:Math.max(this.inventory.weapon_idx-1,0)})
                    break
                case "next_weapon":
                    this.input.actions.push({type:InputActionType.set_hand,hand:Math.max(this.inventory.weapon_idx+1,0)})
                    break
                case "previous_scope":{
                    const oidx=this.inventory.iitems.indexOf(this.inventory.scope!)
                    const it=this.inventory.iitems[oidx-1]
                    this.free_cam_zoom=Math.min(1,this.free_cam_zoom*1.1)

                    if(!it)break

                    this.input.actions.push({
                        type:InputActionType.set_scope,
                        scope_id:it.idNumber!
                    })
                    break
                }
                case "next_scope":{
                    const oidx=this.inventory.iitems.indexOf(this.inventory.scope!)
                    const it=this.inventory.iitems[oidx+1]
                    this.free_cam_zoom=Math.max(0.1,this.free_cam_zoom*0.9)

                    if(!it)break
                    this.input.actions.push({
                        type:InputActionType.set_scope,
                        scope_id:it.idNumber!
                    })
                    break
                }
                case "escape":
                    if(!this.showing_menu){
                        this.showing_menu=true
                        this.menu.game_popup(yes_no_popup("Exit?")).then((v)=>{
                            if(v){
                                this.close_game()
                            }
                            this.showing_menu=false
                        })
                    }
                    break
            }
            this.ui_manager.signal("actiondown",a)
        })
        this.input_manager.listener.on(InputEventType.ActionUp,(a:InputActionEvent)=>{
            if(!this.can_act)return
            switch(a.action){
                case "fire":
                    this.input.use_weapon=false
                    break
                case "alt_fire":
                    this.input.alt_use_weapon=false
                    break
                case "emote_wheel":
                    this.ui.end_emote_wheel()
                    break
                case "comunication_mode":
                    this.comunication_mode=false
                    break
            }
            this.ui_manager.signal("actionup",a)
        })
        this.input_manager.listener.on(InputEventType.MouseMove,(e:InputMouseMoveEvent)=>{
            if(!isMobile){
                const cam_c=v2.dscale(this.scene_2d.camera.size,2)
                const mouse_p=e.position
                const angle=v2.lookTo(cam_c,mouse_p)
                const dist=v2.distance(cam_c,mouse_p)/v2.len(cam_c)
                this.set_lookTo_angle(angle,dist)
            }
        })
        this.ui_manager.init()
    }
    override async bind(fs?:FileManager): Promise<void> {
        super.bind()
        this.save.compatible_version=1
        this.save.version=1
        await this.save.init(is_binary?{
            type:"file",
            path:"save/settings.json",
            fs:fs!,
        }:{
            type:"localstorage",
            key:"surgemd-settings"
        })

        this.language.load_default_language(await(await fetch("/scripts/languages/en.json")).json() as Language,"main")
        this.language.load_language(await(await fetch(`/scripts/languages/${this.save.get_variable("sv_ui_translation")}.json`)).json() as Language,"main")

        this.fs=fs
    }

    set_lookTo_angle(angle:number,dist:number){
        if(!this.active_entity)return
        this.input.angle=angle
        this.input.distance_to_aim=dist
        if(!this.active_entity.downed&&!this.active_entity.swimming&&!this.active_entity.seat&&this.save.get_variable("sv_game_client_rot")){
            this.active_entity.enable_auto_rot=false
            this.active_entity.physical_data.rotation=this.input.angle
        }else{
            this.active_entity.enable_auto_rot=true
        }
    }
    interact(){
        if(this.input.interact||this.active_entity===undefined)return
        this.input.interact=true
        this.ui.update_active_player(this.active_entity)
        if(this.active_entity&&this.ui.current_interaction){
            this.ui.current_interaction.on_interact(this.active_entity)
        }
    }
    async load_resources(agro:string[]=[],assets:Record<string,string>,languages_path:string=""){
        if(!this.resources)return
        this.loaded=false
        this.menu.set_loading_current("Somethings",true)

        agro=["/assets/kspr/main",...agro]
        for(const p in this.resources.imported){
            if(agro.includes(p))continue
            this.resources.unload_imported(p)
        }
        let resolution = this.save.get_variable("sv_graphics_resolution")
        for(const tt of agro){
            if(this.resources.imported[tt])continue
            const v=await this.resources.load_json(`${tt}/settings.json`,this.menu.set_loading_current)

            for(const f of (v.files as string[])){
                const path=Path.join_simple(tt,f)
                this.menu.set_loading_current(path)
                if(f.startsWith("sounds")){
                    await this.resources.load_source(tt,path)
                }else if(f.startsWith("sheets/sheet_"+resolution)){
                    resolution=""
                    await this.resources.load_source(tt,path)
                }
            }
        }
        if(languages_path!=""){
            try{
                this.language.load_default_language(await this.resources.load_json(`${languages_path}/en.json`),"ingame")
                this.language.load_language(await this.resources.load_json(`${languages_path}/${this.save.get_variable("sv_ui_translation")}.json`),"ingame")
            }catch(e){
                console.log(e)
            }
        }
        this.call_event("load",agro)
        this.loaded=true
    }
    async start(settings:StartSettings){
        await this.load_resources(settings.textures,settings.assets,settings.languages_path)
        this.menu.game_start()

        this.scene_2d.set_camera_position(v2(-10000,-10000))
        this.scene_2d.camera.zoom=6
        this.zoom_speed=4

        if(settings.map){
            const map=decode_map_config(settings.map)
            if(map.definitions){
                this.definitions.reset()
                this.definitions.add_definitions(map.definitions)
            }
            await this.terrain.process_map(map)
            this.minimap.init(map)
        }

        this.call_event("game_start",settings)

        this.ui.game_over_screen={
            type:GameOverScreenType.Normal
        }
        this.ui.start()
        this.join()

        this.scope_zoom=1
        this.hitboxes_gfx.ctx.clear()
        this.menu.hide_loading_screen()

        if(this.offline){
            this.ui.game_over_screen={type:GameOverScreenType.Restart}
            this.local_server.init(this.start_with_intro)
        }
    }
    close_game(hard:boolean=true){
        if(this.client&&this.client.opened)this.client.disconnect()
        if(hard){
            this.local_server.stop()
            this.menu.hide_loading_screen()
        }
        this.state=GameState.Idle
        this.match_started=false
        this.menu.game_end()
        this.call_event("game_close")
        this.client=undefined
        this.cam_type=0
        this.language.clear("ingame")
        this.soft_close_game()
        this.showing_menu=false
    }
    soft_close_game(){
        this.scene_2d.clear()
        this.ui.clear()
        this.active_entity=undefined
        this.active_entity_id=undefined
        this.ui.hide_game_over()

        this.scene_2d.set_camera_position(v2(-10000,-10000))
        this.scene_2d.camera.zoom=6
        this.zoom_speed=4
    }
    finish_game_over(win:boolean){
        if(this.offline){
            if(win){
                this.close_game(false)
            }else{
                this.soft_close_game()
                this.local_server.reset_level()
                this.state=GameState.Playing
            }
        }else{
            this.close_game()
        }
    }
    override on_update(dt:number){
        super.on_update(dt)
        if(this.save.get_variable("sv_game_interpolation")){
            this.global_interpolation=Numeric.get_interpolation_t(this.ntps,dt)
        }else{
            this.global_interpolation=1
        }
        if(this.state===GameState.Playing){
            this.ui.update(dt)
        }

        if (this.cam_type === 1) {
            const move = this.input.movement
            this.free_cam_speed=5/this.free_cam_zoom
            if (move.scale>0) {
                this.free_cam_pos.x+=Math.cos(move.dir)*this.free_cam_speed*dt
                this.free_cam_pos.y+=Math.sin(move.dir)*this.free_cam_speed*dt
            }
            this.scene_2d.camera.zoom=Numeric.lerp(this.scene_2d.camera.zoom, this.free_cam_zoom, Numeric.dt_expo_inter(5, dt))
            v2m.lerp(this.scene_2d.camera.position,this.free_cam_pos, Numeric.dt_expo_inter(5, dt))
            if(this.input_manager.keyPress(Key.E)){
                v2m.add(this.free_cam_pos,this.free_cam_pos,v2.scale(this.input_manager.mouse_delta,0.01))
            }
        }else{
            if(this.active_entity&&this.active_entity_id!==this.active_entity.id){
                this.active_entity=this.scene_2d.objects.get_object(this.active_entity_id!) as Human
            }
            if(this.active_entity){
                this.scene_2d.camera.position=this.active_entity.position
                this.scene_2d.camera.zoom=Numeric.lerp(this.scene_2d.camera.zoom,this.scope_zoom,Numeric.dt_expo_inter(this.zoom_speed,dt))
                this.scene_2d.camera.layer=this.active_entity.layer
                if(this.active_entity.dead)this.active_entity=undefined
            }
        }
        this.scene_2d.set_camera_position(this.scene_2d.camera.position)
        this.terrain.tick()
        if(this.client&&this.client.opened){
            this.input.auto_fire=this.ui.mobile_enabled
            this.client.emit_packet(this.input)
            this.reset_input()
        }
    }
    reset_input(){
        this.input.reload=false
        this.input.interact=false
        this.input.cancel=false
        this.input.swamp_guns=false
        this.input.actions.length=0
    }
    process_general_update(up:GeneralUpdate){
        this.call_event("general_update",up)
        if(up.started&&!this.match_started){
            this.match_started=true
        }else if(!up.started){
            this.match_started=false
        }
        this.ui.proccess_general_update(up)
    }
    process_self_state(state:SelfStateUpdate){
        this.scope_zoom=state.scope_zoom
        this.inventory.update_self_state(state)
        this.ui.update_self_state(state)
    }
    proccess_general_main_state(state:GeneralFullMainState){
        this.ntps=state.ntps
        this.ui.proccess_general_main_state(state)
    }
    process_private(priv:PrivateUpdate){
        this.ui.proccess_private(priv)
        if(priv.active_entity.dirty){
            if(priv.active_entity.id){
                this.active_entity_id=priv.active_entity.id
                this.active_entity=this.scene_2d.objects.get_object(this.active_entity_id!) as Human
            }else{
                this.active_entity=undefined
            }
        }
        if(priv.splashes.length>0){
            for(const s of priv.splashes){
                const dd=new DamageSplashOBJ()
                this.scene_2d.objects.add_object(dd,s.taker_layer,undefined,s)
            }
        }
        if(priv.self_state)this.process_self_state(priv.self_state)
        this.device.update_private(priv)
        this.ui_manager.signal("private",priv)
    }
    join(){
        if(!this.client)return
        const packet=new JoinPacket()
        packet.player_name=this.save.get_variable("sv_loadout_name")
        packet.skin={
            female:this.save.get_variable("sv_loadout_female"),
            body_tint:ColorM.hex2number(this.save.get_variable("sv_loadout_body_tint")),
            hair:(this.definitions.loadout.getFromStringSafe(this.save.get_variable("sv_loadout_hair")))?.idNumber??0,
            hair_tint:ColorM.hex2number(this.save.get_variable("sv_loadout_hair_tint")),
            shirt:(this.definitions.loadout.getFromString(this.save.get_variable("sv_loadout_shirt")) as LoadoutShirtDef).idNumber!,
        }
        packet.group_token=this.group_token
        packet.victory_emote=this.definitions.emotes.getFromStringSafe(this.save.get_variable("sv_loadout_emote_victory"))?.idNumber??1
        packet.death_emote=this.definitions.emotes.getFromStringSafe(this.save.get_variable("sv_loadout_emote_death"))?.idNumber??0
        packet.wrapping=this.definitions.wrapping.getFromStringSafe(this.save.get_variable("sv_loadout_wrapping_weapons"))?.idNumber??0
        packet.badge=this.definitions.badges.getFromStringSafe(this.save.get_variable("sv_loadout_badge"))?.idNumber??0
        this.client.emit_packet(packet)
    }

    play_game_hard(result:FindGameResult){
        if(result.success){
            this.group_token=result.token??""
            this.set_socket(new WebSocket(result.address))
        }
    }
    async play_game(play:PlayArgs){
        if(this.state!==GameState.Idle)return
        this.state=GameState.Joining
        this.menu.show_loading_screen()
        switch(play.type){
            case "online":{
                const args={
                    ...play,
                    region:this.save.get_variable("sv_game_region"),
                }
                try{
                    if(this.menu.group_state){
                        this.menu.team_ws!.send(JSON.stringify({
                            ...args,
                            type:"play"
                        }))
                        return
                    }else{
                        const ghost:FindGameResult=await(await fetch(API_BASE+"/find-game",{
                            method:"post",
                            body:JSON.stringify(args)
                        })).json()
                        if(ghost.success){
                            this.set_socket(new WebSocket(ghost.address))
                            return
                        }
                    }
                }catch{
                    alert("Error")
                }
                break
            }
            case "campaign":{
                this.start_with_intro=play.start_with_intro
                this.local_server.load_level(play.path)
                return
            }
            case "editor":{
                //await this.start_editor()
                return
            }
        }
        this.state=GameState.Idle
        this.menu.hide_loading_screen()
    }
    set_socket(socket:BasicSocket|WebSocket){
        if(this.client)return
        const client=new Client(socket as unknown as BasicSocket,PacketManager)
        client.onopen=this.set_client.bind(this,client)
    }

    async online_message(msg:OnlineMessage){
        const old_state=this.state
        let ret:any=undefined
        this.state=GameState.Cutscene
        switch(msg.type){
            case OnlineMessageType.Cutscene:{
                await this.menu.cutscene.play(msg.cutscene)
                break
            }
            case OnlineMessageType.CharacterSelector:{
                ret=await this.menu.select_character_screen(msg.characters)
                break
            }
            case OnlineMessageType.Load:{
                if(msg.assets){
                    for(const a in msg.assets){
                        await this.resources.load_source(a,msg.assets[a],undefined,this.menu.set_loading_current,true)
                    }
                }
                break
            }
        }
        this.state=old_state
        return ret
    }
    set_client(client:Client){
        if(!client.opened)return
        if(this.client===client)return
        if(this.client&&this.client.opened)this.client.disconnect()
        this.client=client
        client.send_ping_emulation=this.save.get_variable("sv_debug_ping_emulation")
        client.recev_ping_emulation=this.save.get_variable("sv_debug_ping_emulation")

        this.world_shadow.enabled=this.save.get_variable("sv_graphics_shadows")

        client.on("general_update",(p:GeneralUpdatePacket)=>{
            this.process_general_update(p.content)
        })
        client.on("update",(p:UpdatePacket)=>{
            this.process_private(p.priv)
            if(p.objects)this.scene_2d.objects_process_queue.push(p.objects)
        })
        client.on("connect",(_p:ConnectPacket)=>{
        })
        client.on("start",async(s:StartPacket)=>{
            await this.start(s.settings)
            /*const wa=new Wall()
            this.scene_2d.add_object(wa,Layers.Normal)
            wa.set_wall([[v2.zero(),v2(10,0),v2(10,10),v2(20,10)]])*/
        })
        client.on("joinned",(jp:JoinnedPacket)=>{
            this.proccess_general_main_state(jp.main_state)
            this.state=GameState.Playing
        })
        client.on("gameover",async(p:GameOverPacket)=>{
            this.state=GameState.Gameover
            this.ui.show_game_over(p)
        })
        client.on("disconnect",(_p:DisconnectPacket)=>{
            if(this.state===GameState.Playing)this.close_game()
        })
        client.on("message",async(msg:any)=>{
            client.emit("_end",await this.online_message(msg))
        })
    }
}