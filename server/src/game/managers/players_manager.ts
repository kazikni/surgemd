import { Client, DefaultSignals, Stream, RectHitbox2D, v2, ValidString, DynamicStream } from "common/engine/core.ts";
import { Game } from "../others/game.ts";
import { GeneralUpdatePacket } from "common/scripts/packets/general_update.ts";
import { Player, PlayerConnManager } from "../objects/player.ts";
import { DamageSplash, UpdatePacket } from "common/scripts/packets/update_packet.ts";
import { type ServerGameObject } from "../others/gameObject.ts";
import { GameOverPacket } from "common/scripts/packets/gameOver.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { GameConstants, HumanStatus, PlayerStatus, ScoreApplyerType } from "common/scripts/others/constants.ts";
import { FeedMessage, FeedMessageType, FeedPacket } from "common/scripts/packets/feed_packet.ts";
import { InputPacket } from "common/scripts/packets/input_packet.ts";
import { JoinnedPacket } from "common/scripts/packets/joinned_packet.ts";
import { BotAi } from "../human/ai/simple_bot_ai.ts";
import { StartPacket} from "common/scripts/packets/start_packet.ts";
import { HumanDefinition } from "common/scripts/definitions/utils.ts";
import { Human } from "../objects/human.ts";
export class BotClient extends PlayerConnManager{
    ai?:BotAi
    override net_update(general_update:Stream): void {
        if(this.real_human)this.real_human.splashes=[]
        if(this.ai){
            this.ai.net_update(general_update)
        }
    }
    override send_game_over(status:(HumanStatus&{id:number})[],win?: boolean, eliminated_by?: number): void {
        //
    }
    override on_revive(human: Human): void {
        super.on_revive(human)
        if(this.ai){
            this.ai.human=human
        }
    }
}
export class PlayerClient extends PlayerConnManager{
    client:Client

    view_objects:ServerGameObject[]=[]
    first_tick:boolean=false

    constructor(game:Game,client:Client){
        super(game)
        this.client=client
        this.connected=false
    }
    override set_spectator(p: Player): void {
        super.set_spectator(p)
        this.view_objects.length=0
    }
    override add_player(): Player | undefined {
        const ret=super.add_player()
        this.view_objects.length=0
        return ret
    }
    get_update_packet():UpdatePacket{
        const up=new UpdatePacket()
        up.definition=this.game.definitions
        up.priv.pings=[...this.game.pings]
        const first_tick=this.first_tick||this.game.players.first_tick
        if(this.human&&!this.spectating){
            up.priv.active_entity={
                dirty:true,
                id:this.human.id,
            }
            if(this.human.loadout.ping)up.priv.pings.push(this.human.loadout.ping)
            if(this.human.team_data.group?.pings)up.priv.pings.push(...this.human.team_data.group.pings)
            up.priv.map_humans=this.human.map_humans()

            up.priv.self_state=this.human.self_state(this.human.is_new)
            if(this.human instanceof Player){
                if(this.human.splash_delay<=0){
                    this.human.merge_damage_splashes()
                    up.priv.splashes=this.human.splashes
                    this.human.splashes=[]
                }else{
                    this.human.splash_delay--
                }
            }
            const scope_view:number=(this.human.equipment_data.force_default_scope?this.human.equipment_data.default_scope.scope_view:this.human.equipment_data.scope.scope_view)
            const camera_hb=RectHitbox2D.centered(v2.clone(this.human!.position),v2(26/scope_view,21/scope_view))

            const objs=this.get_update_packet_objects(camera_hb,this.human.layer)
            const o=this.human.game.scene_2d.objects.encode_list_net(objs,this.view_objects,first_tick,first_tick)

            this.view_objects=o.last
            up.objects=o.strm
        }else if(this.spectating&&this.human){
            up.priv.active_entity={
                dirty:true,
                id:this.human.id,
            }
            up.priv.self_state=this.human.self_state(this.human.is_new)
            if(this.human instanceof Player){
                if(this.human.splash_delay<=0){
                    up.priv.splashes=this.human.splashes
                    this.human.splashes=[]
                }else{
                    this.human.splash_delay--
                }
            }

            const scope_view:number=this.human?.equipment_data.scope.scope_view??0.75
            const camera_hb=RectHitbox2D.centered(v2.clone(this.human!.position),v2(40/scope_view,20/scope_view))

            const objs=this.get_update_packet_objects(camera_hb,this.human.layer)
            const o=this.human.game.scene_2d.objects.encode_list_net(objs,this.view_objects,first_tick,first_tick)

            this.view_objects=o.last
            up.objects=o.strm
        }
        this.first_tick=false
        return up
    }
    send_game_over(status:PlayerStatus[]=[],win:boolean=false,eliminated_by:number=0){
        if(!this.human||!(this.human instanceof Player))return

        const p=new GameOverPacket()
        p.status.status=status
        p.status.win=win
        if(!p.status.win){
            p.status.eliminator=eliminated_by
        }
        if(this.game.leaderboards.length>0){
            p.status.leaderboards=this.game.leaderboards
        }

        this.client!.emit_packet(p)
    }
    stream:DynamicStream=new DynamicStream()
    net_update(general_update:Stream){
        this.stream.clear()
        if(this.client.opened){
            const packet=this.get_update_packet()
            if(packet.objects)this.client.manager.encode(packet,this.stream)
            this.stream.write_stream(general_update)
            this.client.send_stream(this.stream)
        }
    }
}
export class PlayersManager{
    game:Game

    splashes:DamageSplash[]=[]
    general_update:GeneralUpdatePacket=new GeneralUpdatePacket()

    match_players_count:number=0
    connected_players:Record<number,PlayerClient>={}
    connected_bots:BotClient[]=[]
    living_players:Player[]=[]

    buffer:Stream=new DynamicStream()
    global_buffer_1?:Stream
    global_buffer_2?:Stream

    first_tick:boolean=false

    start_packet_stream:Stream=new DynamicStream()

    constructor(game:Game){
        this.game=game
    }
    apply_score(type:ScoreApplyerType,amount:number){
        for(const p of this.living_players){
            p.apply_score(type,amount)
        }
    }
    clear_bots(){
        for(const b of this.connected_bots){
            if(b.human){
                const idx=this.living_players.indexOf(b.human as Player)
                if(idx!==-1){
                    this.living_players.splice(idx,1)
                }
                b.human.destroy()
            }
        }
        this.connected_bots.length=0
    }
    add_bot(packet:JoinPacket,player?:Player):BotClient{
        const client=new BotClient(this.game)
        this.game.modeManager.on_player_connect(client)
        this.game.signals.emit("player_connect",{client:client})
        const p=this.add_player(player??new Player(),packet,undefined,true) as Player
        p.conn=client
        client.set_active_player(p)
        this.connected_bots.push(client)
        return client
    }
    add_player(player:Player,packet:JoinPacket,id?:number,is_bot:boolean=false):Player{
        player.player_manager=this
        const p=this.game.humans.add_human(player,id) as Player
        p.is_bot=is_bot

        if(ValidString.simple_characters(packet.player_name)){
            p.name=packet.player_name
        }else{
            //Round6 Easter Egg
            p.name=`${GameConstants.player.defaultName}#${Math.random()<=0.005?456:this.living_players.length+1}`
        }

        p.proccess_join_packet(packet)

        this.living_players.push(p)
        if(this.living_players.length>this.match_players_count){
            this.match_players_count=this.living_players.length
        }

        this.send_feed_message({
            type:FeedMessageType.join,
            playerId:p.id,
            playerName:p.name,
            playerBadge:p.loadout.badge?.idNumber
        })

        if(this.game.statistics)this.game.statistics.player.players++

        this.game.update_data()
        p.inventory.set_weapon_index(0)

        this.game.modeManager.on_player_join(p)
        this.game.signals.emit("player_join",{player:p})

        const pos=this.game.modeManager.get_human_spawn_position(p)
        if(pos)p.position=pos
        return p
    }
    _add_player(player:Player){
        this.living_players.push(player)
        this.game.update_data()
        if(this.living_players.length>this.match_players_count){
            this.match_players_count=this.living_players.length
        }
    }
    add_enemy(def: HumanDefinition | string, packet: JoinPacket,player?:Player): Player | undefined {
        if(typeof def === "string"){
            def = this.game.humans.enemies[def]
        }
        if(!def) return
        const client=this.add_bot(packet,player)
        if(!client.human)return
        client.human.set_preset(def)
        return client.human as Player
    }
    get_global_update_packet(full:boolean):UpdatePacket{
        if(!this.global_buffer_1)this.global_buffer_1=new DynamicStream()
        this.global_buffer_1.clear()

        const up=new UpdatePacket()
        up.priv.splashes=this.splashes
        up.objects=this.game.scene_2d.objects.encode_all_net(full,undefined,this.global_buffer_1)
        return up
    }
    encode_frame(full:boolean){
        if(!this.global_buffer_2)this.global_buffer_2=new DynamicStream()
        this.global_buffer_2.clear()

        const up=this.get_global_update_packet(full)
        this.game.clients.packets_manager.encode(up,this.global_buffer_2)
        this.game.clients.packets_manager.encode(this.general_update,this.global_buffer_2)
        return this.global_buffer_2
    }
    encode_start_packet(){
        this.start_packet_stream.clear()
        const packet=new StartPacket()
        packet.settings=this.game.start_settings
        this.game.clients.packets_manager.encode(packet,this.start_packet_stream)
        ;(this.start_packet_stream as DynamicStream).lock()
    }
    update(dt:number){
        for(const p of Object.values(this.connected_bots)){
            if(p.ai)p.ai.AI(dt)
        }
    }
    net_update(){
        const s=this.buffer
        s.clear()

        this.general_update.content.started=this.game.started
        this.general_update.content.deadzone=undefined
        this.general_update.content.ambient=this.game.ambient
        this.general_update.content.living_count=this.game.modeManager.get_living_count()
        this.general_update.content.deadzone=this.game.deadzone.state

        this.game.clients.packets_manager.encode(this.general_update,s)

        for(const p of Object.values(this.connected_players)){
            p.net_update(s)
        }
        for(const p of Object.values(this.connected_bots)){
            p.net_update(s)
        }

        if(this.game.replay)this.game.replay.update()
        this.first_tick=false
    }
    send_feed_message(msg:FeedMessage){
        const p=new FeedPacket()
        p.message=msg
        this.game.clients.emit_packet(p)
    }
    connection(client:Client,username:string){
        if(this.connected_players[client.ID])return
        this.connected_players[client.ID]=new PlayerClient(this.game,client)
        client.send_stream(this.start_packet_stream)
        client.send_stream(this.game.map.map_packet_stream)
        this.connected_players[client.ID].connected=true
        client.on("join",(packet:JoinPacket)=>{
            if(this.game.closed)return
            if(packet.group_token.length>0){
                this.game.modeManager.proccess_group_token(client,packet.group_token)
            }
            this.connected_players[client.ID].join_packet=packet
            this.game.modeManager.on_player_connect(this.connected_players[client.ID])
            this.game.signals.emit("player_connect",{client:client})
            const p = this.connected_players[client.ID].add_player()
            if(p!==undefined){
                const jp=new JoinnedPacket()
                jp.ntps=this.game.ntps
                for(const lp of this.living_players){
                    if(lp.id===p.id)continue
                    jp.players.push({
                        id:lp.id,
                        name:lp.name,
                        badge:lp.loadout.badge?.idNumber
                    })
                }
                jp.date=this.game.ambient.date
                const leader=this.game.modeManager.get_leader()
                if(leader){
                    jp.leader={
                        id:leader.id,
                        kills:leader.status.kills,
                    }
                }
                this.game.modeManager.manage_joinned_packet(jp)
                client.emit_packet(jp)
                console.log(`${p.name} Join`)
            }
        })
        client.on("input",(p:InputPacket)=>{
            if(!this.connected_players[client.ID])return
            if(this.connected_players[client.ID].human&&!this.connected_players[client.ID].spectating){
                (this.connected_players[client.ID].human as Player).proccess_input(p)
            }
        })
        client.on(DefaultSignals.DISCONNECT,()=>{
            if(!this.connected_players[client.ID])return
            if(this.connected_players[client.ID].human)console.log(`${this.connected_players[client.ID].human!.name} Disconnected`)
            this.connected_players[client.ID].connected=false
            delete this.connected_players[client.ID]
        })
    }
}