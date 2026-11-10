import { gel_events, GELComponent } from "../../../engine/core.ts";
import { DamageReason } from "../../definitions/utils.ts";
import { type DeadzoneConfig, DefaultDeadzone } from "../gelo/deadzone.ts";
import { mode_events, si_mode, type SI_Mode } from "../gelo/mode.ts";
import { type SI_Human } from "../objects/moving_body/human.ts";
import { BotPlayerConn, type PlayerConn } from "../players/player_conn.ts";

/**
 * Configuracao do Battle Royale (mesmo formato do config.jsonc: play_options[].content[].settings)
 */
export interface BattleRoyaleSettings{
    players?:{
        limit?:number
    }
    /** Segundos depois do start em que ainda da para entrar */
    join_time?:number
    /** Players minimos para comecar (padrao 2) */
    min_players?:number
    /** Tamanho do grupo (duo, squad...). 1 = solo */
    group_size?:number
    /** Quantos bots adicionar quando o primeiro player entrar */
    bots?:number
    deadzone?:DeadzoneConfig
}

export type SI_BattleRoyale=SI_Mode&{
    br:{
        group_size:number
        bots:number
        bots_added:boolean
        deadzone:DeadzoneConfig
    }
    /** Contador para distribuir grupos automaticamente */
    _group_counter:number

    configure_battle_royale(settings:BattleRoyaleSettings):void
    add_bots(count:number):PlayerConn[]
    get_living_sides():Map<number,SI_Human[]>
}

/**
 * Modo Battle Royale: o ultimo player/bot (ou grupo) em pe ganha.
 * NPCs nao contam para a vitoria (isso e responsabilidade do ModeManager, via ModeHumanData.is_player).
 */
export const si_battle_royale:GELComponent<SI_BattleRoyale>={
    id_string:"si_battle_royale",
    extensions:[si_mode],
    events:{
        [gel_events.bind]:function(){
            this.br={
                group_size:1,
                bots:0,
                bots_added:false,
                deadzone:DefaultDeadzone,
            }
            this._group_counter=0
            this.configure({
                join_time:90,
                min_players:2,
                knock_enabled:false,
            })
        },
        [gel_events.tick]:function(_dt:number){
            if(!this.started||this.finished)return
            const dz=this.scene.deadzone
            if(!dz||!dz.do_damage)return
            for(const d of this.humans_data.values()){
                if(this.finished)break
                const h=d.human
                if(h.dead||h.destroyed)continue
                const dmg=dz.damage_at(h.position)
                if(dmg>0)h.piercing_damage({amount:dmg,reason:DamageReason.Deadzone})
            }
        },
        [mode_events.start]:function(){
            const dz=this.scene.deadzone
            if(dz){
                dz.config=this.br.deadzone
                if(this.br.deadzone.stages)dz.stages=this.br.deadzone.stages
                dz.start()
            }
            this.check_win()
        },
        [mode_events.player_join]:function(conn:PlayerConn,human:SI_Human){
            if(this.br.group_size>1){
                const d=this.get_human_data(human)
                if(d&&d.group===0){
                    d.group=Math.floor(this._group_counter/this.br.group_size)+1
                    this._group_counter++
                }
            }
            if(!conn.is_bot&&!this.br.bots_added&&this.br.bots>0){
                this.br.bots_added=true
                this.add_bots(this.br.bots)
            }
        },
    },
    methods:{
        configure_battle_royale(settings:BattleRoyaleSettings){
            this.configure({
                players_limit:settings.players?.limit??this.settings.players_limit,
                join_time:settings.join_time??this.settings.join_time,
                min_players:settings.min_players??this.settings.min_players,
            })
            if(settings.group_size!==undefined)this.br.group_size=settings.group_size
            if(settings.bots!==undefined)this.br.bots=settings.bots
            if(settings.deadzone!==undefined)this.br.deadzone={...DefaultDeadzone,...settings.deadzone}
        },
        add_bots(count:number):PlayerConn[]{
            const ret:PlayerConn[]=[]
            for(let i=0;i<count;i++){
                const bot=new BotPlayerConn()
                this.connect(bot)
                this.add_player(bot,{name:`Bot#${i+1}`})
                ret.push(bot)
            }
            return ret
        },
        get_living_sides():Map<number,SI_Human[]>{
            const sides=new Map<number,SI_Human[]>()
            for(const h of this.get_living_players()){
                const d=this.get_human_data(h)!
                // Lados negativos = solo (cada humano e o proprio lado)
                const side=d.team!==0?d.team:(d.group!==0?100000+d.group:-h.id)
                if(!sides.has(side))sides.set(side,[])
                sides.get(side)!.push(h)
            }
            return sides
        },
        check_win(){
            if(!this.started||this.finished)return
            const sides=this.get_living_sides()
            if(sides.size<=1){
                const winners=sides.size===1?[...sides.values()][0]:[]
                this.finish(winners)
            }
        },
    }
}
