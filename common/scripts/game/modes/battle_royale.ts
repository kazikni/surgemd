import { Stream, v2, Vec2 } from "../../../engine/core.ts";
import { MapDef } from "../../definitions/maps/base.ts";
import { get_map_def } from "../../definitions/maps/maps.ts";
import { DamageReason } from "../../definitions/utils.ts";
import { type DamageParams, gelo_instance_type } from "../../others/constants.ts";
import { type DeadzoneConfig, DefaultDeadzone, type SI_Deadzone } from "../gelo/deadzone.ts";
import { SI_GameMap } from "../gelo/map.ts";
import { type SI_Human } from "../objects/moving_body/human.ts";
import { BotPlayerConn } from "../players/player_conn.ts";
import { DefaultPlayerStatus, ModeManager, SpawnHumanOptions, type Player, type PlayerStatus } from "./mode_manager.ts";
import { Group, GroupsManager, Team, TeamsManager } from "./teams.ts";

export interface BattleRoyaleSettings{
    join_time?:number
    min_players?:number
    teams?:number
    group_size?:number
    group_spawn?:boolean
    bots?:number
    deadzone?:DeadzoneConfig|false
    players?:{
        limit?:number
    }
    map?:{
        def?:MapDef|string
        seed?:number
    }
}
export interface BattleRoyaleStatus extends PlayerStatus{
    rank:number
}

export class BattleRoyale extends ModeManager<BattleRoyaleStatus,BattleRoyaleSettings>{
    deadzone?:SI_Deadzone
    bots_added:boolean=false

    teams?:TeamsManager
    groups?:GroupsManager

    create_status():BattleRoyaleStatus{
        return {...DefaultPlayerStatus(),rank:0}
    }

    override on_init(){
        this.settings.players??={}
        this.settings.players.limit??=100
        const teams=this.settings.teams??0
        if(teams>1){
            this.teams=new TeamsManager()
            for(let i=0;i<teams;i++)this.teams.add_team()
        }
        const group_size=this.settings.group_size??1
        if(group_size>1)this.groups=new GroupsManager(group_size)
    }
    override on_initialized(){
        const config=this.settings.deadzone
        if(config===false)return
        this.deadzone=this.scene.make_gelo(gelo_instance_type.deadzone) as SI_Deadzone
        this.scene.deadzone=this.deadzone
        this.deadzone.config={...DefaultDeadzone,...config}
        if(this.deadzone.config.stages)this.deadzone.stages=this.deadzone.config.stages
        this.scene.gelo.registry(this.deadzone,"deadzone")
    }

    override can_join():boolean{
        if(!super.can_join())return false
        const limit=this.settings.players?.limit
        return limit===undefined||this.players.living().length<limit
    }
    override can_start():boolean{
        const min=this.settings.min_players??2
        if(this.players.living().length<min)return false
        return min<=1||this.get_living_sides().size>1
    }
    override on_player_disconnect(p:Player<BattleRoyaleStatus>){
        if(!this.started)super.on_player_disconnect(p)
        else p.human?.clear_input()
    }
    override on_player_join(p:Player<BattleRoyaleStatus>){
        if(p.human)this.put_on_side(p.human)
        if(!p.is_bot&&!this.bots_added&&(this.settings.bots??0)>0){
            this.bots_added=true
            this.add_bots(this.settings.bots!)
        }
        if(!this.can_join())this.close()
    }
    override on_start(){
        this.deadzone?.start()
        this.app.clock.add_timeout(()=>{
            if(!this.destroyed)this.close()
        },this.settings.join_time??90)
    }
    override on_tick(dt:number){
        this.teams?.tick(dt)
        this.groups?.tick(dt)
        if(!this.started||this.finished||!this.deadzone?.do_damage)return
        for(const p of this.players.living()){
            if(this.finished)break
            const h=p.human!
            const dmg=this.deadzone.damage_at(h.position)
            if(dmg>0)h.piercing_damage({amount:dmg,reason:DamageReason.Deadzone})
        }
    }
    override net_update(){
        super.net_update()
        this.teams?.net_update()
        this.groups?.net_update()
    }
    override destroy(){
        super.destroy()
        this.teams?.reset()
        this.groups?.reset()
    }
    override encode_checkpoint(stream:Stream){
        super.encode_checkpoint(stream)
        const membership=(m?:TeamsManager<any>)=>{
            stream.write_array(m?.teams??[],(t:Team)=>{
                stream.write_uint16(t.id)
                stream.write_uint16((t as Group).team??0)
                stream.write_array(t.humans,(h:SI_Human)=>stream.write_id(h.id),2)
            },2)
        }
        membership(this.teams)
        membership(this.groups)
    }
    override decode_checkpoint(stream:Stream){
        super.decode_checkpoint(stream)
        const membership=(m?:TeamsManager<any>)=>{
            m?.reset()
            stream.read_array(()=>{
                const id=stream.read_uint16()
                const team=stream.read_uint16()
                let t=m?.get(id)
                if(m&&!t){
                    t=m.add_team()
                    t.id=id
                }
                if(t instanceof Group)t.team=team
                stream.read_array(()=>{
                    const h=this.scene.objects.get_object(stream.read_id()) as SI_Human|undefined
                    if(h&&t)t.add_human(h)
                },2)
            },2)
        }
        membership(this.teams)
        membership(this.groups)
    }
    override on_human_die(h:SI_Human,params:DamageParams){
        const p=this.players.of(h)
        if(p)p.status.rank=this.players.living().length+1
        super.on_human_die(h,params)
        this.groups?.of(h)?.clear_knocked()
        this.teams?.of(h)?.clear_knocked()
    }
    override on_finish(winners:Player<BattleRoyaleStatus>[]){
        for(const w of winners)w.status.rank=1
        super.on_finish(winners)
    }
    override check_finish(){
        if(!this.started||this.finished)return
        const sides=this.get_living_sides()
        if(sides.size<=1){
            this.finish(sides.size===1?[...sides.values()][0]:[])
        }
    }
    override get_spawn_position(h:SI_Human):Vec2|undefined{
        const g=this.groups?.of(h)
        if(g&&(this.settings.group_spawn??true)){
            const ally=g.choose_human(h)
            if(ally)return ally.position
        }
        if(this.started&&this.deadzone&&this.deadzone.stage_index>2){
            const dz=this.deadzone
            return this.scene.map.get_random_position(h.collider,h.id,h.layer,this.spawn_mode,(_c,map)=>v2.add(map.random.random_in_circle(dz.radius*0.8),dz.position))
        }
        return super.get_spawn_position(h)
    }

    override can_knock(h:SI_Human):boolean{
        if(this.rules.humans.knock_enabled)return true
        if(this.groups?.of(h)?.can_knock(h))return true
        if(this.teams?.of(h)?.can_knock(h))return true
        return false
    }
    override is_ally(a:SI_Human,b:SI_Human):boolean{
        const ga=this.groups?.of(a)
        if(ga&&ga===this.groups?.of(b))return true
        const ta=this.teams?.of(a)
        if(ta&&ta===this.teams?.of(b))return true
        return false
    }

    override leave(p: Player<BattleRoyaleStatus>): void {
        const h=p.human
        if(h){
            this.teams?.of(h)?.remove_human(h)
            this.groups?.of(h)?.remove_human(h)
        }
        super.leave(p)
    }
    override spawn_human(options?: SpawnHumanOptions): SI_Human {
        const h=super.spawn_human(options)
        if(options?.team!==undefined)this.teams?.get(options.team)?.add_human(h)
        return h
    }

    put_on_side(h:SI_Human,team?:Team){
        if(this.teams){
            team??=this.teams.of(h)??this.teams.smallest()
            team?.add_human(h)
        }
        this.groups?.put(h,team?.id??0)
    }
    get_side(h:SI_Human):object|undefined{
        return this.teams?.of(h)??this.groups?.of(h)
    }
    get_living_sides():Map<object,Player<BattleRoyaleStatus>[]>{
        const sides=new Map<object,Player<BattleRoyaleStatus>[]>()
        for(const p of this.players.living()){
            const side:object=this.get_side(p.human!)??p
            if(!sides.has(side))sides.set(side,[])
            sides.get(side)!.push(p)
        }
        return sides
    }
    add_bots(count:number){
        for(let i=0;i<count;i++){
            this.join(new BotPlayerConn(),{name:`Bot#${i+1}`})
        }
    }

    override async generate_map():Promise<void>{
        const map=this.scene.make_gelo(gelo_instance_type.map) as SI_GameMap
        this.scene.map=map
        this.scene.gelo.registry(map,"map")
        map.generate(get_map_def(this.settings.map?.def),this.settings.map?.seed)
    }
}
