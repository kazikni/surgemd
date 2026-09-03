import { type Game } from "../others/game.ts";
import { Client, GameComponent, Numeric, random, StaticStream, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { Human } from "../objects/human.ts";
import { Player, PlayerConnManager } from "../objects/player.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";
import { type Group, type Team } from "./teams.ts";
import { LevelEnemys } from "common/scripts/config/level_definition.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { GameObjectType, LootSetting, ScoreApplyerType } from "common/scripts/others/constants.ts";
import { MapDef } from "common/scripts/definitions/maps/base.ts";
import { FallBiome, NormalLobby, NormalMap } from "common/scripts/definitions/maps/normal.ts";
import { TundraMap } from "common/scripts/definitions/maps/tundra.ts";
import { WarMap } from "common/scripts/definitions/maps/war.ts";
import { DebugMap, SingleBuildMap } from "common/scripts/definitions/maps/debug.ts";
import { TutorialMap } from "common/scripts/definitions/maps/tutorial.ts";
import { GeneralUpdatePacket } from "common/scripts/packets/general_update.ts";
import { human_die_event } from "../others/utils.ts";
import { Bullet } from "../objects/bullet.ts";
export interface GameRules{
    humans:{
        boosts:{
            mana:{
                regen:number
            }
            addiction:{
                decay:number
                damage:number
                abstinence:number
                speed:number
            }
        },
        keep_inventory:boolean
        help_up:{
            time:number
            distance:number
        }
        group_colors:number[]
        no_quickswitch:boolean
        reload_while_shoot:boolean
    }
    ambient:{
        day_night_cycle:number

        thunderstorm_chance:number
        thunderstorm_stop_chance:number

        rain_lerp_speed:number
        rain_cycle:number
        rain_chance:number
        rain_stop_chance:number
    }
    deadzone:{
        enabled:boolean
        speed:number
    }
    score:{
        win_reward:number
        kill_reward:number
        damage_reward:number
        rank_reward:number
        damage_taken_penalty:number

        //Special
        leader_kill:number
        bounce_kill:number
        
        leader_multiplier:number
    }
    leader:{
        enabled:boolean
        kills_min:number
        search:boolean
    }
    feed:{
        enabled:boolean
    }
    loot_settings:LootSetting
}
export const Maps:Record<string,MapDef>={
    normal:NormalMap,
    normal_fall:{
        ...NormalMap,
        biome:FallBiome
    },
    tutorial:TutorialMap,

    lobby:NormalLobby,

    tundra:TundraMap,

    war:WarMap,

    debug:DebugMap,
    single_building:SingleBuildMap,
}
export abstract class ModeManager extends GameComponent{
    declare game:Game
    rules:GameRules={
        humans:{
            boosts:{
                mana:{
                    regen:0.03
                },
                addiction:{
                    decay:0.15,
                    damage:0.7,
                    speed:0.25,
                    abstinence:0.009
                },
            },
            keep_inventory:false,
            no_quickswitch:false,
            reload_while_shoot:true,
            help_up:{
                time:7,
                distance:2
            },
            group_colors:[
                0x11aa55,
                0xd61cab,
                0x146aba,
                0xffcc00,
            ]
        },
        ambient:{
            day_night_cycle:1,

            thunderstorm_chance:0.25,
            thunderstorm_stop_chance:0.1,

            rain_cycle:1,
            rain_lerp_speed:1,
            rain_stop_chance:0.2,
            rain_chance:0.01,
        },
        deadzone:{
            enabled:true,
            speed:1
        },
        score:{
            win_reward:500,
            rank_reward:500,
            damage_reward:0.5,
            damage_taken_penalty:0.5,
            kill_reward:50,

            leader_kill:2,
            bounce_kill:2,

            leader_multiplier:1.2,
        },
        leader:{
            enabled:true,
            kills_min:3,
            search:true
        },
        feed:{
            enabled:true
        },
        loot_settings:{}
    }

    constructor(){
        super()
    }

    init(game:Game){
        this.game=game
    }
    update_day_and_night(dt:number){
        if(this.rules.ambient.day_night_cycle){
            this.game.ambient.date.second+=dt*this.rules.ambient.day_night_cycle
            if(this.game.ambient.date.second>=1){
                this.game.ambient.date.second=0
                this.game.ambient.date.minute++
                if(this.game.ambient.date.minute>=60){
                    this.game.ambient.date.hour+=1
                    this.game.ambient.date.second=0
                    this.game.ambient.date.minute=0
                }
            }
        }
    }
    update_rain(dt:number){
        const amb = this.game.ambient
        const rules = this.rules.ambient

        amb.rain_timer-=dt*rules.rain_cycle
        if (amb.rain_timer <= 0) {
            if (amb.rain===0&&amb.target_rain === 0) {
                if(Math.random()<rules.rain_chance) {
                    amb.target_rain = random.float(0.1, 1)
                    amb.rain_state=1
                    amb.thunder_storm=0
                    if(Math.random()<rules.thunderstorm_chance)amb.thunder_storm=random.float(0.1,1)
                }
                amb.rain_timer+=10
            }else if(amb.rain_state === 2) {
                if (Math.random()<rules.rain_stop_chance) {
                    amb.target_rain = 0
                } else {
                    amb.target_rain = random.float(0.1, 1)
                }

                amb.rain_state = 1
                amb.rain_timer = random.float(5, 15)
                if(this.game.ambient.thunder_storm===0){
                    if(Math.random()<rules.thunderstorm_chance)amb.thunder_storm=random.float(0.1,1)
                }else{
                    if(Math.random()<rules.thunderstorm_stop_chance)amb.thunder_storm=0
                }
            }
        }

        const dist = Math.abs(amb.target_rain-amb.rain)
        if (dist > 0.01) {
            amb.rain = Numeric.lerp(
                amb.rain,
                amb.target_rain,
                Numeric.dt_expo_inter(rules.rain_lerp_speed*0.1, dt*rules.rain_cycle)
            )
        } else {
            amb.rain = amb.target_rain
            if (amb.rain_state === 1&&amb.target_rain!==0) {
                amb.rain_state = 2
                amb.rain_timer = random.float(20, 60)
            }
        }
    }

    override on_tick(dt:number){
        if(this.game.started){
            this.update_day_and_night(dt)
            this.update_rain(dt)
        }
        this.on_tick(dt)
    }

    abstract can_join():boolean
    abstract can_start():boolean
    abstract can_down(human:Human):boolean
    abstract is_ally(a:Human,b:Human):boolean

    abstract is_leader(p:Human):boolean
    abstract get_leader():Human|undefined

    on_player_connect(p:PlayerConnManager):void{}
    on_player_join(p:Player):void{}
    proccess_group_token(client:Client,token:string):void{}

    on_human_create(human:Human):void{}
    on_human_die(e:human_die_event):void{}
    on_human_revive(human:Human):void{}

    get_group(group:number):Group|undefined{return undefined}
    get_team(team:number):Team|undefined{return undefined}
    create_group(id?:number,group?:Group):Group|undefined{return undefined}
    create_team(team?:Team):Team|undefined{return undefined}
    set_group_for_human(h:Human):void{}

    get_living_count():number[]{
        return [this.game.players.living_players.length]
    }
    get_human_spawn_position(human:Human):Vec2|undefined{
        return v2.zero()
    }

    manage_general_packet(g:GeneralUpdatePacket){
        g.content.feed_enabled=this.rules.feed.enabled
        g.content.leader_enabled=this.rules.leader.enabled
    }

    human_buy_item(human:Human,item:GameItem){}
    
    add_enemies(enemies?:LevelEnemys){
        if(!enemies) return
        for(const e of enemies){
            const count = e.count ?? 1
            for(let i = 0; i < count; i++){
                const bot = this.game.players.add_enemy(e.def,new JoinPacket())
                if(!bot) continue
                if(e.position){
                    v2m.set(bot.position, e.position.x, e.position.y)
                }else{
                    const pos = this.get_human_spawn_position(bot)
                    if(pos) bot.position = pos
                }
            }
        }
    }
    abstract generate_map():Promise<void>
    async load_map(map:string|MapDef):Promise<MapDef|undefined>{
        if(typeof map==="string"){
            if(Maps[map])return Maps[map]
            else{
                if(map.endsWith(".wasm")){
                    
                }else{
                    const stream=new StaticStream((await this.game.fs.read_fileb(map)).buffer as ArrayBuffer)
                    const magic=stream.read_string_sized(4)
                    if(magic!==".MAP"){
                        return undefined
                    }
                    const version=stream.read_uint16()
                    const result=stream.read_any(2,2)
                    return result
                }
            }
        }else{
            return map
        }
    }
    write_checkpoint(stream:Stream){
        stream.write_kdate(this.game.ambient.date)
        .write_float32(this.game.ambient.rain)
        .write_float32(this.game.ambient.target_rain)
        .write_uint8(this.game.ambient.rain_state)
        .write_float32(this.game.ambient.rain_timer)
    }
    decode_checkpoint(stream:Stream){
        this.game.ambient.date=stream.read_kdate()
        this.game.ambient.rain=stream.read_float32()
        this.game.ambient.target_rain=stream.read_float32()
        this.game.ambient.rain_state=stream.read_uint8()
        this.game.ambient.rain_timer=stream.read_float32()
    }
}