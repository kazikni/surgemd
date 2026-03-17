import { type Game } from "../others/game.ts";
import { v2, Vec2 } from "common/engine/core.ts";
import { Human } from "../objects/human.ts";
import { Player } from "../objects/player.ts";
import { type JoinnedPacket } from "common/scripts/packets/joinned_packet.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";

export interface GameRules{
    humans:{
        boosts:{
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
        day_night_cycle:boolean
        rain_cycle:boolean
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
            day_night_cycle:false,
            rain_cycle:false
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
        if(this.rules.ambient.day_night_cycle&&this.game.started)this.game.ambient.date.second+=dt
        if(this.game.ambient.date.second>=1){
            this.game.ambient.date.second=0
            this.game.ambient.date.minute++
            if(this.game.ambient.date.minute>=60){
                this.game.ambient.date.hour+=1
                this.game.ambient.date.second=0
                this.game.ambient.date.minute=0

                this.game.dirty.ambient=true
            }
        }
        this.on_tick(dt)
    }

    on_init(){}
    on_tick(dt:number){}
    on_start():void{}
    on_finish():void{
        this.game.killing_game=true
    }

    abstract can_join():boolean
    abstract can_down(human:Human):boolean
    abstract is_ally(a:Human,b:Human):boolean

    on_player_connect(p:Player):void{}
    on_player_join(p:Player):void{}
    on_player_die(p:Player):void{}

    on_human_create(human:Human):void{}
    on_human_die(human:Human):void{}

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