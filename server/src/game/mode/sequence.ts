import { ModeManager } from "./modeManager.ts"
import { Human } from "../objects/human.ts"
import { human_die_event } from "../others/utils.ts"
import { Vec2 } from "common/engine/core.ts"
import { NormalMap } from "common/scripts/definitions/maps/normal.ts";
import { Spawn } from "common/scripts/others/constants.ts";
import { MapDef } from "common/scripts/definitions/maps/base.ts";
import { Stream } from "common/engine/core/net/stream.ts";
import { LevelEnemys } from "common/scripts/config/level_definition.ts";

export type SequenceCommand={
    type:"spawn_enemies"
    enemies:LevelEnemys[]
}|{
    type:"enemys_count"
    count?:number
}|{
    type:"finish"
}|{
    type:"save_checkpoint"
}
export interface SequenceModeSettings{
    map?:MapDef|string
    minimap?:boolean
    commands?:SequenceCommand[]
}

export class SequenceMode extends ModeManager{
    settings:{
        map?:MapDef|string
        minimap:boolean
    }
    enemies:Record<number,Human>={}
    commands:SequenceCommand[]=[]
    started_sequence=false
    finished=false

    constructor(settings:SequenceModeSettings={}){
        super()
        this.settings={
            map:settings.map,
            minimap:settings.minimap===undefined?false:settings.minimap
        }
        this.commands=[...(settings.commands??[])]

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

    override make_enemy(): Human | undefined {
        const e=super.make_enemy()
        if(e)this.add_enemy(e)
        return e
    }
    override on_human_die(e:human_die_event){
        super.on_human_die(e)
        if(this.is_enemy(e.human)){
            this.remove_enemy(e.human)
        }
    }

    override on_encode_checkpoint(stream: Stream): void {
        const ctx={idco:{},coid:{}}
        stream.write_any(this.commands,2,2)
        stream.write_number_dict(this.enemies,(i)=>{
            this.scene.game.humans.encode_human(i,stream,ctx)
        })
    }
    override on_decode_checkpoint(stream: Stream): void {
        const ctx={idco:{},coid:{}}
        this.commands=stream.read_any(2,2)
        stream.read_number_dict(()=>{
            const e=this.make_enemy()
            if(e){
                this.scene.game.humans.decode_human(e,stream,ctx)
            }
        })
    }

    execute_command(cmd:SequenceCommand):boolean{
        switch(cmd.type){
            case "spawn_enemies":{
                this.add_enemies(cmd.enemies)
                break
            }
            case "enemys_count":{
                return Object.keys(this.enemies).length===(cmd.count??0)
            }
            case "finish":{
                this.game.finish(this.game.players.living_players,1)
                break
            }
            case "save_checkpoint":{
                this.game.level?.save_checkpoint?.()
                break
            }
        }
        return true
    }

    override on_tick(dt:number){
        super.on_tick(dt)
        if(this.game.started){
            let last=true
            while(this.commands.length>0&&last){
                last=this.execute_command(this.commands[0])
                if(last)this.commands.shift()
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
        return this.is_enemy(human)&&Object.keys(this.enemies).length>1
    }
    override is_ally(a: Human, b: Human): boolean {
        return this.is_enemy(a)===this.is_enemy(b)
    }
    override get_living_count(): number[] {
        return [Object.keys(this.enemies).length]
    }

    override get_human_spawn_position(human:Human):Vec2|undefined{
        return this.scene.map.getRandomPosition(human.base_hitbox,human.id,human.layer,Spawn.ground,this.scene.map.random)
    }
    override async generate_map(): Promise<void> {
        this.scene.map.generate(await this.load_map(this.settings.map??"normal")??NormalMap,undefined,false)
    }
}