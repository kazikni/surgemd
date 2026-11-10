import { Numeric, random } from "../../../engine/core.ts";
import { DamageReason } from "../../definitions/utils.ts";
import { type SI_Human } from "../objects/moving_body/human.ts";

export class Team{
    id:number=0
    manager?:TeamsManager<any>
    humans:SI_Human[]=[]
    dirty:boolean=true

    add_human(h:SI_Human){
        const old=this.manager?.of(h)
        if(old===this)return
        old?.remove_human(h)
        this.humans.push(h)
        this.manager?.assign(h,this)
        this.dirty=true
    }
    remove_human(h:SI_Human){
        const idx=this.humans.indexOf(h)
        if(idx===-1)return
        this.humans.splice(idx,1)
        this.manager?.unassign(h,this)
        this.dirty=true
    }
    replace(o:SI_Human,n:SI_Human):boolean{
        const idx=this.humans.indexOf(o)
        if(idx===-1)return false
        this.humans[idx]=n
        this.manager?.unassign(o,this)
        this.manager?.assign(n,this)
        this.dirty=true
        return true
    }
    has(h:SI_Human):boolean{
        return this.humans.includes(h)
    }
    get_living_humans():SI_Human[]{
        return this.humans.filter((h)=>!h.dead&&!h.destroyed)
    }
    get_not_knocked_humans():SI_Human[]{
        return this.get_living_humans().filter((h)=>!h.knocked)
    }
    get_knocked_humans():SI_Human[]{
        return this.get_living_humans().filter((h)=>h.knocked)
    }
    can_knock(h:SI_Human):boolean{
        return this.get_not_knocked_humans().some((o)=>o.id!==h.id)
    }
    clear_knocked(){
        if(this.get_not_knocked_humans().length>0)return
        for(const h of this.get_knocked_humans()){
            h.die({amount:h.health.value,reason:DamageReason.Bleend,position:h.position})
        }
    }
    choose_human(self?:SI_Human):SI_Human|undefined{
        const list=this.get_living_humans().filter((h)=>h!==self)
        if(list.length===0)return undefined
        return list[random.int(0,list.length-1)]
    }
    clear(){
        for(const h of [...this.humans])this.remove_human(h)
    }
    tick(_dt:number){}
    net_update(){
        this.dirty=false
    }
}

export class Group extends Team{
    team:number=0
}

export class TeamsManager<T extends Team=Team>{
    teams:T[]=[]
    protected by_human=new Map<number,T>()
    constructor(protected factory:()=>T=()=>new Team() as T){}

    add_team(team:T=this.factory()):T{
        team.id=this.teams.length+1
        team.manager=this
        this.teams.push(team)
        return team
    }
    get(id:number):T|undefined{
        return this.teams.find((t)=>t.id===id)
    }
    of(h:SI_Human|number):T|undefined{
        return this.by_human.get(typeof h==="number"?h:h.id)
    }
    assign(h:SI_Human,t:T){
        this.by_human.set(h.id,t)
    }
    unassign(h:SI_Human,t:T){
        if(this.by_human.get(h.id)===t)this.by_human.delete(h.id)
    }
    get_living():T[]{
        return this.teams.filter((t)=>t.get_living_humans().length>0)
    }
    smallest():T|undefined{
        let ret:T|undefined
        for(const t of this.teams){
            if(!ret||t.humans.length<ret.humans.length)ret=t
        }
        return ret
    }
    tick(dt:number){
        for(const t of this.teams)t.tick(dt)
    }
    net_update(){
        for(const t of this.teams)t.net_update()
    }
    reset(){
        for(const t of this.teams)t.clear()
        this.by_human.clear()
    }
}

export class GroupsManager extends TeamsManager<Group>{
    colors:number[]=[0x11aa55,0xd61cab,0x146aba,0xffcc00,0xd6601c,0xe06d69]
    constructor(public group_size:number=4){
        super(()=>new Group())
    }
    find_group(team:number=0):Group|undefined{
        return this.teams.find((g)=>g.humans.length<this.group_size&&g.team===team)
    }
    put(h:SI_Human,team:number=0):Group{
        let g=this.of(h)
        if(g)return g
        g=this.find_group(team)
        if(!g){
            g=this.add_team()
            g.team=team
        }
        g.add_human(h)
        return g
    }
    color_of(h:SI_Human):number|undefined{
        const g=this.of(h)
        if(!g)return undefined
        return this.colors[Numeric.loop(g.humans.indexOf(h),0,this.colors.length)]
    }
    override reset(){
        super.reset()
        this.teams.length=0
    }
}