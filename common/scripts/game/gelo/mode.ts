import { gel_events, GELComponent, LootTableGetItemCallback, LootTablesManager, Stream, Vec2 } from "../../../engine/core.ts";
import { LoadoutPreset } from "../../definitions/utils.ts";
import { type JoinData } from "../../net/join_packet.ts";
import { type DamageParams, GameConstants, gelo_instance_type, Layers, object_instance_type, Spawn, SpawnMode, type LootAditional, type LootData, type LootSetting, type LootTable } from "../../others/constants.ts";
import { loot_table_get_item } from "../../others/functions.ts";
import { SimulatedGELO } from "../base.ts";
import { type SI_Human } from "../objects/moving_body/human.ts";
import { type PlayerConn } from "../players/player_conn.ts";

export interface GameRules{
    loot_settings:LootSetting
}
export type C_Mode=SimulatedGELO&{
    rules:GameRules
    loot_tables:LootTablesManager<LootData,LootAditional,LootSetting>
    get_loot(table:LootTable,settings?:LootAditional):LootData[]
}

export const c_mode:GELComponent<C_Mode>={
    id_string:"c_mode",
    events:{
        [gel_events.bind]:function(){
            this.loot_tables=new LootTablesManager(loot_table_get_item as LootTableGetItemCallback<LootData,LootAditional,LootSetting>)
        },
        [gel_events.registry]:function(){
            this.rules={
                loot_settings:{
                    definitions:this.app.definitions,
                    hold_ammo:true
                }
            }
        }
    },
    methods:{
        get_loot(table:LootTable,settings?:LootAditional):LootData[]{
            return this.loot_tables.get_loot(table,{definitions:this.app.definitions,...(settings??this.rules.loot_settings)})
        }
    }
}

// ============================================================================
// Basic Mode Manager (simulacao)
// ============================================================================

export const mode_events={
    /** (conn:PlayerConn) */
    player_connect:gel_events.last+1,
    /** (conn:PlayerConn) */
    player_disconnect:gel_events.last+2,
    /** (conn:PlayerConn,human:SI_Human) */
    player_join:gel_events.last+3,
    /** (human:SI_Human,data:ModeHumanData) */
    human_spawn:gel_events.last+4,
    /** (human:SI_Human,params:DamageParams) */
    human_knocked:gel_events.last+5,
    /** (human:SI_Human,params:DamageParams) */
    human_die:gel_events.last+6,
    /** () */
    start:gel_events.last+7,
    /** (winners:SI_Human[]) */
    finish:gel_events.last+8,
    /** () depois do finish_delay, o jogo pode ser fechado */
    closed:gel_events.last+9,
    last:gel_events.last+10,
}

/**
 * Dados que so o ModeManager conhece sobre cada humano.
 * O humano em si nao sabe se e player, bot ou npc, nem de qual time ele e.
 * Isso deixa todos os humanos iguais (e o checkpoint do humano simples).
 */
export interface ModeHumanData{
    human:SI_Human
    conn?:PlayerConn

    /** Players e bots contam para condicao de vitoria. NPCs nao. */
    is_player:boolean
    team:number // 0 = sem time
    group:number // 0 = sem grupo

    lives:number
    money:number
    kills:number
}

export interface BasicModeSettings{
    players_limit:number
    /** Quantidade minima de players para o jogo comecar sozinho */
    min_players:number
    auto_start:boolean
    /** Tempo (segundos depois do start) em que ainda da para entrar. -1 = sempre */
    join_time:number
    spawn_mode:SpawnMode
    spawn_layer:number
    /** true = todos os humanos podem ser nocauteados, false = so quem tem grupo com aliados vivos */
    knock_enabled:boolean
    /** Segundos entre o finish e o evento closed */
    finish_delay:number
}
export const DefaultBasicModeSettings:BasicModeSettings={
    players_limit:100,
    min_players:2,
    auto_start:true,
    join_time:-1,
    spawn_mode:Spawn.grass,
    spawn_layer:Layers.Normal,
    knock_enabled:false,
    finish_delay:5,
}

/** Visual padrao de quem entra sem loadout (bots, npcs...) */
export const DefaultHumanLoadout:LoadoutPreset={
    body:"body_1",
    body_tint:0xf0a93f,
    hair:"hair_1",
    hair_tint:0x222222,
    eyes:"eyes_1",
    shirt:"black_shirt",
    legs:"blue_jeans_pants",
    foot:"black_shoes",
}

export interface ModeTimer{
    time:number
    callback:()=>void
}
export interface SpawnHumanOptions{
    position?:Vec2
    layer?:number
    name?:string
    loadout?:LoadoutPreset
    is_player?:boolean
    team?:number
    group?:number
}

export type SI_Mode=C_Mode&{
    settings:BasicModeSettings

    conns:Map<number,PlayerConn>
    humans_data:Map<number,ModeHumanData>

    started:boolean
    finished:boolean
    closed:boolean
    /** Segundos desde o start */
    time:number
    timers:ModeTimer[]

    configure(settings:Partial<BasicModeSettings>):void
    add_timer(delay:number,callback:()=>void):ModeTimer
    clear_timers():void

    // Consultas
    can_join():boolean
    can_start():boolean
    get_human_data(human:SI_Human|number):ModeHumanData|undefined
    get_living_players():SI_Human[]
    get_living_count():number
    is_ally(a:SI_Human,b:SI_Human):boolean
    can_knock(human:SI_Human):boolean
    get_spawn_position(human:SI_Human):Vec2|undefined

    // Players e humanos
    connect(conn:PlayerConn):void
    disconnect(conn:PlayerConn):void
    spawn_human(options?:SpawnHumanOptions):SI_Human
    add_player(conn:PlayerConn,join:JoinData):SI_Human|undefined
    remove_human(human:SI_Human):void

    // Eventos vindos dos humanos
    on_human_knocked(human:SI_Human,params:DamageParams):void
    on_human_die(human:SI_Human,params:DamageParams):void

    // Fluxo do jogo
    start(force?:boolean):void
    close():void
    finish(winners?:SI_Human[]):void
    check_win():void

    /** Chamado no net tick (servidor/worker) */
    net_update_conns():void

    // Checkpoint dos dados do modo (time, vidas, dinheiro...). Os humanos sao salvos pelo ObjectManager.
    encode_mode_checkpoint(stream:Stream):void
    decode_mode_checkpoint(stream:Stream):void
}

export const si_mode:GELComponent<SI_Mode>={
    id_string:"si_mode",
    extensions:[c_mode],
    events:{
        [gel_events.bind]:function(){
            this.instance_type=gelo_instance_type.mode
            this.settings={...DefaultBasicModeSettings}
            this.conns=new Map()
            this.humans_data=new Map()
            this.started=false
            this.finished=false
            this.closed=false
            this.time=0
            this.timers=[]
        },
        [gel_events.tick]:function(dt:number){
            for(let i=0;i<this.timers.length;i++){
                const t=this.timers[i]
                t.time-=dt
                if(t.time<=0){
                    this.timers.splice(i,1)
                    i--
                    t.callback()
                }
            }
            if(this.started&&!this.finished)this.time+=dt

            for(const c of this.conns.values()){
                c.tick(dt)
            }

            if(!this.started&&this.settings.auto_start&&this.can_start()){
                this.start()
            }
        },
    },
    methods:{
        configure(settings:Partial<BasicModeSettings>){
            Object.assign(this.settings,settings)
        },
        add_timer(delay:number,callback:()=>void):ModeTimer{
            const t={time:delay,callback}
            this.timers.push(t)
            return t
        },
        clear_timers(){
            this.timers.length=0
        },

        can_join():boolean{
            if(this.closed||this.finished)return false
            if(this.started&&this.settings.join_time>=0&&this.time>this.settings.join_time)return false
            return this.get_living_count()<this.settings.players_limit
        },
        can_start():boolean{
            return !this.finished&&this.get_living_count()>=this.settings.min_players
        },
        get_human_data(human:SI_Human|number):ModeHumanData|undefined{
            return this.humans_data.get(typeof human==="number"?human:human.id)
        },
        get_living_players():SI_Human[]{
            const ret:SI_Human[]=[]
            for(const d of this.humans_data.values()){
                if(d.is_player&&!d.human.dead&&!d.human.destroyed)ret.push(d.human)
            }
            return ret
        },
        get_living_count():number{
            return this.get_living_players().length
        },
        is_ally(a:SI_Human,b:SI_Human):boolean{
            if(a.id===b.id)return true
            const da=this.get_human_data(a)
            const db=this.get_human_data(b)
            if(!da||!db)return false
            if(da.team!==0&&da.team===db.team)return true
            if(da.group!==0&&da.group===db.group)return true
            return false
        },
        can_knock(human:SI_Human):boolean{
            if(this.settings.knock_enabled)return true
            const d=this.get_human_data(human)
            if(!d||d.group===0)return false
            for(const o of this.humans_data.values()){
                if(o.human.id!==human.id&&o.group===d.group&&!o.human.dead&&!o.human.knocked)return true
            }
            return false
        },
        get_spawn_position(human:SI_Human):Vec2|undefined{
            return this.scene.map.get_random_position(human.collider,human.id,human.layer,this.settings.spawn_mode)
        },

        connect(conn:PlayerConn){
            conn.mode=this
            this.conns.set(conn.id,conn)
            this.emit_event(mode_events.player_connect,conn)
        },
        disconnect(conn:PlayerConn){
            if(!this.conns.has(conn.id))return
            this.conns.delete(conn.id)
            const h=conn.human
            if(h&&!h.dead){
                if(!this.started){
                    // Ainda no lobby: tira o humano do jogo
                    this.remove_human(h)
                }else{
                    // Jogo rolando: o humano fica parado no mapa
                    h.clear_input()
                    const d=this.get_human_data(h)
                    if(d)d.conn=undefined
                }
            }
            this.emit_event(mode_events.player_disconnect,conn)
            this.check_win()
        },
        spawn_human(options:SpawnHumanOptions={}):SI_Human{
            const layer=options.layer??this.settings.spawn_layer
            const human=this.scene.add_object(this.scene.make_object(object_instance_type.human),layer,undefined,{
                position:options.position,
                name:options.name,
                loadout:options.loadout??DefaultHumanLoadout,
            }) as SI_Human
            const data:ModeHumanData={
                human,
                is_player:options.is_player??false,
                team:options.team??0,
                group:options.group??0,
                lives:1,
                money:0,
                kills:0,
            }
            this.humans_data.set(human.id,data)
            if(!options.position){
                const pos=this.get_spawn_position(human)
                if(pos)human.position=pos
            }
            this.emit_event(mode_events.human_spawn,human,data)
            return human
        },
        add_player(conn:PlayerConn,join:JoinData):SI_Human|undefined{
            if(!this.can_join())return undefined
            if(!this.conns.has(conn.id))this.connect(conn)
            conn.join=join

            const name=join.name.length>0?join.name:`${GameConstants.player.defaultName}#${this.get_living_count()+1}`
            const human=this.spawn_human({
                name,
                loadout:join.loadout,
                is_player:true,
            })
            const data=this.get_human_data(human)!
            data.conn=conn
            conn.set_human(human)

            this.emit_event(mode_events.player_join,conn,human)
            return human
        },
        remove_human(human:SI_Human){
            this.humans_data.delete(human.id)
            human.destroy()
        },

        on_human_knocked(human:SI_Human,params:DamageParams){
            const d=this.get_human_data(human)
            d?.conn?.on_human_knocked(params)
            this.emit_event(mode_events.human_knocked,human,params)
        },
        on_human_die(human:SI_Human,params:DamageParams){
            const d=this.get_human_data(human)
            if(params.owner&&params.owner.id!==human.id){
                const od=this.get_human_data(params.owner.id)
                if(od)od.kills++
            }
            d?.conn?.on_human_die(params)
            this.emit_event(mode_events.human_die,human,params)
            this.check_win()
        },

        start(force:boolean=false){
            if(this.started)return
            if(!force&&!this.can_start())return
            this.started=true
            this.time=0
            for(const c of this.conns.values())c.on_game_start()
            this.emit_event(mode_events.start)
        },
        close(){
            this.closed=true
        },
        finish(winners:SI_Human[]=[]){
            if(this.finished)return
            this.finished=true
            const win_ids=new Set(winners.map((h)=>h.id))
            for(const c of this.conns.values()){
                c.on_game_finish(c.human!==undefined&&win_ids.has(c.human.id))
            }
            this.emit_event(mode_events.finish,winners)
            this.add_timer(this.settings.finish_delay,()=>{
                this.closed=true
                this.emit_event(mode_events.closed)
            })
        },
        check_win(){
            // O modo basico nao tem condicao de vitoria. Os modos (ex: battle royale) sobrescrevem.
        },

        net_update_conns(){
            for(const c of this.conns.values()){
                c.net_update()
            }
        },

        encode_mode_checkpoint(stream:Stream){
            stream.write_boolean_group(this.started,this.finished,this.closed)
            stream.write_float32(this.time)
            const list=[...this.humans_data.values()].filter((d)=>!d.human.destroyed)
            stream.write_array(list,(d)=>{
                stream.write_id(d.human.id)
                stream.write_boolean_group(d.is_player,d.conn!==undefined)
                if(d.conn)stream.write_id(d.conn.id)
                stream.write_uint16(d.team)
                stream.write_uint16(d.group)
                stream.write_int16(d.lives)
                stream.write_float32(d.money)
                stream.write_uint16(d.kills)
            },3)
        },
        decode_mode_checkpoint(stream:Stream){
            const [started,finished,closed]=stream.read_boolean_group()
            this.started=started
            this.finished=finished
            this.closed=closed
            this.time=stream.read_float32()
            this.humans_data.clear()
            stream.read_array(()=>{
                const id=stream.read_id()
                const [is_player,has_conn]=stream.read_boolean_group()
                const conn_id=has_conn?stream.read_id():undefined
                const team=stream.read_uint16()
                const group=stream.read_uint16()
                const lives=stream.read_int16()
                const money=stream.read_float32()
                const kills=stream.read_uint16()
                const human=this.scene.objects.get_object(id) as SI_Human|undefined
                if(!human)return
                const conn=conn_id!==undefined?this.conns.get(conn_id):undefined
                if(conn)conn.set_human(human)
                this.humans_data.set(id,{human,conn,is_player,team,group,lives,money,kills})
            },3)
        },
    }
}
