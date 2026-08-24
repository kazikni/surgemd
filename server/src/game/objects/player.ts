import { SelfStateUpdate } from "common/scripts/packets/update_packet.ts";
import { Human } from "./human.ts";
import { DamageParams } from "../others/utils.ts";
import { DamageReason, HumanDefinition } from "common/scripts/definitions/utils.ts";
import { PlayersManager } from "../managers/players_manager.ts";
import { InputPacket } from "common/scripts/packets/input_packet.ts";
import { type Game } from "../others/game.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { Stream, RectHitbox2D } from "common/engine/core.ts";
import { type ServerGameObject } from "../others/gameObject.ts";
import { SideEffect } from "common/scripts/definitions/player/effects.ts";
import { LoadoutAccessoryDef, LoadoutEyesDef, LoadoutHairDef, LoadoutShirtDef } from "common/scripts/definitions/loadout/skins.ts";
import { PlayerStatus } from "common/scripts/others/constants.ts";
import { FeedMessageType } from "common/scripts/packets/general_update.ts";
export abstract class PlayerConnManager{
    game:Game
    human?:Human|Player
    real_human?:Human|Player
    spectating:boolean=false
    connected:boolean=true
    join_packet?:JoinPacket

    constructor(game:Game){
        this.game=game
    }
    abstract send_game_over(status:PlayerStatus[],win?:boolean,eliminated_by?:number):void;
    set_spectator(p:Player) {
        this.spectating=true
        this.human=p
    }
    set_active_player(p:Player) {
        this.spectating=false
        this.human=p
        this.real_human=p
        p.conn=this
    }
    add_player():Player|undefined{
        if(this.join_packet&&!this.game.fineshed&&!(this.human&&!this.human.dead)&&this.connected){
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
    on_revive(human:Human){
        this.spectating=false
        this.human=human
    }
    revive(){
        if(!this.real_human)return
        this.real_human.revive()
    }
    get_update_packet_objects(camera_hb:RectHitbox2D,layer:number):ServerGameObject[]{
        const layers=[layer-2,layer-1,layer,layer+1,layer+2]
        const objs=this.game.scene_2d.cells.get_objects_layers(camera_hb,layers)
        return [...objs,...Object.values(this.game.always_visible)]
    }
    abstract net_update(general_update:Stream):void
}
export class Player extends Human{
    username:string=""

    override is_player: boolean=true

    conn?:PlayerConnManager

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
    override status:PlayerStatus
    constructor(){
        super()
        this.status={
            id:0,
            damage:0,
            damage_taken:0,
            kills:0,
            score:0,
            time_alive:0,
            score_applyer:[]
        }
        this.spawn_body=true
    }
    override reset_status(): void {
        super.reset_status()
        this.status.score_applyer.length=0
        this.status.time_alive=0
        this.status.id=this.id
    }
    override on_create(args: Record<string, void>): void {
        super.on_create(args)
        this.status.id=this.id
    }
    override apply_score(type: number, amount: number,multiplier:number=1): void {
        if(this.game.modeManager.is_leader(this))multiplier*=this.game.modeManager.rules.score.leader_multiplier
        super.apply_score(type,amount,multiplier)
        if(this.status.score_applyer.length>0&&this.status.score_applyer[this.status.score_applyer.length-1].type===type&&this.status.score_applyer[this.status.score_applyer.length-1].multiplier===multiplier){
            this.status.score_applyer[this.status.score_applyer.length-1].amount+=amount*=multiplier
        }else{
            this.status.score_applyer.push({
                amount:amount,
                type:type,
                multiplier:multiplier
            })
        }
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
        if(preset.ai){
            if(this.is_bot&&this.conn){
                //@ts-ignore
                this.conn.ai=this.make_ai_from_def(preset.ai)
            }
        }
    }
    override on_tick(dt: number): void {
        super.on_tick(dt)
        this.status.time_alive+=dt
    }
    override piercing_damage(params: DamageParams){
        const rr=super.piercing_damage(params)
        if(this.team_data.group)this.team_data.group.dirty=true
        return rr
    }
    override down(params: DamageParams): void {
        super.down(params)
        if(params.owner&&params.owner instanceof Player){
            this.game.feed_messages.push({
                killer:(params.reason===DamageReason.Explosion||params.reason===DamageReason.Human)?{
                    id:params.owner.id,
                    kills:params.owner.status.kills,
                }:undefined,
                victimId:this.id,
                used:this.game.definitions.game_objects.keysString[params.source!.idString],
                damage_reason:params.reason,
                type:FeedMessageType.down,
            })
        }else{
            this.game.feed_messages.push({
                killer:undefined,
                victimId:this.id,
                damage_reason:params.reason,
                type:FeedMessageType.down,
            })
        }
        if(this.team_data.group)this.team_data.group.dirty=true
    }
    override die(params: DamageParams): void {
        if(this.dead)return
        super.die(params)

        if(this.killed_by&&this.killed_by instanceof Player){
            this.game.feed_messages.push({
                killer:{
                    id:this.killed_by.id,
                    kills:this.killed_by.status.kills,
                },
                used:this.game.definitions.game_objects.keysString[params.source?.idString??""]??0,
                victimId:this.id,
                type:FeedMessageType.kill,
                damage_reason:params.reason,
            })

            if(this.game.statistics){
                this.game.statistics.items.kills[params.source!.idString]=(this.game.statistics.items.kills[params.source!.idString]??0)+1
            }
        }else{
            this.game.feed_messages.push({
                killer:undefined,
                victimId:this.id,
                type:FeedMessageType.kill,
                damage_reason:params.reason,
            })
        }

        this.game.players.living_players.splice(this.game.players.living_players.indexOf(this),1);

        this.game.modeManager.on_player_die(this)
        this.game.signals.emit("player_die",{player:this,killer:this.killed_by})
        this.game.update_data()

        if(this.team_data.group)this.team_data.group.dirty=true
    }
    override revive(): void {
        if(!this.dead)return
        super.revive()
        this.game.players._add_player(this)
        if(this.conn&&this.conn.real_human===this){
            this.conn.on_revive(this)
        }
        this.game.feed_messages.push({
            type:FeedMessageType.set_name,
            playerId:this.id,
            playerName:this.name
        })
    }
    override side_effect(sf:SideEffect){
        super.side_effect(sf)
        if(this.team_data.group)this.team_data.group.dirty=true
    }
    override self_state(full: boolean): SelfStateUpdate {
        const ret=super.self_state(full)
        ret.money=0
        if(this.team_data.group){
            if(this.team_data.group.dirty||full){
                ret.dirty.group=true
                ret.group=this.team_data.group.get_state()
            }
        }
        return ret
    }
    proccess_input(i:InputPacket){
        if(this.script)return
        this.input.movement=i.movement

        this.input.auto_click=i.auto_fire??true
        if(this.input.auto_click){
            this.input.using_item_down=true
        }else if(!this.input.using_item&&i.use_weapon){
            this.input.using_item_down=true
        }

        this.input.rotation=i.angle
        this.input.using_item=i.use_weapon
        this.input.using_item_alt=i.alt_use_weapon
        this.input.dist_to_pointer=i.distance_to_aim

        this.input.interaction=i.interact||this.input.interaction
        this.input.reload=i.reload||this.input.reload
        this.input.swamp_guns=i.swamp_guns||this.input.swamp_guns
        this.input.actions.push(...i.actions)

        this.input.cancel=i.cancel
    }
    proccess_join_packet(jp:JoinPacket){
        this.visual.dirty=true
        if(jp.skin){
            this.visual.eyes=this.game.definitions.loadout.getFromString(jp.skin.female?"eyes_2":"eyes_1") as LoadoutEyesDef
            this.visual.hair={
                tint:jp.skin.hair_tint,
                def:this.game.definitions.loadout.getFromNumber(jp.skin.hair) as LoadoutHairDef
            }
            this.visual.body.tint=jp.skin.body_tint
            this.visual.shirt=this.game.definitions.loadout.getFromNumber(jp.skin.shirt) as LoadoutShirtDef
            this.visual.accessorys=[]
            if(jp.skin.female){
                this.visual.accessorys=[this.game.definitions.loadout.getFromString("white_hair_bow") as LoadoutAccessoryDef]
            }
        }
        this.visual.wrapping=this.game.definitions.wrapping.getFromNumberSafe(jp.wrapping)
        this.visual.badge=this.game.definitions.badges.getFromNumberSafe(jp.badge)
        this.visual.emotes.victory=this.game.definitions.emotes.getFromNumberSafe(jp.victory_emote)
        this.visual.emotes.death=this.game.definitions.emotes.getFromNumberSafe(jp.death_emote)
    }
}