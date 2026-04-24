
import { AbstractServerGame, CircleHitbox2D, Client, ID,  KDate,  LootTablesManager,  ModsManager, OfflineClientsManager, random, ReplayRecorder, v2, v2m, Vec2 } from "common/engine/core.ts";
import { GameMap } from "./map.ts"
import { ServerGameObject } from "./gameObject.ts";
import { ModeManager } from "../mode/modeManager.ts";
import { DeadZoneManager } from "./deadzone.ts";
import { Layers, LayersL, Spawn } from "common/scripts/others/constants.ts";
import { ConfigType, GameConfig, GameDebugOptions } from "common/scripts/config/config.ts";
import { PlaneData } from "common/scripts/packets/general_update.ts";
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
import { BattleRoyaleDebug, BattleRoyaleGroup, BattleRoyaleSolo } from "../mode/battle_royale.ts";
import { CounterMD } from "../mode/counter_md.ts";
import { DamageSourceDef, GameDefinition, GameItem } from "common/scripts/definitions/game_defs.ts";
import { CreatureDef } from "common/scripts/definitions/objects/creatures.ts";
import { Creature } from "../objects/creature.ts";
import { Parachute } from "../objects/parachute.ts";
import { SyncedParticle } from "../objects/synced_particle.ts";
import { SyncedParticleDef } from "common/scripts/definitions/objects/synced_particle.ts";
import { ObstacleDef } from "common/scripts/definitions/objects/obstacles.ts";
import { PingData } from "common/scripts/packets/update_packet.ts";
export interface PlaneDataServer extends PlaneData{
    velocity:Vec2
    target_pos:Vec2
    called:boolean
    speed:number
    
    owner?:Human
    grenade_def?:GrenadeDef
    obstacle?:ObstacleDef
}
export interface GameData {
    living_count: number[]

    can_join: boolean
    running: boolean

    started_time: number
    started:boolean
}
export interface GameStatus{
    players:{
        name:string
        username:string
        kills:number
    }[]
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
    main_config:ConfigType
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
    
    loot_tables:LootTablesManager<GameItem,Aditional>=new LootTablesManager(loot_table_get_item)
    loot:Loot[]=[]

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
    constructor(main_config:ConfigType,clients:OfflineClientsManager,id:ID){
        super(100,id,clients,[
            Human,
            Loot,
            Grenade,
            Obstacle,
            Building,
            Vehicle,
            Bullet,
            Explosion,
            Creature,
            Parachute,
            SyncedParticle
        ])

        this.ntps=30
        this.main_config=main_config

        for(const i of LayersL){
            this.scene_2d.objects.add_layer(i)
        }
        this.debug=main_config.game.debug

        //Gamemode
        this.map=new GameMap(this)
        /*if(level){
            this.level_player=new LevelPlayer(this)
            this.level_player.begin(level)
        }*/

        this.deadzone=new DeadZoneManager(this)
        if(main_config.database.statistic){
            this.statistics={
                items:{
                    dropped:{},
                    kills:{}
                },
                player:{
                    disconnection:0,
                    players:0
                },
                loadout:{
                    uses:{}
                }
            }
        }
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
            switch(game_config.mode){
                case "normal":
                    if((game_config.group_size??1)>1){
                        this.init(new BattleRoyaleGroup(game_config.group_size??1,game_config.mode_settings))
                    }else{
                        this.init(new BattleRoyaleSolo(game_config.mode_settings))
                    }
                    break
                case "counter_md":
                    this.init(new CounterMD(game_config.mode_settings))
                    break
                case "debug":
                    this.init(new BattleRoyaleDebug(game_config.mode_settings))
                    break
            }
        }

        /*for(let i=0;i<99;i++){
            const b = this.players.add_bot(new JoinPacket())
            if(b.human){
                if(Math.random()<=0.1){
                    b.human.set_preset({
                        "inventory":{
                            "infinity_ammo":true,
                            "hand":1,
                            "backpack":[
                                {"item":"basic_pack","weight":10},
                                {"item":"regular_pack","weight":15,"drop_chance":0.3},
                                {"item":"tactical_pack","weight":10,"drop_chance":0.5}
                            ],
                            "vest":[
                                {"item":"basic_vest","weight":10,"drop_chance":0.3},
                                {"item":"regular_vest","weight":15,"drop_chance":0.5},
                                {"item":"tactical_vest","weight":10,"drop_chance":0.75}
                            ],
                            "helmet":[
                                {"item":"basic_helmet","weight":10,"drop_chance":0.3},
                                {"item":"regular_helmet","weight":15,"drop_chance":0.5},
                                {"item":"tactical_helmet","weight":10,"drop_chance":0.75}
                            ],
                            "gun1":[
                                {"item":"blr81","weight":6},
                                {"item":"model94","weight":6},
                                {"item":"kar98k","weight":1.5},
                                {"item":"awp","weight":0.5},
                                {"item":"awms","weight":0.01}
                            ],
                            "gun2":[
                                {"item":"mp5","weight":7},
                                {"item":"ak47","weight":7},
                                {"item":"model94","weight":5},
                                {"item":"blr81","weight":5},
                                {"item":"kar98k","weight":1},
                                {"item":"awp","weight":0.5},
                                {"item":"pkp","weight":0.1},
                                {"item":"awms","weight":0.01}
                            ],
                            "boosts":[
                                {"weight":8,"boost_type":0,"boost":0},
                                {"weight":1,"boost_type":1,"boost":1},
                                {"weight":1,"boost_type":2,"boost":1}
                            ],
                            "aitems":{
                                "12g":30,
                                "556mm":150,
                                "762mm":150,
                                "45acp":150,
                                "9mm":200,
                            },
                            "iitems":[
                                "scope_2",
                                "scope_3",
                                "scope_4",
                            ]
                        }
                    })
                    b.ai=new ADVHumanAI(b.human)
                }else{
                    b.ai=new DumbBotAI(b.human)
                }
            }
        }*/
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
        for(const p of this.planes){
            if(!p.called){
                p.direction=v2.lookTo(p.pos,p.target_pos)
                p.velocity=v2.from_RadAngle(p.direction)
                v2m.scale(p.velocity,p.velocity,p.speed)
            }
            v2m.add(p.pos,p.pos,v2.scale(p.velocity,dt))
            if(!p.called&&v2.distance(p.pos,p.target_pos)<=4){
                switch(p.type){
                    case 0:
                        this.add_parachute(p.target_pos,p.obstacle!)
                        break
                    case 1:{
                        const g=this.add_grenade(p.target_pos,p.grenade_def!,p.owner,Layers.Normal)
                        g.physical_data.zpos=1
                        g.physical_data.zpos_speed=0
                        g.physical_data.angular_velocity=Math.random()>=0.5?-1.5:1.5
                        break
                    }
                }
                p.called=true
            }
        }
    }
    update_data(){
        const data:GameData={
            living_count:this.modeManager.get_living_count(),

            can_join:this.modeManager.can_join()&&!this.fineshed&&!this.closed,
            running:this.running,

            started_time:this.started_time,
            started:this.started
        }
        this.signals.emit("update_data",data)
    }
    clear_loot(){
        for(const l of this.loot){
            l.destroy()
        }
        this.loot.length=0
    }
    planes:PlaneDataServer[]=[]
    add_airdrop(position?:Vec2,obstacle?:ObstacleDef){
        if(!position)position=this.map.getRandomPosition(new CircleHitbox2D(v2(0,0),2),-1,Layers.Normal,Spawn.any,this.map.random,(_hitbox,_map,_random)=>{
            return this.deadzone.random_point_inside_new()
        })
        if(!position)position=v2(3,3)
        if(!obstacle)obstacle=this.definitions.obstacles.getFromString("airdrop_locked")

        const direction=random.rad()
        const planePos = v2.from_RadAngle(direction,this.map.size.x+10)

        this.planes.push({
            id:random.int(0,1000000),
            complete:false,
            direction:direction,
            target_pos:position,
            called:false,
            pos:planePos,
            speed:13,
            velocity:v2.zero,
            obstacle,
            type:0
        })
    }
    add_airstrike(position:Vec2,grenade:GrenadeDef,owner?:Human){
        const dir=v2.lookTo(v2(0,0),position)
        this.planes.push({
            id:random.int(0,1000000),
            direction:dir,
            complete:false,
            target_pos:position,
            called:false,
            pos:v2.zero(),
            speed:100,
            velocity:v2.zero,
            type:1,
            owner:owner,
            grenade_def:grenade
        })
    }
    override on_run(): void {
        this.update_data()
    }
    override on_stop():void{
        super.on_stop()
        /*for(const h of this.humans){
            this.status.players.push({
                kills:p.status.kills,
                name:p.name,
                username:p.name,
            })
        }*/
        this.update_data()
        console.log(`Game ${this.id} Stopped`)
    }
    soft_reset(){
        this.humans.clear_npcs()
        this.players.clear_bots()
        this.clear_loot()
        this.map.soft_reset()
        this.deadzone.reset()
        this.timeouts.length=0
        this.started = false
        this.closed = false
    }
    override mainloop(rqf?:boolean,auto_mainloop?:boolean){
        this.fineshed=false
        this.closed=false
        super.mainloop(rqf,auto_mainloop)
    }
    start(){
        if(this.started)return

        this.started=true
        this.modeManager.on_start()
        this.started_time=performance.now()

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
    finish(){
        if(this.fineshed)return
        this.fineshed=true
        this.update_data()
        this.stop()

        this.modeManager.on_finish()
        this.signals.emit("finish",{})

        if(this.replay)this.replay.stopRecording()

        console.log(`Game ${this.id} Fineshed`)
    }
    add_bullet(position:Vec2,def:BulletDef,owner?:Human,ammo?:string,source?:DamageSourceDef,layer:number=Layers.Normal,satured:boolean=false):Bullet{
        const b=this.scene_2d.objects.add_object(new Bullet(),layer,undefined,{
            defs:def,
            position:v2.clone(position),
            owner:owner,
            ammo:ammo,
            source,
            satured
        })as Bullet
        return b
    }
    add_explosion(position:Vec2,def:ExplosionDef,owner?:Human,source?:DamageSourceDef,layer:number=Layers.Normal):Explosion{
        const e=this.scene_2d.objects.add_object(new Explosion(),layer,undefined,{defs:def,owner,position:position,source}) as Explosion
        return e
    }
    /*add_player_body(owner:Player,angle?:number,layer:number=Layers.Normal):PlayerBody{
        const b=this.scene.objects.add_object(new PlayerBody(angle),layer,undefined,{owner_name:owner.name,owner_badge:owner.loadout.badge,owner,position:v2.duplicate(owner.position)}) as PlayerBody
        return b
    }
    add_player_gore(owner:Player,angle?:number,layer:number=Layers.Normal):PlayerBody{
        const b=this.scene.objects.add_object(new PlayerBody(angle,random.float(4,8)),layer,undefined,{owner_name:"",owner,position:v2.duplicate(owner.position),gore_type:1,gore_id:random.int(0,2)}) as PlayerBody
        return b
    }*/
    add_grenade(position:Vec2,def:GrenadeDef,owner?:Human,layer:number=Layers.Normal):Grenade{
        const p=this.scene_2d.objects.add_object(new Grenade(),layer,undefined,{def:def,owner,position:position}) as Grenade
        return p
    }
    add_loot(position:Vec2,def:GameItem,count:number,layer:number=Layers.Normal):Loot{
        const l=this.scene_2d.objects.add_object(new Loot(),layer,undefined,{item:def,count:count,position:position}) as Loot
        if(this.statistics){
            this.statistics.items.dropped[def.idString]=(this.statistics.items.dropped[def.idString]??0)+count
        }

        this.loot.push(l)
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
    override handle_connection(client:Client,username:string){
        this.players.connection(client,username)
    }
}
