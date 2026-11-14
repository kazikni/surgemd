import { ActionsManager, BaseAction, Numeric, random, Stream, v2, Vec2 } from "../../../engine/core.ts";
import { type GameDefinition, type GameItem } from "../../definitions/game_defs.ts";
import { type BackpackDef } from "../../definitions/items/backpacks.ts";
import { GameItemType } from "../../definitions/utils.ts";
import { HumanAnimationType, type HumanAnimation, type LootData, object_instance_type } from "../../others/constants.ts";
import { type CommonApplication, type SimulatedScene } from "../base.ts";

export enum InventoryDisplay{
    None,
    Weapon,
    Amount,
    Scope,
    Items,
    Equipament,
    Accessory,
}

export type InventoryGroupType="change"|"amount"|"include"|"normal"

export interface InventoryOwner{
    id:number
    position:Vec2
    rotation:number
    layer:number
    app:CommonApplication
    scene:SimulatedScene
    inventory:Inventory<any>
    actions:ActionsManager<any,InventoryAction>
    input:{
        use_weapon:boolean
        alt_use_weapon:boolean
        using_item_down:boolean
        distance_to_aim:number
    }
    knocked?:boolean
    hand_locked:boolean
    animations:HumanAnimation[]
    get_modifier?(name:string):number
    emit_event(event:string|number,...args:any[]):void
}

export abstract class InventoryAction<Owner extends InventoryOwner=InventoryOwner> extends BaseAction<Owner>{
    action_speed:number=1
}

export interface InventoryChangeContext{
    inventory:Inventory<any>
    group:InventoryGroup
    slot:InventorySlot
    def:GameItem
    old?:InventoryItem
}

export interface InventoryGroupDef{
    id:string
    type:InventoryGroupType
    accept:GameItemType[]
    count?:number
    display?:InventoryDisplay
    hand?:boolean
    replace?:"hand"|"first"|"none"
    default?:string
    droppable?:boolean
    get_count?(inventory:Inventory<any>):number
    get_limit?(inventory:Inventory<any>,def:GameItem):number
    can_change?(ctx:InventoryChangeContext):boolean
    on_change?(ctx:InventoryChangeContext):void
}

export interface ItemGiveExtra{
    ammo?:number|boolean
    skin?:number
}

export abstract class InventoryItem<Owner extends InventoryOwner=InventoryOwner>{
    abstract def:GameItem
    inventory!:Inventory<Owner>
    slot?:InventorySlot
    skin?:number
    droppable:boolean=true
    allow_merge:boolean=false
    use_delay:number=0

    get owner():Owner{
        return this.inventory.owner
    }
    get in_hand():boolean{
        return this.inventory.hand_item===this
    }
    get item_type():GameItemType{
        return this.def.item_type!
    }

    on_give(_extra?:ItemGiveExtra){}
    on_remove(){}
    merge(_def:GameItem,_extra?:ItemGiveExtra):boolean{
        return false
    }
    load(_old?:GameItem){}
    unload(){}
    on_use():void{}
    on_fire():boolean{
        return false
    }
    on_fire_alt():void{}
    reload():void{}
    update(_dt:number):void{}
    drop(count:number=1):LootData[]{
        return [{item:this.def,count,skin:this.skin}]
    }

    encode_net(_stream:Stream,_full:boolean):void{}
    decode_net(_stream:Stream,_full:boolean):void{}
    encode_checkpoint(_stream:Stream):void{}
    decode_checkpoint(_stream:Stream):void{}
}

export type ItemFactory=(inventory:Inventory<any>,def:GameItem)=>InventoryItem<any>
export type ItemFactories=Partial<Record<GameItemType,ItemFactory>>

export class InventorySlot<Item extends InventoryItem<any>=InventoryItem<any>>{
    item?:Item
    count:number=0
    is_default:boolean=false
    constructor(public index:number,public group:InventoryGroup){}
    get empty():boolean{
        return this.item===undefined||this.count<=0
    }
    get free():boolean{
        return this.empty||this.is_default
    }
}

export class InventoryGroup{
    slots:InventorySlot[]=[]
    amounts:Record<string,number>={}
    includes:GameItem[]=[]
    selected?:GameItem
    constructor(public index:number,public def:InventoryGroupDef){}
    get id():string{
        return this.def.id
    }
    get type():InventoryGroupType{
        return this.def.type
    }
    accepts(def:GameItem):boolean{
        return this.def.accept.includes(def.item_type!)
    }
}

export class InventoryDirty{
    full:boolean=true
    slots=new Set<number>()
    groups=new Set<number>()
    hand:boolean=true
    get any():boolean{
        return this.full||this.hand||this.slots.size>0||this.groups.size>0
    }
    clear(){
        this.full=false
        this.hand=false
        this.slots.clear()
        this.groups.clear()
    }
}

export const inventory_events={
    changed:"inventory_changed",
    hand:"inventory_hand",
    fire:"inventory_fire",
    reload:"inventory_reload",
    drop:"inventory_drop",
}

export class Inventory<Owner extends InventoryOwner=InventoryOwner>{
    owner:Owner
    factories:ItemFactories
    groups:InventoryGroup[]=[]
    slots:InventorySlot[]=[]

    hand_index:number=-1

    infinity_ammo:boolean=false
    infinity_ammos:Set<string>=new Set()
    extended_capacity:boolean=false
    hold_ammo:boolean=true

    dirty:InventoryDirty=new InventoryDirty()

    constructor(owner:Owner,factories:ItemFactories){
        this.owner=owner
        this.factories=factories
    }

    get definitions():GameDefinition{
        return this.owner.app.definitions
    }
    get hand_slot():InventorySlot|undefined{
        return this.slots[this.hand_index]
    }
    get hand_item():InventoryItem<Owner>|undefined{
        return this.hand_slot?.item as InventoryItem<Owner>|undefined
    }
    get hand_def():GameItem|undefined{
        return this.hand_item?.def
    }
    get hand_slots():InventorySlot[]{
        return this.slots.filter((s)=>s.group.def.hand&&s.group.type==="change")
    }
    get item_slots():InventorySlot[]{
        return this.slots.filter((s)=>s.group.type==="normal")
    }
    recoil?:{time:number,speed:number}

    initialize(defs:InventoryGroupDef[]){
        this.clear(true)
        this.groups.length=0
        this.slots.length=0
        for(const d of defs){
            const g=new InventoryGroup(this.groups.length,d)
            this.groups.push(g)
            if(d.type==="change"||d.type==="normal"){
                const count=d.get_count?.(this)??d.count??1
                for(let i=0;i<count;i++)this.add_slot(g)
            }
        }
        this.reindex()
        for(const g of this.groups)this.fill_default(g)
        this.select_default_hand()
        this.dirty.full=true
    }
    protected add_slot(g:InventoryGroup):InventorySlot{
        const s=new InventorySlot(0,g)
        g.slots.push(s)
        return s
    }
    protected reindex(){
        const hand=this.hand_slot
        this.slots.length=0
        for(const g of this.groups){
            for(const s of g.slots){
                s.index=this.slots.length
                this.slots.push(s)
            }
        }
        this.hand_index=hand?this.slots.indexOf(hand):-1
    }
    fill_default(g:InventoryGroup){
        if(!g.def.default)return
        const def=this.definitions.game_items.valueString[g.def.default]
        if(!def)return
        switch(g.type){
            case "change":
            case "normal":
                for(const s of g.slots){
                    if(s.empty)this.place(s,def,1,undefined,false,true)
                }
                break
            case "include":
                if(!g.includes.includes(def))g.includes.push(def)
                g.selected??=def
                this.dirty.groups.add(g.index)
                break
        }
    }
    resize(g:InventoryGroup){
        if(!g.def.get_count)return
        const count=Math.max(g.def.get_count(this),0)
        let changed=false
        while(g.slots.length>count){
            const s=g.slots.pop()!
            if(s.item&&!s.empty){
                if(!s.is_default)this.drop_loot(s.item.drop(s.count))
                s.item.on_remove()
            }
            if(this.hand_slot===s)this.hand_index=-1
            changed=true
        }
        while(g.slots.length<count){
            this.add_slot(g)
            changed=true
        }
        if(changed){
            this.reindex()
            this.fill_default(g)
            if(this.hand_index===-1)this.select_default_hand()
            this.dirty.full=true
        }
        for(const s of g.slots){
            if(s.item&&g.type==="normal"){
                const limit=this.item_limit(s.item.def,g)
                if(s.count>limit){
                    this.drop_loot(s.item.drop(s.count-limit))
                    s.count=limit
                    this.dirty.slots.add(s.index)
                }
            }
        }
    }
    refresh(){
        for(const g of this.groups)this.resize(g)
        for(const g of this.groups){
            if(g.type!=="amount")continue
            for(const id in g.amounts){
                const def=this.definitions.game_items.valueString[id]
                const limit=this.item_limit(def,g)
                if(g.amounts[id]>limit){
                    this.drop_loot([{item:def,count:g.amounts[id]-limit}])
                    g.amounts[id]=limit
                    this.dirty.groups.add(g.index)
                }
            }
        }
    }

    get_group(id:string):InventoryGroup|undefined{
        return this.groups.find((g)=>g.id===id)
    }
    groups_for(def:GameItem):InventoryGroup[]{
        return this.groups.filter((g)=>g.accepts(def))
    }
    get_equipment<T extends GameItem=GameItem>(type:GameItemType):T|undefined{
        for(const g of this.groups){
            if(g.type!=="change"||!g.def.accept.includes(type))continue
            for(const s of g.slots){
                if(s.item&&!s.empty)return s.item.def as T
            }
        }
        return undefined
    }
    get_items<T extends InventoryItem<any>=InventoryItem<any>>(type:GameItemType):T[]{
        const ret:T[]=[]
        for(const s of this.slots){
            if(s.item&&!s.empty&&s.item.item_type===type)ret.push(s.item as T)
        }
        return ret
    }
    get backpack():BackpackDef|undefined{
        return this.get_equipment<BackpackDef>(GameItemType.backpack)
    }
    item_limit(def:GameItem,group?:InventoryGroup):number{
        const custom=group?.def.get_limit?.(this,def)
        if(custom!==undefined)return custom
        const backpack=this.backpack
        if(backpack&&backpack.max[def.id_string]!==undefined)return backpack.max[def.id_string]
        const base=this.definitions.backpacks.getFromStringSafe("null_pack")
        return base?.max[def.id_string]??15
    }

    create_item(def:GameItem):InventoryItem<Owner>|undefined{
        const factory=this.factories[def.item_type!]
        if(!factory)return undefined
        const item=factory(this,def) as InventoryItem<Owner>
        item.inventory=this
        return item
    }
    place(slot:InventorySlot,def:GameItem,count:number=1,extra?:ItemGiveExtra,drop_old:boolean=true,is_default:boolean=false):InventoryItem<Owner>|undefined{
        const old=slot.item as InventoryItem<Owner>|undefined
        const in_hand=this.hand_slot===slot
        const item=this.create_item(def)
        if(!item)return undefined
        if(old){
            if(in_hand)old.unload()
            if(drop_old&&!slot.is_default&&!slot.empty&&old.droppable&&slot.group.def.droppable!==false)this.drop_loot(old.drop(slot.count))
            old.on_remove()
        }
        item.slot=slot
        item.skin=extra?.skin
        slot.item=item
        slot.count=count
        slot.is_default=is_default
        item.on_give(extra)
        if(in_hand){
            item.load(old?.def)
            this.dirty.hand=true
        }
        slot.group.def.on_change?.({inventory:this,group:slot.group,slot,def,old})
        this.dirty.slots.add(slot.index)
        this.owner.emit_event(inventory_events.changed,slot)
        return item
    }
    remove_slot(slot:InventorySlot,count:number=slot.count):number{
        if(!slot.item||slot.empty)return 0
        const removed=Math.min(count,slot.count)
        slot.count-=removed
        if(slot.count<=0){
            const old=slot.item
            if(this.hand_slot===slot)old.unload()
            old.on_remove()
            slot.item=undefined
            slot.count=0
            slot.is_default=false
            this.fill_default(slot.group)
            slot.group.def.on_change?.({inventory:this,group:slot.group,slot,def:old.def,old})
            if(this.hand_slot===slot&&slot.empty)this.select_default_hand()
            else if(this.hand_slot===slot)this.hand_item?.load(old.def)
        }
        this.dirty.slots.add(slot.index)
        this.owner.emit_event(inventory_events.changed,slot)
        return removed
    }

    give_item(def:GameItem,count:number=1,drop_overflow:boolean=true,extra?:ItemGiveExtra,position?:Vec2,layer?:number):number{
        let remaining=count
        if(remaining<=0)return 0
        for(const s of this.slots){
            if(remaining<=0)break
            if(s.item&&!s.empty&&s.group.accepts(def)&&s.item.merge(def,extra)){
                remaining--
                this.dirty.slots.add(s.index)
                if(this.hand_slot===s)this.dirty.hand=true
            }
        }
        for(const g of this.groups_for(def)){
            if(remaining<=0)break
            switch(g.type){
                case "amount":
                    remaining=this.give_amount(g,def,remaining)
                    break
                case "include":
                    remaining=this.give_include(g,def,remaining)
                    break
                case "normal":
                    remaining=this.give_normal(g,def,remaining,extra)
                    break
                case "change":
                    remaining=this.give_change(g,def,remaining,extra)
                    break
            }
        }
        if(drop_overflow&&remaining>0)this.drop_loot([{item:def,count:remaining,ammo:extra?.ammo,skin:extra?.skin}],position,layer)
        return remaining
    }
    give_loot(loot:LootData,drop_overflow:boolean=true,position?:Vec2,layer?:number):number{
        const ret=this.give_item(loot.item,loot.count,drop_overflow,{ammo:loot.ammo,skin:loot.skin},position,layer)
        for(const l of loot.aditional??[]){
            this.give_loot(l,true,position,layer)
        }
        return ret
    }
    protected give_amount(g:InventoryGroup,def:GameItem,count:number):number{
        const limit=this.item_limit(def,g)
        const current=g.amounts[def.id_string]??0
        if(current>=limit)return count
        const add=Math.min(count,limit-current)
        if(count===Infinity){
            g.amounts[def.id_string]=current+add
            this.dirty.groups.add(g.index)
            this.owner.emit_event(inventory_events.changed,g)
            return Infinity
        }
        g.amounts[def.id_string]=current+add
        this.dirty.groups.add(g.index)
        this.owner.emit_event(inventory_events.changed,g)
        return count-add
    }
    protected give_include(g:InventoryGroup,def:GameItem,count:number):number{
        if(g.includes.includes(def))return count
        g.includes.push(def)
        g.includes.sort((a,b)=>(a.id_number??0)-(b.id_number??0))
        if(!g.selected||(def.id_number??0)>(g.selected.id_number??0))g.selected=def
        this.dirty.groups.add(g.index)
        this.owner.emit_event(inventory_events.changed,g)
        return count-1
    }
    protected give_normal(g:InventoryGroup,def:GameItem,count:number,extra?:ItemGiveExtra):number{
        const limit=this.item_limit(def,g)
        const infinite=count===Infinity
        let remaining=infinite?limit:count
        for(const s of g.slots){
            if(remaining<=0)break
            if(s.empty||s.is_default||s.item!.def!==def||!s.item!.allow_merge)continue
            const add=Math.min(remaining,limit-s.count)
            if(add<=0)continue
            s.count+=add
            remaining-=add
            this.dirty.slots.add(s.index)
        }
        for(const s of g.slots){
            if(remaining<=0)break
            if(!s.free)continue
            const add=Math.min(remaining,limit)
            if(add<=0)break
            if(!this.place(s,def,add,extra,false))break
            remaining-=add
        }
        if(infinite)return remaining<limit?Infinity:count
        return remaining
    }
    protected give_change(g:InventoryGroup,def:GameItem,count:number,extra?:ItemGiveExtra):number{
        const free=g.slots.find((s)=>s.free)
        if(free){
            const ctx:InventoryChangeContext={inventory:this,group:g,slot:free,def,old:free.item}
            if(free.is_default&&g.def.can_change&&!g.def.can_change(ctx))return count
            return this.place(free,def,1,extra,false)?count-1:count
        }
        const replace=g.def.replace??(g.def.hand?"hand":"first")
        let target:InventorySlot|undefined
        if(replace==="hand"){
            if(this.hand_slot?.group===g)target=this.hand_slot
        }else if(replace==="first"){
            target=g.slots[0]
        }
        if(!target)return count
        const ctx:InventoryChangeContext={inventory:this,group:g,slot:target,def,old:target.item}
        if(!(g.def.can_change?g.def.can_change(ctx):default_can_change(ctx)))return count
        return this.place(target,def,1,extra,true)?count-1:count
    }
    can_auto_take(def:GameItem):boolean{
        for(const g of this.groups_for(def)){
            switch(g.type){
                case "amount":
                    if((g.amounts[def.id_string]??0)<this.item_limit(def,g))return true
                    break
                case "include":
                    if(!g.includes.includes(def))return true
                    break
                case "change":{
                    if(g.slots.some((s)=>s.free))return true
                    if(!g.def.hand&&g.slots[0]){
                        const ctx:InventoryChangeContext={inventory:this,group:g,slot:g.slots[0],def,old:g.slots[0].item}
                        if(g.def.can_change?g.def.can_change(ctx):default_can_change(ctx))return true
                    }
                    break
                }
            }
        }
        return false
    }

    amount(id:string):number{
        for(const g of this.groups){
            if(g.type==="amount"&&g.amounts[id]!==undefined)return g.amounts[id]
        }
        return 0
    }
    consume_amount(id:string,count:number):number{
        for(const g of this.groups){
            if(g.type!=="amount"||!g.amounts[id])continue
            const c=Math.min(count,g.amounts[id])
            g.amounts[id]-=c
            if(g.amounts[id]<=0)delete g.amounts[id]
            this.dirty.groups.add(g.index)
            return c
        }
        return 0
    }
    has_include(def:GameItem):boolean{
        return this.groups.some((g)=>g.type==="include"&&g.includes.includes(def))
    }
    select_include(group:InventoryGroup,def:GameItem){
        if(!group.includes.includes(def))return
        group.selected=def
        this.dirty.groups.add(group.index)
    }

    can_hold(slot?:InventorySlot):boolean{
        return slot!==undefined&&!slot.empty&&slot.group.def.hand===true
    }
    set_hand(index:number,force:boolean=false){
        const slot=this.slots[index]
        if(!this.can_hold(slot))return
        if(this.hand_index===index&&!force)return
        const old=this.hand_item
        old?.unload()
        this.owner.actions.cancel()
        this.hand_index=index
        this.hand_item?.load(old?.def)
        this.recoil=undefined
        this.dirty.hand=true
        if(old&&this.hand_item)this.owner.animations.push({type:HumanAnimationType.Switch,item:this.definitions.game_items.keysString[this.hand_item.def.id_string]})
        this.owner.emit_event(inventory_events.hand,this.hand_item,old)
    }
    set_hand_slot(n:number){
        const s=this.hand_slots[n]
        const hand=this.hand_item
        if(!s||this.owner.hand_locked)return
        if(this.owner.scene.mode.rules.humans.no_quickswitch&&hand?.def.item_type===GameItemType.gun&&hand.use_delay>0)return
        this.set_hand(s.index)
    }
    select_default_hand(){
        const s=this.hand_slots.find((v)=>!v.empty)??this.slots.find((v)=>this.can_hold(v))
        if(s){
            this.set_hand(s.index,true)
        }else if(this.hand_index!==-1){
            this.hand_index=-1
            this.dirty.hand=true
        }
    }
    swap_slots(a:InventorySlot,b:InventorySlot){
        if(a.group!==b.group)return
        const ia=a.item,ca=a.count,da=a.is_default
        a.item=b.item;a.count=b.count;a.is_default=b.is_default
        b.item=ia;b.count=ca;b.is_default=da
        if(a.item)a.item.slot=a
        if(b.item)b.item.slot=b
        if(this.hand_index===a.index)this.hand_index=b.index
        else if(this.hand_index===b.index)this.hand_index=a.index
        this.dirty.slots.add(a.index)
        this.dirty.slots.add(b.index)
        this.dirty.hand=true
    }
    swap_hand_group(){
        const g=this.hand_slot?.group.slots.length===2?this.hand_slot.group:this.groups.find((v)=>v.def.hand&&v.type==="change"&&v.slots.length===2)
        if(!g)return
        this.swap_slots(g.slots[0],g.slots[1])
    }
    use_slot(index:number){
        const s=this.slots[index]
        if(!s?.item||s.empty||this.owner.hand_locked)return
        s.item.on_use()
    }
    reload(){
        if(this.owner.hand_locked)return
        this.hand_item?.reload()
    }

    drop_loot(loots:LootData[],position?:Vec2,layer?:number){
        const scene=this.owner.scene
        for(const l of loots){
            if(l.count<=0)continue
            const pos=v2.clone(position??this.owner.position)
            const loot=scene.add_object(scene.make_object(object_instance_type.loot),layer??this.owner.layer,undefined,{data:l,position:pos})
            ;(loot as {push?:(speed:number,angle:number)=>void}).push?.(random.float(0.5,1.5),random.rad())
            this.owner.emit_event(inventory_events.drop,loot)
        }
    }
    drop_slot(index:number,count?:number){
        const s=this.slots[index]
        if(!s?.item||s.empty||s.is_default||!s.item.droppable||s.group.def.droppable===false)return
        const c=Math.min(count??s.count,s.count)
        const loots=s.item.drop(c)
        this.owner.actions.cancel()
        this.remove_slot(s,c)
        this.drop_loot(loots)
    }
    drop_amount(id:string,count?:number){
        const def=this.definitions.game_items.valueString[id]
        if(!def)return
        const c=this.consume_amount(id,count??Math.ceil(this.amount(id)/2))
        if(c>0)this.drop_loot([{item:def,count:c}])
    }
    drop_include(group:InventoryGroup,def:GameItem){
        const idx=group.includes.indexOf(def)
        if(idx===-1||group.def.default===def.id_string||group.def.droppable===false)return
        if((def as {droppable?:boolean}).droppable===false)return
        group.includes.splice(idx,1)
        if(group.selected===def)group.selected=group.includes[group.includes.length-1]
        this.dirty.groups.add(group.index)
        this.drop_loot([{item:def,count:1}])
    }
    drop_all(){
        for(const s of this.slots){
            if(!s.item||s.empty||s.is_default)continue
            if(s.item.droppable&&s.group.def.droppable!==false)this.drop_loot(s.item.drop(s.count))
            this.remove_slot(s,s.count)
        }
        for(const g of this.groups){
            if(g.def.droppable===false)continue
            if(g.type==="amount"){
                for(const id in g.amounts){
                    const def=this.definitions.game_items.valueString[id]
                    let c=g.amounts[id]
                    while(c>0){
                        const rc=Math.min(c,100)
                        this.drop_loot([{item:def,count:rc}])
                        c-=rc
                    }
                }
                g.amounts={}
            }else if(g.type==="include"){
                for(const def of [...g.includes])this.drop_include(g,def)
            }
        }
        this.refresh()
        this.select_default_hand()
        this.dirty.full=true
    }
    clear(keep_defaults:boolean=true){
        for(const s of this.slots){
            if(s.item)s.item.on_remove()
            s.item=undefined
            s.count=0
            s.is_default=false
        }
        for(const g of this.groups){
            g.amounts={}
            g.includes=[]
            g.selected=undefined
        }
        this.hand_index=-1
        if(keep_defaults){
            this.refresh()
            for(const g of this.groups)this.fill_default(g)
            this.select_default_hand()
        }
        this.dirty.full=true
    }

    update(dt:number){
        for(const s of this.slots){
            if(s.item&&!s.empty)s.item.update(dt)
        }
        if(this.recoil){
            this.recoil.time-=dt
            if(this.recoil.time<=0)this.recoil=undefined
        }
    }
    net_update(){
        this.dirty.clear()
    }

    protected encode_slot(stream:Stream,s:InventorySlot,full:boolean,checkpoint:boolean){
        stream.write_uint16(s.index)
        stream.write_boolean_group(!s.empty,s.is_default,s.item?.skin!==undefined)
        if(s.empty)return
        stream.write_uint16(this.definitions.game_items.keysString[s.item!.def.id_string])
        stream.write_float32(s.count)
        if(s.item!.skin!==undefined)stream.write_uint8(s.item!.skin)
        if(checkpoint)s.item!.encode_checkpoint(stream)
        else s.item!.encode_net(stream,full)
    }
    protected decode_slot(stream:Stream,full:boolean,checkpoint:boolean){
        const s=this.slots[stream.read_uint16()]
        const [has_item,is_default,has_skin]=stream.read_boolean_group()
        if(!has_item){
            if(s&&!s.empty)this.remove_slot(s,s.count)
            return
        }
        const def=this.definitions.game_items.valueNumber[stream.read_uint16()]
        const count=stream.read_float32()
        const skin=has_skin?stream.read_uint8():undefined
        if(!s)return
        if(!s.item||s.item.def!==def)this.place(s,def,count,{skin},false,is_default)
        s.count=count
        s.is_default=is_default
        if(s.item){
            s.item.skin=skin
            if(checkpoint)s.item.decode_checkpoint(stream)
            else s.item.decode_net(stream,full)
        }
    }
    protected encode_group(stream:Stream,g:InventoryGroup){
        stream.write_uint8(g.index)
        if(g.type==="amount"){
            stream.write_array(Object.keys(g.amounts),(id)=>{
                stream.write_uint16(this.definitions.game_items.keysString[id])
                stream.write_float32(g.amounts[id])
            },2)
        }else if(g.type==="include"){
            stream.write_array(g.includes,(d)=>stream.write_uint16(this.definitions.game_items.keysString[d.id_string]),1)
            stream.write_int16(g.selected?this.definitions.game_items.keysString[g.selected.id_string]:-1)
        }else{
            stream.write_uint8(g.slots.length)
        }
    }
    protected decode_group(stream:Stream){
        const g=this.groups[stream.read_uint8()]
        if(g.type==="amount"){
            g.amounts={}
            stream.read_array(()=>{
                const def=this.definitions.game_items.valueNumber[stream.read_uint16()]
                g.amounts[def.id_string]=stream.read_float32()
            },2)
        }else if(g.type==="include"){
            g.includes=stream.read_array(()=>this.definitions.game_items.valueNumber[stream.read_uint16()],1)
            const sel=stream.read_int16()
            g.selected=sel>=0?this.definitions.game_items.valueNumber[sel]:undefined
        }else{
            const count=stream.read_uint8()
            while(g.slots.length>count)g.slots.pop()
            while(g.slots.length<count)this.add_slot(g)
            this.reindex()
        }
    }
    protected encode_state(stream:Stream,full:boolean,checkpoint:boolean){
        const groups=full?this.groups:[...this.dirty.groups].map((i)=>this.groups[i])
        stream.write_array(groups,(g)=>this.encode_group(stream,g),1)
        const slots=full?this.slots:[...this.dirty.slots].map((i)=>this.slots[i]).filter((s)=>s!==undefined)
        stream.write_array(slots,(s)=>this.encode_slot(stream,s,full,checkpoint),2)
        stream.write_int16(this.hand_index)
        stream.write_boolean_group(this.infinity_ammo,this.extended_capacity,this.hold_ammo)
    }
    protected decode_state(stream:Stream,full:boolean,checkpoint:boolean){
        stream.read_array(()=>this.decode_group(stream),1)
        stream.read_array(()=>this.decode_slot(stream,full,checkpoint),2)
        const hand=stream.read_int16()
        const [infinity_ammo,extended_capacity,hold_ammo]=stream.read_boolean_group()
        this.infinity_ammo=infinity_ammo
        this.extended_capacity=extended_capacity
        this.hold_ammo=hold_ammo
        if(hand!==this.hand_index){
            if(hand>=0&&this.can_hold(this.slots[hand]))this.set_hand(hand,true)
            else this.hand_index=hand
        }
    }
    encode_net(stream:Stream,full:boolean=this.dirty.full){
        stream.write_boolean_group(full)
        this.encode_state(stream,full,false)
    }
    decode_net(stream:Stream){
        const [full]=stream.read_boolean_group()
        if(full)this.clear(false)
        this.decode_state(stream,full,false)
    }
    encode_checkpoint(stream:Stream){
        stream.write_array([...this.infinity_ammos],(v)=>stream.write_string(v,1),1)
        this.encode_state(stream,true,true)
    }
    decode_checkpoint(stream:Stream){
        this.infinity_ammos=new Set(stream.read_array(()=>stream.read_string(1),1))
        this.clear(false)
        this.decode_state(stream,true,true)
        this.dirty.full=true
    }
}

export function default_can_change(ctx:InventoryChangeContext):boolean{
    if(ctx.slot.free)return true
    if(ctx.group.def.hand)return true
    const old=ctx.old?.def as {level?:number}|undefined
    const level=(ctx.def as {level?:number}).level
    if(old?.level===undefined||level===undefined)return ctx.old?.def!==ctx.def
    return level>old.level
}