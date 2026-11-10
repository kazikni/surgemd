import { BaseGEL, LootTableGetItemCallback, LootTablesManager, Stream, Vec2 } from "../../../engine/core.ts";
import { type MapDef } from "../../definitions/maps/base.ts";
import { get_map_def } from "../../definitions/maps/maps.ts";
import { type LoadoutPreset } from "../../definitions/utils.ts";
import { type JoinData } from "../../net/join_packet.ts";
import { type DamageParams, GameConstants, gelo_instance_type, Layers, object_instance_type, Spawn, type SpawnMode, type LootAditional, type LootData, type LootSetting, type LootTable } from "../../others/constants.ts";
import { loot_table_get_item } from "../../others/functions.ts";
import { type CommonApplication, type SimulatedScene } from "../base.ts";
import { type SI_GameMap } from "../gelo/map.ts";
import { human_events, type SI_Human } from "../objects/moving_body/human.ts";
import { type PlayerConn } from "../players/player_conn.ts";
import { GroupsManager, TeamsManager } from "./teams.ts";

export const mode_events={
    map_generated:"map_generated",
    initialized:"initialized",
    player_connect:"player_connect",
    player_disconnect:"player_disconnect",
    player_join:"player_join",
    player_leave:"player_leave",
    player_spawn:"player_spawn",
    player_respawn:"player_respawn",
    human_spawn:"human_spawn",
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
}

export interface GameRules{
    auto_start:boolean
    loot_settings:LootSetting
    humans:{
        knock_enabled:boolean
        friendly_fire:boolean
    }
    score:{
        kill:number
        damage:number
        win:number
    }
}

export interface ModeSettings{
    map?:{
        def?:MapDef|string
        seed?:number
    }
    players?:{
        limit?:number
    }
}

export interface SpawnHumanOptions{
    position?:Vec2
    layer?:number
    name?:string
    loadout?:LoadoutPreset
    team?:number
}

export abstract class ModeManager<S extends object=PlayerStatus,Settings extends ModeSettings=ModeSettings> extends BaseGEL{
    scene!:SimulatedScene
    app!:CommonApplication

    settings:Settings
    rules:GameRules

    loot_tables:LootTablesManager<LootData,LootAditional,LootSetting>
    players:PlayersManager<S>=new PlayersManager<S>()
    teams?:TeamsManager
    groups?:GroupsManager

    spawn_mode:SpawnMode=Spawn.grass
    spawn_layer:number=Layers.Normal

    started:boolean=false
    finished:boolean=false
    closed:boolean=false
    destroyed:boolean=false
    time:number=0

    constructor(settings:Settings){
        super()
        this.settings=settings
        this.loot_tables=new LootTablesManager(loot_table_get_item as LootTableGetItemCallback<LootData,LootAditional,LootSetting>)
        this.rules={
            auto_start:true,
            loot_settings:{hold_ammo:true} as LootSetting,
            humans:{
                knock_enabled:false,
                friendly_fire:false,
            },
            score:{
                kill:50,
                damage:0.5,
                win:500,
            },
        }
    }

    abstract create_status():S

    init(scene:SimulatedScene){
        this.scene=scene
        this.app=scene.app
        scene.mode=this
        this.rules.loot_settings.definitions=this.app.definitions
        this.on_init()
        this.generate_map()
        this.emit_event(mode_events.map_generated,this.scene.map)
        this.on_initialized()
        this.emit_event(mode_events.initialized)
    }
    on_init(){}
    on_initialized(){}

    generate_map(){
        const map=this.scene.make_gelo(gelo_instance_type.map) as SI_GameMap
        this.scene.map=map
        this.scene.gelo.registry(map,"map")
        map.generate(get_map_def(this.settings.map?.def),this.settings.map?.seed)
    }

    get_loot(table:LootTable,settings?:LootAditional):LootData[]{
        return this.loot_tables.get_loot(table,{definitions:this.app.definitions,...(settings??this.rules.loot_settings)})
    }
    timeout(callback:()=>void,delay:number){
        this.app.clock.add_timeout(()=>{
            if(!this.destroyed)callback()
        },delay)
    }

    is_open():boolean{
        return !this.closed&&!this.finished
    }
    can_connect(_conn:PlayerConn):boolean{
        return this.is_open()
    }
    can_join(_player:Player<S>):boolean{
        if(!this.is_open())return false
        const limit=this.settings.players?.limit
        return limit===undefined||this.players.living().length<limit
    }
    can_start():boolean{
        return this.players.connected().length>0
    }
    can_knock(h:SI_Human):boolean{
        if(this.rules.humans.knock_enabled)return true
        if(this.groups?.of(h)?.can_knock(h))return true
        if(this.teams?.of(h)?.can_knock(h))return true
        return false
    }
    is_ally(a:SI_Human,b:SI_Human):boolean{
        if(a.id===b.id)return true
        if(this.rules.humans.friendly_fire)return false
        const ga=this.groups?.of(a)
        if(ga&&ga===this.groups?.of(b))return true
        const ta=this.teams?.of(a)
        if(ta&&ta===this.teams?.of(b))return true
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
    add_status(p:Player<S>|undefined,key:string,amount:number){
        if(!p)return
        const s=p.status as Record<string,unknown>
        if(typeof s[key]==="number")s[key]=(s[key] as number)+amount
    }

    connect(conn:PlayerConn):Player<S>|undefined{
        const old=this.players.get(conn.id)
        if(old)return old
        if(!this.can_connect(conn))return undefined
        conn.mode=this
        const p=new Player<S>(conn,this.create_status())
        this.players.add(p)
        this.on_player_connect(p)
        this.emit_event(mode_events.player_connect,p)
        return p
    }
    disconnect(conn:PlayerConn){
        const p=this.players.get(conn.id)
        if(!p||!p.connected)return
        p.connected=false
        this.on_player_disconnect(p)
        this.emit_event(mode_events.player_disconnect,p)
        this.check_finish()
    }
    join(conn:PlayerConn,data:JoinData):SI_Human|undefined{
        const p=this.connect(conn)
        if(!p||p.alive||!this.can_join(p))return undefined
        p.join=data
        conn.join=data
        p.name=data.name.length>0?data.name:`${GameConstants.player.defaultName}#${this.players.count}`
        const h=this.spawn_player(p)
        this.on_player_join(p)
        this.emit_event(mode_events.player_join,p)
        return h
    }
    leave(p:Player<S>){
        const h=p.human
        this.players.set_human(p,undefined)
        this.players.remove(p)
        if(h){
            this.teams?.of(h)?.remove_human(h)
            this.groups?.of(h)?.remove_human(h)
            if(!h.destroyed)h.destroy()
        }
        this.emit_event(mode_events.player_leave,p)
    }

    spawn_human(options:SpawnHumanOptions={}):SI_Human{
        const h=this.scene.add_object(this.scene.make_object(object_instance_type.human),options.layer??this.spawn_layer,undefined,{
            position:options.position,
            name:options.name,
            loadout:options.loadout??DefaultHumanLoadout,
        }) as SI_Human
        if(options.team!==undefined)this.teams?.get(options.team)?.add_human(h)
        if(!options.position){
            const pos=this.get_spawn_position(h)
            if(pos)h.position=pos
        }
        this.on_human_spawn(h)
        this.emit_event(mode_events.human_spawn,h)
        return h
    }
    spawn_player(p:Player<S>):SI_Human{
        const h=this.spawn_human({
            name:p.name,
            loadout:p.join?.loadout,
        })
        this.players.set_human(p,h)
        h.on(human_events.damaged,(params:DamageParams,health_damage:number)=>{
            this.add_status(p,"damage_taken",health_damage)
            if(params.owner&&params.owner.id!==h.id)this.add_status(this.players.of(params.owner.id),"damage",health_damage)
        })
        this.on_player_spawn(p,h)
        this.emit_event(mode_events.player_spawn,p,h)
        return h
    }
    respawn_player(p:Player<S>,delay:number=0){
        const run=()=>{
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
            this.emit_event(mode_events.player_respawn,p)
        }
        this.timeout(run,Math.max(delay,0.001))
    }

    on_player_connect(_p:Player<S>){}
    on_player_disconnect(p:Player<S>){
        this.leave(p)
    }
    on_player_join(_p:Player<S>){}
    on_player_spawn(_p:Player<S>,_h:SI_Human){}
    on_player_respawn(_p:Player<S>){}
    on_human_spawn(_h:SI_Human){}

    on_human_knocked(h:SI_Human,params:DamageParams){
        this.players.of(h)?.conn.on_human_knocked(params)
        this.emit_event(mode_events.human_knocked,h,params)
    }
    on_human_die(h:SI_Human,params:DamageParams){
        const p=this.players.of(h)
        const killer=params.owner&&params.owner.id!==h.id?this.players.of(params.owner.id):undefined
        if(killer&&killer.human&&!this.is_ally(h,killer.human)){
            this.add_status(killer,"kills",1)
            this.add_status(killer,"score",this.rules.score.kill)
        }
        if(p){
            this.add_status(p,"deaths",1)
            p.conn.on_human_die(params)
        }
        this.groups?.of(h)?.clear_knocked()
        this.teams?.of(h)?.clear_knocked()
        this.emit_event(mode_events.human_die,h,params)
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
        this.emit_event(mode_events.start)
    }
    on_start(){}
    finish(winners:Player<S>[]=[],delay:number=5){
        if(this.finished)return
        this.finished=true
        this.on_finish(winners)
        for(const p of this.players.list()){
            p.conn.on_game_finish(winners.includes(p))
        }
        this.emit_event(mode_events.finish,winners)
        this.timeout(()=>this.close(),delay)
    }
    on_finish(winners:Player<S>[]){
        for(const w of winners)this.add_status(w,"score",this.rules.score.win)
    }
    close(){
        if(this.closed)return
        this.closed=true
        this.emit_event(mode_events.closed)
    }

    tick(dt:number){
        if(this.started&&!this.finished){
            this.time+=dt
            for(const p of this.players.living())this.add_status(p,"time_alive",dt)
        }
        for(const p of this.players.list())p.conn.tick(dt)
        this.teams?.tick(dt)
        this.groups?.tick(dt)
        this.on_tick(dt)
        if(!this.started&&this.rules.auto_start&&this.can_start())this.start()
    }
    on_tick(_dt:number){}

    net_update(){
        for(const p of this.players.list())p.conn.net_update()
        this.teams?.net_update()
        this.groups?.net_update()
    }

    destroy(){
        this.destroyed=true
        this.players.clear()
        this.teams?.reset()
        this.groups?.reset()
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
        const membership=(m?:TeamsManager<any>)=>{
            stream.write_array(m?.teams??[],(t)=>{
                stream.write_uint16(t.id)
                stream.write_array(t.humans,(h:SI_Human)=>stream.write_id(h.id),2)
            },2)
        }
        membership(this.teams)
        membership(this.groups)
        this.on_encode_checkpoint(stream)
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
        const membership=(m?:TeamsManager<any>)=>{
            m?.reset()
            stream.read_array(()=>{
                const id=stream.read_uint16()
                let t=m?.get(id)
                if(m&&!t){
                    t=m.add_team()
                    t.id=id
                }
                stream.read_array(()=>{
                    const h=this.scene.objects.get_object(stream.read_id()) as SI_Human|undefined
                    if(h&&t)t.add_human(h)
                },2)
            },2)
        }
        membership(this.teams)
        membership(this.groups)
        this.on_decode_checkpoint(stream)
    }
    on_encode_checkpoint(_stream:Stream){}
    on_decode_checkpoint(_stream:Stream){}
}