import { type AcessorieDef } from "common/scripts/definitions/items/equipaments.ts";
import { type Human } from "../objects/human.ts";

export interface AcessoriesSlot{
    droppable:boolean
    changable:boolean
    item?:AcessorieDef
}
export class AcessoriesManager{
    user:Human
    acessories:Record<number,AcessoriesSlot>={}
    slots:AcessoriesSlot[]=[]
    constructor(user:Human,slots:number){
        this.user=user
        for(let i=0;i<slots;i++){
            const s={
                droppable:true,
                changable:true,
                item:undefined
            }
            this.slots.push(s)
            this.acessories[i]=s
        }
    }
    hasAccesorie(idString:string):boolean{
        for(const s of this.slots){
            if(s.item&&s.item.idString===idString){
                return true
            }
        }
        return false
    }
}