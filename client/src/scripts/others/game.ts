import { ClientGame, Graphics2D, Grid2D, InputActionEvent, InputAxisEvent, InputEventType, InputMouseMoveEvent, isMobile, Key, Sound, WebglRenderer } from "common/engine/web.ts";
import { InputActionType, InputPacket } from "common/scripts/packets/input_packet.ts";
import { GameObject } from "./gameObject.ts";
import { UiManager } from "../managers/uiManager.ts";
import { TerrainM } from "../managers/terrainManager.ts";
import { MenuManager } from "../managers/menuManager.ts";
import { DeadZoneManager } from "../managers/deadZoneManager.ts";
import { AmbientManager } from "../managers/ambientManager.ts";
import { Human } from "../objects/human.ts";
import { DamageSplash, PrivateUpdate, SelfStateUpdate, UpdatePacket } from "common/scripts/packets/update_packet.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { Layers, zIndexes } from "common/scripts/others/constants.ts";
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
import { load_kspr } from "common/engine/core/lang/kspr.ts";
import { Plane } from "../objects/plane.ts";
import { Decal } from "../objects/decals.ts";
import { HumanBody } from "../objects/human_body.ts";
import { OnlineMessage, OnlineMessageType } from "common/scripts/packets/messages.ts"
import { StartPacket, StartSettings } from "common/scripts/packets/start_packet.ts";
import { input_popup, yes_no_popup } from "../defs/menu.ts";
import { Matrix, matrix4 } from "common/engine/core/math/matrix.ts";
import { EditorManager } from "../managers/editorManager.ts";
import { BasicSocket, Client, Color, ColorM, ConnectPacket, DisconnectPacket, FileManager, Language, Numeric, ReplayWatcher, sleep, TranslationManager, v2, v2m, Vec2 } from "common/engine/core.ts";
import { Drone } from "../objects/drone.ts";
import { decode_map_config } from "common/scripts/packets/map_message.ts";
export class Game extends ClientGame<GameObject>{
    client?:Client
    input:InputPacket=new InputPacket()
    comunication_mode:boolean=false
    showing_menu:boolean=false

    offline:boolean=false
    can_act:boolean=true
    get play_sounds():boolean{
        return this.menu.content.gameover_text_screen.style.opacity=="0"
    }
    game_over:boolean=false
    started:boolean=false

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

    terrain_gfx=new Graphics2D()
    grid=new Grid2D()

    loaded=false
    loaded_textures:string[]=[]

    definitions!:GameDefinition

    world_shadow: {
        enabled:boolean
        color: Color
        matrix: Matrix
        offset: Vec2
        scale: Vec2
    }
    fs?:FileManager
    watcher?:ReplayWatcher
    editor?: EditorManager
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

    parallax:Record<number,Obstacle>={}

    constructor(definitions:GameDefinition,menu:MenuManager,canvas:HTMLCanvasElement,translation:TranslationManager,objects:Array<new ()=>GameObject>=[]){
        super(
            new WebglRenderer(canvas),
            translation,
            [...objects,Human,Loot,Building,Obstacle,Bullet,Decal,Explosion,Grenade,Vehicle,Creature,Parachute,SyncedParticle,Plane,HumanBody,Drone],
        )

        this.set_meter_size(100)
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

        this.cam2d.add_object(this.terrain_gfx)
        this.cam2d.add_object(this.grid)
        this.cam2d.add_object(this.hitboxes_gfx)
        this.cam2d.add_object(this.ui_gfx)

        this.terrain_gfx.zIndex=zIndexes.Terrain
        this.grid.zIndex=zIndexes.Grid
        this.ui_gfx.zIndex=zIndexes.UI
        this.hitboxes_gfx.zIndex=zIndexes.UI

        this.world_shadow={
            enabled:true,
            color:ColorM.hex("#0013"),
            matrix:matrix4.translation_2d(v2(0.1,0.1)),//matrix4.mul(),matrix4.translation_2d(v2(0.9,0.9)))
            offset:v2(0.1,0.1),
            scale:v2(1,1)
        }

        this.inventory.initialize(this.definitions,{
            0:MeleeItem as (new(item:GameItem)=>LItem),
            1:GunItem as (new(item:GameItem)=>LItem),
            2:GunItem as (new(item:GameItem)=>LItem)
        })

        this.grid.size=0.05
        this.grid.size=5
        this.grid.stroke=ColorM.rgba(0,0,0,25)

        this.terrain_gfx.initialize(this.cam2d.ctx)
        this.hitboxes_gfx.initialize(this.cam2d.ctx)
        this.ui_gfx.initialize(this.cam2d.ctx)
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
                if(!this.can_act){
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
            if(!this.can_act||this.editor)return
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
                    if(this.happening&&!this.showing_menu&&!this.game_over){
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
                case "escape":
                    if(this.happening&&!this.showing_menu&&!this.game_over){
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
        if(!this.active_entity.downed&&!this.active_entity.swimming&&!this.active_entity.seat&&this.save.get_variable("sv_game_client_rot")&&!this.game_over){
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
    set_scope(scope:ScopeDef){
        if(this.inventory.scope&&this.inventory.scope===scope){
            return
        }
        this.inventory.scope=scope
        this.ui_manager.signal("current_scope_dirty",scope)
    }
    async load_resources(textures:string[]=[],assets:Record<string,string>,languages_path:string="",show_loading_screen:boolean=true){
        if(!this.resources||(this.loaded_textures.length==textures.length&&textures==this.loaded_textures))return
        this.loaded=false
        if(show_loading_screen)this.menu.show_loading_screen()
        this.menu.set_loading_current("Somethings",true)

        textures=["/assets/img/kspr/main",...textures]
        this.resources.clear([
            "essentials",
            "main",
            ...textures
        ])

        for (const tt of textures) {
            this.menu.set_loading_current(`${tt}.kspr`)
            const res = await fetch(`${tt}.kspr`)
            const buffer = await res.arrayBuffer()
            const kspr = load_kspr(buffer)
            let resolution = this.save.get_variable("sv_graphics_resolution")
            if(!["low","medium"].includes(resolution)){
                resolution="low"
                this.save.set_variable("sv_graphics_resolution",resolution)
            }
            await this.resources.load_kspr(kspr,resolution,tt,"",undefined,undefined,this.menu.set_loading_current)
        }
        await this.resources.load_ksnd("/assets/sounds/ksnd/main","main",undefined,this.menu.set_loading_current)
        if(languages_path!=""){
            try{
                this.language.load_default_language(await this.resources.load_json(`${languages_path}/en.json`),"ingame")
                this.language.load_language(await this.resources.load_json(`${languages_path}/${this.save.get_variable("sv_ui_translation")}.json`),"ingame")
            }catch(e){
                console.log(e)
            }
        }
        if(show_loading_screen)this.menu.hide_loading_screen()
        this.loaded=true
    }
    async start_editor(){
        this.close_game()
        this.editor = new EditorManager(this)
        this.cam_type=1
        this.happening=true

        this.free_cam_pos=v2.zero()
        this.free_cam_zoom=1
        this.menu.game_start()
        this.ui.start()
        this.hitboxes_gfx.ctx.clear()
        this.editor.start()
        //await this.editor.load(path)
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

        if(settings.map){
            const map=decode_map_config(settings.map)
            if(map.definitions){
                this.definitions.reset()
                this.definitions.add_definitions(map.definitions)
            }
            await this.terrain.process_map(map)
            this.minimap.init(map)
        }

        this.ambient.on_game_start()

        this.ui.game_over_screen={
            type:GameOverScreenType.Normal
        }
        this.ui.start()
        this.join()
        this.watcher?.play?.()

        this.scope_zoom=1
        this.hitboxes_gfx.ctx.clear()
    }
    async show_final_screen(game_over:GameOverStatus){
        /*this.final_screen.set_final_screen(island_final)
        await this.final_screen.show_final_screen()
        await this.final_screen.show_status(game_over.status[0] as PlayerStatus)
        if(game_over.leaderboards)await this.final_screen.show_leaderboards(game_over.leaderboards)
        await this.final_screen.hide_final_screen()*/
    }
    close_game(hard:boolean=true){
        if(this.client&&this.client.opened)this.client.disconnect()
        if(hard){
            this.local_server.stop()
            this.menu.hide_loading_screen()
        }
        if(this.editor)this.editor.close()
        this.editor=undefined
        this.happening=false
        this.started=false
        this.menu.game_end()
        this.ambient.on_game_close()
        this.client=undefined
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
        this.set_scope(this.definitions.scopes.getFromNumber(0))
        this.cam2d.zoom=6
        this.zoom_speed=4
    }
    finish_game_over(win:boolean){
        if(this.offline){
            if(win){
                this.menu.show_loading_screen()
                this.close_game(false)
                this.start_with_intro=true
                this.local_server.next_level("complete")
            }else{
                this.soft_close_game()
                this.local_server.reset_level()
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
        if(this.happening){
            this.ambient.update(dt)
            this.dead_zone.tick(dt)
        }
        this.ui.update(dt)
        if(this.editor)this.editor.tick(dt)

        if (this.cam_type === 1) {
            const move = this.input.movement
            this.free_cam_speed=5/this.free_cam_zoom
            if (move.scale>0) {
                this.free_cam_pos.x+=Math.cos(move.dir)*this.free_cam_speed*dt
                this.free_cam_pos.y+=Math.sin(move.dir)*this.free_cam_speed*dt
            }
            this.cam2d.zoom=Numeric.lerp(this.cam2d.zoom, this.free_cam_zoom, Numeric.dt_expo_inter(5, dt))
            v2m.lerp(this.cam2d.position,this.free_cam_pos, Numeric.dt_expo_inter(5, dt))
            if(this.input_manager.keyPress(Key.E)){
                v2m.add(this.free_cam_pos,this.free_cam_pos,v2.scale(this.input_manager.mouse_delta,0.01))
            }
        }else{
            if(this.active_entity&&this.active_entity_id!==this.active_entity.id){
                this.active_entity=this.scene_2d.objects.get_object(this.active_entity_id!) as Human
            }
            if(this.active_entity){
                this.cam2d.position=this.active_entity.position
                //this.cam2d.position=v2.add_rotate_RadAngle(this.active_entity.position,v2(0.05/this.cam2d.zoom,0),this.active_entity.physical_data.rotation)
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
        this.sounds.set_listener_position(this.cam2d.position)
        if(this.save.get_variable("sv_graphics_perspective")){
            for(const k in this.parallax){
                if(!this.parallax[k].sprite.matrix)this.parallax[k].sprite.matrix=matrix4.identity()
                this.cam2d.get_topdown_perspective_2d(this.parallax[k].sprite.matrix,this.parallax[k].position,this.parallax[k].def.parallax!,0)
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
    }
    process_self_state(state:SelfStateUpdate){
        this.scope_zoom=state.scope_zoom
        this.ui.update_self_state(state)
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
        if(priv.self_state)this.process_self_state(priv.self_state)
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
        sv=this.save.get_variable("sv_loadout_badge")
        if(sv!=""){
            packet.badge=this.definitions.badges.getFromStringSafe(sv)?.idNumber
        }
        this.client.emit_packet(packet)

        if(this.offline){
            this.ui.game_over_screen={type:GameOverScreenType.Restart}
            this.local_server.init(this.start_with_intro)
        }
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
            this.clock.profiler.start(100)
            this.process_private(p.priv)
            this.scene_2d.objects.proccess_net(p.objects!,true)
            this.clock.profiler.end(100)
        })
        client.on("connect",(_p:ConnectPacket)=>{
        })
        client.on("start",async(s:StartPacket)=>{
            await this.start(s.settings)
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
                    await this.menu.cutscene.play(msg.cutscene)
                    client.emit("_end")
                    break
                }
                case OnlineMessageType.CharacterSelector:{
                    const r=await this.menu.select_character_screen(msg.characters)
                    client.emit("_end",r)
                    break
                }
                case OnlineMessageType.Load:{
                    if(msg.assets){
                        for(const a in msg.assets){
                            await this.resources.load_source(a,msg.assets[a],undefined,"level",this.menu.set_loading_current)
                        }
                    }
                    client.emit("_end")
                    break
                }
                case OnlineMessageType.SetLoad:{
                    if(msg.enabled){
                        this.menu.show_loading_screen()
                    }else{
                        this.menu.hide_loading_screen()
                    }
                    client.emit("_end")
                    break
                }
            }
        })
    }
}