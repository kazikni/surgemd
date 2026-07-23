import { type Game } from "../others/game.ts";
import { Client, Numeric, random, StaticStream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { Human } from "../objects/human.ts";
import { Player, PlayerConnManager } from "../objects/player.ts";
import { type JoinnedPacket } from "common/scripts/packets/joinned_packet.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";
import { type Group, type Team } from "./teams.ts";
import { LevelEnemys } from "common/scripts/config/level_definition.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { LootSetting } from "common/scripts/others/constants.ts";
import { MapDef } from "common/scripts/definitions/maps/base.ts";
import { FallBiome, NormalLobby, NormalMap } from "common/scripts/definitions/maps/normal.ts";
import { TundraMap } from "common/scripts/definitions/maps/tundra.ts";
import { WarMap } from "common/scripts/definitions/maps/war.ts";
import { DebugMap, SingleBuildMap } from "common/scripts/definitions/maps/debug.ts";
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
    }
    ambient:{
        day_night_cycle:number

        rain_lerp_speed:number
        rain_cycle:number
        thunderstorm_cycle:number
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
        kill_leader:number
        leader_multiplier:number

        bounce_kill:number
    }
    leader:{
        kills_min:number
    }
    loot_settings:LootSetting
}
export const Maps:Record<string,MapDef>={
    normal:NormalMap,
    normal_fall:{
        ...NormalMap,
        biome:FallBiome
    },

    lobby:NormalLobby,

    tundra:TundraMap,

    war:WarMap,

    debug:DebugMap,
    single_building:SingleBuildMap,
}
export abstract class ModeManager{
    game!:Game
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

            rain_lerp_speed:1,
            rain_cycle:1,
            thunderstorm_cycle:1,
            rain_stop_chance:0.3,
            rain_chance:0.03,
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
            kill_reward:100,

            kill_leader:200,
            leader_multiplier:1.2,
            bounce_kill:200
        },
        leader:{
            kills_min:3
        },
        loot_settings:{}
    }

    constructor(){}

    init(game:Game){
        this.game=game
        this.on_init()
    }
    tick(dt:number){
        if(this.game.started){
            this.update_day_and_night(dt)
            this.update_rain(dt)
        }
        this.on_tick(dt)
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

        const dt_scaled = dt * rules.rain_cycle
        amb.rain_timer -= dt_scaled
        if (amb.rain_timer <= 0) {
            if (amb.rain === 0 && amb.target_rain === 0) {
                if (Math.random() < rules.rain_chance) {
                    amb.target_rain = random.float(0.1, 1)
                    amb.rain_state = 1
                }
                amb.rain_timer = random.float(10, 30)
            }else if (amb.rain_state === 2) {
                if (Math.random() < rules.rain_stop_chance) {
                    amb.target_rain = 0
                } else {
                    amb.target_rain = random.float(0.1, 1)
                }

                amb.rain_state = 1
                amb.rain_timer = random.float(5, 15)
            }
        }

        const dist = Math.abs(amb.target_rain - amb.rain)

        if (dist > 0.01) {
            amb.rain = Numeric.lerp(
                amb.rain,
                amb.target_rain,
                Numeric.dt_expo_inter(rules.rain_lerp_speed*0.1, dt)
            )
        } else {
            amb.rain = amb.target_rain
            if (amb.rain_state === 1) {
                amb.rain_state = 2
                amb.rain_timer = random.float(20, 60)
            }
        }
    }

    on_init(){}
    on_tick(dt:number){}
    on_net_update(){}
    on_start():void{}
    on_finish(winners:Human[]):void{}

    abstract can_join():boolean
    abstract can_start():boolean
    abstract can_down(human:Human):boolean
    abstract is_ally(a:Human,b:Human):boolean

    abstract is_leader(p:Human):boolean
    abstract get_leader():Human|undefined
    abstract can_be_leader(p:Human):boolean
    abstract assign_leader(p:Human):boolean
    abstract leader_die(p:Human):void

    on_player_connect(p:PlayerConnManager):void{}
    on_player_join(p:Player):void{}
    on_player_die(p:Player):void{}
    proccess_group_token(client:Client,token:string):void{}
    reset():void{}

    on_human_create(human:Human):void{}
    on_human_die(human:Human):void{}

    get_group(group:number):Group|undefined{
        return undefined
    }
    get_team(team:number):Team|undefined{
        return undefined
    }
    set_group_for_human(h:Human):void{

    }

    get_living_count():number[]{
        return [this.game.players.living_players.length]
    }
    get_human_spawn_position(human:Human):Vec2|undefined{
        return v2.zero()
    }

    manage_joinned_packet(jp:JoinnedPacket){

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
                const stream=new StaticStream((await this.game.fs.read_fileb(map)).buffer as ArrayBuffer)
                const magic=stream.read_string_sized(4)
                if(magic!==".MAP"){
                    return undefined
                }
                const version=stream.read_uint16()
                const result=stream.read_any(2,2)
                return result
            }
        }else{
            return map
        }
    }
}