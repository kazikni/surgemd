import { PlayerStatus, ScoreApplyerType, Spawn, SpawnMode } from "common/scripts/others/constants.ts";
import { ModeManager } from "./modeManager.ts";
import { type Human } from "../objects/human.ts";
import { Player } from "../objects/player.ts";
import { MapDef} from "common/scripts/definitions/maps/base.ts";
import { v2, Vec2 } from "common/engine/core.ts";
import { Group, GroupsManager, Team, TeamsManager} from "./teams.ts";
import { DeadZoneConfig, DefaultDeadzone } from "../others/deadzone.ts";
import { DebugMap } from "common/scripts/definitions/maps/debug.ts";
import { FeedMessageType } from "common/scripts/packets/general_update.ts";
import { NormalMap } from "common/scripts/definitions/maps/normal.ts";
import { LocationDrone } from "../objects/drone.ts";
export interface AirdropConfig{
    spawn:number[]
    obstacle:string
}
export interface DronesConfig{
    spawn:number[]
}
export interface BattleRoyaleSettings{
    players?:{
        limit?:number
        group_spawn?:boolean
    }
    join_time?:number
    map?:{
        def:MapDef|string
        seed?:number
        disable_minimap?:boolean
    }
    spawn_mode?:SpawnMode
    deadzone?:DeadZoneConfig
    airdrops?:AirdropConfig
    drones?:DronesConfig
    teams?:number
    group_size?:number
}
export class BattleRoyale extends ModeManager{
    leader?:Player
    settings:{
        players:{
            limit:number
            group_spawn:boolean
        }
        join_time:number
        map:{
            def:MapDef|string
            seed?:number
            disable_minimap?:boolean
        }
        spawn_mode:SpawnMode
        deadzone:DeadZoneConfig
        airdrops:AirdropConfig
        drones:DronesConfig
    }
    groups_manager?:GroupsManager
    group_size:number
    teams_manager?:TeamsManager
    teams:number

    constructor(settings:BattleRoyaleSettings={},group_size:number=1,teams:number=0){
        super()
        this.settings={
            players:{
                limit:settings.players?.limit??100,
                group_spawn:settings.players?.group_spawn===undefined?true:settings.players.group_spawn,
            },
            join_time:settings.join_time??90,
            map:{
                def:settings.map?.def??"normal",
                seed:settings.map?.seed,
                disable_minimap:settings.map?.disable_minimap
            },
            spawn_mode:settings.spawn_mode??Spawn.grass,
            deadzone:settings.deadzone??DefaultDeadzone,
            airdrops:settings.airdrops??{
                obstacle:"iron_crate",
                spawn:[
                    20,150,301
                ]
            },
            drones:settings.drones??{
                spawn:[20,301]
            }
        }
        this.group_size=settings.group_size===undefined?group_size:settings.group_size
        if(this.group_size>1){
            this.groups_manager=new GroupsManager()
        }
        this.teams=settings.teams===undefined?teams:settings.teams
        if(this.teams>0){
            this.teams_manager=new TeamsManager()
            for(let i=0;i<this.teams;i++){
                this.teams_manager.add_team()
            }
        }
    }

    override get_group(group:number):Group|undefined{
        if(!this.groups_manager)return undefined
        return this.groups_manager.groups[group]
    }
    override create_group(id?: number, group?: Group): Group | undefined {
        if(!this.groups_manager)return
        return this.groups_manager.add_group(id,group)
    }
    override get_team(team:number):Team|undefined{
        if(!this.teams_manager)return undefined
        return this.teams_manager.teams[team]
    }
    override create_team(team?: Team): Team | undefined {
        if(!this.teams_manager)return
        return this.teams_manager.add_team(team)
    }
    override on_start(){
        this.game.deadzone.start()
        for(const p of this.settings.airdrops.spawn){
            this.game.clock.add_timeout(()=>{
                this.game.scene_2d.add_airdrop()
            },p)
        }
        for(const d of this.settings.drones.spawn){
            this.game.clock.add_timeout(()=>{
                this.game.scene_2d.add_drone(undefined,undefined,new LocationDrone())
            },d)
        }
        this.game.clock.add_timeout(()=>{
            this.game.close()
        },this.settings.join_time)
    }
    override on_tick(dt: number): void {
        if(this.groups_manager)this.groups_manager.tick(dt)
        if(this.teams_manager)this.teams_manager.tick(dt)
    }
    override on_net_update(){
        if(this.groups_manager)this.groups_manager.net_update()
        if(this.teams_manager)this.teams_manager.net_update()
    }
    override reset(): void {
        if(this.groups_manager)this.groups_manager.reset()
        if(this.teams_manager)this.teams_manager.reset()
    }
    override can_down(human: Human): boolean {
        if(this.teams_manager&&(human.team_data.team&&human.team_data.team.can_down(human))!){
            return true
        }
        if(this.groups_manager&&(human.team_data.group&&human.team_data.group.can_down(human))!){
            return true
        }
        return false
    }
    override is_ally(a: Human, b: Human): boolean {
        if(this.teams_manager&&a.team_data.team_id===b.team_data.team_id){
            return true
        }
        if(this.groups_manager&&a.team_data.group_id===b.team_data.group_id) {
            return true
        }
        return false
    }
    can_join():boolean{
        return this.game.players.living_players.length<this.settings.players.limit
    }
    can_start(): boolean {
        if (this.teams_manager) {
            return this.teams_manager.get_living_teams().length > 1
        }
        if (this.groups_manager) {
            return this.groups_manager.get_living_groups().length > 1
        }
        return this.game.players.living_players.length > 1
    }

    can_be_leader(p:Human):boolean{
        return p instanceof Player&&(this.leader===undefined?p.status.kills>=this.rules.leader.kills_min:this.leader.status.kills<p.status.kills)
    }
    is_leader(p:Human):boolean{
        return this.leader?.id===p.id
    }
    get_leader(): Human|undefined {
        return this.leader
    }
    assign_leader(p:Human):boolean{
        if(this.can_be_leader(p)){
            this.leader=p as Player
            this.game.scene_2d.feed_messages.push({
                type:FeedMessageType.leader_assigned,
                player:{
                    id:p.id,
                    kills:p.status.kills
                }
            })
            return true
        }
        return false
    }
    leader_die(p:Human){
        this.leader=undefined
        this.game.scene_2d.feed_messages.push({
            type:FeedMessageType.leader_dead,
            player:{
                id:p.id,
                kills:p.status.kills
            }
        })
    }
    override search_leader(): Human | undefined {
        let selected:Player|undefined
        let selected_kills:number=0
        for(const p of this.game.players.living_players){
            if(!p.dead&&(!selected||selected_kills<selected.status.kills)){
                selected_kills=p.status.kills
                selected=p
            }
        }
        if(selected)this.assign_leader(selected)
        return selected
    }
    give_rank_score(){
        this.game.players.apply_score(ScoreApplyerType.Rank,this.rules.score.rank_reward/this.game.players.match_players_count)
    }
    override on_player_join(p: Player): void {
        if(this.groups_manager){
            this.set_group_for_human(p)
        }
        this.game.start()
        if(!this.can_join()){
            this.game.close()
        }
    }
    override on_player_die(p:Player){
        if(this.game.fineshed){
            return
        }
        this.game.scene_2d.leaderboards.push({
            id:p.id,
            kills:p.status.kills,
            score:p.status.score,
            rank:this.game.players.living_players.length+1,
        })
        if(p.conn){
            const status=p.team_data.group?.get_status() ?? [p.status]
            p.conn?.send_game_over(status as PlayerStatus[],false,p.killed_by?.id)
        }
        if(this.game.started){
            this.give_rank_score()

            let stopped:boolean=false
            let winners:Player[]=[]
            if(this.game.players.living_players.length<=1||(this.groups_manager&&this.groups_manager.get_living_groups().length<=1)){
                winners=[...this.game.players.living_players]
                stopped=true
            }
            if(stopped){
                for(const w of winners){
                    if(w.visual.emotes.victory){
                        w.input.emote=w.visual.emotes.victory
                    }
                }
                this.game.finish(winners,2)
            }
        }
    }
    override on_human_revive(human: Human): void {
        this.set_group_for_human(human)
        const pos=this.get_human_spawn_position(human)
        if(pos)human.position=pos
    }
    override on_finish(winners:Player[]): void {
        for(const p of this.game.players.living_players){
            this.give_rank_score()
            this.game.scene_2d.leaderboards.push({
                id:p.id,
                kills:p.status.kills,
                score:p.status.score,
                rank:1,
            })
        }
        this.game.players.apply_score(ScoreApplyerType.Win,this.rules.score.win_reward)
        for(const p of winners){
            p.conn?.send_game_over((p.team_data.group?.get_status()??[p.status]) as PlayerStatus[],true)
        }
    }
    override set_group_for_human(p: Human){
        if(!this.groups_manager) return
        if(p.team_data.group === undefined){
            let g = this.groups_manager.find_group(this.group_size,p.team_data.team_id)
            if(!g){
                g = this.groups_manager.add_group()
            }
            g.add_human(p)
        }
    }
    override async generate_map(): Promise<void> {
        this.game.map.generate(await this.load_map(this.settings.map.def??"normal")??NormalMap,this.settings.map.seed,!this.settings.map.disable_minimap)
        this.game.deadzone.set_config(this.settings.deadzone)
        //this.game.deadzone.start()
    }
    override get_human_spawn_position(h:Human):Vec2|undefined{
        if(h.team_data.group&&this.settings.players.group_spawn){
            const c=h.team_data.group.choose_human(h)
            if(c?.position)return c.position
        }
        return this.game.map.getRandomPosition(h.base_hitbox,h.id,h.layer,this.settings.spawn_mode,this.game.map.random)
    }
}
export class BattleRoyaleDebug extends BattleRoyale{
    constructor(settings:BattleRoyaleSettings,group_size?:number) {
        const s={...settings}
        if(!s.map?.def){
            s.map={def:DebugMap}
        }
        super(s,group_size)
    }
    override on_start(){
    }
    override async generate_map(): Promise<void> {
        this.game.map.generate(await this.load_map(this.settings.map.def??"debug")??DebugMap,this.settings.map.seed,!this.settings.map.disable_minimap)
    }
    override get_human_spawn_position(h:Human):Vec2|undefined{
        return v2.dscale(this.game.map.size,2)
    }
}