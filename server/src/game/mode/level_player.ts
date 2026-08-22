import { type Game } from "../others/game.ts";
import { LevelCharacter, LevelDefinition } from "common/scripts/config/level_definition.ts";
import { FileManager, mergeDeep, DynamicStream, Stream, parseJSONC, create_script, v2, CutsceneCommand, CutsceneCommandType, sleep } from "common/engine/core.ts";
import { OnlineMessage, OnlineMessageType } from "common/scripts/packets/messages.ts"
import { GameConfig } from "common/scripts/config/config.ts";
import { type Player } from "../objects/player.ts";
import { type Human } from "../objects/human.ts";
export class LevelPlayerScript{
    level!:LevelPlayer
    game!:Game
    constructor(){

    }

    async initialize_mode(config:GameConfig){
        await this.game.auto_init(config)
    }

    on_load_character(character:LevelCharacter){return character}
    on_spawn_player(player:Player){}
    on_save_checkpoint(stream:Stream){}

    on_tick(dt:number){}
    on_begin(){}
    on_before(start_with_intro:boolean){}
    async on_load(){
    }
    on_start(){}
    on_stop(){}
    on_finish(winners:Human[]){}

    async character_selection(characters:LevelCharacter[]):Promise<number>{
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
        return Object.values(await this.game.clients.wait("_end"))[0]
    }
    async load_json(path:string):Promise<any>{
        return parseJSONC(await this.level.fs.read_file(path))
    }
    async show_cutscene(cutscene:CutsceneCommand[]):Promise<void>{
        this.game.clients.send({
            type:OnlineMessageType.Cutscene,
            cutscene
        })
        await this.game.clients.wait("_end")
    }
    async send_message_event(msg:OnlineMessage){
        this.game.clients.send(msg)
        await this.game.clients.wait("_end")
    }
    make_level_intro(title_color="blue"):CutsceneCommand[]{
        return [{
            type:CutsceneCommandType.SetContentText,
            content:[
                {value:this.level.def.meta.name,style:"nn_title_"+title_color},
                {value:this.level.def.meta.location,style:"nn_location"},
                {value:this.level.def.meta.date,style:"nn_date"},
                {value:this.level.def.meta.description,style:"nn_description"},
            ],
        },{type:CutsceneCommandType.Wait,time:3}]
    }
}
export class LevelPlayer {
    game: Game
    def!: LevelDefinition
    path!:string
    started:boolean=false
    fs:FileManager

    checkpoint:Stream

    npcs:LevelCharacter[]=[]

    script!:LevelPlayerScript

    constructor(game: Game,fs:FileManager){
        this.game = game
        this.checkpoint=new DynamicStream()
        this.fs=fs
        this.set_script_class(new LevelPlayerScript())
    }

    set_script_class(script:LevelPlayerScript){
        this.script=script
        script.level=this
        script.game=this.game
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
        return await this.script.on_load_character(base)
    }
    async begin(path:string){
        this.path=path

        this.def = parseJSONC(await this.fs.read_file("level.jsonc"))
        this.set_script_class(new (create_script(await this.fs.read_file(this.def.script??"level.js"),this.game.globals)()))

        this.game.start_settings.textures.push(...(this.def.assets?.textures??[]))
        Object.assign(this.game.start_settings.assets,this.def.assets?.assets??{})
        this.game.start_settings.languages_path=path+"/languages"

        this.game.players.connect_add_player=false
        this.game.can_start=false
        this.game.can_finish=false

        await this.script.initialize_mode(this.def.mode)
        await this.script.on_begin()
    
        this.save_checkpoint()

        if(!this.game.running)this.game.mainloop()
    }
    async init(start_with_intro:boolean=true){
        this.game.clock.timeScale=0

        /*this.game.clients.send({type:OnlineMessageType.SetLoad,enabled:true})
        await this.game.clients.wait("_end")*/

        await this.script.on_load()

        /*this.game.clients.send({type:OnlineMessageType.SetLoad,enabled:false})
        await this.game.clients.wait("_end")*/

        await this.script.on_before(start_with_intro)
        this.game.clock.timeScale=1

        this.start()
    }
    save_checkpoint(){
        this.checkpoint.clear()
        this.game.save_checkpoint(this.checkpoint)
        this.script.on_save_checkpoint(this.checkpoint)
        this.checkpoint.lock()
    }
    start(){
        this.game.start(true)
        this.script.on_start()
        this.spawn_players()
    }
    spawn_players(){
        for(const conn of Object.values(this.game.players.connected_players)){
            conn.view_objects.length=0
            let p=conn.real_human as Player
            if(p?.dead){
                conn.revive()
            }else{
                p=conn.add_player() as Player
            }
            if(!p)continue
            p!.reset_status()
            if(p&&p.is_player&&!p.is_bot){
                p.clear(true,true)
                this.script.on_spawn_player(p)
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