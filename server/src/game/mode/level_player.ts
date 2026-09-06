import { type Game } from "../others/game.ts";
import { LevelCharacter, LevelDefinition } from "common/scripts/config/level_definition.ts";
import { FileManager, mergeDeep, DynamicStream, Stream, parseJSONC, create_script, v2, CutsceneCommand, CutsceneCommandType, sleep, GameComponent, Path } from "common/engine/core.ts";
import { OnlineMessage, OnlineMessageType } from "common/scripts/packets/messages.ts"
import { type Player } from "../objects/player.ts";
export class LevelPlayerScript{
    level!:LevelPlayer
    game!:Game
    constructor(){

    }

    async initialize_mode(){
        await this.game.auto_init(this.level.def.mode)
    }

    on_load_character(character:LevelCharacter){return character}
    on_spawn_player(player:Player,first:boolean){}
    on_save_checkpoint(stream:Stream){}

    on_tick(dt:number){}
    on_begin(){}
    on_before(start_with_intro:boolean){}
    async on_load(){
    }
    on_start(first:boolean){}
    on_stop(){}
    on_game_finish(e:any){
        if(e.win){
            if(!((this.level.def.next_level as Record<string,string>)["complete"]))return
            this.level.msg({
                type:"start_level",
                path:Path.join(this.level.path,(this.level.def.next_level as Record<string,string>)["complete"]),
                start_with_intro:true
            })
        }
    }

    async character_selection(characters:LevelCharacter[]):Promise<number>{
        const ret=await this.send_message_event({
            type:OnlineMessageType.CharacterSelector,
            characters:characters.map((v)=>{
                return {
                    name:v.name,
                    description:v.description,
                    icon:v.icon
                }
            })
        } satisfies OnlineMessage)
        return ret
    }
    async load_json(path:string):Promise<any>{
        return parseJSONC(await this.level.fs.read_file(path))
    }
    show_cutscene(cutscene:CutsceneCommand[]):Promise<void>{
        return this.send_message_event({
            type:OnlineMessageType.Cutscene,
            cutscene
        })
    }
    send_message_event(msg:OnlineMessage):Promise<any>{
        if(this.level.online_messsage_resolve)this.level.online_messsage_resolve()
        return new Promise<void>((resolve)=>{
            this.level.online_messsage_resolve=resolve
            this.level.msg({
                type:"online_message",
                message:msg
            })
        })
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
export class LevelPlayer extends GameComponent {
    declare game: Game
    def!: LevelDefinition
    path!:string
    started:boolean=false
    fs:FileManager

    checkpoint:Stream
    checkpoint_count:number=-1

    npcs:LevelCharacter[]=[]

    script!:LevelPlayerScript

    msg:(args:any)=>any

    online_messsage_resolve?:(v?:any)=>void

    constructor(msg:(args:any)=>any,fs:FileManager){
        super()
        this.msg=msg
        this.checkpoint=new DynamicStream()
        this.fs=fs
    }
    override on_bind(): void {
        if(!this.script)this.set_script_class(new LevelPlayerScript())
        this.game.level=this
    }
    async on_game_finish(e:{winners:Player[]}){
        let win=false
        for(const p of e.winners){
            if(p.is_player&&this.game.players.connected_players[p.conn?.id??0]&&!p.dead)win=true
        }
        const ev={...e,win}
        await this.script.on_game_finish(ev)
        this.game.can_win=ev.win
    }

    override on_tick(dt:number){
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
    async begin(game:Game,path:string){
        this.game=game
        this.game.players.connect_add_player=false
        this.game.can_start=false
        this.game.can_finish=false
        this.path=path

        this.def = parseJSONC(await this.fs.read_file("level.jsonc"))
        this.set_script_class(new (create_script(await this.fs.read_file(this.def.script??"level.js"),this.game.globals)()))

        this.game.start_settings.textures.push(...(this.def.assets?.textures??[]))
        Object.assign(this.game.start_settings.assets,this.def.assets?.assets??{})
        this.game.start_settings.languages_path=path+"/languages"

        await this.script.initialize_mode()
        await this.script.on_begin()

        game.add_component(this)
        this.save_checkpoint()
        if(!this.game.running)this.game.mainloop()
    }

    async init(start_with_intro:boolean=true){
        this.game.clock.timeScale=0
        await this.script.on_before(start_with_intro)
        this.game.clock.timeScale=1
        this.start()
    }
    save_checkpoint(){
        this.checkpoint.clear()
        this.game.save_checkpoint(this.checkpoint)
        this.script.on_save_checkpoint(this.checkpoint)
        this.checkpoint.lock()
        this.checkpoint_count++
    }
    start(){
        const first=this.checkpoint_count<=0
        this.game.start(true)
        this.script.on_start(first)
        this.spawn_players(first)
    }
    spawn_players(first:boolean=false){
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
                p.clear(false,true)
                this.script.on_spawn_player(p,first)
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