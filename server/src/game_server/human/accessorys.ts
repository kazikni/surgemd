import { AccessoryDef } from "common/scripts/definitions/items/accessorys.ts";
import { type Human } from "../objects/human.ts";

export interface AccessorySlot{
    droppable:boolean
    changable:boolean
    item?:AccessoryDef
}
export class AccessorysManager{
    user:Human
    accessorys:Record<number,AccessorySlot>={}
    slots:AccessorySlot[]=[]
    constructor(user:Human,slots:number){
        this.user=user
        for(let i=0;i<slots;i++){
            const s={
                droppable:true,
                changable:true,
                item:undefined
            }
            this.slots.push(s)
            this.accessorys[i]=s
        }
    }
    has_accessory(idString:string):boolean{
        for(const s of this.slots){
            if(s.item&&s.item.idString===idString){
                return true
            }
        }
        return false
    }
    has_property(property:string):boolean{
        if(this.user.equipment_data.helmet?.property){
            const include=this.user.equipment_data.helmet.property.includes(property)
            if(include)return true
        }
        if(this.user.equipment_data.vest?.property){
            const include=this.user.equipment_data.vest.property.includes(property)
            if(include)return true
        }
        for(const s of this.slots){
            if(s.item&&(s.item.property??[]).includes(property)){
                return true
            }
        }
        return false
    }
    call_event(name:string,e:any){
        this.user.equipment_data.helmet?.events?.[name]?.(e)
        this.user.equipment_data.vest?.events?.[name]?.(e)
        for(const s of this.slots){
            if(s.item&&s.item.events?.[name]){
                s.item.events[name](e)
            }
        }
    }
    apply_modifiers(h:Human){
        for(const s of this.slots){
            if(s.item){
                if(s.item.modifiers)h.apply_modifiers(s.item.modifiers)
                s.item.events?.["apply_modifiers"]?.(h)
            }
        }
    }
    add_accessory(def:AccessoryDef,droppable:boolean=true,changable:boolean=true):[AccessoryDef|undefined,boolean]{
        if(this.has_accessory(def.idString))return [undefined,false]
        for(const s of this.slots){
            if(s.changable){
                const ret=s.item
                s.item=def
                s.droppable=droppable
                s.changable=changable

                if(ret&&ret.events&&ret.events["drop"])ret.events["drop"]({def:ret,user:this.user})
                if(def.events&&def.events["pickup"])def.events["pickup"]({def:def,user:this.user})
                return [ret,true]
            }
        }
        return [undefined,false]
    }
    remove_accessory(def:AccessoryDef){
        for(const slot of this.slots){
            if(slot.item&&slot.item.idString===def.idString){
                slot.item=undefined
            }
        }
    }
    clear(){
        for(const s of this.slots){
            s.item=undefined
            s.droppable=true
            s.changable=true
        }
    }
}