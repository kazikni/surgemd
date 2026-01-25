import { ID, KDate, NetStream, Numeric, ReplayRecorder2D, ValidString, Vec2, cloneDeep, random, v2 } from "common/scripts/engine/mod.ts"
import { GameConstants, Layers, LayersL} from "common/scripts/others/constants.ts"
import { Player } from "../gameObjects/player.ts"
import { Loot } from "../gameObjects/loot.ts"
import { JoinPacket } from "common/scripts/packets/join_packet.ts"
import { ActionPacket } from "common/scripts/packets/action_packet.ts"
import { Bullet } from "../gameObjects/bullet.ts"
import { Obstacle } from "../gameObjects/obstacle.ts"
import { GameMap } from "./map.ts"
import { Explosion } from "../gameObjects/explosion.ts";
import { Gamemode, Gamemodes } from "../mode/gamemode.ts";
import { BulletDef } from "common/scripts/definitions/utils.ts";
import { ExplosionDef } from "common/scripts/definitions/objects/explosions.ts";
import { ProjectileDef } from "common/scripts/definitions/objects/projectiles.ts";
import { Projectile } from "../gameObjects/projectile.ts";
import { ServerGameObject } from "./gameObject.ts";
import { Client, DefaultSignals, OfflineClientsManager, ServerGame2D } from "common/scripts/engine/server_offline/offline_server.ts";
import { PlayerBody } from "../gameObjects/player_body.ts";
import { JoinedPacket } from "common/scripts/packets/joined_packet.ts";
import { KillFeedMessage, KillFeedMessageType, KillFeedPacket } from "common/scripts/packets/killfeed_packet.ts";
import { DamageSourceDef, GameItem } from "common/scripts/definitions/alldefs.ts";
import { Vehicle } from "../gameObjects/vehicle.ts";
import { VehicleDef, Vehicles } from "common/scripts/definitions/objects/vehicles.ts";
import { Skins } from "common/scripts/definitions/loadout/skins.ts";
import { Badges } from "common/scripts/definitions/loadout/badges.ts";
import { Creature } from "../gameObjects/creature.ts";
import { CreatureDef } from "common/scripts/definitions/objects/creatures.ts";
import { Obstacles } from "common/scripts/definitions/objects/obstacles.ts";
import { ConfigType, GameConfig, GameDebugOptions } from "common/scripts/config/config.ts";
import { GamemodeManager, SoloGamemodeManager } from "../mode/modeManager.ts";
import { DeadZoneDefinition, DeadZoneManager, DeadZoneMode } from "../gameObjects/deadzone.ts";
import { GeneralUpdatePacket, PlaneData } from "common/scripts/packets/general_update.ts"
import {PacketManager} from "common/scripts/packets/packet_manager.ts"
import { LootTablesManager } from "common/scripts/engine/inventory.ts";
import { Aditional, loot_table_get_item } from "common/scripts/definitions/maps/base.ts";
import { Building } from "../gameObjects/building.ts";
import { LevelDefinition } from "common/scripts/config/level_definition.ts";
import { LevelPlayer } from "../mode/level_player.ts";
export interface PlaneDataServer extends PlaneData{
    velocity:Vec2
    target_pos:Vec2
    called:boolean
}
export interface GameData {
    living_count: number
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
export class Game extends ServerGame2D<ServerGameObject>{
    map:GameMap
    gamemode:Gamemode
    subscribe_db?:Record<string,{
        skins:number[],
    }>

    debug!:GameDebugOptions

    players:Player[]=[]
    livingPlayers:Player[]=[]
    connectedPlayers:Record<number,Player>={}

    bullets:Record<number,Bullet>=[]

    modeManager:GamemodeManager

    started:boolean=false

    status:GameStatus={
        players:[]
    }

    private _pvpEnabled:boolean=false
    set pvpEnabled(v:boolean){
        this._pvpEnabled=v
        for(const p of this.livingPlayers){
            p.pvpEnabled=v
        }
    }
    get pvpEnabled():boolean{
        return this._pvpEnabled
    }
    string_id=""
    Config:ConfigType

    replay?:ReplayRecorder2D

    statistics?:GameStatistic

    deadzone:DeadZoneManager
    loot_tables:LootTablesManager<GameItem,Aditional>=new LootTablesManager(loot_table_get_item)

    living_count_dirty:boolean=false

    general_update:GeneralUpdatePacket=new GeneralUpdatePacket()

    started_time:number=0

    date:KDate={
        day:3,
        hour:9,
        minute:6,
        second:30,
        month:5,
        year:2000
    }
    begin_date:KDate={
        day:3,
        hour:9,
        minute:6,
        second:30,
        month:5,
        year:2000
    }
    level_player?:LevelPlayer

    npcs:Player[]=[]
    constructor(_config:GameConfig,clients:OfflineClientsManager,id:ID,Config:ConfigType,level?:LevelDefinition){
        super(Config.game.options.gameTps,id,clients,PacketManager,[
            Player,
            Loot,
            Bullet,
            Obstacle,
            Explosion,
            Projectile,
            PlayerBody,
            Vehicle,
            Creature,
            Building
        ])
        for(const i of LayersL){
            this.scene.objects.add_layer(i)
        }
        this.Config=Config
        this.debug=Config.game.debug
        this.new_list=false

        //Gamemode
        this.gamemode=Gamemodes.normal
        this.map=new GameMap(this)
        if(level){
            this.level_player=new LevelPlayer(this)
            this.level_player.begin(level)
        }else{
            this.date=cloneDeep(this.gamemode.game.date)
            this.begin_date=cloneDeep(this.gamemode.game.date)
        }
        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        if(!this.modeManager)this.modeManager=new SoloGamemodeManager(this)
        this.modeManager.generate_map(false)

        this.deadzone=new DeadZoneManager(this,{
            mode:DeadZoneMode.Staged,
            stages:DeadZoneDefinition,
            timeSpeed:Config.game.debug?.dead_zone?.time_speed??1
        })
        if(Config.database.statistic){
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
        if(this.level_player)this.level_player.begin_after()
        this.modeManager.begin_after()
    }
    ntt:number=0
    override on_update(): void {
        super.on_update()
        this.deadzone.tick(this.dt)
        for(const p of this.planes){
            p.pos=v2.add(p.pos,v2.scale(p.velocity,this.dt))
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
        }
        if(this.killing_game){
            this.clock.timeScale=Numeric.lerp(this.clock.timeScale,0,0.03)
            if(this.clock.timeScale<=0.05){
                this.clock.timeScale=1
                this.running=false
            }
        }
        this.ntt-=this.dt
        if(this.ntt<=0){
            this.netUpdate()
            this.ntt=1/this.Config.game.options.netTps
        }

        if(this.started)this.date.second+=this.dt
        if(this.date.second>=1){
            this.date.second=0
            this.date.minute++
            if(this.date.minute>=60){
                this.date.hour+=1
                this.date.second=0
                this.date.minute=0
                this.dirty_ambient=true
            }
        }
    }
    dirty_ambient:boolean=false
    update_data(){
        const data:GameData={
            living_count:this.livingPlayers.length,
            can_join:this.modeManager.can_join()&&!this.fineshed,
            running:this.running,
            started_time:this.started_time,
            started:this.started
        }
        this.signals.emit("update_data",data)
    }
    planes:PlaneDataServer[]=[]
    add_airdrop(position:Vec2){
        const dir=v2.lookTo(v2.new(0,0),position)

        this.planes.push({
            id:random.int(0,1000000),
            complete:false,
            direction:dir,
            target_pos:position,
            called:false,
            pos:v2.new(0,0),//v2.mult(v2.from_RadAngle(dir),this.map.size),
            velocity:v2.scale(v2.from_RadAngle(dir),8),
            type:0
        })
    }
    override on_stop():void{
        super.on_stop()
        if(this.replay)this.replay.stop()
        for(const p of this.players){
            this.status.players.push({
                kills:p.status.kills,
                name:p.name,
                username:p.name,
            })
        }
        this.update_data()
        console.log(`Game ${this.id} Stopped`)
    }
    killing_game:boolean=false
    nd:number=0
    send_killfeed_message(msg:KillFeedMessage){
        const p=new KillFeedPacket()
        p.message=msg
        this.clients.emit(p)
    }
    netUpdate(){
        const s=new NetStream(new ArrayBuffer(5*1024))
        s.writeUint16(this.general_update.ID)
        this.general_update.content.planes=this.planes
        this.general_update.content.deadzone=undefined
        this.general_update.content.ambient=undefined
        this.general_update.content.dirty.living_count=this.living_count_dirty
        if(this.living_count_dirty){
            this.general_update.content.living_count=[this.livingPlayers.length]
        }
        this.living_count_dirty=false
        if(this.deadzone.dirty){
            this.general_update.content.deadzone=this.deadzone.state
        }
        if(this.dirty_ambient){
            this.general_update.content.ambient={
                date:this.date,
                rain:0,
                thunder_storm:0,
                time_walked:0,
            }
        }
        this.dirty_ambient=false
        this.general_update.encode(s)
        for(const p of this.players){
            if(p.connected&&p.activated){
                p.update2()
                p.client!.sendStream(s)
            }
        }
        this.scene.objects.update_to_net()
        this.scene.objects.apply_destroy_queue()
    }
    add_player(id:number|undefined,username:string,packet:JoinPacket,layer:number=Layers.Normal,connected=true):Player{
        const p=this.scene.objects.add_object(new Player(),layer,id) as Player
        if(ValidString.simple_characters(packet.PlayerName)){
            p.name=packet.PlayerName
        }else{
            //Round 6 Easter Egg
            p.name=`${GameConstants.player.defaultName}#${Math.random()<=0.005?456:this.players.length+1}`
        }
        this.players.push(p)
        this.livingPlayers.push(p)

        p.pvpEnabled=this._pvpEnabled||this.debug.deenable_lobby===true
        p.input.is_mobile=packet.is_mobile

        p.username=username

        p.manager.cells.updateObject(p)

        this.living_count_dirty=true

        if(connected){
            this.send_killfeed_message({
                type:KillFeedMessageType.join,
                playerId:p.id,
                playerName:p.name,
                playerBadge:Badges.getFromString(p.loadout.badge).idNumber
            })
            this.modeManager.on_player_join(p)
            if(this.statistics){
                this.statistics.player.players++
            }
            this.update_data()
        }
        p.inventory.set_weapon_index(0)
        return p
    }
    override on_run(): void {
        this.update_data()
    }
    async activate_player(username:string,packet:JoinPacket,client:Client){
        const p=this.add_player(client.ID,username,packet) as Player;
            p.client=client;
            p.update2()

        const pos=this.modeManager.get_player_spawn_position(p)
        if(pos)p.position=pos

        this.connectedPlayers[p.id]=p
        p.connected=true
        if(this.Config.database.enabled){
            let ff
            try{
                if(this.subscribe_db){
                    ff=this.subscribe_db[p.username]
                }else{
                    ff=await(await fetch(`${this.Config.api.global}/get-status/${p.username}`)).json()
                }
            }catch{
                if(this.subscribe_db){
                    ff=this.subscribe_db[p.username]
                }else{
                    ff=undefined
                }
            }

            if(ff?.user){
                const inv=JSON.parse(ff.user.inventory)
                const s=Skins.getFromNumber(packet.skin)
                if(inv.skins.includes(s.idNumber)){
                    p.skin=s
                    p.loadout.skin=s.idString
                }
                p.account_status=ff.user
            }
        }else{
            p.username=""
            const s=Skins.getFromNumber(packet.skin)
            p.skin=s
            p.loadout.skin=s.idString
        }
        

        const jp=new JoinedPacket()

        for(const lp of this.players){
            if(lp.id===p.id)continue
            jp.players.push({
                id:lp.id,
                name:lp.name,
                badge:Badges.getFromString(lp.loadout.badge).idNumber
            })
        }
        jp.date=this.date
        if(this.modeManager.kill_leader){
            jp.kill_leader={
                id:this.modeManager.kill_leader.id,
                kills:this.modeManager.kill_leader.status.kills,
            }
        }

        p.activated=true
        client.emit(jp)

        if(this.statistics){
            this.statistics.player.players++
            this.statistics.loadout.uses[p.loadout.skin]=(this.statistics.loadout.uses[p.loadout.skin]??0)+1
        }

        /*if(Math.random()<0.2){
            const vehicle=this.add_vehicle(p.position,Vehicles.getFromString(random.choose(["bike","jeep"])))
            vehicle.seats[0].set_player(p)
            p.dirty=true
        }*/

        p.update2()

        /*const car=this.add_vehicle(p.position,Vehicles.getFromString("jeep"),p.layer)
        car.seats[0].set_player(p)*/
        return p
    }
    add_npc(name?:string,layer?:number):Player{
        const p=this.add_player(undefined,"",new JoinPacket(name),layer,false)
        p.is_npc=true
        p.connected=true
        this.npcs.push(p)
        return p
    }
    add_bot(name?:string,layer?:number):Player{
        const p=this.add_player(undefined,"",new JoinPacket(name),layer,true)
        p.connected=true
        p.is_bot=true
        p.is_npc=false

        const pos=this.modeManager.get_player_spawn_position(p)
        if(pos)p.position=pos

        return p
    }
    play_sound(position:Vec2,layer:number,sound:string,owner?:Player){
        for(const n of this.npcs){
            n.ai?.on_sound(position,sound,owner)
        }
    }
    fineshed:boolean=false
    start(){
        if(this.started||!this.modeManager.start_rules())return
        this.started=true
        this.modeManager.on_start()
        this.started_time=performance.now()
        if(this.replay)this.replay.start()
        this.update_data()
        console.log(`Game ${this.id} Started`)
    }
    finish(){
        if(this.fineshed)return
        this.fineshed=true
        this.modeManager.on_finish()
        this.update_data()
        console.log(`Game ${this.id} Fineshed`)
    }
    add_bullet(position:Vec2,angle:number,def:BulletDef,owner?:Player,ammo?:string,source?:DamageSourceDef,layer:number=Layers.Normal):Bullet{
        const b=this.scene.objects.add_object(new Bullet(),layer,undefined,{
            defs:def,
            position:v2.duplicate(position),
            owner:owner,
            ammo:ammo,
            source
        })as Bullet
        b.set_direction(angle)
        this.bullets[b.id]=b
        return b
    }
    add_explosion(position:Vec2,def:ExplosionDef,owner?:Player,source?:DamageSourceDef,layer:number=Layers.Normal):Explosion{
        const e=this.scene.objects.add_object(new Explosion(),layer,undefined,{defs:def,owner,position:position,source}) as Explosion
        return e
    }
    add_player_body(owner:Player,angle?:number,layer:number=Layers.Normal):PlayerBody{
        const b=this.scene.objects.add_object(new PlayerBody(angle),layer,undefined,{owner_name:owner.name,owner_badge:owner.loadout.badge,owner,position:v2.duplicate(owner.position)}) as PlayerBody
        return b
    }
    add_player_gore(owner:Player,angle?:number,layer:number=Layers.Normal):PlayerBody{
        const b=this.scene.objects.add_object(new PlayerBody(angle,random.float(4,8)),layer,undefined,{owner_name:"",owner,position:v2.duplicate(owner.position),gore_type:1,gore_id:random.int(0,2)}) as PlayerBody
        return b
    }
    add_projectile(position:Vec2,def:ProjectileDef,owner?:Player,layer:number=Layers.Normal):Projectile{
        const p=this.scene.objects.add_object(new Projectile(),layer,undefined,{defs:def,owner,position:position}) as Projectile
        return p
    }
    add_loot(position:Vec2,def:GameItem,count:number,layer:number=Layers.Normal):Loot{
        const l=this.scene.objects.add_object(new Loot(),layer,undefined,{item:def,count:count,position:position}) as Loot
        if(this.statistics){
            this.statistics.items.dropped[def.idString]=(this.statistics.items.dropped[def.idString]??0)+count
        }
        return l
    }
    add_vehicle(position:Vec2,def:VehicleDef,layer:number=Layers.Normal):Vehicle{
        const v=this.scene.objects.add_object(new Vehicle(),layer,undefined,{position,def}) as Vehicle
        return v
    }
    
    add_creature(position:Vec2,def:CreatureDef,layer:number=Layers.Normal):Creature{
        const c=this.scene.objects.add_object(new Creature(),layer,undefined,{position,def}) as Creature
        return c
    }
    handleConnections(client:Client,username:string){
        let player:Player|undefined
        client.sendStream(this.map.map_packet_stream)
        client.on("join",async(packet:JoinPacket)=>{
            if (this.modeManager.can_join()&&!this.fineshed&&!this.scene.objects.exist_all(client.ID,1)){
                const p=await this.activate_player(username,packet,client)
                player=p
                console.log(`${p.name} Connected`)
            }
        })
        client.on("action",(p:ActionPacket)=>{
            if(player){
                player.process_action(p)
            }
        })
        client.on(DefaultSignals.DISCONNECT,()=>{
            if(player){
                player.connected=false
                delete this.connectedPlayers[player.id]
                console.log(`${player.name} Disconnected`)
            }
        })
    }
}
