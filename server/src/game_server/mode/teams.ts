import { Human } from "../objects/human.ts";

export class Team{
    humans:Human[]=[]
    id:number=0
    add_human(h:Human){
        h.team_data.team=this
        h.team_data.team_id=this.id
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
    constructor(){

    }
}
export class Group extends Team{
    team:number=0
    override add_human(h:Human){
        h.team_data.group=this
        h.team_data.group_id=this.id
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
}