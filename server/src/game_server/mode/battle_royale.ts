import { PlayerStatus, ScoreApplyerType, Spawn, SpawnMode } from "common/scripts/others/constants.ts";
import { ModeManager } from "./modeManager.ts";
import { type Human } from "../objects/human.ts";
import { Player } from "../objects/player.ts";
import { MapDef, Maps } from "common/scripts/definitions/maps/base.ts";
import { random, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type Group, GroupsManager, type Team, TeamsManager } from "./teams.ts";
import { DamageReason } from "common/scripts/definitions/utils.ts";
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
export class BattleRoyaleSolo extends ModeManager{
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

    constructor(settings:BattleRoyaleSettings){
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
        },50)
    }

    can_down(_human:Human):boolean{
        return false
    }
    can_join():boolean{
        return this.game.players.living_players.length<this.settings.players.limit
    }
    can_start():boolean{
        return this.game.players.living_players.length>1
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
    override on_player_connect(_p:Player){
        if(!this.game.started&&this.game.can_start&&this.can_start()){
            this.game.add_timeout(()=>{
                if(this.can_start())this.game.start()
            },3)
        }
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
            p.conn.send_game_over([p.status],false,p.killed_by?.id)
        }
        if(p.killed_by&&p.conn&&p.killed_by instanceof Player)this.game.add_timeout(()=>{
            p.conn!.set_spectator(p.killed_by! as Player)
        },2)
        if(this.game.started){
            this.give_rank_score()
            if(this.game.players.living_players.length<=1){
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
            if(p.conn)p.conn.send_game_over((p.team_data.group?.get_status()??[p.status]) as PlayerStatus[],true)
        }
    }

    is_ally(_a:Human,_b:Human):boolean{
        return false
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
export class BattleRoyaleDebug extends BattleRoyaleSolo{
    constructor(settings:BattleRoyaleSettings) {
        if(!settings.map?.def){
            settings.map={def:Maps["debug"]}
        }
        super(settings)
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
export class BattleRoyaleGroup extends BattleRoyaleSolo{
    groupsManager:GroupsManager
    group_size:number
    constructor(group_size:number,settings:BattleRoyaleSettings){
        super(settings)
        this.group_size=group_size
        this.groupsManager=new GroupsManager()
    }
    override can_down(player:Human):boolean{
        return (player.team_data.group&&player.team_data.group.can_down(player))!
    }
    override can_start():boolean{
        return this.groupsManager.get_living_groups().length>1
    }
    override is_ally(a:Player,b:Player):boolean{
        return a.team_data.group_id===b.team_data.group_id
    }
    override on_net_update(): void {
        this.groupsManager.net_update()
    }

    set_group_for_human(p:Human){
        if(p.team_data.group===undefined){
            let t=this.groupsManager.find_group(this.group_size,p.team_data.team_id)
            if(!t){
                t=this.groupsManager.add_group()
            }else if(t.humans.length>0){
                p.position=random.choose(t.humans).position
            }
            t.add_human(p)
        }
    }

    override on_player_join(p:Player){
        this.set_group_for_human(p)
        if(!this.game.started&&this.groupsManager.get_living_groups().length>1){
            this.game.add_timeout(this.game.start.bind(this.game),3)
        }
    }
    override on_player_die(p:Player){
        super.on_player_die(p)
        if(p.conn){
            p.conn.send_game_over((p.team_data.group?.get_status()??[p.status]) as PlayerStatus[],false,p.killed_by?.id)
        }
        if(this.game.started){
            this.game.players.apply_score(ScoreApplyerType.Rank,this.rules.score.rank_reward)
            if(this.can_start()){
                this.game.add_timeout(this.game.finish.bind(this.game),3)
            }
        }
    }
    override get_group(group: number): Group | undefined {
        return this.groupsManager.groups[group]
    }
    override get_human_spawn_position(h:Human):Vec2|undefined{
        return super.get_human_spawn_position(h)
    }
}
export class BattleRoyaleTeam extends BattleRoyaleGroup{
    teamsManager:TeamsManager=new TeamsManager()
    f=0
    teams_count:number

    constructor(teams_count:number=2,group_size:number=4,settings:BattleRoyaleSettings){
        super(group_size,settings)
        this.teams_count=teams_count
        for(let t=0;t<=teams_count;t++){
            this.teamsManager.add_team()
        }
    }
    override can_down(human:Human):boolean{
        return super.can_down(human)&&(human.team_data.team&&human.team_data.team.get_not_downed_humans().length>1)!
    }
    override can_start():boolean{
        return this.teamsManager.get_living_teams().length>1
    }
    override is_ally(a:Player,b:Player):boolean{
        return a.team_data.team_id===b.team_data.team_id
    }
    find_team(_p:Player):Team{
        const ret=this.teamsManager.teams[this.f]
        if(!ret){
            return this.teamsManager.add_team()
        }

        this.f++
        if(this.f>=this.teams_count){
            this.f=0
        }

        return ret
    }
    override on_player_connect(p:Player){
        const team=this.find_team(p)

        team.add_human(p)
        super.set_group_for_human(p)

        if(!this.game.started&&this.teamsManager.get_living_teams().length>1){
            this.game.add_timeout(this.game.start.bind(this.game),3)
        }
    }
    override on_player_die(p:Player){
        if(p.team_data.team){
            for(const pp of p.team_data.team.get_downed_players()){
                pp.die({
                    amount:pp.health_data.health,
                    critical:false,
                    position:pp.position,
                    reason:DamageReason.Bleend,
                    owner:pp.downed_by,
                    source:pp.downed_by_source,
                    direction:0,
                })
            }
        }
        if(this.teamsManager.get_living_teams().length<=1){
            this.game.finish()
        }
    }
    override get_team(team: number): Team | undefined {
        return this.teamsManager.teams[team]
    }
}