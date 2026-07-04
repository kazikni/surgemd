import { AbstractServerGame, CircleHitbox2D, Client, ID,  KDate,  LootTableItemRet,  LootTablesManager,  ModsManager, OfflineClientsManager, random, ReplayRecorder, Stream, v2, Vec2 } from "common/engine/core.ts";
import { GameMap } from "./map.ts"
import { ServerGameObject } from "./gameObject.ts";
import { ModeManager } from "../mode/modeManager.ts";
import { DeadZoneManager } from "./deadzone.ts";
import { GameObjectType, Layers, LayersL, Spawn } from "common/scripts/others/constants.ts";
import { GameConfig, GameDebugOptions, GameServerConfig } from "common/scripts/config/config.ts";
import { PlayersManager } from "../managers/players_manager.ts";
import { Human } from "../objects/human.ts";
import { HumansManager } from "../managers/humans_manager.ts";
import { Loot } from "../objects/loot.ts";
import { Obstacle } from "../objects/obstacle.ts";
import { Vehicle } from "../objects/vehicle.ts";
import { Aditional, loot_table_get_item } from "common/scripts/definitions/maps/base.ts";
import { BulletDef } from "common/scripts/definitions/utils.ts";
import { Bullet } from "../objects/bullet.ts";
import { ExplosionDef } from "common/scripts/definitions/objects/explosions.ts";
import { Explosion } from "../objects/explosion.ts";
import { GrenadeDef } from "common/scripts/definitions/items/grenades.ts";
import { Grenade } from "../objects/grenade.ts";
import { VehicleDef } from "common/scripts/definitions/objects/vehicles.ts";
import { Building } from "../objects/building.ts";
import {MDModModule, ModResult} from "common/scripts/others/mods.ts"
import { BattleRoyale, BattleRoyaleDebug } from "../mode/battle_royale.ts";
import { DamageSourceDef, GameDefinition, GameItem } from "common/scripts/definitions/game_defs.ts";
import { CreatureDef } from "common/scripts/definitions/objects/creatures.ts";
import { Creature } from "../objects/creature.ts";
import { Parachute } from "../objects/parachute.ts";
import { SyncedParticle } from "../objects/synced_particle.ts";
import { SyncedParticleDef } from "common/scripts/definitions/objects/synced_particle.ts";
import { ObstacleDef } from "common/scripts/definitions/objects/obstacles.ts";
import { PingData } from "common/scripts/packets/update_packet.ts";
import { Plane } from "../objects/plane.ts";
import { DecalDef, DecalTint } from "common/scripts/definitions/objects/decals.ts";
import { Decal } from "../objects/decals.ts";
import { LeaderboardPlayer } from "common/scripts/packets/gameOver.ts";
import { BadgeDef } from "common/scripts/definitions/loadout/badges.ts";
import { HumanBody } from "../objects/human_body.ts";
import { StartSettings } from "common/scripts/packets/start_packet.ts";
export interface GameData {
    living_count: number[]

    can_join: boolean
    running: boolean

    started_time: number
    started:boolean
}
export type GameStatistic={
    player:{
        players:number
        disconnection:number
    }
    items:{
        kills:Record<string,number>
        dropped:Record<string,number>
    }
    loadout:{
        uses:Record<string,number>
    }
}
export class Game extends AbstractServerGame<ServerGameObject>{
    main_config:GameServerConfig
    game_config!:GameConfig
    string_id=""

    map:GameMap

    alt_db?:Record<string,{
        skins:number[],
    }>

    debug!:GameDebugOptions

    definitions:GameDefinition=new GameDefinition()

    closed:boolean=false
    started:boolean=false
    fineshed:boolean=false

    statistics?:GameStatistic

    players:PlayersManager=new PlayersManager(this)
    humans:HumansManager=new HumansManager(this)

    modeManager!:ModeManager
    deadzone:DeadZoneManager

    started_time:number=0
    can_start:boolean=true
    can_finish:boolean=true
    
    loot_tables:LootTablesManager<GameItem,Aditional>=new LootTablesManager(loot_table_get_item as (id: string, count: number, aditional: Aditional) => LootTableItemRet<GameItem>[])

    pings:PingData[]=[]

    mods?:ModsManager<any,any,any,ModResult,MDModModule<Game,any,ModResult>>

    ambient:{
        date:KDate
        initial_date:KDate
        rain: number
        thunder_storm: number

        target_rain:number
        target_thunder:number

        rain_timer:number
        rain_state:number // 0=clear,1=rain
    }={
        date:{
            second:0,
            minute:30,
            hour:12,
            month:5,
            day:10,
            year:2000
        },
        initial_date:{
            second:0,
            minute:30,
            hour:12,
            month:5,
            day:10,
            year:2000
        },
        rain:0,
        thunder_storm:0,

        target_rain:0,
        target_thunder:0,
        rain_timer:0,
        rain_state:0
    }

    replay?:ReplayRecorder

    leaderboards:LeaderboardPlayer[]=[]

    start_settings:StartSettings={
        textures:[],
        musics:[],
        assets:{},
        languages_path:"",
    }
    constructor(main_config:GameServerConfig,clients:OfflineClientsManager,id:ID){
        super(main_config.tps,id,clients,[
            Human,
            Loot,
            Grenade,
            Obstacle,
            Building,
            Vehicle,
            Bullet,
            Decal,
            Explosion,
            Creature,
            Parachute,
            SyncedParticle,
            Plane,
        ])

        this.ntps=main_config.ntps
        this.main_config=main_config

        for(const i of LayersL){
            this.scene_2d.objects.add_layer(i)
        }
        this.debug=main_config.debug

        //Gamemode
        this.map=new GameMap(this)

        this.deadzone=new DeadZoneManager(this)
    }
    init(mode:ModeManager){
        this.definitions.init_default()
        if(this.mods){
            for(const k of this.mods.getLoadOrder()){
                const mod=this.mods.loaded.get(k.id)
                if(mod?.module.on_mode_init){
                    mod.module.on_mode_init(mod.ctx,this.game_config)
                }
                if(mod?.result?.definitions)this.definitions.add_definitions(mod?.result?.definitions)
            }
        }

        this.modeManager=mode
        mode.init(this)
        mode.generate_map()

        this.players.encode_start_packet()
    }
    auto_init(game_config:GameConfig){
        this.game_config=game_config
        let has_mode=false
        if(this.mods){
            for(const k of this.mods.getLoadOrder()){
                const mod=this.mods.loaded.get(k)
                if(mod?.module.create_mode){
                    has_mode=mod.module.create_mode(mod.ctx,game_config)
                }
                if(has_mode){
                    break
                }
            }
        }
        if(!has_mode){
            switch(game_config.mode.mode){
                case "normal":
                    this.init(new BattleRoyale(game_config.mode.settings,game_config.group_size??1))
                    break
                case "counter_md":
                    //this.init(new CounterMD(game_config.mode_settings))
                    break
                case "debug":
                    this.init(new BattleRoyaleDebug(game_config.mode.settings,game_config.group_size??1))
                    break
            }
        }
    }
    override net_update(full:boolean){
        this.players.net_update()
        this.modeManager.on_net_update()
        this.pings.length=0
        super.net_update(full)
    }
    override on_update(dt:number): void {
        super.on_update(dt)
        this.players.update(dt)
        this.deadzone.tick(dt)
        this.modeManager.tick(dt)
    }
    update_data(){
        const data:GameData={
            living_count:this.modeManager.get_living_count(),

            can_join:this.modeManager.can_join()&&!this.fineshed&&!this.closed,
            running:this.running,

            started_time:this.started_time,
            started:this.started,
        }
        this.signals.emit("update_data",data)
    }
    override on_run(): void {
        this.update_data()
    }
    override on_stop():void{
        super.on_stop()
        this.update_data()
        console.log(`Game ${this.id} Stopped`)
    }
    reset(){
        this.humans.clear_npcs()
        this.players.clear_bots()
        this.modeManager.reset()
        this.deadzone.reset()
        this.timeouts.length=0
        this.started = false
        this.closed = false
        this.fineshed=false
        this.clock.timeScale=1
        this.pings.length=0
    }
    override mainloop(rqf?:boolean,auto_mainloop?:boolean){
        this.fineshed=false
        this.clock.timeScale=1
        super.mainloop(rqf,auto_mainloop)
    }
    save_checkpoint(stream:Stream){
        this.scene_2d.make_checkpoint(stream,{
            save_id:true,
            orden:[
                GameObjectType.Human,
                GameObjectType.Obstacle,
                GameObjectType.Building,
            ]
        })
    }
    start(force:boolean=false){
        if(this.started)return
        if(!force&&(!this.can_start||!this.modeManager.can_start()))return
        this.started=true
        this.modeManager.on_start()
        this.started_time=performance.now()
        this.leaderboards.length=0
        if(!this.replay){
            this.replay=new ReplayRecorder(this,(r,full)=>{
                return this.players.encode_frame(full)
            },this.ntps);
            /*(new DenoFileManager().open("database/replays/1.repl","rw")).then((v)=>{
                this.replay!.startRecording(v,this.map.map_packet_stream)
            })*/
        }

        this.update_data()
        console.log(`Game ${this.id} Started`)

    }
    close(){
        if(this.closed)return
        this.closed=true
        this.update_data()
        console.log(`Game ${this.id} Clossed`)
    }
    finish(winners:Human[]=[]){
        if(this.fineshed)return
        console.log(`Game ${this.id} Fineshed`)
        this.fineshed=true
        this.update_data()

        this.modeManager.on_finish(winners)
        this.signals.emit("finish",{winners})

        if(!this.can_finish){
            this.clock.timeScale=0
            return
        }
        this.add_timeout(()=>{ 
            this.stop()
        },1)
        if(this.replay)this.replay.stopRecording()
    }
    add_bullet(position:Vec2,def:BulletDef,owner?:Human,ammo?:string,source?:DamageSourceDef,layer:number=Layers.Normal,satured?:number,critical_chance?:number):Bullet{
        const b=this.scene_2d.objects.add_object(new Bullet(),layer,undefined,{
            def,
            position:v2.clone(position),
            owner:owner,
            ammo:ammo,
            source,
            critical_chance,
            satured
        })as Bullet
        return b
    }
    add_explosion(position:Vec2,def:ExplosionDef,owner?:Human,source?:DamageSourceDef,layer:number=Layers.Normal):Explosion{
        const e=this.scene_2d.objects.add_object(new Explosion(),layer,undefined,{def:def,owner,position:position,source}) as Explosion
        return e
    }
    add_decal(position:Vec2,rotation:number,def:DecalDef,tint?:DecalTint,scale?:number,layer:number=Layers.Normal):Decal{
        const d=this.scene_2d.objects.add_object(new Decal(),layer,undefined,{def:def,position:position,rotation,tint,scale}) as Decal
        return d
    }
    add_human_body(position:Vec2,name:string,angle:number,badge?:BadgeDef,layer:number=Layers.Normal):HumanBody{
        const b=this.scene_2d.objects.add_object(new HumanBody(),layer,undefined,{name:name,badge:badge,position:position,angle}) as HumanBody
        return b
    }
    add_grenade(position:Vec2,def:GrenadeDef,owner?:Human,layer:number=Layers.Normal):Grenade{
        const p=this.scene_2d.objects.add_object(new Grenade(),layer,undefined,{def:def,owner,position:position}) as Grenade
        return p
    }
    add_loot(position:Vec2,def:GameItem,count:number,layer:number=Layers.Normal):Loot{
        const l=this.scene_2d.objects.add_object(new Loot(),layer,undefined,{item:def,count:count,position:position}) as Loot
        if(this.statistics){
            this.statistics.items.dropped[def.idString]=(this.statistics.items.dropped[def.idString]??0)+count
        }
        return l
    }
    add_vehicle(position:Vec2,def:VehicleDef,layer:number=Layers.Normal):Vehicle{
        const v=this.scene_2d.objects.add_object(new Vehicle(),layer,undefined,{position,def}) as Vehicle
        return v
    }
    add_creature(position:Vec2,def:CreatureDef,layer:number=Layers.Normal):Creature{
        const c=this.scene_2d.objects.add_object(new Creature(),layer,undefined,{position,def}) as Creature
        return c
    }
    add_parachute(position:Vec2,obstacle:ObstacleDef,layer=Layers.Normal):Parachute{
        const p=this.scene_2d.objects.add_object(new Parachute(),layer,undefined,{position,obstacle}) as Parachute
        return p
    }
    add_synced_particle(position:Vec2,def:SyncedParticleDef,owner?:Human,layer=Layers.Normal):SyncedParticle{
        const p=this.scene_2d.objects.add_object(new SyncedParticle(),layer,undefined,{def,position,owner}) as SyncedParticle
        return p
    }

    add_plane(position:Vec2,args:Record<string,any>,plane?:Plane){
        if(!plane)plane=new Plane()
        const direction=random.rad()
        const planePos = v2.from_RadAngle(direction,this.map.size.x+10)
        this.scene_2d.objects.add_object(
            plane,
            Layers.Normal,
            undefined,
            {
                position: planePos,
                target_pos: position,
                ...args
            }
        )
    }
    add_airdrop(position?:Vec2,obstacle?:ObstacleDef){
        if(!position)position=this.map.getRandomPosition(new CircleHitbox2D(v2(0,0),2),-1,Layers.Normal,Spawn.ground,this.map.random,(_hitbox,_map,_random)=>{
            return this.deadzone.random_point_inside_new()
        })
        if(!position)position=v2(3,3)
        if(!obstacle)obstacle=this.definitions.obstacles.getFromString("airdrop_locked")

        this.add_plane(position,{
            speed: 20,
            obstacle,
            type: 0
        })
    }
    add_airstrike(position:Vec2,grenade:GrenadeDef,count:number,radius:number,owner?:Human){
        this.add_plane(position,{
            speed: 130,
            grenade,
            count,
            radius,
            owner,
            type: 1
        })
    }
    override handle_connection(client:Client,username:string){
        this.players.connection(client,username)
    }
}
