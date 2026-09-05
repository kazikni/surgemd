import { ModeManager } from "./modeManager.ts"
import { Human } from "../objects/human.ts"
import { human_die_event } from "../others/utils.ts"
import { Vec2 } from "common/engine/core.ts"
import { NormalMap } from "common/scripts/definitions/maps/normal.ts";
import { Spawn } from "common/scripts/others/constants.ts";
import { LevelEnemys } from "common/scripts/config/level_definition.ts";
import { MapDef } from "common/scripts/definitions/maps/base.ts";
import { type Player } from "../objects/player.ts";

export interface SequenceModeSettings{
    map?:MapDef|string
    minimap?:boolean
}

export class SequenceMode extends ModeManager{
    settings:{
        map?:MapDef|string
        minimap:boolean
    }
    enemies:Record<string,Human>={}
    started_sequence=false
    finished=false

    constructor(settings:SequenceModeSettings={}){
        super()
        this.settings={
            map:settings.map,
            minimap:settings.minimap===undefined?false:settings.minimap
        }

        this.rules.deadzone.enabled=false
        this.rules.leader.enabled=false
        this.rules.feed.enabled=false
    }

    is_enemy(human:Human){
        return this.enemies[human.id]!==undefined
    }
    add_enemy(human:Human){
        this.enemies[human.id]=human
    }
    remove_enemy(human:Human){
        if(this.enemies[human.id])delete this.enemies[human.id]
    }

    override add_enemies(enemies?: LevelEnemys): Human[] {
        const l=super.add_enemies(enemies)
        for(const e of l){
            this.add_enemy(e)
        }
        return l
    }
    override on_human_die(e:human_die_event){
        super.on_human_die(e)
        if(this.is_enemy(e.human)){
            this.remove_enemy(e.human)
        }

        if(this.game.started){
            if(Object.keys(this.enemies).length<=0){
                this.game.finish(this.game.players.living_players,1)
            }
        }
    }

    on_game_reset(){
        this.enemies={}
    }

    override can_start(){
        return true
    }

    override can_join(){
        return true
    }

    override can_down(human: Human): boolean {
        return this.is_enemy(human)
    }
    override is_ally(a: Human, b: Human): boolean {
        return this.is_enemy(a)===this.is_enemy(b)
    }
    override get_living_count(): number[] {
        return [Object.keys(this.enemies).length]
    }

    override get_human_spawn_position(human:Human):Vec2|undefined{
        return this.game.map.getRandomPosition(human.base_hitbox,human.id,human.layer,Spawn.ground,this.game.map.random)
    }
    override async generate_map(): Promise<void> {
        this.game.map.generate(await this.load_map(this.settings.map??"normal")??NormalMap,undefined,false)
    }
}