import { PlayerStatus, ScoreApplyerType, Spawn, SpawnMode } from "common/scripts/others/constants.ts";
import { ModeManager } from "./modeManager.ts";
import { type Human } from "../objects/human.ts";
import { Player } from "../objects/player.ts";
import { MapDef, Maps } from "common/scripts/definitions/maps/base.ts";
import { v2, v2m, Vec2 } from "common/engine/core.ts";
import { GroupsManager} from "./teams.ts";
import { DeadZoneConfig, DefaultDeadzone } from "../others/deadzone.ts";
import { LevelEnemys } from "common/scripts/config/level_definition.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { FeedMessageType } from "common/scripts/packets/feed_packet.ts";
export interface AirdropConfig{
    spawn:number[]
    obstacle:string
}
export interface BattleRoyaleSettings{
    players?:{
        limit?:number
    }
    map?:{
        def:MapDef|string
        seed?:number
    }
    spawn_mode?:SpawnMode
    deadzone?:DeadZoneConfig
    enemies?:LevelEnemys
    airdrops?:AirdropConfig
}
export class BattleRoyale extends ModeManager{
    leader?:Player

    settings:{
        players:{
            limit:number
        }
        map:{
            def:MapDef
            seed?:number
        }
        spawn_mode:SpawnMode
        deadzone:DeadZoneConfig
        airdrops:AirdropConfig
        enemies?:LevelEnemys
    }
    groups_manager?:GroupsManager
    group_size:number

    constructor(settings:BattleRoyaleSettings={},group_size:number=1){
        super()
        this.settings={
            players:{
                limit:settings.players?.limit??100,
            },
            map:{
                def:(settings.map?.def===undefined)?Maps["normal"]:(typeof settings.map.def==="string"?Maps[settings.map.def]:settings.map.def),
                seed:settings.map?.seed
            },
            spawn_mode:settings.spawn_mode??Spawn.grass,
            deadzone:settings.deadzone??DefaultDeadzone,
            enemies:settings.enemies,
            airdrops:settings.airdrops??{
                obstacle:"iron_crate",
                spawn:[
                    20,150,301
                ]
            }
        }
        this.group_size=group_size
        if(group_size > 1){
            this.groups_manager = new GroupsManager()
        }
    }
    add_enemies(enemies:LevelEnemys|undefined=this.settings.enemies){
        if(!enemies) return
        for(const e of enemies){
            const count = e.count ?? 1
            for(let i = 0; i < count; i++){
                const bot = this.game.players.add_enemy(e.def,new JoinPacket())
                if(!bot) continue
                if(e.position){
                    v2m.set(bot.position, e.position.x, e.position.y)
                }else{
                    const pos = this.get_human_spawn_position(bot)
                    if(pos) bot.position = pos
                }
            }
        }
    }

    override on_start(){
        this.add_enemies()
        this.game.deadzone.start()
        for(const p of this.settings.airdrops.spawn){
            this.game.add_timeout(()=>{
                this.game.add_airdrop()
            },p)
        }
        this.game.add_timeout(()=>{
            this.game.close()
        },120)
    }
    override on_tick(dt: number): void {
        if(this.groups_manager)this.groups_manager.tick(dt)
    }
    override reset(): void {
        if(this.groups_manager)this.groups_manager.reset()
    }
    override can_down(human: Human): boolean {
        if (!this.groups_manager) {
            return false
        }
        return (human.team_data.group&&human.team_data.group.can_down(human))!
    }
    override is_ally(a: Human, b: Human): boolean {
        if (!this.groups_manager) {
            return false
        }
        return a.team_data.group_id === b.team_data.group_id
    }
    can_join():boolean{
        return this.game.players.living_players.length<this.settings.players.limit
    }
    can_start(): boolean {
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
            this.game.players.send_feed_message({
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
        this.game.players.send_feed_message({
            type:FeedMessageType.leader_dead,
            player:{
                id:p.id,
                kills:p.status.kills
            }
        })
    }
    give_rank_score(){
        this.game.players.apply_score(ScoreApplyerType.Rank,this.rules.score.rank_reward/this.game.players.match_players_count)
    }
    override on_net_update(){
        if(this.groups_manager)this.groups_manager.net_update()
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
        this.game.leaderboards.push({
            id:p.id,
            kills:p.status.kills,
            score:p.status.score,
            rank:this.game.players.living_players.length+1,
        })
        if(p.conn){
            const status=p.team_data.group?.get_status() ?? [p.status]
            p.conn?.send_game_over(status as PlayerStatus[],false,p.killed_by?.id)
        }
        if(p.killed_by&&p.conn&&p.killed_by instanceof Player)this.game.add_timeout(()=>{
            p.conn!.set_spectator(p.killed_by! as Player)
        },2)
        if(this.game.started){
            this.give_rank_score()
            if(this.groups_manager&&this.groups_manager.get_living_groups().length<=1){
                this.game.add_timeout(()=>{
                    this.game.finish()
                },3)
            }else if(this.game.players.living_players.length<=1){
                this.game.add_timeout(()=>{
                    this.game.finish()
                },3)
            }
        }
    }
    override on_finish(): void {
        for(const p of this.game.players.living_players){
            this.give_rank_score()
            this.game.leaderboards.push({
                id:p.id,
                kills:p.status.kills,
                score:p.status.score,
                rank:1,
            })
        }
        this.game.players.apply_score(ScoreApplyerType.Win,this.rules.score.win_reward)
        for(const p of this.game.players.living_players){
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
    override generate_map(): void {
        this.game.map.generate(this.settings.map.def,this.settings.map.seed)
        this.game.deadzone.set_config(this.settings.deadzone)
        //this.game.deadzone.start()
    }
    override get_human_spawn_position(h:Human):Vec2|undefined{
        if(h.team_data.group){
            const c=h.team_data.group.choose_human(h)
            if(c?.position)return c.position
        }
        return this.game.map.getRandomPosition(h.base_hitbox,h.id,h.layer,this.settings.spawn_mode,this.game.map.random)
    }
}
export class BattleRoyaleDebug extends BattleRoyale{
    constructor(settings:BattleRoyaleSettings,group_size?:number) {
        if(!settings.map?.def){
            settings.map={def:Maps["debug"]}
        }
        super(settings,group_size)
    }
    override on_start(){
    }
    override generate_map(): void {
        this.game.map.generate(this.settings.map.def,this.settings.map.seed)
    }
    override get_human_spawn_position(h:Human):Vec2|undefined{
        return v2.dscale(this.game.map.size,2)
    }
}