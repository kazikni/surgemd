import { Game } from "../others/game.ts";
import { LevelCharacter, LevelDefinition } from "common/scripts/config/level_definition.ts";
import { BattleRoyale, BattleRoyaleDebug, BattleRoyaleSettings } from "./battle_royale.ts";
import { FileManager, mergeDeep, DynamicStream, Stream, parseJSONC } from "common/engine/core.ts";
import { OnlineMessage, OnlineMessageType } from "common/scripts/packets/messages.ts"
import { JoinPacket } from "common/scripts/packets/join_packet.ts"
export class LevelPlayer {
    game: Game
    level!: LevelDefinition
    path!:string
    started:boolean=false
    fs:FileManager

    checkpoint:Stream

    player_preset?:LevelCharacter
    allies:LevelCharacter[]=[]
    npcs:LevelCharacter[]=[]

    constructor(game: Game,fs:FileManager){
        this.game = game
        this.checkpoint=new DynamicStream()
        this.fs=fs
    }

    async load_character(base:LevelCharacter):Promise<LevelCharacter>{
        if(base.script_path){
            base.script=await this.fs.read_file(base.script_path)
        }
        if(base.path){
            if(typeof base.path==="string"){
                return mergeDeep(await this.load_character(parseJSONC(await this.fs.read_file(base.path))),base)
            }else{
                const content:LevelCharacter[]=[]
                for(const path of base.path){
                    content.push(await this.load_character(parseJSONC(await this.fs.read_file(path))))
                }
                return mergeDeep({},...content,base)
            }
        }
        return base
    }
    async begin(path:string){
        this.path=path
        this.level = parseJSONC(await this.fs.read_file("level.jsonc"))

        this.game.start_settings.background_music=this.level.assets?.background_music
        this.game.start_settings.textures.push(...(this.level.assets?.textures??[]))
        Object.assign(this.game.start_settings.assets,this.level.assets?.assets??{})

        this.game.start_settings.languages_path=path+"/languages"

        switch(this.level.mode.type){
            case "kill_all_enemies":
                // deno-lint-ignore ban-ts-comment
                //@ts-ignore
                await this.game.init(new KillAllEnemiesMode(this.level.mode.settings))
                break
            case "battle_royale":
                await this.game.init(new BattleRoyale(this.level.mode.settings,this.level.mode.group_size,this.level.mode.teams))
                break
            case "debug":{
                await this.game.init(new BattleRoyaleDebug(this.level.mode.settings as unknown as BattleRoyaleSettings))
                break
            }
        }
        this.game.signals.on("player_join",async(e:any)=>{
            if(!e.player.is_bot){
                if(this.level.player){
                    this.player_preset=await this.load_character(this.level.player)
                    e.player.set_preset(this.player_preset)
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
        this.game.can_finish=false

        if(!this.game.running)this.game.mainloop()
    }
    async init(start_with_intro:boolean=true){
        this.game.clock.timeScale=0
        if(start_with_intro){
            if(this.level.cutscenes?.begin){
                const def=parseJSONC(await this.fs.read_file(this.level.cutscenes.begin))
                this.game.clients.send({
                    type:OnlineMessageType.Cutscene,
                    cutscene:def
                } satisfies OnlineMessage)
                await this.game.clients.wait("_end")
            }
        }
        if(this.level.characters_selection){
            const characters:LevelCharacter[]=[]
            for(const v of this.level.characters_selection.characters){
                characters.push(await this.load_character(v))
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
            const idx=Object.values(await this.game.clients.wait("_end"))[0]
            this.player_preset=mergeDeep({},this.player_preset??{},characters[idx])
            characters.splice(idx,1)
            this.allies=characters
        }
        this.npcs.length=0
        for(const def of this.level.npcs??[]){
            this.npcs.push(await this.load_character(def))
        }
        for(const p of this.game.players.living_players){
            p.set_preset(this.player_preset)
        }
        this.game.clock.timeScale=1
        this.start()
    }
    save_checkpoint(){
        this.checkpoint.clear()
        this.game.save_checkpoint(this.checkpoint)
        this.checkpoint.lock()
    }
    start(){
        this.game.start(true)
        if(this.level.mode.deadzone?.stage){
            this.game.deadzone.jump_stages(this.level.mode.deadzone.stage)
        }
        this.spawn_players()
        if(this.allies){
            for(const a of this.allies){
                const bot = this.game.players.add_enemy(a,new JoinPacket())
                if(!bot) continue
            }
        }
        for(const def of this.npcs){
            const npc=this.game.humans.add_npc()
            npc.set_preset(def)
        }
        this.game.modeManager.add_enemies()
    }
    spawn_players(){
        for(const conn of Object.values(this.game.players.connected_players)){
            conn.view_objects.length=0
            if(conn.real_human?.dead){
                conn.revive()
                conn.human!.reset_status()
                this.game.modeManager.set_group_for_human(conn.real_human)
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
        this.game.load_checkpoint(this.checkpoint)
        this.start()
    }
}