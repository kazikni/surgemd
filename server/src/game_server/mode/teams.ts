import { GroupMemberState } from "common/scripts/packets/update_packet.ts";
import { Human } from "../objects/human.ts";
import { random } from "common/engine/core.ts";

export class Team{
    dirty:boolean=true
    humans:Human[]=[]
    id:number=0
    remove_human(h:Human){
        if(!h.team_data.team)return
        const idx=this.humans.indexOf(h)
        if(idx!==-1){
            h.team_data.team=undefined
            h.team_data.team_id=undefined
            this.humans.splice(idx,1)
        }
    }
    add_human(h:Human){
        if(h.team_data.team)h.team_data.team.remove_human(h)
        h.team_data.team=this
        h.team_data.team_id=this.id
        this.dirty=true
        this.humans.push(h)
    }
    get_living_humans():Human[]{
        return this.humans.filter((p)=>!p.health_data.dead)
    }
    get_not_downed_humans():Human[]{
        return this.humans.filter((p)=>!p.health_data.dead&&!p.health_data.downed)
    }
    get_downed_players():Human[]{
        return this.humans.filter((p)=>!p.health_data.dead&&p.health_data.downed)
    }
    replace(o: Human, n: Human) {
        const index = this.humans.indexOf(o)
        if (index === -1) return false

        n.team_data.team = this
        n.team_data.team_id = this.id

        this.humans[index] = n
        return true
    }
    get_state():Record<number,GroupMemberState>{
        const ret:Record<number,GroupMemberState>={}
        for(const m of this.humans){
            ret[m.id]={
                boost:m.health_data.boost/m.health_data.max_boost,
                boost_type:m.health_data.boost_def.type,
                health:m.health_data.health/m.health_data.max_health,
            }
        }
        return ret
    }
    choose_human(self: Human): Human | undefined {
        const candidates = this.humans.filter(h => h !== self && !h.health_data.dead)
        if (candidates.length === 0) return undefined
        return candidates[random.int(0,candidates.length)]
    }
    constructor(){

    }
}
export class Group extends Team{
    team:number=0

    override remove_human(h:Human){
        if(!h.team_data.group)return
        const idx=this.humans.indexOf(h)
        if(idx!==-1){
            h.team_data.group=undefined
            h.team_data.group_id=undefined
            this.humans.splice(idx,1)
        }

    }
    override add_human(h:Human){
        if(h.team_data.group)h.team_data.group.remove_human(h)
        if(h.team_data.team_id)this.team=h.team_data.team_id
        h.team_data.group=this
        h.team_data.group_id=this.id
        this.dirty=true
        this.humans.push(h)
    }
    override replace(o: Human, n: Human) {
        const index = this.humans.indexOf(o)
        if (index === -1) return false

        n.team_data.group = this
        n.team_data.group_id = this.id

        this.humans[index] = n
        return true
    }
}
export class TeamsManager{
    teams:Team[]=[]
    constructor(){

    }
    get_living_teams():Team[]{
        return this.teams.filter((t)=>(t&&t!.get_living_humans().length>0))
    }
    add_team(team:Team=new Team):Team{
        team.id=this.teams.length-1
        this.teams.push(team)
        return team
    }
    net_update(){
        for(const t of this.teams){
            t.dirty=false
        }
    }
}
export class GroupsManager{
    groups:Partial<Record<number,Group>>={}
    constructor(){

    }
    find_group(max_group_size:number,team=0):Group|undefined{
        for(const g of Object.values(this.groups)){
            if(g&&g.humans.length<max_group_size&&g.team===team)return g
        }
        return undefined
    }
    get_living_groups():Group[]{
        return Object.values(this.groups).filter((t)=>(t&&t!.get_living_humans().length>0)) as (Group[])
    }
    add_group(id?:number,group:Group=new Group):Group{
        if(!id){
            id=Object.keys(this.groups).length
        }
        this.groups[id]=group
        this.groups[id]!.id=id
        return this.groups[id]!
    }
    net_update(){
        for(const g of Object.values(this.groups)){
            if(g)g.dirty=false
        }
    }
}