import { Inventory, Item, Numeric, Slot } from "../../engine/core.ts";
import { GameDefinition, GameItem } from "../definitions/game_defs.ts";
import { AmmoDef } from "../definitions/items/ammo.ts";
import { BackpackDef } from "../definitions/items/backpacks.ts";
import { ConsumibleDef } from "../definitions/items/consumibles.ts";
import { GrenadeDef } from "../definitions/items/grenades.ts";
import { GunDef } from "../definitions/items/guns.ts";
import { MeleeDef } from "../definitions/items/melees.ts";
import { InventoryItemType } from "../definitions/utils.ts";

export abstract class MDItem extends Item{
    abstract item_type:InventoryItemType
    abstract def:GameItem
    droppable:boolean=true
    inventory!:GInventoryBase
    constructor(){
        super()
        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        this.inventory=null
    }
    unload(def?:GameItem){}
    load(def?:GameItem){}
}
export class GunItemBase extends MDItem{
    def:GunDef
    liquid:boolean=false
    item_type=InventoryItemType.gun
    constructor(def?:GunDef){
        super()
        this.def=def!
        this.tags.push("gun")
        this.liquid=false
    }
    is(other: MDItem): boolean {
        return (other.item_type===this.item_type)&&other.def.idNumber==this.def.idNumber
    }
}
export class AmmoItemBase extends MDItem{
    def:AmmoDef
    item_type: InventoryItemType.ammo=InventoryItemType.ammo
    constructor(def:AmmoDef){
        super()
        this.def=def
        this.tags.push("ammo",`ammo_${this.def.ammoType}`)
    }
    is(other: MDItem): boolean {
        return (other.item_type===this.item_type)&&other.def.idNumber==this.def.idNumber
    }
}
export class ConsumibleItemBase extends MDItem{
  def:ConsumibleDef
  item_type: InventoryItemType.consumible=InventoryItemType.consumible
  constructor(def:ConsumibleDef){
      super()
      this.def=def
  }
  is(other: MDItem): boolean {
      return (other.item_type===this.item_type)&&other.def.idNumber==this.def.idNumber
  }
}
export class GrenadeItemBase extends MDItem{
    def:GrenadeDef
    item_type: InventoryItemType.grenade=InventoryItemType.grenade
    constructor(def:GrenadeDef){
        super()
        this.def=def
    }
    is(other: MDItem): boolean {
        return (other.item_type===this.item_type)&&other.def.idNumber==this.def.idNumber
    }
}
export class MeleeItemBase extends MDItem{
    def:MeleeDef
    item_type: InventoryItemType.melee=InventoryItemType.melee
    constructor(def:MeleeDef){
      super()
      this.limit_per_slot=1
      this.def=def
    }
    is(other: MDItem): boolean {
      return (other.item_type===this.item_type)&&other.def.idNumber==this.def.idNumber
    }
}
export class GInventoryBase<IT extends MDItem=MDItem> extends Inventory<IT>{
    weapons:Record<number,IT|undefined>={}
    weapons_kind:Record<number,(new(def:GameItem)=>IT)>={}
    weapons_defaults:Record<number,GameItem>={}

    weapon_idx:number=-1
    hand_item?:IT
    hand_def?:GameItem

    aitems:Record<string,number>={} // Amount Items
    iitems:GameItem[]=[] // Inclusion Items

    backpack!:BackpackDef
    default_backpack!:BackpackDef

    net_sync:{
        hand:boolean
        weapons:boolean
        melee_world:boolean

        items:boolean
        aitems:boolean
        iitems:boolean
    }={
        hand:false,
        weapons:false,
        melee_world:false,

        items:false,
        aitems:false,
        iitems:false,
    }

    constructor(){
        super(1)
    }
    initialize(definitions:GameDefinition,weapons_kind:Record<number,(new(def:GameItem)=>IT)>,weapons_defaults?:Record<number,GameItem>){
        this.default_backpack=definitions.backpacks.getFromString("null_pack")
        this.set_backpack()
        this.weapons_kind=weapons_kind
        this.weapons_defaults=weapons_defaults??{
            0:definitions.melees.getFromString("fist")
        }
        this.clear_weapons()
        this.iitems.push(definitions.scopes.getFromNumber(0))

        this.set_weapon_index(0)
    }

    set_backpack(backpack?:BackpackDef){
        if(!backpack)backpack=this.default_backpack
        if(this.backpack&&this.backpack.idString===backpack.idString)return
        this.backpack=backpack
        for(const s of this.slots){
            if(s.item){
                s.item.limit_per_slot=backpack.max[s.item.def.idString]??this.default_backpack.max[s.item.def.idString]??15
            }
        }
        if(this.slots.length>backpack.slots){
            while(this.slots.length>backpack.slots){
                this.slots.pop()
            }
        }
        while(this.slots.length<backpack.slots){
            this.slots.push(new Slot<IT>())
        }
    }
    set_hand_item(val:IT){
        const old=this.hand_item?.def
        this.hand_item=val
        this.hand_def=val.def
        this.hand_item.load(old)

        this.net_sync.hand=true
    }
    set_weapon_index(idx:number,force:boolean=false){
        if((this.weapon_idx===idx&&!force)||!this.weapons[idx])return
        const val=this.weapons[idx as keyof typeof this.weapons]
        this.weapon_idx=idx
        if(this.hand_item){
            this.hand_item.unload()
        }
        this.set_hand_item(val!)
    }
    set_weapon(slot:number,wep?:GameItem){
        const oid=this.weapons[slot]?.def.idString
        if(wep||this.weapons_defaults[slot]){
            const item=new(this.weapons_kind[slot])(wep??this.weapons_defaults[slot])
            item.inventory=this
            this.weapons[slot]=item
        }else{
            this.weapons[slot]=undefined
        }
        if(slot==this.weapon_idx){
            this.weapon_idx=-1;
            if(wep){
                this.set_weapon_index(slot)
            }else{
                this.set_weapon_index(0)
            }
        }
        this.net_sync.weapons=true
    }
    weapon_is_free(slot:number):boolean{
        return !this.weapons[slot]||this.weapons[slot].def==this.weapons_defaults[slot]
    }
    clear_weapons(){
        this.weapons={}
        for(const k of Object.keys(this.weapons_kind)){
            if(this.weapons_defaults[k as unknown as number])this.set_weapon(k as unknown as number,this.weapons_defaults[k as unknown as number])
            else this.weapons[k as unknown as number]=undefined
        }
    }
    consume_aitems(a:string,val:number):number{
        if(this.aitems[a]){
            const con=Numeric.max(val,this.aitems[a])
            this.aitems[a]-=con
            if(this.aitems[a]===0){
                delete this.aitems[a]
            }
            this.net_sync.aitems=true
            return con
        }
        return 0
    }
    clear(){
        this.aitems={}
        this.iitems.length=1
        this.set_backpack()
        for(const s of this.slots){
            s.clear()
        }
        this.clear_weapons()
    }
    item_limit(item:GameItem):number{
        return this.backpack.max[item.idString]??this.default_backpack.max[item.idString]??15
    }
}