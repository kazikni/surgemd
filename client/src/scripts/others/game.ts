import { BasicSocket, Client, ClientGame, Color, ColorM, ConnectPacket, DisconnectPacket, FileManager, Graphics2D, Grid2D, InputActionEvent, InputAxisEvent, InputEventType, InputMouseMoveEvent, isMobile, Language, Numeric, random, ReplayWatcher, Sound, TranslationManager, v2, v2m, Vec2, WebglRenderer } from "common/engine/client.ts";
import { InputActionType, InputPacket } from "common/scripts/packets/input_packet.ts";
import { GameObject } from "./gameObject.ts";
import { UiManager } from "../managers/uiManager.ts";
import { TerrainM } from "../managers/terrainManager.ts";
import { MenuManager } from "../managers/menuManager.ts";
import { DeadZoneManager } from "../managers/deadZoneManager.ts";
import { AmbientManager } from "../managers/ambientManager.ts";
import { Human } from "../objects/human.ts";
import { DamageSplash, PrivateUpdate, UpdatePacket } from "common/scripts/packets/update_packet.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { MapPacket } from "common/scripts/packets/map_packet.ts";
import { HumanStatus, Layers, PlayerStatus, zIndexes } from "common/scripts/others/constants.ts";
import { ConfigCasters, ConfigDefaultActions, ConfigDefaultValues } from "./config.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { Loot } from "../objects/loot.ts";
import { Obstacle } from "../objects/obstacle.ts";
import { Bullet } from "../objects/bullet.ts";
import { Explosion } from "../objects/explosion.ts";
import { ScopeDef } from "common/scripts/definitions/items/scopes.ts";
import { Grenade } from "../objects/grenade.ts";
import { JoinnedPacket } from "common/scripts/packets/joinned_packet.ts";
import { GeneralUpdate, GeneralUpdatePacket } from "common/scripts/packets/general_update.ts";
import { GameOverScreenType } from "common/scripts/config/level_definition.ts";
import { Building } from "../objects/building.ts";
import { DamageSplashOBJ } from "../objects/damageSplash.ts";
import { Vehicle } from "../objects/vehicle.ts";
import { MinimapManager } from "../managers/miniMapManager.ts";
import { MapApp } from "../apps/map.ts";
import { GameDefinition, GameItem } from "common/scripts/definitions/game_defs.ts";
import { GameOverPacket, GameOverStatus } from "common/scripts/packets/gameOver.ts";
import { LocalGameServer } from "./offline_game.ts";
import { is_binary } from "../defs/go_files.ts";
import { Creature } from "../objects/creature.ts";
import { Parachute } from "../objects/parachute.ts";
import { SyncedParticle } from "../objects/synced_particle.ts";
import { GInventory, GunItem, LItem, MeleeItem } from "./inventory.ts";
import { GameDeviceManager } from "../managers/deviceManager.ts";
import { Floors, FloorType } from "common/scripts/others/terrain.ts";
import { LoadoutShirtDef } from "common/scripts/definitions/loadout/skins.ts";
import { load_kspr } from "common/engine/core/lang/kspx.ts";
import { Plane } from "../objects/plane.ts";
import { Decal } from "../objects/decals.ts";
import { FinalScreenManager } from "../managers/final_screen.ts";
import { island_final } from "common/scripts/config/final_screen.ts";
import { HumanBody } from "../objects/human_body.ts";
import { OnlineMessage, OnlineMessageType } from "common/scripts/packets/messages.ts"
import { StartPacket, StartSettings } from "common/scripts/packets/start_packet.ts";
import { yes_no_popup } from "../defs/menu.ts";
export class Game extends ClientGame<GameObject>{
    client?:Client
    input:InputPacket=new InputPacket()
    comunication_mode:boolean=false
    escape_menu:boolean=false

    offline:boolean=false
    can_act:boolean=true
    get play_sounds():boolean{
        return this.menu.content.gameover_text_screen.style.opacity=="0"
    }
    game_over:boolean=false
    started:boolean=false
    map_started:boolean=false

    local_server:LocalGameServer
    start_with_intro:boolean=false

    group_token:string=""

    cursors={
        default:"url('/img/menu/icons/mouse.svg') 0 0, default",
        pointer:"url('/img/menu/icons/pointer.svg') 21 21, pointer"
    }

    terrain:TerrainM=new TerrainM(this)

    force_default_scope:boolean=false
    default_scope?:ScopeDef
    scope_zoom:number=0.5
    zoom_speed:number=4

    ui:UiManager
    menu:MenuManager
    inventory:GInventory
    dead_zone:DeadZoneManager
    ambient:AmbientManager
    device:GameDeviceManager
    minimap:MinimapManager
    final_screen:FinalScreenManager

    active_entity?:Human
    active_entity_id?:number

    global_interpolation:number=1

    terrain_gfx=new Graphics2D()
    grid=new Grid2D()

    loaded=false
    loaded_textures:string[]=[]

    definitions!:GameDefinition

    world_shadow: {
        color: Color,
        radius: number,
        offset:Vec2
    }
    fs?:FileManager
    watcher?:ReplayWatcher
    cam_type:number=0

    free_cam_pos = v2(0, 0)
    free_cam_speed = 2
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
            [...objects,Human,Loot,Building,Obstacle,Bullet,Decal,Explosion,Grenade,Vehicle,Creature,Parachute,SyncedParticle,Plane,HumanBody],
        )

        this.set_meter_size(85)
        this.cam2d.visible_callback=(o)=>o.layer<=this.cam2d.layer

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

        this.inventory=new GInventory()
        this.dead_zone=new DeadZoneManager(this)
        this.ambient=new AmbientManager(this)
        this.device=new GameDeviceManager(this)
        this.minimap=new MinimapManager(this)
        this.final_screen=new FinalScreenManager(this)

        this.cam2d.add_object(this.terrain_gfx)
        this.cam2d.add_object(this.grid)
        //this.cam2d.add_object(this.ui_gfx)
        //this.cam2d.add_object(this.hitboxes_gfx)

        this.terrain_gfx.zIndex=zIndexes.Terrain
        this.grid.zIndex=zIndexes.Grid
        this.ui_gfx.zIndex=zIndexes.UI
        this.hitboxes_gfx.zIndex=zIndexes.UI

        this.world_shadow={
            color:ColorM.rgba(0,0,0,50),
            radius:1,
            offset:v2(0.1,0.1)
        }

        this.inventory.initialize(this.definitions,{
            0:MeleeItem as (new(item:GameItem)=>LItem),
            1:GunItem as (new(item:GameItem)=>LItem),
            2:GunItem as (new(item:GameItem)=>LItem)
        })

        this.device.add_app(new MapApp)

        this.grid.size=0.05
        this.grid.size=5
        this.grid.stroke=ColorM.rgba(0,0,0,25)

        this.terrain_gfx.initialize(this.cam2d.ctx)
        this.dead_zone.append()
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
    add_damage_splash(d:DamageSplash){
        const dd=new DamageSplashOBJ()
        this.scene_2d.objects.add_object(dd,d.taker_layer,undefined,d)
    }
    override listeners_init(): void {
        this.input_manager.add_axis("movement","move_up","move_down","move_left","move_right","left")
        this.input_manager.add_axis("aim","aim_up","aim_down","aim_left","aim_right","right")
        this.input_manager.listener.on(InputEventType.Axis,(a:InputAxisEvent)=>{
            if(a.action==="movement"){
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
            if(!this.can_act)return
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
                case "toggle_full_device":
                    this.device.toggle_full()
                    break
                case "toggle_hide_device":
                    this.device.toggle_visibility()
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
                case "debug_menu":
                    /*if((!this.menu.api_settings.debug.debug_menu)&&!this.offline)break
                    if(!this.device.apps.some((a)=>a instanceof DebugApp)){
                        this.device.add_app(new DebugApp)
                    }*/
                    break
                case "escape":
                    if(this.happening&&!this.escape_menu){
                        this.escape_menu=true
                        this.menu.game_popup(yes_no_popup("Exit?")).then((v)=>{
                            if(v){
                                this.close_game()
                            }
                            this.escape_menu=false
                        })
                    }
                    break
            }
            this.ui_manager.signal("actiondown",a)
        })
        this.input_manager.listener.on(InputEventType.ActionUp,(a:InputActionEvent)=>{
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
                const cam_c=v2(this.cam2d.width/2,this.cam2d.height/2)
                const mouse_p=v2.dscale(e.position,this.cam2d.zoom)
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
        if(!this.active_entity.downed&&this.active_entity.controlling&&!this.active_entity.seat&&this.save.get_variable("sv_game_client_rot")&&!this.game_over){
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
    set_scope(scope:ScopeDef,force_default:boolean=false,force:boolean=false){
        if(this.inventory.scope&&this.inventory.scope===scope&&this.force_default_scope==force_default&&!force){
            return
        }
        if(!this.default_scope)this.default_scope=this.definitions.scopes.getFromNumber(0)
        this.force_default_scope=force_default
        this.inventory.scope=scope
        this.scope_zoom=force_default?this.default_scope.scope_view:scope.scope_view
        this.ui_manager.signal("current_scope_dirty",scope)
    }
    async load_resources(textures:string[]=["main"],assets:Record<string,string>,languages_path:string=""){
        if(!this.resources||(this.loaded_textures.length==textures.length&&textures==this.loaded_textures))return
        this.loaded=false
        this.menu.show_loading_screen()
        this.menu.set_loading_current("Somethings",true)

        this.resources.clear([
            "essentials",
            "main",
            ...textures
        ])

        for (const tt of textures) {
            this.menu.set_loading_current(`Loading ${tt}.kspr`)
            const res = await fetch(`/img/kspr/${tt}.kspr`)
            const buffer = await res.arrayBuffer()
            const kspr = load_kspr(buffer)
            let resolution = this.save.get_variable("sv_graphics_resolution")
            if(!["low","medium"].includes(resolution)){
                resolution="low"
                this.save.set_variable("sv_graphics_resolution",resolution)
            }
            await this.resources.load_kspr(kspr,resolution,tt,"",this.menu.set_loading_current)
        }

        await this.resources.load_group("/assets/main-sounds.json","main",this.menu.set_loading_current)
        
        await this.resources.load_sound("typewriter-1",{src:"/sounds/ui/typewriter-1.mp3",volume:1},"essentials",this.menu.set_loading_current)
        await this.resources.load_sound("typewriter-2",{src:"/sounds/ui/typewriter-2.mp3",volume:1},"essentials",this.menu.set_loading_current)

        await this.resources.load_sound("deadzone_ambience",{src:"/sounds/ambience/deadzone_ambience.mp3",volume:1},"essentials",this.menu.set_loading_current)
        await this.resources.load_sound("rain_ambience",{src:"/sounds/ambience/rain_ambience.mp3",volume:1},"essentials",this.menu.set_loading_current)
        await this.resources.load_sound("storm_ambience",{src:"/sounds/ambience/storm_ambience.mp3",volume:1},"essentials",this.menu.set_loading_current)
        await this.resources.load_sound("snowstorm_ambience",{src:"/sounds/ambience/snowstorm_ambience.mp3",volume:1},"essentials",this.menu.set_loading_current)
        await this.resources.load_sound("thunder_1",{src:"/sounds/ambience/thunder_1.mp3",volume:1},"essentials",this.menu.set_loading_current)
        await this.resources.load_sound("thunder_2",{src:"/sounds/ambience/thunder_2.mp3",volume:1},"essentials",this.menu.set_loading_current)
        await this.resources.load_sound("thunder_3",{src:"/sounds/ambience/thunder_3.mp3",volume:1},"essentials",this.menu.set_loading_current)

        for(const s in assets){
            await this.resources.load_sound(s,{src:assets[s],volume:1},"ingame",this.menu.set_loading_current)
        }
        
        if(languages_path!=""){
            try{
                this.language.load_default_language(await this.resources.load_json(`${languages_path}/en.json`),"ingame")
                this.language.load_language(await this.resources.load_json(`${languages_path}/${this.save.get_variable("sv_ui_translation")}.json`),"ingame")
            }catch(e){
                console.log(e)
            }
        }
        /*if(this.level){
            if(this.level?.assets?.background_music){
                await this.resources.load_sound("level_music",{src:this.level.assets.background_music,volume:1},"level",this.menu.set_loading_current)
            }
            if(this.level.cutscenes?.begin){
                await this.menu.preload_cutscene(this.level_path+"/cutscenes/"+this.level.cutscenes.begin)
            }
        }*/

        this.menu.hide_loading_screen()
        this.loaded=true
    }
    async start(settings:StartSettings){
        await this.load_resources(settings.textures,settings.assets,settings.languages_path)
        this.menu.game_start()

        this.happening=true

        this.cam2d.position.x=-10000
        this.cam2d.position.y=-10000
        this.sounds.set_listener_position(this.cam2d.position)
        this.cam2d.zoom=6
        this.zoom_speed=4

        this.ambient.music.set(undefined)

        this.ui.game_over_screen={
            type:GameOverScreenType.Normal
        }
        this.ui.start()
        this.join()
        this.watcher?.play?.()
        if(this.offline){
            this.ui.game_over_screen={
                type:GameOverScreenType.Restart
            }
            this.local_server.init(this.start_with_intro)
        }

        this.scope_zoom=(this.default_scope??this.definitions.scopes.getFromNumber(0)).scope_view
    }
    async show_final_screen(game_over:GameOverStatus){
        this.final_screen.set_final_screen(island_final)
        await this.final_screen.show_final_screen()
        await this.final_screen.show_status(game_over.status[0] as PlayerStatus)
        if(game_over.leaderboards)await this.final_screen.show_leaderboards(game_over.leaderboards)
        await this.final_screen.hide_final_screen()

    }
    make_green_light_death_message(status:HumanStatus):string[]{
        const messages: string[] = []
        // INTRO
        messages.push(this.language.get(`gameover.messages.introductions.${random.int(0, 2)}`))
        // DEATH
        messages.push(this.language.get(`gameover.messages.death.${random.int(0, 10)}`))
        // STATUS
        if (status.kills >= 1) {
            messages.push(this.language.get("gameover.messages.status.kills", {
                kills: status.kills.toString()
            }))
        } else {this.default_scope??this.definitions.scopes.getFromNumber(0)
            messages.push(
                this.language.get("gameover.messages.status.no-kills"),
                this.language.get("gameover.messages.status.no-kills-dead")
            )
        }
        // HINTS
        const hintGroups:[string,number][] = [
            ["quickswitch", 5],
            ["movement", 2],
            ["cover", 3],
            ["healing", 3],
            ["grenade", 2]
        ]
        const chosenHint = random.choose(hintGroups)
        for (let i = 0; i < chosenHint[1]; i++) {
            messages.push(
                this.language.get(`gameover.messages.hints.${chosenHint[0]}.${i}`)
            )
        }
        // MOTIVATIONAL
        const motivational:number[]=[
            1,
            1,
            1,
            1,
            2,
            1,
            2,
            2
        ]
        const msg=random.int(0,motivational.length-1)
        for(let i=0;i<motivational[i];i++){
            messages.push(this.language.get(`gameover.messages.motivational.${msg}.${i}`))
        }
        // FINAL
        messages.push(this.language.get(`gameover.messages.final.${random.int(0, 3)}`))
        // END
        messages.push(this.language.get("gameover.messages.death-end"))
        return messages
    }
    /*async on_die_level(p:GameOverPacket){
        if(!this.level)return
        this.add_timeout(()=>{
            this.local_server.reset_level()
        },2)
        await this.game_over_messages(this.make_green_light_death_message(p.status.status[0]),this.resources.get_sound("gameover_music")!)
        this.ambient.music.set(this.resources.get_sound("level_music"),{
            loop:true,
            offset:this.ambient.last_music_pos
        })
        this.ui.hide_game_over()
        this.local_server.start()
    }*/
    close_game(){
        if(this.client&&this.client.opened)this.client.disconnect()
        this.happening=false
        this.started=false
        this.local_server.stop()
        this.menu.game_end()
        this.ambient.on_game_close()
        this.client=undefined
        this.map_started=false
        this.cam_type=0
        this.language.clear("ingame")
        this.soft_close_game()
    }
    soft_close_game(){
        this.clear()
        this.ui.clear()
        this.cam2d.stop_shake()
        this.game_over=false
        this.active_entity=undefined
        this.active_entity_id=undefined
        this.ui.hide_game_over()
        this.set_scope(this.default_scope||this.definitions.scopes.getFromNumber(0),true)
        this.cam2d.zoom=6
        this.zoom_speed=4
    }
    finish_game_over(){
        if(this.offline){
            this.soft_close_game()
            this.local_server.reset_level()
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
        this.ambient.update(dt)
        this.ui.update(dt)
        this.device.tick(dt)
        this.dead_zone.tick(dt)
        this.final_screen.update(dt)

        if (this.cam_type === 1) {
            const move = this.input.movement
            if (move.scale > 0) {
                this.free_cam_pos.x += Math.cos(move.dir) * this.free_cam_speed * dt
                this.free_cam_pos.y += Math.sin(move.dir) * this.free_cam_speed * dt
                v2m.clamp2(this.free_cam_pos,v2.zero,this.terrain.map.size)
            }
            this.free_cam_speed=5/this.free_cam_zoom
            this.cam2d.zoom = Numeric.lerp(this.cam2d.zoom, this.free_cam_zoom, Numeric.dt_expo_inter(2, dt))
            v2m.lerp(this.cam2d.position,this.free_cam_pos, Numeric.dt_expo_inter(1, dt))
            v2m.clamp2(this.cam2d.position,v2.zero,this.terrain.map.size)
            this.sounds.set_listener_position(this.cam2d.position)
        }else{
            if(this.active_entity&&this.active_entity_id!==this.active_entity.id){
                this.active_entity=this.scene_2d.objects.get_object(this.active_entity_id!) as Human
            }
            if(this.active_entity){
                this.cam2d.position=this.active_entity.position
                this.sounds.set_listener_position(this.active_entity.position)
                this.cam2d.zoom=Numeric.lerp(this.cam2d.zoom,this.scope_zoom,Numeric.dt_expo_inter(this.zoom_speed,dt))
                this.cam2d.layer=this.active_entity.layer
                /*this.ui_gfx.ctx.clear()
                if(this.aim_line.enabled){
                    this.ui_gfx.ctx.fill_color=this.aim_line.color
                    this.ui_gfx.ctx.dr(this.active_entity.position,v2.add(this.active_entity.position,v2.from_RadAngle(this.active_entity.physical_data.rotation,this.aim_line.width)),this.aim_line.height/this.cam2d.zoom)
                }*/
                if(this.active_entity.dead)this.active_entity=undefined
            }
        }
        this.terrain.draw(this.terrain_gfx,this.cam2d.layer)
        this.update_grid(this.grid,this.cam2d.position,v2(this.cam2d.width,this.cam2d.height))
        this.ambient.update_camera()
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
    update_grid(grid:Grid2D,camera_position:Vec2,camera_size:Vec2){
        grid.layer=this.terrain_gfx.layer
        this.dead_zone.sprite.layer=grid.layer
        this.ui_gfx.layer=grid.layer
        this.hitboxes_gfx.layer=grid.layer
        if(this.cam2d.layer<Layers.Normal){
            this.grid.visible=false
            return
        }
        this.grid.visible=true

        const begin=v2(camera_size.x/2,camera_size.y/2)
        v2m.sub(begin,camera_position,begin)
        v2m.dscale(begin,begin,grid.size)
        v2m.floor(begin)
        v2m.sub_component(begin,1,1)

        const end=v2(camera_size.x/grid.size+2,camera_size.y/grid.size+2)
        v2m.ceil(end)
        v2m.add(end,end,begin)
        grid.begin=begin
        grid.end=end
    }
    override on_render(_dt: number): void {
        this.ambient.render()
    }
    async game_over_messages(text:string[],music:Sound,time_per_message?:number,opacity_anim?:number):Promise<void>{
        this.ambient.ambience.set(undefined)
        await this.menu.game_over_messages(text,music,this.ambient.music,time_per_message,opacity_anim)
        this.ambient.reload()
    }
    process_general_update(up:GeneralUpdate){
        if(up.deadzone)this.dead_zone.update_from_data(up.deadzone)
        if(up.ambient){
            this.ambient.update_from_data(up.ambient)
            if(!this.started)this.ambient.date=up.ambient.date
        }
        if(up.started&&!this.started){
            this.started=true
        }else if(!up.started){
            this.started=false
        }
        this.ui.proccess_general_update(up)
        this.ui_manager.signal("general_update",up)
    }
    process_private(priv:PrivateUpdate){
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
                this.add_damage_splash(s)
            }
        }
        this.ui.proccess_private(priv)
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
            hair:(this.definitions.loadout.getFromString(this.save.get_variable("sv_loadout_hair"))).idNumber!,
            hair_tint:ColorM.hex2number(this.save.get_variable("sv_loadout_hair_tint")),
            shirt:(this.definitions.loadout.getFromString(this.save.get_variable("sv_loadout_shirt")) as LoadoutShirtDef).idNumber!,
        }
        packet.group_token=this.group_token
        let sv=this.save.get_variable("sv_loadout_emote_victory")
        if(sv!=""){
            packet.victory_emote=this.definitions.emotes.getFromString(sv).idNumber!+1
        }
        sv=this.save.get_variable("sv_loadout_emote_death")
        if(sv!=""){
            packet.death_emote=this.definitions.emotes.getFromString(sv).idNumber!+1
        }
        sv=this.save.get_variable("sv_loadout_wrapping_weapons")
        if(sv!=""){
            packet.wrapping=this.definitions.wrapping.getFromString(sv).idNumber!+1
        }
        this.client.emit_packet(packet)
    }
    connect(url:string){
        if(this.happening)return
        this.set_socket(new WebSocket(url) as unknown as BasicSocket)
        this.offline=false
    }
    set_socket(socket:BasicSocket){
        if(this.client)return
        const client=new Client(socket,PacketManager)
        client.onopen=this.set_client.bind(this,client)
    }
    set_client(client:Client){
        if(!client.opened){
            this.client=undefined
            return
        }
        if(client===this.client)return
        this.client=client
        client.send_ping_emulation=this.save.get_variable("sv_debug_ping_emulation")
        client.recev_ping_emulation=this.save.get_variable("sv_debug_ping_emulation")

        client.on("general_update",(p:GeneralUpdatePacket)=>{
            this.process_general_update(p.content)
        })
        client.on("update",(p:UpdatePacket)=>{
            this.clock.profiler.start(100)
            this.process_private(p.priv)
            this.scene_2d.objects.proccess_net(p.objects!,true)
            this.clock.profiler.end(100)
        })
        client.on("connect",(_p:ConnectPacket)=>{
        })
        client.on("map",async(mp:MapPacket)=>{
            if(!this.map_started){
                await this.signals.wait("_map_start")
            }
            if(mp.map.definitions){
                this.definitions.reset()
                this.definitions.add_definitions(mp.map.definitions)
            }
            await this.terrain.process_map(mp.map)
            this.terrain.last_layer=0
            this.minimap.init(mp.map)
            this.ambient.on_game_start()
        })
        client.on("start",async(s:StartPacket)=>{
            await this.start(s.settings)
            this.map_started=true
            this.signals.emit("_map_start")
        })
        client.on("joinned",(jp:JoinnedPacket)=>{
            this.ui.proccess_joinned_packet(jp)
            this.ntps=jp.ntps
        })
        client.on("gameover",async(p:GameOverPacket)=>{
            this.game_over = true
            if(p.status.win){
                await this.show_final_screen(p.status)
            }
            this.ui.show_game_over(p)
        })
        client.on("disconnect",(_p:DisconnectPacket)=>{
            if(!this.game_over)this.close_game()
        })
        client.on("message",async(msg:OnlineMessage)=>{
            switch(msg.type){
                case OnlineMessageType.Cutscene:{
                    await this.menu.show_history(msg.cutscene,this.resources,this.ambient.music,this.ambient.ambience,this.input_manager)
                    client.emit("_end")
                    break
                }
                case OnlineMessageType.CharacterSelector:{
                    const r=await this.menu.select_character_screen(msg.characters)
                    client.emit("_end",r)
                    break
                }
            }
        })
    }
}