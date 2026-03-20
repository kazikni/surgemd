import { Client, DefaultSignals, NetStream, RectHitbox2D, v2, ValidString } from "common/engine/core.ts";
import { Game } from "../others/game.ts";
import { GeneralUpdatePacket } from "common/scripts/packets/general_update.ts";
import { Player, PlayerConnManager } from "../objects/player.ts";
import { DamageSplash, UpdatePacket } from "common/scripts/packets/update_packet.ts";
import { type ServerGameObject } from "../others/gameObject.ts";
import { GameOverPacket } from "common/scripts/packets/gameOver.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { GameConstants } from "common/scripts/others/constants.ts";
import { KillFeedMessage, KillFeedMessageType, KillFeedPacket } from "common/scripts/packets/killfeed_packet.ts";
import { InputPacket } from "common/scripts/packets/input_packet.ts";
import { JoinnedPacket } from "common/scripts/packets/joinned_packet.ts";
import { BotAi } from "../human/ai/simple_bot_ai.ts";
export class BotClient extends PlayerConnManager{
    ai?:BotAi
    override net_update(general_update:NetStream): void {
        if(this.ai){
            this.ai.net_update(general_update)
        }
    }
    override send_game_over(win?: boolean, eliminated_by?: number): void {
        //
    }
}
export class PlayerClient extends PlayerConnManager{
    client:Client

    view_objects:ServerGameObject[]=[]
    first_tick:boolean=true

    constructor(game:Game,client:Client){
        super(game)
        this.client=client
        this.connected=false
    }
    override set_spectator(p: Player): void {
        super.set_spectator(p)
        this.view_objects=[]
    }
    override add_player(): Player | undefined {
        const ret=super.add_player()
        this.view_objects=[]
        return ret
    }
    get_update_packet():UpdatePacket{
        const up=new UpdatePacket()
        up.definition=this.game.definitions
        if(this.human&&!this.spectating){
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
            const camera_hb=RectHitbox2D.centered(v2.clone(this.human!.position),v2.new(40/scope_view,20/scope_view))

            const objs=this.get_update_packet_objects(camera_hb,this.human.layer)
            const o=this.human.game.scene_2d.objects.encode_list(objs,this.view_objects,undefined,undefined,undefined,this.first_tick)

            this.view_objects=o.last
            up.objects=o.strm

            this.first_tick=false
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
            const camera_hb=RectHitbox2D.centered(v2.clone(this.human!.position),v2.new(40/scope_view,20/scope_view))

            const objs=this.get_update_packet_objects(camera_hb,this.human.layer)
            const o=this.human.game.scene_2d.objects.encode_list(objs,this.view_objects,undefined,undefined,undefined,this.first_tick)

            this.view_objects=o.last
            up.objects=o.strm

            this.first_tick=false
        }
        return up
    }
    send_game_over(win:boolean=false,eliminated_by:number=0){
        if(!this.human||!(this.human instanceof Player))return

        const p=new GameOverPacket()
        p.Kills=this.human.status.kills
        p.DamageDealth=this.human.status.damage
        p.Win=win
        p.Score=this.human.status.score
        p.Eliminator=eliminated_by

        this.client!.emit(p)
    }
    net_update(general_update:NetStream){
        if(this.client.opened){
            const packet=this.get_update_packet()
            if(packet.objects)this.client!.emit(packet)
            this.client.sendStream(general_update)
        }
    }
}
export class PlayersManager{
    game:Game

    splashes:DamageSplash[]=[]
    general_update:GeneralUpdatePacket=new GeneralUpdatePacket()

    connected_players:Record<number,PlayerClient>={}
    connected_bots:BotClient[]=[]
    living_players:Player[]=[]

    constructor(game:Game){
        this.game=game
    }
    add_bot(packet:JoinPacket):BotClient{
        const client=new BotClient(this.game)
        const p=this.add_player(new Player(),packet) as Player
        p.conn=client
        client.set_active_player(p)

        this.game.modeManager.on_player_connect(p)
        this.connected_bots.push(client)
        return client
    }
    add_player(player:Player,packet:JoinPacket,id?:number):Player{
        player.player_manager=this
        const p=this.game.humans.add_human(player,id) as Player

        if(ValidString.simple_characters(packet.player_name)){
            p.name=packet.player_name
        }else{
            //Round6 Easter Egg
            p.name=`${GameConstants.player.defaultName}#${Math.random()<=0.005?456:this.living_players.length+1}`
        }

        this.living_players.push(p)

        this.send_killfeed_message({
            type:KillFeedMessageType.join,
            playerId:p.id,
            playerName:p.name,
            playerBadge:p.loadout.badge?.idNumber
        })

        if(this.game.statistics)this.game.statistics.player.players++

        this.game.update_data()
        p.inventory.set_weapon_index(0)

        this.game.modeManager.on_player_join(p)

        const pos=this.game.modeManager.get_human_spawn_position(p)
        if(pos)p.position=pos
        return p
    }
    get_global_update_packet(full:boolean):UpdatePacket{
        const up=new UpdatePacket()
        up.priv.splashes=this.splashes
        up.objects=this.game.scene_2d.objects.encode_all(full)
        return up
    }
    encode_frame(stream:NetStream,full:boolean){
        const up=this.get_global_update_packet(full)

        this.game.clients.packets_manager.encode(up,stream)
    }
    update(dt:number){
        for(const p of Object.values(this.connected_bots)){
            if(p.ai)p.ai.AI(dt)
        }
    }
    net_update(){
        const s=new NetStream(new ArrayBuffer(5*1024))

        this.general_update.content.planes=this.game.planes
        this.general_update.content.deadzone=undefined
        this.general_update.content.ambient=this.game.ambient

        this.general_update.content.dirty=this.game.dirty
        this.general_update.content.living_count=this.game.modeManager.get_living_count()

        if(this.game.deadzone.dirty){
            this.general_update.content.deadzone=this.game.deadzone.state
        }

        s.writeUint16(this.general_update.ID)
        this.general_update.encode(s)
        for(const p of Object.values(this.connected_players)){
            p.net_update(s)
        }
        for(const p of Object.values(this.connected_bots)){
            p.net_update(s)
        }

        this.game.scene_2d.objects.update_to_net()
        this.game.scene_2d.objects.apply_destroy_queue()
    }
    send_killfeed_message(msg:KillFeedMessage){
        const p=new KillFeedPacket()
        p.message=msg
        this.game.clients.emit(p)
    }
    connection(client:Client,username:string){
        if(this.connected_players[client.ID])return
        this.connected_players[client.ID]=new PlayerClient(this.game,client)
        client.sendStream(this.game.map.map_packet_stream)
        this.connected_players[client.ID].connected=true
        client.on("join",(packet:JoinPacket)=>{
            this.connected_players[client.ID].join_packet=packet
            if(this.game.modeManager.can_join()){
                const p = this.connected_players[client.ID].add_player()

                if(p!==undefined){
                    const jp=new JoinnedPacket()
                    for(const lp of this.living_players){
                        if(lp.id===p.id)continue
                        jp.players.push({
                            id:lp.id,
                            name:lp.name,
                            badge:lp.loadout.badge?.idNumber
                        })
                    }
                    jp.date=this.game.ambient.date
                    if(this.game.modeManager.kill_leader){
                        jp.kill_leader={
                            id:this.game.modeManager.kill_leader.id,
                            kills:this.game.modeManager.kill_leader.status.kills,
                        }
                    }

                    this.game.modeManager.manage_joinned_packet(jp)
                    client.emit(jp)
                    console.log(`${p.name} Join`)

                    this.game.modeManager.on_player_connect(p)
                }
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