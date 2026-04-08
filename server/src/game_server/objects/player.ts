import { SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
import { Human } from "./human.ts";
import { DamageParams } from "../others/utils.ts";
import { DamageReason } from "common/scripts/definitions/utils.ts";
import { KillFeedMessageType } from "common/scripts/packets/killfeed_packet.ts";
import { PlayersManager } from "../managers/players_manager.ts";
import { InputPacket } from "common/scripts/packets/input_packet.ts";
import { type Game } from "../others/game.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { NetStream, RectHitbox2D } from "common/engine/core.ts";
import { type ServerGameObject } from "../others/gameObject.ts";
import { Layers } from "common/scripts/others/constants.ts";
import { HumanDefinition } from "common/scripts/config/level_definition.ts";
import { SideEffect } from "common/scripts/definitions/player/effects.ts";
export abstract class PlayerConnManager{
    game:Game
    human?:Human|Player
    spectating:boolean=false
    connected:boolean=true
    join_packet?:JoinPacket

    constructor(game:Game){
        this.game=game
    }
    abstract send_game_over(win?:boolean,eliminated_by?:number):void;
    set_spectator(p:Player) {
        this.spectating=true
        this.human=p
    }
    set_active_player(p:Player) {
        this.spectating=false
        this.human=p
        p.conn=this
    }
    add_player():Player|undefined{
        if(this.join_packet&&!this.game.fineshed&&!(this.human&&!this.human.health_data.dead)&&this.connected){
            let p=new Player()
            if(this.human){
                p.status=(this.human as Player).status
                p.team_data=this.human.team_data

                if(p.team_data.team){
                    p.team_data.team.replace(this.human,p)
                }
                if(p.team_data.group){
                    p.team_data.group.replace(this.human,p)
                }
            }
            p=this.game.players.add_player(p,this.join_packet)
            this.set_active_player(p)
            return p
        }
    }
    get_update_packet_objects(camera_hb:RectHitbox2D,layer:number):ServerGameObject[]{
        const layers=layer>=Layers.Normal?[Layers.Normal,Layers.Normal+1,Layers.Normal+2,Layers.Normal+3,Layers.Normal+4]:[layer]
        const objs=this.game.scene_2d.cells.get_objects_layers(camera_hb,layers)
        return objs
    }
    abstract net_update(general_update:NetStream):void
}
export class Player extends Human{
    username:string=""

    override is_player: boolean=true

    conn?:PlayerConnManager

    status={
        damage:0,
        kills:0,
        rank:0,
        money:0,
        score:0,

        time_alive:0
    }
    account_status={
        coins:0,
        xp:0,
        wins:0,
        special_wins:0,
        games_total:0,
        kills:0,
    }
    earned={
        coins:0,
        xp:0,
        score:0,
        win:0,
    }

    player_manager!:PlayersManager
    constructor(){
        super()
    }
    override set_preset(preset: HumanDefinition|undefined): void {
        if(!preset)return
        super.set_preset(preset)
        if(preset.team){
            this.game.modeManager.get_team(preset.team)?.add_human(this)
        }
        if(preset.group){
            this.game.modeManager.get_team(preset.group)?.add_human(this)
        }
    }
    override net_update(): void {
        super.net_update()
    }
    override update(dt: number): void {
        super.update(dt)
        this.status.time_alive+=dt
    }
    override piercing_damage(params: DamageParams){
        const rr=super.piercing_damage(params)
        if (params.owner && params.owner instanceof Player && params.owner.id !== this.id && params.reason !== DamageReason.Bleend) {
            params.owner.status.damage += (rr[1] + rr[0])
        }

        if(this.team_data.group)this.team_data.group.dirty=true
        return rr
    }
    override down(params: DamageParams): void {
        super.down(params)
        if(params.owner&&params.owner instanceof Player){
            this.player_manager.send_killfeed_message({
                killer:(params.reason===DamageReason.Explosion||params.reason===DamageReason.Human)?{
                    id:params.owner.id,
                    kills:params.owner.status.kills,
                    used:this.game.definitions.game_items.keysString[params.source!.idString]
                }:undefined,
                victimId:this.id,
                damage_reason:params.reason,
                type:KillFeedMessageType.down,
            })
        }else{
            this.player_manager.send_killfeed_message({
                killer:undefined,
                victimId:this.id,
                damage_reason:params.reason,
                type:KillFeedMessageType.down,
            })
        }
        if(this.team_data.group)this.team_data.group.dirty=true
    }
    override die(params: DamageParams): void {
        if(this.health_data.dead)return
        super.die(params)

        if(this.game.modeManager.kill_leader&&this.game.modeManager.kill_leader===this){
            this.game.modeManager.kill_leader=undefined
            this.player_manager.send_killfeed_message({
                type:KillFeedMessageType.killleader_dead,
                player:{
                    id:this.id,
                    kills:this.status.kills
                }
            })
        }

        if(params.owner&&params.owner instanceof Player){
            if(params.owner.id!==this.id&&(params.owner.username===""||params.owner.username!==this.username)&&!this.game.modeManager.is_ally(this,params.owner)){
                params.owner.earned.coins+=3
                params.owner.earned.xp+=1
                params.owner.earned.score+=5
            }
            this.player_manager.send_killfeed_message({
                killer:(params.reason===DamageReason.Explosion||params.reason===DamageReason.Human)?{
                    id:params.owner.id,
                    kills:params.owner.status.kills,
                    used:this.game.definitions.game_items.keysString[params.source!.idString]
                }:undefined,
                victimId:this.id,
                type:KillFeedMessageType.kill,
                damage_reason:params.reason,
            })
            if((!this.game.modeManager.kill_leader&&params.owner.status.kills>=3)||(this.game.modeManager.kill_leader&&this.game.modeManager.kill_leader.status.kills<params.owner.status.kills)){
                this.game.modeManager.kill_leader=params.owner
                this.player_manager.send_killfeed_message({
                    type:KillFeedMessageType.killleader_assigned,
                    player:{
                        id:params.owner.id,
                        kills:params.owner.status.kills
                    }
                })
            }
            if(this.game.statistics){
                this.game.statistics.items.kills[params.source!.idString]=(this.game.statistics.items.kills[params.source!.idString]??0)+1
            }
        }else{
            this.player_manager.send_killfeed_message({
                killer:undefined,
                victimId:this.id,
                type:KillFeedMessageType.kill,
                damage_reason:params.reason,
            })
        }

        //Respawn
        this.game.players.living_players.splice(this.game.players.living_players.indexOf(this),1);
        this.game.dirty.living_count=true

        this.game.modeManager.on_player_die(this)
        this.game.signals.emit("player_die",{player:this,killer:this.killed_by})
        this.game.update_data()

        if(this.team_data.group)this.team_data.group.dirty=true
    }
    override side_effect(sf:SideEffect){
        super.side_effect(sf)
        if(this.team_data.group)this.team_data.group.dirty=true
    }
    override self_state(full: boolean): SelfStateUpdate {
        const ret=super.self_state(full)
        ret.money=this.status.money
        if(this.team_data.group){
            if(this.team_data.group.dirty||full){
                ret.dirty.group=true
                ret.group=this.team_data.group.get_state()
            }
        }
        return ret
    }
    reset_status(){
        this.status.damage=0
        this.status.kills=0
        this.status.money=0
        this.status.rank=0
        this.status.score=0
        this.status.time_alive=0
    }
    proccess_input(i:InputPacket){
        this.input.movement=i.movement

        if(this.input.auto_click){
            this.input.using_item_down=i.use_weapon
        }else if(!this.input.using_item&&i.use_weapon){
            this.input.using_item_down=true
        }

        this.input.rotation=i.angle
        this.input.using_item=i.use_weapon
        this.input.dist_to_pointer=i.distance_to_aim

        this.input.interaction=i.interact||this.input.interaction
        this.input.reload=i.reload||this.input.reload
        this.input.swamp_guns=i.swamp_guns||this.input.swamp_guns
        this.input.actions.push(...i.actions)
    }
}