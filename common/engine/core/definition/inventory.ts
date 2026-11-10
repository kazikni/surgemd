export abstract class Item{
    limit_per_slot:number=1
    allow_merge:boolean=true
    abstract is(other:Item):boolean
}

export class Slot<ItemBase extends Item = Item>{
    item:ItemBase|null
    quantity:number

    constructor(){
        this.quantity=0
        this.item=null
    }
    accept_item(item:ItemBase){
        return true
    }
    /**
     * Add Item In `Slot`
     * @param item `Item` To Add
     * @param quantity Add Quantity
     * @returns `Slot` Overflow
     */
    add(item:ItemBase,quantity:number=1):number{
        if(this.item==null){
            if(this.accept_item(item)){
                this.item=item
            }else{
                return quantity
            }
        }else if(!this.item.is(item)){
            return quantity
        }
        if(!this.item.allow_merge){
            return quantity
        }
        const add=this.quantity+quantity
        const ret=Math.max(add-this.item.limit_per_slot,0)
        this.quantity=add-ret
        return ret
    }
    clear(){
        this.item=null
        this.quantity=0
    }
    /**
     * Remove Item From `Slot`
     * @param quantity Remove amount
     * @returns The `Slot` debt
     */
    remove(quantity:number):number{
        if(this.item==null){
            return quantity
        }
        this.quantity-=quantity
        const ret=Math.max(-this.quantity,0)
        if(ret!=0||this.quantity===0){
            this.item=null
            this.quantity=0
        }
        return ret
    }
}

export class Inventory<ItemBase extends Item = Item>{
    slots:Slot<ItemBase>[]
    constructor(slots:Slot<ItemBase>[]=[]){
        this.slots=slots
    }
    /**
     * Add Item In `Inventory`
     * @param item `Item` To Add
     * @param quantity Add amount
     * @returns `Inventory` Overflow
     */
    add(item:ItemBase,quantity:number=1):number{
        /*let ret=quantity
        let i=-1
        while(i < this.slots.length&&ret>0&&this.slots[i]){
            i++
            ret=this.slots[i].add(item,ret)
        }
        return ret*/
        let ret=quantity
        for(const i in this.slots){
            ret=this.slots[i].add(item,ret)
            if(ret==0){
                break
            }
        }
        return ret
    }
    /**
     * Consume Inventory Item
     * @param item `Item` To Consume
     * @param quantity Needed Quantity
     * @returns Success
     */
    consume(item:ItemBase,quantity:number=1):boolean{
        const has_slots:number[]=[]
        let has=0
        for(const i in this.slots){
            if(this.slots[i].item!=null&&this.slots[i].item.is(item)){
                has=Math.min(has+this.slots[i].quantity,quantity)
                has_slots.push(parseInt(i))
                if(has==quantity){
                    for(const j of has_slots){
                        has=this.slots[j].remove(has)
                        if(has==0){break}
                    }
                    return true
                }
            }
        }
        return false
    }
    /**
     * Remove Item From `Inventory`
     * @param quantity Remove amount
     * @returns The `Inventory` debt
     */
    remove(item:ItemBase,quantity:number=1):number{
        let ret=quantity
        for(const i in this.slots){
            if(this.slots[i].item!=null&&this.slots[i].item.is(item)){
                ret=this.slots[i].remove(ret)
                if(ret==0){
                    break
                }
            }
        }
        return ret
    }
}

export abstract class BaseAction<User>{
    abstract delay:number
    abstract type:number
    abstract on_execute(user:User):void
    on_begin(user:User){
        
    }
    on_cancel(user:User){

    }
    update(user:User,dt:number){}
    constructor(){}
}

export class ActionsManager<User,Action extends BaseAction<User>>{
    current_action?:Action
    current_delay:number=0
    user:User
    dirty:boolean=false
    constructor(user:User){
        this.user=user
    }
    cancel(){
        if(this.current_action){
            const action=this.current_action
            this.current_action=undefined
            this.current_delay=0
            this.dirty=true
            action.on_cancel(this.user)
        }
    }
    play(action:Action):void{
        if(this.current_action)return
        this.current_action=action
        this.current_delay=action.delay
        this.current_action.on_begin(this.user)
        this.dirty=true
    }
    update(deltaTime:number){
        if(this.current_action){
            this.current_delay=Math.max(this.current_delay-deltaTime,0)
            if(this.current_delay===0){
                this.current_action.on_execute(this.user)
                this.current_action=undefined
                this.current_delay=0
                this.dirty=true
            }
            this.current_action?.update?.(this.user,deltaTime)
        }
    }
    net_update(){
        this.dirty=false
    }
}