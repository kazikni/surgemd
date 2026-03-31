
import { AbstractServerGame, Client, ID,  KDate,  LootTablesManager,  ModsManager,  Numeric, OfflineClientsManager, v2, Vec2 } from "common/engine/core.ts";
import { GameMap } from "./map.ts"
import { ServerGameObject } from "./gameObject.ts";
import { ModeManager } from "../mode/modeManager.ts";
import { DeadZoneManager } from "./deadzone.ts";
import { Layers, LayersL } from "common/scripts/others/constants.ts";
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
import { BattleRoyaleDebug, BattleRoyaleSolo } from "../mode/battle_royale.ts";
import { CounterMD } from "../mode/counter_md.ts";
import { DamageSourceDef, GameDefinition, GameItem } from "common/scripts/definitions/game_defs.ts";
import { CreatureDef } from "common/scripts/definitions/objects/creatures.ts";
import { Creature } from "../objects/creature.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { DumbBotAI } from "../human/ai/dumb_bot_ai.ts";
export interface PlaneDataServer extends PlaneData{
    velocity:Vec2
    target_pos:Vec2
    called:boolean
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

    mods?:ModsManager<any,any,any,ModResult,MDModModule<Game,any,ModResult>>

    ambient:{
        date:KDate
        initial_date:KDate
        rain: number
        thunder_storm: number
    }={
        date:{
            second:0,
            minute:30,
            hour:13,
            month:13,
            day:10,
            year:2000
        },
        initial_date:{
            second:0,
            minute:30,
            hour:13,
            month:13,
            day:10,
            year:2000
        },
        rain:0,
        thunder_storm:0
    }
    dirty:{
        living_count:boolean
        ambient:boolean
    }={
        living_count:false,
        ambient:false,
    }
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
            Creature
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
                    this.init(new BattleRoyaleSolo(game_config.mode_settings))
                    break
                case "counter_md":
                    this.init(new CounterMD(game_config.mode_settings))
                    break
                case "debug":
                    this.init(new BattleRoyaleDebug(game_config.mode_settings))
                    break
            }
        }

        for(let i=0;i<99;i++){
            const b = this.players.add_bot(new JoinPacket())
            if(b.human)b.ai=new DumbBotAI(b.human)
        }
    }
    override net_update(full:boolean){
        this.players.net_update()
    }
    override on_update(dt:number): void {
        super.on_update(dt)
        this.players.update(dt)
        this.deadzone.tick(dt)
        this.modeManager.tick(dt)
        /*for(const p of this.planes){
            p.pos=v2.add(p.pos,v2.scale(p.velocity,dt))
            switch(p.type){
                case 0:
                    if(!p.called&&v2.distance(p.pos,p.target_pos)<=4){
                        const obs=this.map.add_obstacle(Obstacles.getFromString("copper_crate"))
                        obs.set_position(p.pos,0)
                        obs.manager.cells.updateObject(obs)
                        p.called=true
                    }
                    break
            }
        }*/
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
    add_airdrop(position:Vec2){
        /*const dir=v2.lookTo(v2.new(0,0),position)

        this.planes.push({
            id:random.int(0,1000000),
            complete:false,
            direction:dir,
            target_pos:position,
            called:false,
            pos:v2.new(0,0),//v2.mult(v2.from_RadAngle(dir),this.map.size),
            velocity:v2.scale(v2.from_RadAngle(dir),8),
            type:0
        })*/
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

        console.log(`Game ${this.id} Fineshed`)
    }
    add_bullet(position:Vec2,angle:number,def:BulletDef,owner?:Human,ammo?:string,source?:DamageSourceDef,layer:number=Layers.Normal):Bullet{
        const b=this.scene_2d.objects.add_object(new Bullet(),layer,undefined,{
            defs:def,
            position:v2.clone(position),
            owner:owner,
            ammo:ammo,
            source
        })as Bullet
        b.set_direction(angle)
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
    override handle_connection(client:Client,username:string){
        this.players.connection(client,username)
    }
}
