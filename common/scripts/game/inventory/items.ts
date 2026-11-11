import { CircleCollider2D, Numeric, Stream, v2, Vec2 } from "../../../engine/core.ts";
import { type GameItem } from "../../definitions/game_defs.ts";
import { type GunDef } from "../../definitions/items/guns.ts";
import { type MeleeDef } from "../../definitions/items/melees.ts";
import { type HelmetDef, type VestDef } from "../../definitions/items/equipaments.ts";
import { DamageReason, GameItemType } from "../../definitions/utils.ts";
import { type DamageParams, type LootData } from "../../others/constants.ts";
import { FireMode } from "../../others/item.ts";
import { type SimulatedObject } from "../base.ts";
import { InventoryAction, inventory_events, InventoryItem, type InventoryOwner, type ItemFactories, type ItemGiveExtra } from "./inventory.ts";

export enum InventoryActionType{
    Reload,
    Consuming,
}

export type Damageable=SimulatedObject&{
    damage(params:DamageParams):void
}

export class ReloadAction extends InventoryAction{
    delay:number
    type:number=InventoryActionType.Reload
    item:GunItem
    alt_reload:boolean=false
    constructor(item:GunItem){
        super()
        this.item=item
        const reload=item.def.reload
        if(reload?.reload_alt&&item.ammo===0){
            this.delay=reload.reload_alt.delay
            this.alt_reload=true
        }else{
            this.delay=reload?.delay??1
        }
    }
    on_execute(user:InventoryOwner){
        const def=this.item.def
        if(!def.reload)return
        const capacity=this.item.get_capacity()
        const request=Math.min(
            this.alt_reload?(def.reload.reload_alt?.reload_count??capacity):def.reload.reload_count??capacity,
            capacity-this.item.ammo
        )
        if(this.item.infinity_ammo()){
            this.item.ammo+=request
        }else{
            this.item.ammo+=user.inventory.consume_amount(def.ammo_type,request)
        }
        if(this.item.ammo>=capacity)this.item.reloading=false
        user.inventory.dirty.hand=true
        if(this.item.slot)user.inventory.dirty.slots.add(this.item.slot.index)
        user.emit_event(inventory_events.reload,this.item,false)
    }
    override on_cancel(_user:InventoryOwner){
        this.item.reloading=false
    }
}

export class GunItem extends InventoryItem{
    def!:GunDef
    ammo:number=0
    use_delay:number=0
    fire_sequence:number=0
    burst?:{t:number,c:number}
    reloading:boolean=false
    dual_d:boolean=false

    constructor(def:GunDef){
        super()
        this.set_def(def)
    }
    set_def(def:GunDef){
        this.def=def
        this.use_delay=def.fire_delay??0
        if(def.fire_sequence)this.fire_sequence=1
    }
    get_capacity():number{
        const reload=this.def.reload
        if(!reload)return 0
        return (this.inventory.extended_capacity?(reload.extended_capacity??reload.capacity):reload.capacity)??0
    }
    infinity_ammo():boolean{
        return this.inventory.infinity_ammo||this.inventory.infinity_ammos.has(this.def.ammo_type)
    }
    has_ammo():boolean{
        return this.ammo>0||!this.def.reload
    }
    override on_give(extra?:ItemGiveExtra){
        if(extra?.ammo===true)this.ammo=this.get_capacity()
        else if(typeof extra?.ammo==="number")this.ammo=extra.ammo
    }
    override merge(def:GameItem,extra?:ItemGiveExtra):boolean{
        const gun=def as GunDef
        if(gun!==this.def||!gun.dual||gun.dual_from)return false
        const dual=this.inventory.definitions.guns.getFromStringSafe(gun.id_string+"_dual")
        if(!dual)return false
        const old_ammo=this.ammo
        const in_hand=this.in_hand
        if(in_hand)this.unload()
        this.set_def(dual)
        if(extra?.ammo===true)this.ammo=dual.reload?.capacity??0
        else if(typeof extra?.ammo==="number")this.ammo=old_ammo+extra.ammo
        if(in_hand)this.load(gun)
        return true
    }
    override on_fire():boolean{
        const user=this.owner
        if(this.def.fire_mode===FireMode.Single&&!user.input.using_item_down)return false
        if(this.has_ammo()){
            if(this.use_delay<=0){
                if(this.def.fire_mode===FireMode.Burst&&this.def.burst&&!this.burst){
                    this.burst={c:this.def.burst.sequence-1,t:this.def.burst.delay}
                    this.use_delay=0
                }else{
                    this.shot()
                }
                return true
            }
        }else{
            this.burst=undefined
        }
        return false
    }
    override reload(){
        if(this.def.reload)this.reloading=true
    }
    start_reload(){
        const user=this.owner
        if(!this.def.reload||user.knocked)return
        const no_ammo=!this.infinity_ammo()&&!user.inventory.amount(this.def.ammo_type)
        if(this.ammo>=this.get_capacity()||no_ammo||this.use_delay>0){
            if(this.ammo>=this.get_capacity()||no_ammo)this.reloading=false
            return
        }
        user.actions.play(new ReloadAction(this))
        user.emit_event(inventory_events.reload,this,true)
    }
    muzzle_position():Vec2{
        const user=this.owner
        const barrel=v2(
            this.def.barrel_length,
            (this.def.barrel_offset??0)+(this.def.dual_from?(this.dual_d?-this.def.dual_offset:this.def.dual_offset):0)
        )
        return v2.add(user.position,v2.rotate_RadAngle(barrel,user.rotation))
    }
    shot(consume:boolean=true){
        const user=this.owner
        user.actions.cancel()
        this.reloading=false
        if(consume&&this.def.reload)this.ammo=Math.max(this.ammo-(this.def.reload.ammo_consume??1),0)
        const position=this.muzzle_position()
        if(this.def.dual_from)this.dual_d=!this.dual_d
        if(this.def.fire_sequence){
            this.fire_sequence=Math.min(this.fire_sequence+this.def.fire_sequence.increse,1)
        }
        if(this.burst){
            if(this.burst.c<=0||this.ammo<=0){
                this.burst=undefined
                this.use_delay=this.def.fire_delay??0
            }else{
                this.burst.c--
                this.use_delay=this.burst.t
            }
        }else{
            this.use_delay=this.def.fire_delay??0
        }
        user.inventory.dirty.hand=true
        if(this.slot)user.inventory.dirty.slots.add(this.slot.index)
        user.emit_event(inventory_events.fire,this,position,user.rotation)
    }
    override update(dt:number){
        if(this.use_delay>0)this.use_delay-=dt
        else if(this.fire_sequence>0&&this.def.fire_sequence?.decay){
            this.fire_sequence=Math.max(this.fire_sequence-this.def.fire_sequence.decay*dt,0)
        }
        if(this.in_hand&&!this.owner.actions.current_action){
            if(((this.ammo<=0&&this.use_delay<=0)||this.reloading)&&this.def.reload){
                this.reloading=true
                this.start_reload()
            }
            if(this.use_delay<=0&&this.burst)this.shot()
        }
    }
    override load(old?:GameItem){
        if(this.def.switch_delay&&this.use_delay<=this.def.switch_delay){
            this.use_delay=this.def.switch_delay
            if(old?.item_type===GameItemType.gun&&this.def.class_switch_multiply){
                this.use_delay*=this.def.class_switch_multiply[(old as GunDef).class]??1
            }
        }else if(this.def.switch_multiply!==undefined){
            this.use_delay=Math.min(this.def.fire_delay??0,this.use_delay*this.def.switch_multiply)
        }
    }
    override unload(){
        this.reloading=false
        this.burst=undefined
        if(this.def.unload_delay!==undefined)this.use_delay=this.def.unload_delay
    }
    override drop(count:number=1):LootData[]{
        const hold=this.inventory.hold_ammo
        if(!hold&&this.ammo>0&&!this.infinity_ammo()){
            const ammo=this.inventory.definitions.game_items.valueString[this.def.ammo_type]
            if(ammo)this.inventory.give_item(ammo,this.ammo)
            this.ammo=0
        }
        if(this.def.dual_from){
            const single=this.inventory.definitions.guns.getFromString(this.def.dual_from)
            return [
                {item:single,count:1,skin:this.skin,ammo:hold?Math.ceil(this.ammo/2):undefined},
                {item:single,count:1,skin:this.skin,ammo:hold?Math.floor(this.ammo/2):undefined},
            ]
        }
        return [{item:this.def,count,skin:this.skin,ammo:hold?this.ammo:undefined}]
    }
    override encode_net(stream:Stream,_full:boolean){
        stream.write_uint16(this.ammo)
    }
    override decode_net(stream:Stream,_full:boolean){
        this.ammo=stream.read_uint16()
    }
    override encode_checkpoint(stream:Stream){
        stream.write_uint16(this.def.id_number!)
        stream.write_uint16(this.ammo)
        stream.write_float32(this.use_delay)
        stream.write_float(this.fire_sequence,0,1,1)
    }
    override decode_checkpoint(stream:Stream){
        this.set_def(this.inventory.definitions.guns.getFromNumber(stream.read_uint16()))
        this.ammo=stream.read_uint16()
        this.use_delay=stream.read_float32()
        this.fire_sequence=stream.read_float(0,1,1)
    }
}

export class MeleeItem extends InventoryItem{
    def:MeleeDef
    use_delay:number=0
    damage_times:number[]=[]
    firing:boolean=false
    constructor(def:MeleeDef){
        super()
        this.def=def
    }
    override on_fire():boolean{
        const user=this.owner
        if(this.def.fire_mode===FireMode.Single&&!user.input.using_item_down)return false
        if(this.use_delay>0)return false
        user.actions.cancel()
        this.damage_times=[...this.def.damage_delays]
        this.use_delay=this.def.attack_delay
        this.firing=true
        user.inventory.dirty.hand=true
        user.emit_event(inventory_events.fire,this,user.position,user.rotation)
        return true
    }
    attack(){
        const user=this.owner
        const hb=new CircleCollider2D(v2.add_rotate_RadAngle(user.position,this.def.offset,user.rotation),this.def.radius)
        const objs:SimulatedObject[]=user.scene.cells.get_objects(hb,user.layer)
        for(const o of objs){
            if(o.id===user.id||o.destroyed)continue
            const d=o as Damageable
            if(typeof d.damage!=="function"||!hb.colliding_with(o.collider))continue
            d.damage({
                amount:this.def.damage,
                reason:DamageReason.Human,
                owner:user,
                source:this.def,
                position:hb.position,
                direction:v2.lookTo(o.position,user.position),
                critical:false,
                penetration:1,
            })
        }
    }
    override update(dt:number){
        if(this.in_hand&&!this.owner.knocked){
            for(let i=0;i<this.damage_times.length;i++){
                this.damage_times[i]-=dt
                if(this.damage_times[i]<=0){
                    this.damage_times.splice(i,1)
                    i--
                    this.attack()
                }
            }
        }
        if(this.use_delay>0)this.use_delay-=dt
        else this.firing=false
    }
    override load(_old?:GameItem){
        this.use_delay=this.def.switch_delay??0
    }
    override unload(){
        this.use_delay=this.def.attack_delay
        this.damage_times.length=0
    }
    override encode_checkpoint(stream:Stream){
        stream.write_float32(this.use_delay)
    }
    override decode_checkpoint(stream:Stream){
        this.use_delay=stream.read_float32()
    }
}

export class StackItem extends InventoryItem{
    def:GameItem
    use_delay:number=0
    constructor(def:GameItem){
        super()
        this.def=def
        this.allow_merge=(def as {allow_merge?:boolean}).allow_merge??true
    }
    override on_use(){
        if(this.def.item_type===GameItemType.grenade&&this.slot)this.inventory.set_hand(this.slot.index)
    }
    override update(dt:number){
        if(this.use_delay>0)this.use_delay-=dt
    }
}

export class EquipmentItem extends InventoryItem{
    def:GameItem
    health?:number
    constructor(def:GameItem){
        super()
        this.def=def
        this.health=(def as HelmetDef|VestDef).health
    }
    get defence():number{
        return (this.def as HelmetDef|VestDef).defence??0
    }
    get reduction():number{
        return (this.def as HelmetDef|VestDef).reduction??0
    }
    get level():number{
        return (this.def as {level?:number}).level??0
    }
    override drop(count:number=1):LootData[]{
        if(this.level<=0&&this.def.item_type===GameItemType.backpack)return []
        return super.drop(count)
    }
    override encode_net(stream:Stream,_full:boolean){
        stream.write_boolean_group(this.health!==undefined)
        if(this.health!==undefined)stream.write_float32(this.health)
    }
    override decode_net(stream:Stream,_full:boolean){
        const [has_health]=stream.read_boolean_group()
        this.health=has_health?stream.read_float32():undefined
    }
    override encode_checkpoint(stream:Stream){
        this.encode_net(stream,true)
    }
    override decode_checkpoint(stream:Stream){
        this.decode_net(stream,true)
    }
}

export const DefaultItemFactories:ItemFactories={
    [GameItemType.gun]:(_inv,def)=>new GunItem(def as unknown as GunDef),
    [GameItemType.melee]:(_inv,def)=>new MeleeItem(def as MeleeDef),
    [GameItemType.consumible]:(_inv,def)=>new StackItem(def),
    [GameItemType.grenade]:(_inv,def)=>new StackItem(def),
    [GameItemType.helmet]:(_inv,def)=>new EquipmentItem(def),
    [GameItemType.vest]:(_inv,def)=>new EquipmentItem(def),
    [GameItemType.backpack]:(_inv,def)=>new EquipmentItem(def),
    [GameItemType.accessory]:(_inv,def)=>new EquipmentItem(def),
}

export function armor_damage(inventory:{get_items<T extends InventoryItem<any>>(type:GameItemType):T[]},params:DamageParams){
    const penetration=params.penetration??1
    let mod=1
    let amount=params.amount
    for(const type of [GameItemType.vest,GameItemType.helmet]){
        for(const e of inventory.get_items<EquipmentItem>(type)){
            mod-=e.reduction*penetration
            amount-=e.defence*penetration
        }
    }
    params.amount=Math.max(amount*Numeric.clamp(mod,0,1),0)
}
