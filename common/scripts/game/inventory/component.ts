import { ActionsManager, gel_events, GELComponent, Stream } from "../../../engine/core.ts";
import { type SimulatedObject } from "../base.ts";
import { InputActionType, type InputAction } from "../../net/input_packet.ts";
import { type DamageParams } from "../../others/constants.ts";
import { human_events } from "../objects/moving_body/human_events.ts";
import { Inventory, inventory_speed, type InventoryAction, type InventoryGroupDef, type InventoryOwner, type ItemFactories } from "./inventory.ts";
import { armor_damage, DefaultItemFactories } from "./items.ts";
import { HumanInventoryLayout } from "./layouts.ts";

export type SI_InventoryOwner=SimulatedObject&InventoryOwner&{
    inventory:Inventory<SI_InventoryOwner>
    actions:ActionsManager<SI_InventoryOwner,InventoryAction>
    inventory_layout:()=>InventoryGroupDef[]
    inventory_factories:ItemFactories
    setup_inventory(layout?:InventoryGroupDef[],factories?:ItemFactories):void
}

export const si_inventory:GELComponent<SI_InventoryOwner>={
    id_string:"si_inventory",
    events:{
        [gel_events.bind]:function(){
            this.allow_tick=true
            this.allow_net_update=true
            this.inventory_factories??=DefaultItemFactories
        },
        [gel_events.create]:function(){
            if(!this.inventory)this.setup_inventory()
        },
        [gel_events.tick]:function(dt:number){
            this.inventory.update(dt)
            this.actions.update(dt)
        },
        [gel_events.net_update]:function(){
            this.inventory.net_update()
            this.actions.net_update()
        },
        [gel_events.checkpoint_encode]:function(stream:Stream){
            this.inventory.encode_checkpoint(stream)
        },
        [gel_events.checkpoint_decode]:function(stream:Stream){
            this.inventory.decode_checkpoint(stream)
        },
    },
    methods:{
        setup_inventory(layout?:InventoryGroupDef[],factories?:ItemFactories){
            this.actions=new ActionsManager(this)
            this.inventory=new Inventory(this,factories??this.inventory_factories)
            this.inventory.initialize(layout??this.inventory_layout?.()??[])
        },
    },
}

export type SI_HumanInventory=SI_InventoryOwner&{
    knocked:boolean
    swimming:boolean
    input:SI_InventoryOwner["input"]&{
        reload:boolean
        swap_guns:boolean
    }
}

export const si_human_inventory:GELComponent<SI_HumanInventory>={
    id_string:"si_human_inventory",
    extensions:[si_inventory],
    events:{
        [gel_events.bind]:function(){
            this.inventory_layout=HumanInventoryLayout
        },
        [human_events.update_modifiers]:function(mods:Record<string,number>){
            mods.speed=(mods.speed??1)*inventory_speed(this.inventory)*(this.actions.current_action?.action_speed??1)
        },
        [human_events.use_hand]:function(){
            if(this.knocked||this.swimming)return
            const hand=this.inventory.hand_item
            if(!hand)return
            if(this.input.use_weapon){
                if(hand.on_fire())this.input.using_item_down=false
            }else if(this.input.alt_use_weapon){
                hand.on_fire_alt()
            }
        },
        [human_events.tick_input]:function(actions:InputAction[]){
            const inv=this.inventory
            if(this.input.reload)inv.reload()
            if(this.input.swap_guns)inv.swap_hand_group()
            const executed=new Set<InputActionType>()
            for(const a of actions){
                if(executed.has(a.type))continue
                switch(a.type){
                    case InputActionType.drop:
                        if(a.drop<0)break
                        switch(a.drop_kind){
                            case 1:{
                                const s=inv.hand_slots[a.drop]
                                if(s)inv.drop_slot(s.index)
                                break
                            }
                            case 2:{
                                const def=inv.definitions.game_items.valueNumber[a.drop]
                                if(def)inv.drop_amount(def.id_string)
                                break
                            }
                            case 3:{
                                const s=inv.item_slots[a.drop]
                                if(s)inv.drop_slot(s.index)
                                break
                            }
                            case 4:{
                                const def=inv.definitions.game_items.valueNumber[a.drop]
                                const s=inv.slots.find((v)=>v.item?.def===def&&!v.is_default)
                                if(s)inv.drop_slot(s.index)
                                break
                            }
                            case 5:{
                                const def=inv.definitions.game_items.valueNumber[a.drop]
                                const g=def?inv.groups.find((v)=>v.includes.includes(def)):undefined
                                if(g)inv.drop_include(g,def)
                                break
                            }
                            case 6:{
                                const s=inv.slots.filter((v)=>v.group.type==="change"&&!v.group.def.hand)[a.drop]
                                if(s)inv.drop_slot(s.index)
                                break
                            }
                        }
                        break
                    case InputActionType.use_item:{
                        if(this.knocked)break
                        const s=inv.item_slots[a.slot]
                        if(s)inv.use_slot(s.index)
                        break
                    }
                    case InputActionType.set_hand:
                        if(this.knocked)break
                        inv.set_hand_slot(a.hand)
                        break
                    case InputActionType.set_scope:{
                        const def=inv.definitions.game_items.valueNumber[a.scope_id]
                        const g=def?inv.groups.find((v)=>v.includes.includes(def)):undefined
                        if(g)inv.select_include(g,def)
                        break
                    }
                    default:
                        continue
                }
                executed.add(a.type)
            }
        },
        [human_events.modify_damage]:function(params:DamageParams){
            armor_damage(this.inventory,params)
        },
        [human_events.knocked]:function(){
            this.actions.cancel()
            this.inventory.set_hand_slot(0)
        },
        [human_events.die]:function(){
            this.actions.cancel()
        },
    },
}
