import { Game } from "../others/game.ts";
import { LevelDefinition, LevelEnemys } from "common/scripts/config/level_definition.ts";
import { BattleRoyaleSettings, BattleRoyaleSolo, BattleRoyaleTeam } from "./battle_royale.ts";
import { MapDef, Maps } from "common/scripts/definitions/maps/base.ts";
import { ModeManager } from "./modeManager.ts"
import { type Human } from "../objects/human.ts"
import { type Player } from "../objects/player.ts"
import { v2m, Vec2 } from "common/engine/core.ts";
import { Spawn, SpawnMode } from "common/scripts/others/constants.ts";
export type KillAllEnemiesSettings={
    map:{
        def:MapDef|string
    }
    spawn_mode?:SpawnMode
    enemies?:LevelEnemys
}
export class KillAllEnemiesMode extends ModeManager {
    settings:{
        map:{
            def:MapDef
            seed?:number
        }
        enemies?:LevelEnemys
        spawn_mode:SpawnMode
    }

    constructor(settings: KillAllEnemiesSettings){
        super()
        this.settings={
            map:{
                def:typeof settings.map.def==="string"?Maps[settings.map.def]:settings.map.def,
            },
            spawn_mode:settings.spawn_mode??Spawn.grass,
            enemies:settings.enemies
        }
    }
    override on_start(){
        this.spawn_enemies()
    }
    can_join(): boolean {
        return true
    }
    can_down(): boolean {
        return false
    }
    is_ally(a: Human, b: Human): boolean {
        return a.is_player === b.is_player
    }

    spawn_enemies(){
        if(!this.settings.enemies) return
        for(const e of this.settings.enemies){
            const count = e.count ?? 1
            for(let i = 0; i < count; i++){
                const npc = this.game.humans.create_enemy(e.def)
                if(!npc)break
                if(e.position){
                    v2m.set(npc.position, e.position.x, e.position.y)
                }else{
                    const pos = this.get_human_spawn_position(npc)
                    if(pos) npc.position = pos
                }
            }
        }
    }
    override on_human_die(h: Human){
        if(!h.is_player){
            if(this.game.humans.living_npc.length <= 0 && this.game.started){
                for(const p of this.game.players.living_players){
                    p.conn?.send_game_over(true)
                }
                this.game.finish()
            }
        }
    }
    override on_player_die(p: Player){
        p.conn?.send_game_over(false, p.killed_by?.id)
    }
    override generate_map(): void {
        this.game.map.generate(this.settings.map.def)
    }
    override get_human_spawn_position(h:Human):Vec2|undefined{
        return this.game.map.getRandomPosition(h.base_hitbox,h.id,h.layer,this.settings.spawn_mode,this.game.map.random)
    }
}
export class LevelPlayer {
    game: Game
    level!: LevelDefinition
    started:boolean=false

    constructor(game: Game){
        this.game = game
    }

    begin(level: LevelDefinition){
        this.level = level

        switch(level.mode.type){
            case "kill_all_enemies":
                // deno-lint-ignore ban-ts-comment
                //@ts-ignore
                this.game.init(new KillAllEnemiesMode(level.mode))
                break
            case "battle_royale":
                if((level.mode.teams??0)>=2){
                    this.game.init(new BattleRoyaleTeam(level.mode.teams,level.mode.group_size??4,level.mode as unknown as BattleRoyaleSettings))
                }else{
                    this.game.init(new BattleRoyaleSolo(level.mode as unknown as BattleRoyaleSettings))
                }
                break
        }
        this.game.signals.on("player_join",(e:any)=>{
            if(!e.player.is_bot){
                if(this.level.player){
                    e.player.set_preset(this.level.player)
                    if(!this.level.player.start_position){
                        const pos = this.game.modeManager.get_human_spawn_position(e.player)
                        if(pos)e.player.position = pos
                    }
                }
            }
        })

        if(level.definitions?.enemies)this.game.humans.enemies=level.definitions?.enemies
    }
    start(){
        const level = this.level
        this.game.start()

        if(level.deadzone?.stage){
            this.game.deadzone.jump_stages(level.deadzone.stage)
        }

        this.spawn_players()
        this.enable_all()
    }
    spawn_players(){
        for(const p of Object.values(this.game.players.connected_players)){
            if(!p.human || p.human.health_data.dead){
                p.add_player()
            }
        }
    }
    reset(){
        if(!this.game.running)this.game.mainloop()
        for(const p of Object.values(this.game.players.connected_players)){
            if(p.human){
                if(p.human.is_player){
                    (p.human as Player).reset_status()
                }
            }
        }
        this.game.soft_reset()
    }
    enable_all(){
        for(const h of this.game.humans.humans){
            h.human_data.movement_enabled = true
            h.human_data.combat_enabled = true
        }
    }
}