import { cloneDeep, LootTableGetItemCallback, LootTablesManager, SignalManager, Stream, Vec2 } from "../../../engine/core.ts";
import { type LoadoutPreset } from "../../definitions/utils.ts";
import { type JoinData } from "../../net/join_packet.ts";
import { type DamageParams, GameConstants, Layers, object_instance_type, Spawn, type SpawnMode, type LootAditional, type LootData, type LootSetting, type LootTable } from "../../others/constants.ts";
import { loot_table_get_item } from "../../others/functions.ts";
import { type CommonApplication, type SimulatedScene } from "../base.ts";
import { human_events } from "../objects/human/events.ts";
import { type SI_Human } from "../objects/human/human.ts";
import { type PlayerConn } from "../players/player_conn.ts";

export const mode_events={
    map_generated:"map_generated",
    initialized:"initialized",
    player_connect:"player_connect",
    player_disconnect:"player_disconnect",
    player_join:"player_join",
    player_leave:"player_leave",
    player_spawn:"player_spawn",
    player_respawn:"player_respawn",
    human_knocked:"human_knocked",
    human_die:"human_die",
    start:"start",
    finish:"finish",
    closed:"closed",
} as const

export interface PlayerStatus{
    kills:number
    deaths:number
    damage:number
    damage_taken:number
    score:number
    time_alive:number
}
export function DefaultPlayerStatus():PlayerStatus{
    return {kills:0,deaths:0,damage:0,damage_taken:0,score:0,time_alive:0}
}

export const DefaultHumanLoadout:LoadoutPreset={
    body:"body_1",
    body_tint:0xf0a93f,
    hair:"hair_1",
    hair_tint:0x222222,
    eyes:"eyes_1",
    shirt:"blue_shirt",
    legs:"blue_jeans_pants",
    foot:"black_shoes",
}

export class Player<S extends object=PlayerStatus>{
    human?:SI_Human
    name:string=""
    join?:JoinData
    connected:boolean=true
    constructor(public conn:PlayerConn,public status:S){}
    get id():number{
        return this.conn.id
    }
    get is_bot():boolean{
        return this.conn.is_bot
    }
    get alive():boolean{
        return this.human!==undefined&&!this.human.dead&&!this.human.destroyed
    }
}

export class PlayersManager<S extends object=PlayerStatus>{
    players=new Map<number,Player<S>>()
    by_human=new Map<number,Player<S>>()

    get count():number{
        return this.players.size
    }
    add(p:Player<S>){
        this.players.set(p.id,p)
        if(p.human)this.by_human.set(p.human.id,p)
    }
    remove(p:Player<S>){
        this.players.delete(p.id)
        if(p.human&&this.by_human.get(p.human.id)===p)this.by_human.delete(p.human.id)
    }
    get(id:number):Player<S>|undefined{
        return this.players.get(id)
    }
    of(h:SI_Human|number):Player<S>|undefined{
        return this.by_human.get(typeof h==="number"?h:h.id)
    }
    set_human(p:Player<S>,h?:SI_Human){
        if(p.human&&this.by_human.get(p.human.id)===p)this.by_human.delete(p.human.id)
        p.human=h
        if(h)this.by_human.set(h.id,p)
        p.conn.set_human(h)
    }
    list():Player<S>[]{
        return [...this.players.values()]
    }
    living():Player<S>[]{
        return this.list().filter((p)=>p.alive)
    }
    connected():Player<S>[]{
        return this.list().filter((p)=>p.connected)
    }
    clear(){
        this.players.clear()
        this.by_human.clear()
    }
    add_status(p:Player<S>|undefined,key:string,amount:number){
        if(!p)return
        const s=p.status as Record<string,unknown>
        if(typeof s[key]==="number")s[key]=(s[key] as number)+amount
    }
}

export interface GameRules{
    auto_start:boolean
    loot_settings:LootSetting
    humans:{
        knock_enabled:boolean
        friendly_fire:boolean
        drop_inventory:boolean
        critical_chance:number
        idle_critical_chance:number
    }
    score:{
        kill:number
        damage:number
        win:number
    }
}

export abstract class ModeManager<S extends object=PlayerStatus,Settings={}>{
    scene!:SimulatedScene
    app!:CommonApplication

    settings:Settings
    rules:GameRules

    loot_tables:LootTablesManager<LootData,LootAditional,LootSetting>
    players:PlayersManager<S>=new PlayersManager<S>()

    spawn_mode:SpawnMode=Spawn.grass
    spawn_layer:number=Layers.Normal

    initialized:boolean=false
    started:boolean=false
    finished:boolean=false
    closed:boolean=false
    destroyed:boolean=false
    time:number=0

    signals:SignalManager=new SignalManager()

    constructor(settings:Settings){
        this.settings=cloneDeep(settings)
        this.loot_tables=new LootTablesManager(loot_table_get_item as LootTableGetItemCallback<LootData,LootAditional,LootSetting>)
        this.rules={
            auto_start:true,
            loot_settings:{hold_ammo:true} as LootSetting,
            humans:{
                knock_enabled:false,
                friendly_fire:false,
                drop_inventory:true,
                critical_chance:0.1,
                idle_critical_chance:0.2,
            },
            score:{
                kill:50,
                damage:0.5,
                win:500,
            },
        }
    }

    abstract create_status():S

    async init(scene:SimulatedScene){
        this.scene=scene
        this.app=scene.app
        scene.mode=this
        this.on_init()
        await this.generate_map()
        this.signals.emit(mode_events.map_generated,this.scene.map)

        this.rules.loot_settings.definitions=this.app.definitions
        this.on_initialized()
        this.initialized=true
        this.signals.emit(mode_events.initialized)
    }
    on_init(){}
    on_initialized(){}

    abstract generate_map():Promise<void>

    get_loot(table:LootTable,settings?:LootAditional):LootData[]{
        return this.loot_tables.get_loot(table,{definitions:this.app.definitions,...(settings??this.rules.loot_settings)})
    }

    get open():boolean{
        return this.initialized&&!this.closed&&!this.finished&&!this.destroyed
    }
    can_connect():boolean{
        return this.open
    }
    can_join():boolean{
        return this.open
    }
    can_start():boolean{
        return this.players.connected().length>0
    }

    can_knock(h:SI_Human):boolean{
        return false
    }
    is_ally(a:SI_Human,b:SI_Human):boolean{
        return false
    }
    is_player(h:SI_Human):boolean{
        return this.players.of(h)!==undefined
    }
    get_living_count():number{
        return this.players.living().length
    }

    get_spawn_position(h:SI_Human):Vec2|undefined{
        return this.scene.map.get_random_position(h.collider,h.id,h.layer,this.spawn_mode)
    }

    connect(conn:PlayerConn):Player<S>|undefined{
        const old=this.players.get(conn.id)
        if(old)return old
        if(!this.can_connect())return undefined
        conn.mode=this
        const p=new Player<S>(conn,this.create_status())
        this.players.add(p)
        this.on_player_connect(p)
        this.signals.emit(mode_events.player_connect,p)
        return p
    }
    disconnect(conn:PlayerConn){
        const p=this.players.get(conn.id)
        if(!p||!p.connected)return
        p.connected=false
        conn.connected=false
        this.on_player_disconnect(p)
        this.signals.emit(mode_events.player_disconnect,p)
        this.check_finish()
    }
    join(conn:PlayerConn,data:JoinData):SI_Human|undefined{
        const p=this.connect(conn)
        if(!p||p.alive||!this.can_join())return undefined
        p.join=data
        conn.join=data
        p.name=data.name.length>0?data.name:`${GameConstants.player.defaultName}#${this.players.count}`
        this.on_player_join(p)
        const h=this.spawn_player(p)
        this.signals.emit(mode_events.player_join,p)
        return h
    }
    leave(p:Player<S>){
        const h=p.human
        this.players.set_human(p,undefined)
        this.players.remove(p)
        if(h){
            if(!h.destroyed)h.destroy()
        }
        this.signals.emit(mode_events.player_leave,p)
    }

    spawn_player(p:Player<S>):SI_Human{
        const h=this.scene.add_object(this.scene.make_object(object_instance_type.human),this.spawn_layer,undefined,{
            name:p.name,
            loadout:p.join?.loadout??DefaultHumanLoadout,
        }) as SI_Human
        this.players.set_human(p,h)
        h.on(human_events.damaged,(params:DamageParams,health_damage:number)=>{
            this.players.add_status(p,"damage_taken",health_damage)
            if(params.owner&&params.owner.id!==h.id)this.players.add_status(this.players.of(params.owner.id),"damage",health_damage)
        })
        this.on_player_spawn(p,h)
        this.signals.emit(mode_events.player_spawn,p,h)

        const pos=this.get_spawn_position(h)
        if(pos)h.position=pos
        return h
    }
    respawn_player(p:Player<S>,delay:number=0){
        const run=()=>{
            if(this.destroyed)return
            if(!this.players.get(p.id)||this.finished)return
            const h=p.human
            if(h&&h.dead){
                h.revive()
                const pos=this.get_spawn_position(h)
                if(pos)h.position=pos
                this.players.set_human(p,h)
            }else if(!h){
                this.spawn_player(p)
            }
            this.on_player_respawn(p)
            this.signals.emit(mode_events.player_respawn,p)
        }
        this.app.clock.add_timeout(run,Math.max(delay,0.001))
    }

    on_player_connect(_p:Player<S>){}
    on_player_disconnect(p:Player<S>){
        this.leave(p)
    }
    on_player_join(_p:Player<S>){}
    on_player_spawn(_p:Player<S>,_h:SI_Human){}
    on_player_respawn(_p:Player<S>){}

    on_human_knocked(h:SI_Human,params:DamageParams){
        this.players.of(h)?.conn.on_human_knocked(params)
        this.signals.emit(mode_events.human_knocked,h,params)
    }
    on_human_die(h:SI_Human,params:DamageParams){
        if(this.rules.humans.drop_inventory)h.inventory?.drop_all()
        const p=this.players.of(h)
        const killer=params.owner&&params.owner.id!==h.id?this.players.of(params.owner.id):undefined
        if(killer&&killer.human&&!this.is_ally(h,killer.human)){
            this.players.add_status(killer,"kills",1)
            this.players.add_status(killer,"score",this.rules.score.kill)
        }
        if(p){
            this.players.add_status(p,"deaths",1)
            p.conn.on_human_die(params)
        }
        this.signals.emit(mode_events.human_die,h,params)
        this.check_finish()
    }
    check_finish(){}

    start(force:boolean=false){
        if(this.started)return
        if(!force&&!this.can_start())return
        this.started=true
        this.time=0
        for(const p of this.players.list())p.conn.on_game_start()
        this.on_start()
        this.signals.emit(mode_events.start)
    }
    on_start(){}
    close(){
        if(this.closed)return
        this.closed=true
        this.on_close()
        this.signals.emit(mode_events.closed)
    }
    on_close(){}
    finish(winners:Player<S>[]=[]){
        if(this.finished)return
        this.finished=true
        this.close()
        this.on_finish(winners)
        for(const p of this.players.list()){
            p.conn.on_game_finish(winners.includes(p))
        }
        this.signals.emit(mode_events.finish,winners)
    }
    on_finish(winners:Player<S>[]){
        for(const w of winners)this.players.add_status(w,"score",this.rules.score.win)
    }

    tick(dt:number){
        if(this.started&&!this.finished){
            this.time+=dt
            for(const p of this.players.living())this.players.add_status(p,"time_alive",dt)
        }
        for(const p of this.players.list())p.conn.tick(dt)
        this.on_tick(dt)
        if(!this.started&&this.rules.auto_start&&this.can_start())this.start()
    }
    on_tick(_dt:number){}

    net_update(){
        for(const p of this.players.list())p.conn.net_update()
    }

    destroy(){
        this.destroyed=true
        this.players.clear()
    }

    encode_checkpoint(stream:Stream){
        stream.write_boolean_group(this.started,this.finished,this.closed)
        stream.write_float32(this.time)
        stream.write_array(this.players.list(),(p)=>{
            stream.write_id(p.id)
            stream.write_id(p.human?.id??0)
            stream.write_string(p.name,1)
            stream.write_any(p.status,2,2)
        },2)
    }
    decode_checkpoint(stream:Stream){
        const [started,finished,closed]=stream.read_boolean_group()
        this.started=started
        this.finished=finished
        this.closed=closed
        this.time=stream.read_float32()
        stream.read_array(()=>{
            const id=stream.read_id()
            const human_id=stream.read_id()
            const name=stream.read_string(1)
            const status=stream.read_any(2,2) as S
            const p=this.players.get(id)
            if(!p)return
            p.name=name
            p.status=status
            const h=this.scene.objects.get_object(human_id) as SI_Human|undefined
            this.players.set_human(p,h)
        },2)
    }
}