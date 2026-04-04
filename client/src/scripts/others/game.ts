import { ActionEvent, AxisActionEvent, BasicSocket, Client, ClientGame, Color, ColorM, ConnectPacket, DisconnectPacket, FileManager, Graphics2D, isMobile, MouseEvents, Numeric, random, Sound, TranslationManager, v2, v2m, Vec2, WebglRenderer } from "common/engine/client.ts";
import { InputActionType, InputPacket } from "common/scripts/packets/input_packet.ts";
import { GameObject } from "./gameObject.ts";
import { UiManager } from "../managers/uiManager.ts";
import { TerrainM } from "../objects/terrain.ts";
import { MenuManager } from "../managers/menuManager.ts";
import { DeadZoneManager } from "../managers/deadZoneManager.ts";
import { AmbientManager } from "../managers/ambientManager.ts";
import { TabManager } from "../managers/tabManager.ts";
import { Human } from "../objects/human.ts";
import { InventoryManager } from "../managers/inventoryManager.ts";
import { DamageSplash, PrivateUpdate, UpdatePacket } from "common/scripts/packets/update_packet.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { MapPacket } from "common/scripts/packets/map_packet.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { ConfigCasters, ConfigDefaultActions, ConfigDefaultValues } from "./config.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { Loot } from "../objects/loot.ts";
import { Obstacle } from "../objects/obstacle.ts";
import { Bullet } from "../objects/bullet.ts";
import { Explosion } from "../objects/explosion.ts";
import { ScopeDef } from "common/scripts/definitions/items/scopes.ts";
import { Grenade } from "../objects/grenade.ts";
import { JoinnedPacket } from "common/scripts/packets/joinned_packet.ts";
import { MessageTabApp } from "../apps/message.ts";
import { DebugTabApp } from "../apps/debug.ts";
import { ShopTabApp } from "../apps/shop.ts";
import { GeneralUpdate, GeneralUpdatePacket } from "common/scripts/packets/general_update.ts";
import { LevelDefinition } from "common/scripts/config/level_definition.ts";
import { Building } from "../objects/building.ts";
import { DamageSplashOBJ } from "../objects/damageSplash.ts";
import { Vehicle } from "../objects/vehicle.ts";
import { MinimapManager } from "../managers/miniMapManager.ts";
import { MapTabApp } from "../apps/map.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";
import { KillFeedPacket } from "common/scripts/packets/killfeed_packet.ts";
import { GameOverPacket } from "common/scripts/packets/gameOver.ts";
import { LocalGameServer } from "./offline_game.ts";
import { is_binary } from "../defs/go_files.ts";
import { Creature } from "../objects/creature.ts";
import { Plane } from "./planes.ts";
import { Parachute } from "../objects/parachute.ts";
export class Game extends ClientGame<GameObject>{
    client?:Client
    input:InputPacket=new InputPacket()

    level?:LevelDefinition
    offline:boolean=false
    can_act:boolean=true
    get play_sounds():boolean{
        return this.menu.content.gameover_text_screen.style.opacity=="0"
    }
    game_over:boolean=false

    local_server:LocalGameServer

    cursors={
        default:"url('/img/menu/icons/mouse.svg') 0 0, default",
        pointer:"url('/img/menu/icons/pointer.svg') 21 21, pointer"
    }

    terrain:TerrainM=new TerrainM(this)

    scope_zoom:number=0.5
    dest_zoom:number=1

    ui:UiManager
    menu:MenuManager
    inventory:InventoryManager
    dead_zone:DeadZoneManager
    ambient:AmbientManager
    tab:TabManager
    minimap:MinimapManager

    active_entity?:Human
    active_entity_id?:number

    global_interpolation:number=1

    terrain_gfx=new Graphics2D()
    grid_gfx=new Graphics2D()

    loaded=false
    loaded_textures:string[]=[]

    definitions!:GameDefinition

    world_shadow: {
        color: Color,
        radius: number,
        offset:Vec2
    }
    fs?:FileManager

    planes:Record<number,Plane>={}

    constructor(definitions:GameDefinition,menu:MenuManager,canvas:HTMLCanvasElement,translation:TranslationManager,objects:Array<new ()=>GameObject>=[]){
        super(
            new WebglRenderer(canvas),
            translation,
            [...objects,Human,Loot,Building,Obstacle,Bullet,Explosion,Grenade,Vehicle,Creature,Parachute],
        )

        this.local_server=new LocalGameServer(this)

        this.definitions=definitions
        this.renderer.background=ColorM.rgba(10,10,10)

        this.sounds.volumes={
            "music":1,
            "humans":1,
            "loot":1,
            "obstacles":1,
            "explosions":1,
            "ambience":1,
            "ui":1
        }
        this.save.casters=ConfigCasters
        this.save.default_values=ConfigDefaultValues
        this.save.default_actions=ConfigDefaultActions

        this.ui=new UiManager(this)
        this.menu=menu

        this.inventory=new InventoryManager(this)
        this.dead_zone=new DeadZoneManager(this)
        this.ambient=new AmbientManager(this)
        this.tab=new TabManager(this)
        this.minimap=new MinimapManager(this)

        this.cam2d.addObject(this.terrain_gfx)
        this.cam2d.addObject(this.grid_gfx)

        this.dead_zone.append()

        this.terrain_gfx.zIndex=zIndexes.Terrain
        this.grid_gfx.zIndex=zIndexes.Grid

        this.world_shadow={
            color:ColorM.rgba(0,0,0,50),
            radius:1,
            offset:v2(0.1,0.1)
        }

        this.tab.add_app(new MessageTabApp(this.tab))
        this.tab.add_app(new MapTabApp(this.tab))

        this.ui.shop_app=new ShopTabApp(this.tab)
        this.tab.add_app(this.ui.shop_app)
    }
    add_damage_splash(d:DamageSplash){
        const dd=new DamageSplashOBJ()
        this.scene_2d.objects.add_object(dd,d.taker_layer,undefined,d)
    }
    override listeners_init(): void {
        this.input_manager.add_axis("movement","move_up","move_down","move_left","move_right")
        this.input_manager.on("axis",(a:AxisActionEvent)=>{
            if(a.action==="movement"){
                if(a.value.x==0&&a.value.y==0){
                    this.input.movement={dir:0,scale:0}
                }else{
                    this.input.movement={dir:Math.atan2(a.value.y,a.value.x),scale:1}
                }
            }
        })
        this.input_manager.on("actiondown",(a:ActionEvent)=>{
            if(!this.can_act)return
            switch(a.action){
                case "fire":
                    this.input.use_weapon=true
                    break
                case "alt_fire":
                    this.input.alt_use_weapon=true
                    break
                case "emote_wheel":
                    this.ui.begin_emote_wheel(this.input_manager.mouse.position)
                    break
                case "reload":
                    this.input.reload=true
                    break
                case "interact":
                    this.interact()
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
                case "full_tab":
                    this.tab.toggle_tab_full()
                    break
                case "hide_tab":
                    this.tab.toggle_tab_visibility()
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
                    this.input.actions.push({type:InputActionType.set_hand,hand:this.inventory.current_weapon-1})
                    break
                case "next_weapon":
                    this.input.actions.push({type:InputActionType.set_hand,hand:Numeric.loop(this.inventory.current_weapon+1,-1,3)})
                    break
                case "previous_scope":{
                    const oidx=this.inventory.inventory.iitems.indexOf(this.inventory.scope!)
                    const it=this.inventory.inventory.iitems[oidx-1]

                    if(!it)break

                    this.input.actions.push({
                        type:InputActionType.set_scope,
                        scope_id:it.idNumber!
                    })
                    break
                }
                case "next_scope":{
                    const oidx=this.inventory.inventory.iitems.indexOf(this.inventory.scope!)
                    const it=this.inventory.inventory.iitems[oidx+1]
                    if(!it)break
                    this.input.actions.push({
                        type:InputActionType.set_scope,
                        scope_id:it.idNumber!
                    })
                    break
                }
                case "debug_menu":
                    //if((!this.menu.api_settings.debug.debug_menu)&&!this.offline)break
                    if(!this.tab.apps.some((a)=>a instanceof DebugTabApp)){
                        this.tab.add_app(new DebugTabApp(this.tab))
                    }
                    break
            }
        })
        this.input_manager.on("actionup",(a:ActionEvent)=>{
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
            }
        })
        this.input_manager.mouse.listener.on(MouseEvents.MouseMove,()=>{
            if(isMobile){
            }else{
                const cam_c=v2.new(this.cam2d.width/2,this.cam2d.height/2)
                const mouse_p=v2.dscale(this.input_manager.mouse.position,this.cam2d.zoom)
                const angle=v2.lookTo(cam_c,mouse_p)
                const dist=v2.distance(cam_c,mouse_p)/v2.len(cam_c)
                this.set_lookTo_angle(angle,dist)
            }
        })
        
        this.ui_manager.init()
    }
    override async bind(fs?:FileManager): Promise<void> {
        super.bind()

        await this.save.init(is_binary?{
            type:"file",
            path:"save/settings.json",
            fs:fs!,
        }:{
            type:"localstorage",
            key:"surgemd-settings"
        })
        
        this.load_resources(["main"])
        this.fs=fs
    }
    set_lookTo_angle(angle:number,dist:number,aim_assist:boolean=false,aim_assist_help:number=0.2){
        if(!this.active_entity)return
        /*if(aim_assist){
            for(const o of this.scene_2d.objects.objects[this.activePlayer.layer].orden){
                const obj=this.scene.objects.objects[this.activePlayer.layer].objects[o]
                if(obj.id===this.activePlayerId||obj.stringType!=="player")continue
                const ang=v2.lookTo(this.activePlayer.position,obj.position)
                if(Math.abs(angle-ang)<=aim_assist_help){
                    angle=ang
                    break
                }
            }
        }*/
        this.input.angle=angle
        this.input.distance_to_aim=dist
        if(this.save.get_variable("sv_game_client_rot")&&!this.active_entity.driving&&!this.game_over){
            this.active_entity.physical_data.rotation=this.input.angle
        }
    }
    interact(){
        if(this.input.interact||this.active_entity===undefined)return
        this.input.interact=true
        this.ui.update_active_player(this.active_entity)
        if(this.active_entity&&this.ui.current_interaction){
            this.ui.current_interaction.interact(this.active_entity)
        }
    }
    set_scope(scope:ScopeDef){
        this.scope_zoom=scope.scope_view
    }
    async load_resources(textures:string[]=["main"]){
        if(!this.resources||(this.loaded_textures.length==textures.length&&textures==this.loaded_textures))return
        this.loaded=false

        this.menu.show_loading_screen()
        this.menu.set_loading_current("Somethings",true)

        this.resources.clear([
            "essentials",
            "main",
            ...textures
        ])

        for(const tt of textures){
            const at=`atlases/atlas-${tt}-data.json`
            const spg=await(await fetch(at)).json()
            for(const s of spg[this.save.get_variable("sv_graphics_resolution")]){
                await this.resources.load_spritesheet("",s,undefined,tt,this.menu.set_loading_current)
            }
        }

        //Load Sfx
        await this.resources.load_group("/sounds/game/main.json","main",this.menu.set_loading_current)

        /*
        await this.resources.load_audio("keyboard-1",{src:"/sounds/ui/keyboard-1.mp3",volume:1},"essentials",this.menu.set_loading_current)
        await this.resources.load_audio("keyboard-2",{src:"/sounds/ui/keyboard-2.mp3",volume:1},"essentials",this.menu.set_loading_current)*/
        
        await this.resources.load_audio("typewriter-1",{src:"/sounds/ui/typewriter-1.mp3",volume:1},"essentials",this.menu.set_loading_current)
        await this.resources.load_audio("typewriter-2",{src:"/sounds/ui/typewriter-2.mp3",volume:1},"essentials",this.menu.set_loading_current)

        await this.resources.load_audio("rain_ambience",{src:"/sounds/ambience/rain_ambience.mp3",volume:1},"essentials",this.menu.set_loading_current)
        await this.resources.load_audio("storm_ambience",{src:"/sounds/ambience/storm_ambience.mp3",volume:1},"essentials",this.menu.set_loading_current)
        await this.resources.load_audio("snowstorm_ambience",{src:"/sounds/ambience/snowstorm_ambience.mp3",volume:1},"essentials",this.menu.set_loading_current)
        await this.resources.load_audio("thunder_1",{src:"/sounds/ambience/thunder_1.mp3",volume:1},"essentials",this.menu.set_loading_current)
        await this.resources.load_audio("thunder_2",{src:"/sounds/ambience/thunder_2.mp3",volume:1},"essentials",this.menu.set_loading_current)
        await this.resources.load_audio("thunder_3",{src:"/sounds/ambience/thunder_3.mp3",volume:1},"essentials",this.menu.set_loading_current)

        if(this.level){
            if(this.level?.assets?.background_music){
                await this.resources.load_audio("level_music",{src:this.level.assets.background_music,volume:1},"level",this.menu.set_loading_current)
            }
            if(this.level?.assets?.load?.sounds){
                for(const s of Object.keys(this.level.assets.load.sounds)){
                    await this.resources.load_audio(s,{src:this.level.assets.load.sounds[s],volume:1},"level",this.menu.set_loading_current)
                }
            }
        }

        this.menu.hide_loading_screen()
        this.loaded=true
    }
    start_campaign_level(level:LevelDefinition){
        this.local_server.begin_campaign_level(level)
        this.local_server.start()
        this.local_server.connect()
        this.level=level
    }
    async start(assets:string[]){
        await this.load_resources(assets)
        this.menu.game_start()

        this.happening=true

        this.sounds.listener_position.x=100000
        this.sounds.listener_position.y=100000
        this.cam2d.position.x=100000
        this.cam2d.position.y=100000
        this.cam2d.zoom=6

        if(this.level){
            this.ambient.music.set(undefined)
            await this.menu.show_phase_intro({
                location:this.level.meta.location,
                name:this.level.meta.name,
                description:this.level.meta.description,
                date:this.level.meta.date,
                style:"clean",
            },[
                this.resources.get_audio("typewriter-1"),
                this.resources.get_audio("typewriter-2"),
            ],this.sounds)
            if(this.level?.begin?.history){
                await this.menu.show_history(this.level.begin.history,this.sounds,this.resources,this.ambient.music,this.ambient.ambience,this.input_manager)
            }
        }

        this.ui.start()
        this.join()
        this.mainloop(true)
    }
    async end_level(kills:number=0){
        this.stop()
        /*await this.game_over_messages([
            random.choose(["Hi.", "Hello.","Hey."]),
            "You did it.",
            ...(kills >= 1 ? [`You got ${kills} kills.`] : ["You didn't kill anyone.","Congratulations you are a good soul."]),
            "But are you really happy?",
            "Was it worth it?",
            "You can leave the island...",
            "But the island will never leave you.",
            "Goodbye. See you later!"
        ], this.resources.get_audio("gameover_music"))*/
        if(this.level?.end&&this.fs){
            if(this.level?.end?.history){
                await this.menu.show_history(this.level.end.history,this.sounds,this.resources,this.ambient.music,this.ambient.ambience,this.input_manager)
            }
            if(this.level.end.next?.type==="level"){
                this.soft_close_game()
                const l=JSON.parse(await this.fs.read_file(this.menu.campaign.charpters[this.level.end.next.charpter].levels[this.level.end.next.level]))
                this.start_campaign_level(l)
            }
        }
    }
    async on_die_level(p:GameOverPacket){
        if(!this.level)return
        this.add_timeout(()=>{
            this.local_server.reset_level()
        },2)
        await this.game_over_messages([
            random.choose(["Hi.", "Hello.","Hey."]),
            random.choose([
                "You died again.",
                "You've become a pile of meat.",
                "You died.",
                "You are dead.",
                "You lose.",
                "Your Hearth Stop.",
                "You were turned inside out",
                "You were taken apart.",
                "You suffered brain death.",
                "You Dont Exist More",
                "You’re sleeping with the fishes."
            ]),
            ...(p.Kills >= 1 ? [`You got ${p.Kills} kills.`] : ["You didn't eliminate anyone.","Unfortunately, this is not the way to get out of here alive."]),
            ...(random.choose([
                [
                    "Have you heard about quickswitch?",
                    "Quickswitch removes your recoil.",
                    "Just switch to another weapon after shooting.",
                    "Quickswitch only works with single-shot weapons...",
                    "Weapons like snipers or shotguns."
                ],
                [
                    "Movement is a weapon too.",
                    "Use it wisely."
                ],  
                [
                    "Cover can save your life.",
                    "Fight near rocks or trees.",
                    "Never stay in the open."
                ],
                [
                    "Do not fight while weak.",
                    "Heal first.",
                    "Then fight."
                ],
                [
                    "A well placed grenade",
                    "can win a fight instantly."
                ],
                [
                    "Intelligence is the key",
                    "Know exactly what you are doing.",
                    "Investing without a plan usually goes wrong."
                ],
                [
                    "Melees is good too.",
                    "The enemy can't aim properly if they're too close to you.",
                ],
                [],
            ])),
            ...random.choose([
                ["Failure teaches more than victory."],
                ["You can do it."],
                ["Every attempt teaches something."],
                ["I trust you"],
                ["Never give up.","trust your instincts."],
                ["Fritz never gave up.","Look where he is now."],
                ["You are strong.","You are capable of anything."],
                ["Hope is always the last to die."],
                ["No Pain","No Gain"]
            ]),
            random.choose([
                "Death is not the end.",
                "There are things worse than death.",
                "I need you alive.",
                "I dont will allow you die.",
                "You Are Too Important To Die.",
                "There's still a lot of work ahead.",
                "Evil never rests.",
                "Some questions remain unanswered.",
                "She is still alive, waiting for you.",
                "You still have many unfinished matters.",
                "You are too young to die.",
                "Its Not Your Time",
                "Your time hasn’t come yet."
            ]),
            "Get up!"
        ], this.resources.get_audio("gameover_music"))
        this.soft_reset()
        this.ambient.music.set(this.resources.get_audio("level_music"),true,this.ambient.last_music_pos)
        this.local_server.start()
    }
    close_game(){
        this.soft_close_game()
        this.menu.game_end()
        this.ambient.on_game_close()
    }
    soft_close_game(){
        if(this.running)this.stop()
        this.local_server.stop()
        this.ui.clear()
        this.happening=false
        this.soft_reset()
    }
    soft_reset(){
        this.tab.stop_all()
        this.clear()
        this.game_over=false
        this.ui.hide_game_over()
        this.cam2d.zoom=6
        this.active_entity=undefined
        this.active_entity_id=undefined
    }
    override clear(): void {
        super.clear()
        for(const p of Object.values(this.planes)){
            p.free()
        }
        this.planes={}
    }
    override on_stop(): void {
        super.on_stop()
        this.happening=false
        if(!this.game_over){
            this.close_game()
        }
    }
    reset_input(){
        this.input.reload=false
        this.input.interact=false
        this.input.swamp_guns=false
        this.input.actions.length=0
    }
    override on_update(dt:number){
        super.on_update(dt)

        if(this.save.get_variable("sv_game_interpolation")){
            this.global_interpolation=Numeric.dt_expo_inter(15,dt)
        }else{
            this.global_interpolation=1
        }
        this.ambient.update(dt)
        this.ui.update(dt)
        this.tab.tick(dt)
        if(this.active_entity&&this.active_entity_id!==this.active_entity.id){
            this.active_entity=this.scene_2d.objects.get_object(this.active_entity_id!) as Human
        }
        if(this.active_entity){
            this.cam2d.position=this.active_entity.position
            this.sounds.listener_position=this.active_entity.position
            this.update_grid(this.grid_gfx,5,this.cam2d.position,v2.new(this.cam2d.width,this.cam2d.height),0.06)

            this.cam2d.zoom=Numeric.lerp(this.cam2d.zoom,this.scope_zoom,Numeric.dt_expo_inter(4,dt))

            this.ambient.update_camera()
            if(this.client&&this.client.opened){
                this.client.emit(this.input)
                this.reset_input()
            }
            if(this.active_entity.dead)this.active_entity=undefined
        }
        for(const p of Object.values(this.planes)){
            p.update(dt)
        }
    }
    update_grid(grid_gfx:Graphics2D,gridSize:number,camera_position:Vec2,camera_size:Vec2,line_size:number){
        this.grid_gfx.position=v2.new(0,0)
        grid_gfx.clear()
        const begin=v2.new(camera_size.x/2,camera_size.y/2)
        v2m.sub(begin,camera_position,begin)
        v2m.dscale(begin,begin,gridSize)
        v2m.floor(begin)
        v2m.sub_component(begin,1,1)

        const size=v2.new(camera_size.x/gridSize+2,camera_size.y/gridSize+2)
        v2m.ceil(size)
        grid_gfx.fill_color({r:0,g:0,b:0,a:0.2})
        grid_gfx.drawGrid(begin,size,gridSize,line_size)
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
        for(const p of up.planes){
            let plane=this.planes[p.id]
            if(!plane)plane=new Plane(this)
            this.planes[p.id]=plane
            plane.update_data(p)
        }
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
        if(priv.self_state){
            this.ui.update_self_state(priv.self_state)
        }
    }
    join(){
        if(!this.client)return
        const packet=new JoinPacket()

        packet.player_name=this.save.get_variable("sv_game_name")
        this.client.emit(packet)
    }
    connect(url:string){
        this.set_socket(new WebSocket(url) as unknown as BasicSocket)
        this.offline=false
    }
    set_socket(socket:BasicSocket){
        if(this.client)return
        this.level=undefined
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

        client.on("general_update",(p:GeneralUpdatePacket)=>{
            this.process_general_update(p.content)
        })
        client.on("update",(p:UpdatePacket)=>{
            this.scene_2d.objects.proccess(p.objects!,true)
            this.process_private(p.priv)
        })
        client.on("connect",(_p:ConnectPacket)=>{
        })
        client.on("map",async(mp:MapPacket)=>{
            await this.terrain.process_map(mp.map)
            this.terrain.draw(this.terrain_gfx,1)
            await this.start(this.terrain.biome!.assets)

            this.minimap.init(mp.map)
            this.ambient.on_game_start()
        })
        client.on("joinned",(jp:JoinnedPacket)=>{
            this.ui.proccess_joinned_packet(jp)
            this.reset_input()
        })
        client.on("gameover",(p:GameOverPacket)=>{
            this.game_over = true
            this.ui.show_game_over(p)
            if(this.level){
                if(p.Win){
                    this.end_level(p.Kills)
                }else{
                    this.on_die_level(p)
                }
            }
        })
        client.on("disconnect",(_p:DisconnectPacket)=>{
            this.stop()
        })
        client.on("killfeed",(p:KillFeedPacket)=>{
            this.ui.add_killfeed_message(p.message)
        })
    }
}