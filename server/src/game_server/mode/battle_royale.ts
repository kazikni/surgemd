import { Spawn, SpawnMode } from "common/scripts/others/constants.ts";
import { ModeManager } from "./modeManager.ts";
import { type Human } from "../objects/human.ts";
import { Player } from "../objects/player.ts";
import { MapDef, Maps } from "common/scripts/definitions/maps/base.ts";
import { random, v2, Vec2 } from "common/engine/core.ts";
import { GroupsManager, Team, TeamsManager } from "./teams.ts";
import { DamageReason } from "common/scripts/definitions/utils.ts";
import { DeadZoneConfig, DefaultDeadzone } from "../others/deadzone.ts";

export interface BattleRoyaleSettings{
    players?:{
        limit?:number
    }
    map?:MapDef|string
    spawn_mode?:SpawnMode
    deadzone?:DeadZoneConfig
}
export class BattleRoyaleSolo extends ModeManager{
    settings:{
        players:{
            limit:number
        }
        spawn_mode:SpawnMode
        map:MapDef
        deadzone:DeadZoneConfig
    }

    constructor(settings:BattleRoyaleSettings){
        super()

        this.settings={
            players:{
                limit:settings.players?.limit??100,
            },
            map:settings.map?(
                typeof settings.map==="string"?Maps[settings.map]:settings.map
            ):Maps["lobby"],
            spawn_mode:settings.spawn_mode??Spawn.grass,
            deadzone:settings.deadzone??DefaultDeadzone
        }
    }

    override on_start(){
        this.game.deadzone.start()
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

    override on_player_connect(_p:Player){
        if(!this.game.started&&this.can_start()){
            this.game.add_timeout(()=>{
                if(this.can_start())this.game.start()
            },3)
        }
    }
    override on_player_die(p:Player){
        if(p.conn){
            p.conn.send_game_over(false,p.killed_by?.id)
        }
        if(p.killed_by&&p.conn&&p.killed_by instanceof Player)this.game.add_timeout(()=>{
            p.conn!.set_spectator(p.killed_by! as Player)
        },2)
        if(this.game.players.living_players.length<=1&&this.game.started){
            for(const p of this.game.players.living_players){
                if(p.conn)p.conn.send_game_over(true)
            }
            this.game.finish()
        }
    }

    is_ally(_a:Human,_b:Human):boolean{
        return false
    }

    override generate_map(): void {
        this.game.map.generate(this.settings.map)
        this.game.deadzone.set_config(this.settings.deadzone)

        /*for(let i=0;i<1;i++){
            const b=this.game.humans.add_npc()
            b.ai=new ADVHumanAI(b)

            const pos=this.get_human_spawn_position(b)
            if(pos)b.position=pos

            b.inventory.load_preset({
                gun1:[
                    {item:"spas12",weight:1},
                ],
                gun2:[
                    {item:"kar98k",weight:1},
                ],
                helmet:[
                    {item:"tactical_helmet",weight:1}
                ],
                vest:[
                    {item:"tactical_vest",weight:1}
                ],
                hand:1,
                infinity_ammo:true,
            })
    
            const jp=new JoinPacket()
            jp.player_name=`BOT-${i+1}`
            const b=this.game.players.add_bot(jp)

            b.ai=new ADVHumanAI(b.human!)
            b.human!.inventory.load_preset({
                gun1:[
                    {item:"spas12",weight:1},
                ],
                gun2:[
                    {item:"ak47",weight:1},
                    {item:"kar98k",weight:1},
                ],
                helmet:[
                    {item:"tactical_helmet",weight:1}
                ],
                vest:[
                    {item:"tactical_vest",weight:1}
                ],
                hand:1,
                infinity_ammo:true,
            })
        }*/
    }
    override get_human_spawn_position(h:Human):Vec2|undefined{
        return this.game.map.getRandomPosition(h.base_hitbox,h.id,h.layer,this.settings.spawn_mode,this.game.map.random)
    }
}
export class BattleRoyaleDebug extends BattleRoyaleSolo{
    constructor(settings:BattleRoyaleSettings) {
        if(!settings.map){
            settings.map=Maps["debug"]
        }
        super(settings)
    }
    override on_start(){
    }
    override generate_map(): void {
        this.game.map.generate(this.settings.map)
    }
    override get_human_spawn_position(h:Human):Vec2|undefined{
        return v2.dscale(this.game.map.size,2)
    }
}
export class BattleRoyaleGroupMode extends BattleRoyaleSolo{
    groupsManager:GroupsManager
    group_size:number
    constructor(group_size:number,settings:BattleRoyaleSettings){
        super(settings)
        this.group_size=group_size
        this.groupsManager=new GroupsManager()
    }
    override can_down(player:Human):boolean{
        return (player.team_data.group&&player.team_data.group.get_not_downed_humans().length>1)!
    }
    override can_start():boolean{
        return this.groupsManager.get_living_groups().length>1
    }
    override is_ally(a:Player,b:Player):boolean{
        return a.team_data.group_id===b.team_data.group_id
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
        if(p.team_data.group){
            for(const pp of p.team_data.group.get_downed_players()){
                pp.die({amount:pp.health_data.health,critical:false,position:pp.position,reason:DamageReason.Bleend,owner:pp.downed_by,source:pp.downed_by_source})
            }
        }
        if(this.groupsManager.get_living_groups().length<=1){
            this.game.finish()
        }
    }
}
export class BattleRoyaleTeam extends BattleRoyaleGroupMode{
    teamsManager:TeamsManager=new TeamsManager()
    f=0
    teams_count:number

    constructor(teams_count:number=2,group_size:number=4,settings:BattleRoyaleSettings){
        super(group_size,settings)
        this.teams_count=teams_count
    }
    override can_down(human:Human):boolean{
        return super.can_down(human)&&(human.team_data.team&&human.team_data.team.get_not_downed_humans().length>1)!
    }
    override can_start():boolean{
        return this.teamsManager.get_living_teams().length>1
    }
    override is_ally(a:Player,b:Player):boolean{
        return a.team_data.group_id===b.team_data.group_id
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
                pp.die({amount:pp.health_data.health,critical:false,position:pp.position,reason:DamageReason.Bleend,owner:pp.downed_by,source:pp.downed_by_source})
            }
        }
        if(this.teamsManager.get_living_teams().length<=1){
            this.game.finish()
        }
    }
}