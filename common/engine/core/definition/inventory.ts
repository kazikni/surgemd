import { type AbstractGame } from "../game/game.ts";
import { random, type WeightDefinition } from "../math/random.ts";
import { Numeric, Tags, hasTag, hasTags } from "../math/utils.ts"

export abstract class Item{
    limit_per_slot:number=1
    tags:Tags=[]
    abstract is(other:Item):boolean
}

export class Slot<ItemBase extends Item = Item>{
    item:ItemBase|null
    quantity:number
    accept_tags:Tags
    constructor(accept_tags:Tags=[]){
        this.accept_tags=accept_tags
        this.quantity=0
        this.item=null
    }
    /**
     * Add Item In `Slot`
     * @param item `Item` To Add
     * @param quantity Add Quantity
     * @returns `Slot` Overflow
     */
    add(item:ItemBase,quantity:number=1):number{
        if(this.item==null){
            if(this.accept_tags.length==0||hasTags(this.accept_tags,item.tags)){
                this.item=item
            }else{
                return quantity
            }
        }else if(!this.item.is(item)){
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
    constructor(slots_quatity:number=10){
        this.slots=[]
        for(let i=0;i<slots_quatity;i++){
            this.slots.push(new Slot<ItemBase>())
        }
    }
    /**
     * Add Item In `Inventory`
     * @param item `Item` To Add
     * @param quantity Add amount
     * @returns `Inventory` Overflow
     */
    add(item:ItemBase,quantity:number=1):number{
        let ret=quantity
        for(const i in this.slots){
            ret=this.slots[i].add(item,ret)
            if(ret==0){
                break
            }
        }
        return ret
    }
    //#region normal consume and remove
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
    //#endregion
    //#region tag consume and remove
    /**
     * Consume Inventory Item
     * @param tag `Tag` Needed To Consume
     * @param quantity Needed Quantity
     * @returns Success
     */
    consumeTag(tag:string,quantity:number=1):boolean{
        const has_slots:number[]=[]
        let has=0
        for(const i in this.slots){
            if(this.slots[i].item!=null&&hasTag(this.slots[i].item.tags,tag)){
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
     * @param tag `Tag` Needed To Consume
     * @param quantity Remove amount
     * @returns The `Inventory` debt
     */
    removeTag(tag:string,quantity:number=1):number{
        let ret=quantity
        for(const i in this.slots){
            // deno-lint-ignore ban-ts-comment
            //@ts-expect-error
            if(this.slots[i].item!=null&&hasTag(this.slots[i].item,tag)){
                ret=this.slots[i].remove(ret)
                if(ret==0){
                    break
                }
            }
        }
        return ret
    }
    //#endregion
}
export abstract class ItemCap extends Item{
    abstract cap:number
}
export class SlotCap<ItemBase extends ItemCap = ItemCap>{
    item:ItemBase|null
    quantity:number
    accept_tags:Tags
    constructor(accept_tags:Tags=[]){
        this.accept_tags=accept_tags
        this.quantity=0
        this.item=null
    }
    calculate_cap():number{
        if(!this.item)return 0
        return this.item.cap*this.quantity
    }
    /**
     * Add Item In `Slot`
     * @param item `Item` To Add
     * @param quantity Add Quantity
     * @returns `Slot` Overflow
     */
    add(item:ItemBase,quantity:number=1):number{
        if(this.item==null){
            if(this.accept_tags.length==0||hasTags(this.accept_tags,item.tags)){
                this.item=item
            }else{
                return quantity
            }
        }else if(!this.item.is(item)){
            return quantity
        }
        const add=this.quantity+quantity
        const ret=Math.max(add-this.item.limit_per_slot,0)
        this.quantity=add-ret
        return ret
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
        if(ret!=0){
            this.item=null
            this.quantity=0
        }
        return ret
    }
}
export class InventoryCap<ItemBase extends ItemCap=ItemCap>{
    slots:SlotCap<ItemBase>[]
    max_cap:number
    infinity_slots:boolean
    constructor(slots_quatity?:number,max_cap:number=10){
        this.slots=[]
        this.infinity_slots=slots_quatity?false:true
        this.max_cap=max_cap
        if(slots_quatity){
            for(let i=0;i<slots_quatity;i++){
                this.slots.push(new SlotCap<ItemBase>())
            }
        }
    }
    calculate_cap():number{
        let cap=0
        for(const s of this.slots){
            cap+=s.calculate_cap()
        }
        return cap
    }
    /**
     * Add Item In `Inventory`
     * @param item `Item` To Add
     * @param quantity Add amount
     * @returns `Inventory` Overflow
     */
    add(item:ItemBase,quantity:number=1):number{
        let ret=quantity
        let current_cap=this.calculate_cap()
        const sizeA=ret*item.cap+current_cap
        const overAmmount=Math.floor(Numeric.clamp((sizeA-this.max_cap)/item.cap,0,quantity))
        for(const i in this.slots){
            ret=this.slots[i].add(item,ret)
            if(ret==0){
                break
            }
        }
        current_cap=this.calculate_cap()
        if(ret>0&&this.infinity_slots&&current_cap<this.max_cap){
            const slot=new SlotCap<ItemBase>()
            ret=slot.add(item,ret-overAmmount)
            this.slots.push(slot)
        }
        return ret+overAmmount
    }
    //#region normal consume and remove
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
    //#endregion
    //#region tag consume and remove
    /**
     * Consume Inventory Item
     * @param tag `Tag` Needed To Consume
     * @param quantity Needed Quantity
     * @returns Success
     */
    consumeTag(tag:string,quantity:number=1):boolean{
        const has_slots:number[]=[]
        let has=0
        for(const i in this.slots){
            if(this.slots[i].item!=null&&hasTag(this.slots[i].item.tags,tag)){
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
     * Consume Inventory Item
     * @param tag `Tag` Needed To Consume
     * @param quantity Needed Quantity
     * @returns Success
     */
    consumeTagRemains(tag:string,max:number=1):number{
        const has_slots:SlotCap<ItemBase>[]=[]
        let has=0
        for(const i in this.slots){
            if(this.slots[i].item!=null&&hasTag(this.slots[i].item.tags,tag)){
                has=Math.min(has+this.slots[i].quantity,max)
                has_slots.push(this.slots[i])
                if(has==max){
                    break
                }
            }
        }
        let has_ret=has

        for(const j of has_slots){
            has_ret-=j.remove(has_ret)
            if(j.quantity<=0){
                this.slots.splice(this.slots.indexOf(j),1)
            }
        }
        return has
    }
    update_infinity(){
        for(let i=0;i<this.slots.length;i++){
            if(this.slots[i].quantity<=0){
                this.slots.splice(i,1)
                i--
                continue
            }
        }
    }
    getCountTag(tag:string){
        let has=0
        for(const i in this.slots){
            if(this.slots[i].item&&this.slots[i].item!.tags.includes(tag)){
                has+=this.slots[i].quantity
            }
        }
        return has
    }
    /**
     * Remove Item From `Inventory`
     * @param tag `Tag` Needed To Consume
     * @param quantity Remove amount
     * @returns The `Inventory` debt
     */
    removeTag(tag:string,quantity:number=1):number{
        let ret=quantity
        for(const i in this.slots){
            // deno-lint-ignore ban-ts-comment
            //@ts-expect-error
            if(this.slots[i].item!=null&&hasTag(this.slots[i].item,tag)){
                ret=this.slots[i].remove(ret)
                if(ret==0){
                    break
                }
            }
        }
        return ret
    }
    //#endregion
}

export abstract class BaseAction<User>{
    abstract delay:number
    abstract type:number
    abstract on_execute(user:User):void
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
            this.current_action=undefined
            this.current_delay=0
            this.dirty=true
        }
    }
    play(action:Action):void{
        if(this.current_action)return
        this.current_action=action
        this.current_delay=action.delay
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

export type LootTableItem={
    table?:string
    item?:string
    count?:number
    separate?:boolean
}&WeightDefinition
interface LootTableObject{
    min:number
    max:number
    content:LootTableItem[]
}
export type LootTable=string|LootTableObject|LootTableItem[]|LootTableItem[][]
export type LootTableItemRet<Item>={
    count:number
    item:Item
}
export class LootTablesManager<TP,Aditional>{
    tables:Map<string,LootTable>=new Map()
    get_item:(id:string,count:number,aditional:Aditional,game:AbstractGame<any>)=>LootTableItemRet<TP>[]
    constructor(get_item:(id:string,count:number,aditional:Aditional)=>LootTableItemRet<TP>[]){
        this.get_item=get_item
    }
    add_loot_table(name:string,table:LootTable){
        this.tables.set(name,table)
    }
    add_tables(tables:Record<string,LootTable>){
        for(const t of Object.keys(tables)){
            this.tables.set(t,tables[t])
        }
    }
    get_loot(table:LootTable,aditional:Aditional,game:AbstractGame<any>):LootTableItemRet<TP>[]{
        const ret:LootTableItemRet<TP>[]=[]
        const lt=typeof table==="string"?this.tables.get(table):table
        if(!lt){
            return []
        }
        const rand=random
        const multiLoot=Array.isArray(lt)&&lt.length>0&&Array.isArray(lt[0])
        if(Array.isArray(lt)&&!multiLoot){
            const obj=rand.weight2(lt as LootTableItem[])
            if(obj){
                if(obj.item){
                    ret.push(...this.get_item(obj.item,obj.count??1,aditional,game))
                }
                if(obj.table&&obj.table!==table){
                    const c=obj.count??1
                    for(let i=0;i<c;i++){
                        ret.push(...this.get_loot(obj.table,aditional,game))
                    }
                }
            }
        }else if(multiLoot){
            for(const slt of (lt as LootTableItem[][])){
                const obj=rand.weight2(slt)
                if(obj){
                    if(obj.item){
                        ret.push(...this.get_item(obj.item,obj.count??1,aditional,game))
                    }
                    if(obj.table&&obj.table!==table){
                        const c=obj.count??1
                        for(let i=0;i<c;i++){
                            ret.push(...this.get_loot(obj.table,aditional,game))
                        }
                    }
                }
            }
        }else{
            const count=rand.int((lt as LootTableObject).min,(lt as LootTableObject).max)
            for(let i=0;i<count;i++){
                const obj=rand.weight2((lt as LootTableObject).content)
                if(obj){
                    if(obj.item){
                        ret.push(...this.get_item(obj.item,obj.count??1,aditional,game))
                    }
                    if(obj.table&&obj.table!==table){
                        const c=obj.count??1
                        for(let i=0;i<c;i++){
                            ret.push(...this.get_loot(obj.table,aditional,game))
                        }
                    }
                }
            }
        }
        return ret
    }
    clear(){
        this.tables.clear()
    }
}