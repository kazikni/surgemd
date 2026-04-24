import { AccessoryDef } from "../definitions/items/accessorys.ts";

export interface AccessorySlot{
    item?:AccessoryDef
    changable:boolean
}
export class AccessorysManager<Slot extends AccessorySlot=AccessorySlot>{
    slots:Slot[]=[]
    constructor(){
        this.slots=[]
    }
    has_accessory(id:string):boolean{
        for(const s of this.slots){
            if(s.item&&s.item.idString===id){
                return true
            }
        }
        return false
    }
    add_slot(s:AccessorySlot){
        this.slots.push(s)
    }
}