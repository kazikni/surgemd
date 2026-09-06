import { AbstractServerGame, Client, FileManager, KDate,  LootTableGetItemCallback,  LootTablesManager,  ModsManager, OfflineClientsManager, random, ReplayRecorder, Stream, v2, Vec2 } from "common/engine/core.ts";
import {globals} from "common/scripts/scripts.ts"
import { GameMap } from "./map.ts"
import { ServerGameObject } from "./gameObject.ts";
import { ModeManager } from "../mode/modeManager.ts";
import { DeadZoneManager, DeadZoneMode } from "./deadzone.ts";
import { GameObjectType, LayersL, LootAditional, LootData, LootSetting, LootTable } from "common/scripts/others/constants.ts";
import { GameConfig, GameDebugOptions, GameServerConfig } from "common/scripts/config/config.ts";
import { PlayersManager } from "../managers/players_manager.ts";
import { Human } from "../objects/human.ts";
import { HumansManager } from "../managers/humans_manager.ts";
import { Loot } from "../objects/loot.ts";
import { Obstacle } from "../objects/obstacle.ts";
import { Vehicle } from "../objects/vehicle.ts";
import { Bullet } from "../objects/bullet.ts";
import { Explosion } from "../objects/explosion.ts";
import { Grenade } from "../objects/grenade.ts";
import { Building } from "../objects/building.ts";
import {MDModModule, ModResult} from "common/scripts/others/mods.ts"
import { BattleRoyale, BattleRoyaleDebug } from "../mode/battle_royale.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";
import { Creature } from "../objects/creature.ts";
import { Parachute } from "../objects/parachute.ts";
import { SyncedParticle } from "../objects/synced_particle.ts";
import { Plane } from "../objects/plane.ts";
import { Decal } from "../objects/decals.ts";
import { StartSettings } from "common/scripts/packets/start_packet.ts";
import { loot_table_get_item } from "common/scripts/others/functions.ts";
import { HumanScript } from "../human/ai/script.ts";
import { type LevelPlayer, LevelPlayerScript } from "../mode/level_player.ts";
import { Drone } from "../objects/drone.ts";
import { ServerGameScene2D } from "./scene.ts";
import { SequenceMode } from "../mode/sequence.ts";
import { HumanBody } from "../objects/human_body.ts";
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
    scene_2d:ServerGameScene2D

    main_config:GameServerConfig
    game_config!:GameConfig
    string_id=""

    fs:FileManager

    alt_db?:Record<string,{
        skins:number[],
    }>

    debug!:GameDebugOptions

    definitions:GameDefinition=new GameDefinition()

    closed:boolean=false
    started:boolean=false
    fineshed:boolean=false
    initialized:boolean=false

    statistics?:GameStatistic

    players:PlayersManager=new PlayersManager()
    humans:HumansManager=new HumansManager(this)

    modeManager!:ModeManager
    level?:LevelPlayer

    started_time:number=0
    can_start:boolean=true
    can_finish:boolean=true
    can_win:boolean=true

    loot_tables:LootTablesManager<LootData,LootAditional,LootSetting>=new LootTablesManager(loot_table_get_item as LootTableGetItemCallback<LootData,LootAditional,LootSetting>)

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

    start_settings:StartSettings={
        textures:[],
        musics:[],
        assets:{},
        languages_path:"",
    }

    globals:Record<string,any>={
        ...globals,
        HumanScript,
        LevelPlayerScript,
        DeadZoneMode
    }
    constructor(main_config:GameServerConfig,clients:OfflineClientsManager,fs:FileManager){
        super(main_config.tps,clients,[
            Human,
            HumanBody,
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
            Drone
        ])
        //Gamemode
        this.scene_2d=new ServerGameScene2D(this)

        this.ntps=main_config.ntps
        this.main_config=main_config
        this.fs=fs

        for(const i of LayersL){
            this.scene_2d.objects.add_layer(i)
        }
        this.debug=main_config.debug

        this.add_component(this.players)
    }
    async init(mode:ModeManager){
        this.initialized=false
        this.definitions.reset()
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
        mode.init(this.scene_2d)
        await mode.generate_map()
        this.scene_2d.deadzone.reset()

        this.players.encode_start_packet()
        this.initialized=true
        this.call_event("game_initialized",this)
    }
    async auto_init(game_config:GameConfig){
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
            switch(game_config.mode){
                case "normal":
                    await this.init(new BattleRoyale(game_config.settings,game_config.group_size??1))
                    break
                case "counter_md":
                    //this.init(new CounterMD(game_config.mode_settings))
                    break
                case "sequence":
                    await this.init(new SequenceMode(game_config.settings))
                    break
                case "debug":
                    await this.init(new BattleRoyaleDebug(game_config.settings,game_config.group_size??1))
                    break
            }
        }
    }
    override net_update(full:boolean){
        this.call_event("net_update",{full})
        this.scene_2d.objects.apply_destroy_queue()
        this.scene_2d.net_update()
        super.net_update(full)
    }
    override on_update(dt:number): void {
        super.on_update(dt)
        this.scene_2d.update(dt,false,false)
    }
    update_data(){
        const data:GameData={
            living_count:this.modeManager.get_living_count(),

            can_join:this.modeManager.can_join()&&!this.fineshed&&!this.closed,
            running:this.running&&!this.fineshed,

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
        this.scene_2d.clear()
        this.call_event("game_reset")
        this.clock.clear()
        this.started=false
        this.closed=false
        this.fineshed=false
        this.clock.timeScale=1
    }
    override mainloop(rqf?:boolean,auto_mainloop?:boolean){
        this.fineshed=false
        this.clock.timeScale=1
        super.mainloop(rqf,auto_mainloop)
    }
    save_checkpoint(stream:Stream){
        this.call_event("encode_checkpoint",stream)
        this.scene_2d.make_checkpoint(stream,{
            save_id:true,
            orden:[
                GameObjectType.Human,
                GameObjectType.Obstacle,
                GameObjectType.Building,
            ]
        })
    }
    load_checkpoint(stream:Stream){
        this.call_event("decode_checkpoint",stream)
        this.scene_2d.load_checkpoint(stream)
    }
    start(force:boolean=false){
        if(this.started)return
        if(!force&&(!this.can_start||!this.modeManager.can_start()))return
        this.started=true
        this.call_event("game_start")
        this.started_time=performance.now()
        this.scene_2d.on_start()
        if(!this.replay){
            this.replay=new ReplayRecorder(this,(r,full)=>{
                return this.players.encode_frame(full)
            },this.ntps)
            /*(new DenoFileManager().open("database/replays/1.repl","rw")).then((v)=>{
                this.replay!.startRecording(v,this.map.map_stream)
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
    finish(winners:Human[]=[],finish_time:number=0){
        if(this.fineshed)return
        console.log(`Game ${this.id} Fineshed`)
        this.fineshed=true
        this.clock.add_timeout(()=>{
            this.clock.timeScale=0
            this.call_event_async("game_finish",{winners}).then(()=>{
                if(!this.can_finish){
                    return
                }
                if(this.replay)this.replay.stopRecording()
                this.update_data()
                setTimeout(()=>{
                    this.running=false
                },1000)
            })
        },finish_time)
    }

    set_rain(rain:number){
        this.ambient.target_rain=rain
        this.ambient.rain_state=1
        this.ambient.rain_timer=random.float(10,30)
    }
    get_loot_table(table:LootTable,settings?:LootAditional):LootData[]{
        return this.loot_tables.get_loot(table,settings??this.modeManager.rules.loot_settings,this)
    }
    override handle_connection(client:Client,username:string){
        this.players.connection(client,username)
    }
}
