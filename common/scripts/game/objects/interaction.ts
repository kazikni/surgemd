import { CircleCollider2D, gel_events, GELComponent, v2 } from "../../../engine/core.ts";
import { type SimulatedObject } from "../base.ts";

export type Interactable=SimulatedObject&{
    can_interact(user:SI_Interactor):boolean
    on_interact(user:SI_Interactor):void
    auto_interact?(user:SI_Interactor):boolean
}

export type SI_Interactor=SimulatedObject&{
    interaction:{
        enabled:boolean
        auto_pickup:boolean
        radius:number
    }
    get_interactables():Interactable[]
    interact(manual:boolean):Interactable|undefined
}

export const si_interactor:GELComponent<SI_Interactor>={
    id_string:"si_interactor",
    events:{
        [gel_events.bind]:function(){
            this.interaction={
                enabled:true,
                auto_pickup:false,
                radius:1.5,
            }
        },
    },
    methods:{
        get_interactables():Interactable[]{
            const area=new CircleCollider2D(v2.clone(this.position),this.interaction.radius)
            const ret:Interactable[]=[]
            for(const o of this.scene.cells.get_objects(area,this.layer) as Interactable[]){
                if(o.id===this.id||o.destroyed||typeof o.can_interact!=="function")continue
                if(o.can_interact(this))ret.push(o)
            }
            ret.sort((a,b)=>v2.distanceSquared(a.position,this.position)-v2.distanceSquared(b.position,this.position))
            return ret
        },
        interact(manual:boolean):Interactable|undefined{
            if(!this.interaction.enabled)return undefined
            const list=this.get_interactables()
            if(manual){
                const o=list[0]
                o?.on_interact(this)
                return o
            }
            if(!this.interaction.auto_pickup)return undefined
            for(const o of list){
                if(o.auto_interact?.(this)){
                    o.on_interact(this)
                    return o
                }
            }
            return undefined
        },
    },
}
