import { v2, Vec2 } from "../../../engine/core.ts";
import { DamageReason } from "../../definitions/utils.ts";
import { type DamageParams, gelo_instance_type } from "../../others/constants.ts";
import { type DeadzoneConfig, DefaultDeadzone, type SI_Deadzone } from "../gelo/deadzone.ts";
import { type SI_Human } from "../objects/moving_body/human.ts";
import { BotPlayerConn } from "../players/player_conn.ts";
import { DefaultPlayerStatus, ModeManager, type ModeSettings, type Player, type PlayerStatus } from "./mode_manager.ts";
import { GroupsManager } from "./teams.ts";

export interface BattleRoyaleSettings extends ModeSettings{
    join_time?:number
    min_players?:number
    group_size?:number
    group_spawn?:boolean
    bots?:number
    deadzone?:DeadzoneConfig
}
export interface BattleRoyaleStatus extends PlayerStatus{
    rank:number
}

export class BattleRoyale extends ModeManager<BattleRoyaleStatus,BattleRoyaleSettings>{
    deadzone!:SI_Deadzone
    bots_added:boolean=false

    create_status():BattleRoyaleStatus{
        return {...DefaultPlayerStatus(),rank:0}
    }

    override on_init(){
        this.settings.players??={}
        this.settings.players.limit??=100
        const group_size=this.settings.group_size??1
        if(group_size>1)this.groups=new GroupsManager(group_size)
    }
    override on_initialized(){
        this.deadzone=this.scene.make_gelo(gelo_instance_type.deadzone) as SI_Deadzone
        this.scene.deadzone=this.deadzone
        this.deadzone.config={...DefaultDeadzone,...this.settings.deadzone}
        this.scene.gelo.registry(this.deadzone,"deadzone")
    }

    override is_open():boolean{
        return super.is_open()&&(!this.started||this.time<(this.settings.join_time??90))
    }
    override can_start():boolean{
        if(this.groups)return this.groups.get_living().length>1
        return this.players.living().length>=(this.settings.min_players??2)
    }
    override on_player_disconnect(p:Player<BattleRoyaleStatus>){
        if(!this.started)super.on_player_disconnect(p)
        else p.human?.clear_input()
    }
    override on_player_join(p:Player<BattleRoyaleStatus>){
        if(p.human)this.groups?.put(p.human)
        if(!p.is_bot&&!this.bots_added&&(this.settings.bots??0)>0){
            this.bots_added=true
            this.add_bots(this.settings.bots!)
        }
    }
    override on_start(){
        this.deadzone.start()
        this.check_finish()
    }
    override on_tick(_dt:number){
        if(!this.started||this.finished||!this.deadzone.do_damage)return
        for(const p of this.players.living()){
            if(this.finished)break
            const h=p.human!
            const dmg=this.deadzone.damage_at(h.position)
            if(dmg>0)h.piercing_damage({amount:dmg,reason:DamageReason.Deadzone})
        }
    }
    override on_human_die(h:SI_Human,params:DamageParams){
        const p=this.players.of(h)
        if(p)p.status.rank=this.players.living().length+1
        super.on_human_die(h,params)
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
        if(this.started&&this.deadzone.stage_index>2){
            const dz=this.deadzone
            return this.scene.map.get_random_position(h.collider,h.id,h.layer,this.spawn_mode,(_c,map)=>v2.add(map.random.random_in_circle(dz.radius*0.8),dz.position))
        }
        return super.get_spawn_position(h)
    }

    get_living_sides():Map<object,Player<BattleRoyaleStatus>[]>{
        const sides=new Map<object,Player<BattleRoyaleStatus>[]>()
        for(const p of this.players.living()){
            const side:object=this.groups?.of(p.human!)??p
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
}