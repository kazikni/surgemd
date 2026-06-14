import { Game } from "../others/game.ts";
import { LevelCharacter, LevelDefinition, LevelEnemys } from "common/scripts/config/level_definition.ts";
import { BattleRoyale, BattleRoyaleDebug, BattleRoyaleSettings } from "./battle_royale.ts";
import { MapDef, Maps } from "common/scripts/definitions/maps/base.ts";
import { ModeManager } from "./modeManager.ts"
import { type Human } from "../objects/human.ts"
import { type Player } from "../objects/player.ts"
import { FileManager, mergeDeep, StaticStream, Stream, v2m, Vec2 } from "common/engine/core.ts";
import { Spawn, SpawnMode } from "common/scripts/others/constants.ts";
import { OnlineMessage, OnlineMessageType } from "common/scripts/packets/messages.ts"
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
    can_down(a: Human): boolean {
        return a.is_npc
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
    fs:FileManager

    checkpoint:Stream

    player_preset?:LevelCharacter

    constructor(game: Game,fs:FileManager){
        this.game = game
        this.checkpoint=new StaticStream(new ArrayBuffer(1))
        this.fs=fs
    }

    async begin(path:string){
        this.level = JSON.parse(await this.fs.read_file("level.json"))

        this.game.start_settings.background_music=this.level.assets?.background_music
        this.game.start_settings.textures.push(...(this.level.assets?.textures??[]))
        Object.assign(this.game.start_settings.assets,this.level.assets?.assets??{})

        this.game.start_settings.languages_path=path+"/languages"

        switch(this.level.mode.type){
            case "kill_all_enemies":
                // deno-lint-ignore ban-ts-comment
                //@ts-ignore
                this.game.init(new KillAllEnemiesMode(this.level.mode))
                break
            case "battle_royale":
                this.game.init(new BattleRoyale(this.level.mode as unknown as BattleRoyaleSettings,this.level.mode.group_size??1))
                break
            case "debug":{
                this.game.init(new BattleRoyaleDebug(this.level.mode as unknown as BattleRoyaleSettings))
                break
            }
        }
        this.game.signals.on("player_join",async(e:any)=>{
            if(!e.player.is_bot){
                if(this.level.player){
                    let p:LevelCharacter
                    if(this.level.player.path){
                        p=mergeDeep(JSON.parse(await this.fs.read_file(this.level.player.path)),this.level.player)
                    }else{
                        p=this.level.player
                    }
                    this.player_preset=this.level.player
                    e.player.set_preset(p)
                    if(!this.level.player.position){
                        const pos = this.game.modeManager.get_human_spawn_position(e.player)
                        if(pos)e.player.position = pos
                    }
                }
            }
        })

        if(this.level.definitions?.enemies)this.game.humans.enemies=this.level.definitions?.enemies
        this.save_checkpoint()
        this.game.can_start=false

        if(!this.game.running)this.game.mainloop()
    }
    async init(){
        this.game.clock.timeScale=0
        if(this.level.cutscenes?.begin){
            const def=JSON.parse(await this.fs.read_file(this.level.cutscenes.begin))
            this.game.clients.send({
                type:OnlineMessageType.Cutscene,
                cutscene:def
            } satisfies OnlineMessage)
            await this.game.clients.wait("_end")
        }
        if(this.level.characters_selection){
            const characters:LevelCharacter[]=[]
            for(const v of this.level.characters_selection.characters){
                if(v.path){
                    characters.push(mergeDeep(JSON.parse(await this.fs.read_file(v.path)),this.level.player))
                }else{
                    characters.push(v)
                }
            }
            this.game.clients.send({
                type:OnlineMessageType.CharacterSelector,
                characters:characters.map((v)=>{
                    return {
                        name:v.name,
                        description:v.description,
                        icon:v.icon
                    }
                })
            } satisfies OnlineMessage)
            this.player_preset=mergeDeep({},this.player_preset??{},characters[Object.values(await this.game.clients.wait("_end"))[0]])
            for(const p in this.game.players.living_players){
                this.game.players.living_players[p].set_preset(this.player_preset)
            }
        }
        this.game.clock.timeScale=1
        this.start()
    }
    save_checkpoint(){
        this.checkpoint=new StaticStream(new ArrayBuffer(1024*1000))
        this.game.save_checkpoint(this.checkpoint)
        ;(this.checkpoint as StaticStream).lock()
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
        for(const conn of Object.values(this.game.players.connected_players)){
            conn.view_objects.length=0
            if(conn.real_human?.dead){
                conn.revive()
                const pos=this.game.modeManager.get_human_spawn_position(conn.real_human)
                if(pos!==undefined){
                    conn.real_human.position=pos
                }
                conn.real_human.set_preset(this.player_preset)
            }else{
                const p=conn.add_player()
                if(p){
                    p.set_preset(this.player_preset)
                }
            }
        }
    }
    reset(){
        if(!this.game.running)this.game.mainloop()
        this.game.reset()
        this.checkpoint.index=0
        this.game.players.first_tick=true
        this.game.scene_2d.load_checkpoint(this.checkpoint)
        this.start()
    }
    enable_all(){
        for(const h of this.game.humans.humans){
            h.human_data.movement_enabled = true
            h.human_data.combat_enabled = true
        }
    }
}