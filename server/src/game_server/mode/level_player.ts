import { Game } from "../others/game.ts";
import { EnemyDef, LevelDefinition } from "common/scripts/config/level_definition.ts";
import { cloneDeep, mergeDeep, SignalManager, v2m, Vec2 } from "common/engine/core.ts";
import { BattleRoyaleSolo } from "./battle_royale.ts";
import { MapDef, Maps } from "common/scripts/definitions/maps/base.ts";
import { ModeManager } from "./modeManager.ts"
import { type Human } from "../objects/human.ts"
import { type Player } from "../objects/player.ts"
import { Spawn } from "common/scripts/others/constants.ts";
import { EnemyNPCAI } from "../human/ai/enemy_npc_ai.ts";
import { ADVHumanAI } from "../human/ai/adv_human_ai.ts";

export class CampaignGamemodeManager extends ModeManager {
    level: LevelDefinition
    level_player:LevelPlayer
    started:boolean=false
    constructor(level: LevelDefinition,level_player:LevelPlayer) {
        super()
        this.level_player=level_player
        this.level = level
    }

    can_join(): boolean {
        return true
    }

    can_down(_h: Human): boolean {
        return false
    }

    is_ally(a: Human, b: Human): boolean {
        return a.is_player === b.is_player
    }

    override generate_map(): void {
        const m = this.level.mode.map.def
        if (typeof m === "string") {
            this.game.map.generate(Maps[m], this.level.mode.map.seed)
        } else {
            const def = mergeDeep({}, Maps[m.base], m)
            this.game.map.generate(def as MapDef, this.level.mode.map.seed)
        }
    }

    override get_human_spawn_position(h: Human): Vec2 | undefined {
        if (h.is_player) {
            return this.level.player?.start_position
        }

        return this.game.map.getRandomPosition(
            h.base_hitbox,
            h.id,
            h.layer,
            Spawn.grass,
            this.game.map.random
        )
    }

    override on_human_create(human: Human): void {
        if(!this.game.started&&!this.started){
            human.human_data.movement_enabled=false
            human.human_data.combat_enabled=false
        }
    }
    override on_player_join(p: Player) {
        if (this.level.player?.name)
            p.name = this.level.player.name

        if (this.level.player?.inventory)
            p.inventory.load_preset(this.level.player.inventory)
    }

    override on_human_die(h: Human) {
        if(!h.is_player) {
            if(this.game.humans.living_npc.length<=0&&this.game.started&&this.started){
                for(const p of this.game.players.living_players){
                    if(p.conn)p.conn.send_game_over(true)
                }
                this.game.finish()
            }
        }
    }
    override on_player_die(p: Player): void {
        if(p.conn)p.conn.send_game_over(false,p.killed_by?.id)

        this.game.add_timeout(()=>{
            this.reset_level()
        },1)
    }

    generate_enemy(def: EnemyDef, name?: string) {
        const bot = this.game.humans.add_npc()

        bot.ai=new ADVHumanAI(bot)
        //bot.ai = new EnemyNPCAI(bot)

        if (name)bot.name = name
        if (def.inventory)bot.inventory.load_preset(def.inventory)
        if (def.ia?.params)bot.ai.params = cloneDeep(def.ia.params)

        return bot
    }
    reset_level(){
        this.started=false

        for(const p of Object.values(this.game.players.connected_players)){
            if(p.human){
                if(p.human.is_player){
                    (p.human as Player).reset_status()
                }
                p.human.human_data.movement_enabled=false
                p.human.human_data.combat_enabled=false
            }
        }

        this.game.humans.clear_npcs()
        this.game.clear_loot()

        this.game.map.soft_reset()
    }
    override on_init(): void {
        this.game.add_timeout(this.game.start.bind(this.game),1)
    }

    start_level_again(){
        if(this.started)return
        const level=this.level
        this.started=true

        for(const p of Object.values(this.game.players.connected_players)){
            if(p.human && p.human.health_data.dead){
                p.add_player()
            }

            if(p.human){
                const pos=this.get_human_spawn_position(p.human)
                if(pos)p.human.position=pos
            }
        }

        const obj = level.mode
        if(obj.type==="kill_all_enemies"){
            for(const e of obj.enemies){
                const count=e.count??1
                let def:EnemyDef|undefined

                if(typeof e.def==="string"){
                    def=this.level.definitions?.enemies?.[e.def]?.normal
                }else{
                    def=e.def
                }

                if(!def)continue

                for(let i=0;i<count;i++){
                    const npc=this.generate_enemy(def,e.name)

                    if(e.position){
                        v2m.set(npc.position,e.position.x,e.position.y)
                    }else{
                        const pos=this.get_human_spawn_position(npc)
                        if(pos)npc.position=pos
                    }
                }
            }
        }

        for(const h of this.game.humans.humans){
            h.human_data.movement_enabled=true
            h.human_data.combat_enabled=true
        }

        this.game.started=true
    }
    override on_start() {
        const obj = this.level.mode
        if (obj.type !== "kill_all_enemies") return
        this.start_level_again()
    }
}
export class LevelPlayer {
    game:Game
    signals:SignalManager
    level!:LevelDefinition
    constructor(game:Game){
        this.game=game
        this.signals=new SignalManager()
        this.signals.emit("init", this)
    }
    begin(level:LevelDefinition){
        this.level=level
        this.signals.emit("level_begin", this)
        const map=(typeof level.mode.map.def==="string"?Maps[level.mode.map.def]:mergeDeep({},Maps[level.mode.map.def.base],level.mode.map.def)) as MapDef
        switch(level.mode.type){
            case "battle_royale":
                this.game.init(new BattleRoyaleSolo({
                    map:map,
                    players:{
                        limit:level.mode.players.count+1,
                    }
                }))

                /*for(let i=0;i<level.mode.players.count;i++){
                    const pp=this.game.players.add_bot()
                    const ai=new BattleRoyaleBot(pp)
                    pp.ai=ai
                }*/
                break
            default:
                this.game.init(new CampaignGamemodeManager(level,this))
                break
        }
        /**/
    }
}