import { type Game } from "../others/game.ts";
import { Numeric, random, v2, Vec2 } from "common/engine/core.ts";
import { Human } from "../objects/human.ts";
import { Player } from "../objects/player.ts";
import { type JoinnedPacket } from "common/scripts/packets/joinned_packet.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";
import { type Group, type Team } from "./teams.ts";

export interface GameRules{
    humans:{
        boosts:{
            shield:{
                damage_multiplier:number
            }
            adrenaline:{
                decay:number
                speed:number
                regen:number
            }
            mana:{
                regen:number
            }
            addiction:{
                decay:number
                damage:number
                abstinence:number
                speed:number
            }
            green_bless:{
                regen:number
                speed:number
                damage_reduction:number
            }
            death:{
                life_time:number
                damage:number
                damage_reduction:number
                speed:number
            }
        },
        keep_inventory:boolean
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
}
export abstract class ModeManager{
    game!:Game
    kill_leader?:Player

    rules:GameRules={
        humans:{
            boosts:{
                shield:{
                    damage_multiplier:1.25
                },
                adrenaline:{
                    decay:0.25,
                    speed:0.1,
                    regen:0.01
                },
                mana:{
                    regen:0.03
                },
                addiction:{
                    decay:0.15,
                    damage:0.7,
                    speed:0.25,
                    abstinence:0.009
                },
                green_bless:{
                    regen:0.01,
                    speed:0.05,
                    damage_reduction:0.2,
                },
                death:{
                    life_time:160,
                    damage:0.5,
                    damage_reduction:0.5,
                    speed:0.5
                },
            },
            keep_inventory:false
        },
        ambient:{
            day_night_cycle:1,

            rain_lerp_speed:1,
            rain_cycle:1,
            thunderstorm_cycle:1,
            rain_stop_chance:0.2,
            rain_chance:0.005,
        },
        deadzone:{
            enabled:true,
            speed:1
        }
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
        const rain_speed=dt*this.rules.ambient.rain_cycle
        this.game.ambient.rain_timer-=dt*this.rules.ambient.rain_cycle

        const rain_target_distance=Math.abs(this.game.ambient.target_rain-this.game.ambient.rain)

        if(this.game.ambient.rain_timer<=0) {
            if(this.game.ambient.rain===0&&this.game.ambient.target_rain===0) {
                this.game.ambient.rain_timer = 1
                if (Math.random() < this.rules.ambient.rain_chance) {
                    this.game.ambient.target_rain=Math.min(Math.random()+0.1,1)
                    this.game.ambient.rain_state=0
                }
            }else{
                if(rain_target_distance===0&&this.game.ambient.rain_state===1){
                    this.game.ambient.rain_timer = 1
                    if(Math.random()<=this.rules.ambient.rain_stop_chance){
                        this.game.ambient.rain_state=0
                        this.game.ambient.target_rain=0
                    }else{
                        this.game.ambient.rain_state=0
                        this.game.ambient.target_rain=Math.min(Math.random()+0.1,1)
                    }
                }
            }
        }

        if(rain_target_distance>0.001){
            this.game.ambient.rain=Numeric.lerp(this.game.ambient.rain,this.game.ambient.target_rain,Numeric.dt_expo_inter(this.rules.ambient.rain_lerp_speed,rain_speed))
        }else{
            this.game.ambient.rain=this.game.ambient.target_rain
            if(this.game.ambient.rain_state===0){
                this.game.ambient.rain_state=1
                this.game.ambient.rain_timer=random.float(3,7)
            }
        }
    }

    on_init(){}
    on_tick(dt:number){}
    on_net_update(){}
    on_start():void{}
    on_finish():void{}

    abstract can_join():boolean
    abstract can_down(human:Human):boolean
    abstract is_ally(a:Human,b:Human):boolean

    on_player_connect(p:Player):void{}
    on_player_join(p:Player):void{}
    on_player_die(p:Player):void{}

    on_human_create(human:Human):void{}
    on_human_die(human:Human):void{}

    get_group(group:number):Group|undefined{
        return undefined
    }
    get_team(team:number):Team|undefined{
        return undefined
    }

    abstract generate_map():void

    get_living_count():number[]{
        return [this.game.players.living_players.length]
    }
    get_human_spawn_position(human:Human):Vec2|undefined{
        return v2.zero()
    }

    manage_joinned_packet(jp:JoinnedPacket){

    }

    human_buy_item(human:Human,item:GameItem){}
}