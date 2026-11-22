import { type DamageParams, type ProjectileOwner } from "../projectile/projectile.ts";
import { ActionsManager, CheckpointContext, CircleCollider2D, Collider2D, Numeric, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type GameItem } from "common/scripts/definitions/game_defs.ts";
import { ConsumibleCondition } from "common/scripts/definitions/items/consumibles.ts";
import { type MeleeDef } from "common/scripts/definitions/items/melees.ts";
import { type BadgeDef } from "common/scripts/definitions/loadout/badges.ts";
import { type EmoteDef } from "common/scripts/definitions/loadout/emotes.ts";
import { type LoadoutAccessoryDef, type LoadoutBodyDef, type LoadoutEyesDef, type LoadoutFootDef, type LoadoutHairDef, type LoadoutLegDef, type LoadoutShirtDef } from "common/scripts/definitions/loadout/skins.ts";
import { HumanAnimations, type HumanoidMomentaryDef, type MomentaryPlayOptions } from "common/scripts/definitions/player/human_animations.ts";
import { type BoostDef } from "common/scripts/definitions/player/boosts.ts";
import { type EffectInstance, type SideEffect, SideEffectType } from "common/scripts/definitions/player/effects.ts";
import { GameItemType, GameObjectDefinitionType, type LoadoutPreset } from "common/scripts/definitions/utils.ts";
import { InputActionType, type InputData } from "common/scripts/net/input_packet.ts";
import { GameConstants, type HumanAnimation, HumanAnimationType, object_instance_type, ObjectType } from "common/scripts/others/constants.ts";
import { apply_modifiers } from "common/scripts/others/functions.ts";
import { Floors, FloorType } from "common/scripts/others/terrain.ts";
import { decode_visual, encode_visual, type HumanVisual } from "common/scripts/net/visual.ts";
import { SimObject } from "../../main/base.ts";
import { MovingBody } from "../moving_body.ts";
import { type InventoryAction, Inventory, type InventoryOwner, InventoryGroupDef } from "../../inventory/inventory.ts";
import { armor_damage, DefaultItemFactories, type EquipmentItem, GrenadeItem } from "../../inventory/items.ts";
import { HumanInventoryLayout } from "../../inventory/layouts.ts";
import { human_events } from "./events.ts";
import { type HumanScript } from "./script.ts";


export interface HumanCreateArgs{
    position?:Vec2
    name?:string
    loadout?:LoadoutPreset
    inventory_loadout?:InventoryGroupDef[]
}

export type Interactable=SimObject&{
    can_interact(user:Human):boolean
    on_interact(user:Human):void
    auto_interact?(user:Human):boolean
}

export class Human extends MovingBody implements InventoryOwner{
    name:string=""
    dead:boolean=false
    downed:boolean=false
    swimming:boolean=false
    scale:number=1
    down_timer:number=0

    secondary_velocity:Vec2=v2.zero()
    secondary_acceleration:number=1
    current_floor:FloorType=FloorType.Void

    visual!:HumanVisual&{dirty:boolean}

    momentary?:{
        def:HumanoidMomentaryDef
        time:number
        duration?:number
        on_end?:(completed:boolean)=>void
    }
    momentary_dirty:boolean=false

    knocked:boolean=false
    controlled:boolean=false
    self_revive:boolean=false

    health={value:100,max:100,invencibility:0}
    boost!:{value:number,max:number,def:BoostDef}
    knocked_by?:ProjectileOwner
    last_damage_by?:ProjectileOwner
    bleed_timer:number=0

    movement_enabled:boolean=true
    combat_enabled:boolean=true
    pacific_enabled:boolean=false
    drop_on_death_enabled:boolean=true

    inventory!:Inventory<Human>
    actions!:ActionsManager<Human,InventoryAction>

    input:InputData&{
        using_item_down:boolean
    }={
        movement:{dir:0,scale:0},
        rotation:0,
        distance_to_aim:0,
        auto_fire:false,
        use_weapon:false,
        alt_use_weapon:false,
        interact:false,
        cancel:false,
        reload:false,
        swap_guns:false,
        actions:[],
        using_item_down:false
    }
    emote_time:number=0

    modifiers:Record<string,number>={}
    temp_modifiers:Record<string,number>={}

    effects=new Map<number,EffectInstance&{owner?:ProjectileOwner}>()
    effects_dirty:boolean=true

    interaction={enabled:true,auto_pickup:false,radius:1.1}

    animations:HumanAnimation[]=[]

    script?:HumanScript

    constructor(){
        super()
        this.object_type=ObjectType.Human
        this.instance_type=object_instance_type.human
        this.allow_tick=true
        this.allow_net_update=true
        this.base_collider=new CircleCollider2D(v2(0,0),GameConstants.humanoid.radius)
    }

    get hand_locked():boolean{
        return this.momentary?.def.lock_hand===true
    }

    on_create(args:HumanCreateArgs={}){
        if(args.position)this.position=args.position
        this.name=args.name??""
        this.visual={
            accessorys:[],
            body:{def:this.app.definitions.loadout.getFromString("body_1") as LoadoutBodyDef,tint:0x000000},
            legs:this.app.definitions.loadout.getFromString("blue_jeans_pants") as LoadoutLegDef,
            shirt:this.app.definitions.loadout.getFromString("red_shirt") as LoadoutShirtDef,
            dirty:true
        }
        this.set_loadout_preset(args.loadout)
        this.boost={value:0,max:100,def:this.app.definitions.boosts.getFromString(GameConstants.human.default_boost)}
        this.actions=new ActionsManager(this)
        this.inventory=new Inventory(this,DefaultItemFactories)
        this.inventory.initialize(args.inventory_loadout??HumanInventoryLayout())
        this.inventory.hold_ammo=this.scene.mode.rules.humans.hold_ammo
    }
    on_destroy(){
        this.set_script(undefined)
    }

    get_modifier(name:string):number{
        return (this.modifiers[name]??1)*(this.scene.mode.rules.humans.modifiers[name]??1)
    }

    on_tick(dt:number){
        if(this.dead)return
        this.script?.tick(dt)
        this.controlled=this.script!==undefined&&this.script.take_control

        this.inventory.emit_event("tick",dt)
        this.inventory.update(dt)
        this.actions.update(dt)
        for(const e of this.effects.values()){
            e.tick_time-=dt
            e.time-=dt
            if(e.tick_time<=0){
                e.tick_time=1
                for(const sf of e.effect.side_effects){
                    if(sf.type!==SideEffectType.Modify)this.apply_side_effect(sf,e.owner)
                }
            }
            if(e.time<0){
                this.effects.delete(e.effect.id_number!)
                this.effects_dirty=true
            }
        }
        if(this.dead)return
        if(this.momentary){
            this.momentary.time+=dt
            if(this.momentary.duration!==undefined&&this.momentary.time>=this.momentary.duration)this.stop_momentary(true)
        }
        this.current_floor=this.scene.map.terrain.get_floor_type(this.position,this.layer,this.scene.map.default_floor) as FloorType
        this.swimming=Floors[this.current_floor]?.deep===true
        if(this.down_timer>0)this.down_timer=Math.max(this.down_timer-dt,0)
        this.downed=this.down_timer>0
        if(this.knocked)this.downed=true
        if(this.emote_time>0)this.emote_time-=dt

        this.modifiers={}
        apply_modifiers(this.modifiers,this.temp_modifiers)
        if(this.boost.def.se?.update_modifiers)apply_modifiers(this.modifiers,this.boost.def.se.update_modifiers(this))
        for(const e of this.effects.values()){
            for(const sf of e.effect.side_effects){
                if(sf.type===SideEffectType.Modify)apply_modifiers(this.modifiers,sf.modify)
            }
        }
        for(const slot of this.inventory.slots){
            const def=slot.item?.def as {modifiers?:Record<string,number>,events?:Record<string,(e:unknown)=>Record<string,number>|void>}|undefined
            if(def?.modifiers)apply_modifiers(this.modifiers,def.modifiers)
            const mods=def?.events?.apply_modifiers?.(this)
            if(mods)apply_modifiers(this.modifiers,mods)
        }
        if(this.health.invencibility>0)this.health.invencibility=Math.max(this.health.invencibility-dt,0)

        if(this.knocked){
            this.bleed_timer+=dt
            if(this.bleed_timer>=1){
                this.bleed_timer=0
                this.piercing_damage({amount:1,position:this.position})
                if(this.dead)return
            }
        }else{
            this.bleed_timer=0
        }

        this.tick_physics(dt)
        this.move(dt)

        const hand=this.inventory.slots[this.inventory.hand_index]?.item
        if(hand&&this.combat_enabled&&!this.pacific_enabled&&!this.hand_locked&&!this.knocked&&!this.swimming){
            if(this.input.use_weapon){
                if(hand.on_fire())this.input.using_item_down=false
            }else if(this.input.alt_use_weapon){
                hand.on_fire_alt()
            }
        }
        this.tick_input()
        this.set_dirty_part()
    }

    tick_physics(dt:number){
        const floor=Floors[this.current_floor]
        const slow=this.downed||this.swimming
        const acceleration=Numeric.dt_expo_inter(40*(slow?0.2:floor.acceleration),dt)
        const rotation_locked=this.momentary?.def.lock_rotation===true

        if(this.movement_enabled&&this.momentary?.def.lock_movement!==true){
            const hand=this.inventory.slots[this.inventory.hand_index]?.item
            const grenade_holding=hand instanceof GrenadeItem&&hand.holding!==undefined
            let speed=5.7*floor.speed_mult*this.get_modifier("speed")
                *(this.inventory.recoil?.speed??1)
                *(this.actions.current_action?.action_speed??1)
                *((this.inventory.slots[this.inventory.hand_index]?.item?.def as {speed_mod?:number}|undefined)?.speed_mod??1)
                *(grenade_holding?0.7:1)
                *(this.boost.def.se?.tick?.(dt,this)??1)
            if(this.knocked)speed*=0.3
            else if(this.swimming)speed*=0.6
            const move=v2.from_PolarMovement(this.input.movement)
            v2m.scale(move,move,speed)
            v2m.lerp(this.velocity,move,acceleration)
            if(!rotation_locked){
                if(slow){
                    if(this.input.movement.scale>0)this.rotation=Numeric.lerp_rad(this.rotation,this.input.movement.dir,Numeric.dt_expo_inter(1,dt))
                }else{
                    this.rotation=this.input.rotation
                }
            }
        }else{
            this.velocity=v2.zero()
            if(!rotation_locked&&!slow&&this.movement_enabled)this.rotation=this.input.rotation
        }

        if(v2.len(this.secondary_velocity)>0.07){
            v2m.add(this.velocity,this.velocity,this.secondary_velocity)
            v2m.lerp(this.secondary_velocity,v2.zero,acceleration*this.secondary_acceleration)
        }else if(this.secondary_velocity.x!==0||this.secondary_velocity.y!==0){
            this.secondary_velocity=v2.zero()
        }
    }

    process_input(data:InputData){
        if(this.controlled)return
        this.input.movement=data.movement
        this.input.auto_fire=data.auto_fire
        if(data.auto_fire||(!this.input.use_weapon&&data.use_weapon))this.input.using_item_down=true
        this.input.rotation=data.rotation
        this.input.use_weapon=data.use_weapon
        this.input.alt_use_weapon=data.alt_use_weapon
        this.input.distance_to_aim=data.distance_to_aim
        this.input.interact=data.interact||this.input.interact
        this.input.reload=data.reload||this.input.reload
        this.input.swap_guns=data.swap_guns||this.input.swap_guns
        this.input.cancel=data.cancel||this.input.cancel
        this.input.actions.push(...data.actions)
    }

    tick_input(){
        const inv=this.inventory
        if(this.input.reload)inv.reload()
        if(this.input.swap_guns)inv.swap_hand_group()
        const executed=new Set<InputActionType>()
        for(const a of this.input.actions){
            if(executed.has(a.type))continue
            executed.add(a.type)
            switch(a.type){
                case InputActionType.emote:{
                    if(this.emote_time>0)break
                    const def=this.app.definitions.game_objects.valueNumber[a.id] as EmoteDef|GameItem|BadgeDef|undefined
                    if(!(def?.def_type===GameObjectDefinitionType.badge||def?.def_type===GameObjectDefinitionType.emote||def?.def_type===GameObjectDefinitionType.item))break
                    this.emote_time=2.5
                    this.animations.push({type:HumanAnimationType.Emote,id:a.id})
                    break
                }
                case InputActionType.message:
                    if(this.emote_time>0&&a.value.length>0)break
                    this.emote_time=1.5
                    this.animations.push({type:HumanAnimationType.Message,msg:a.value})
                    break
                case InputActionType.drop:
                    if(a.drop<0)break
                    switch(a.drop_kind){
                        case 1:{
                            const s=inv.hand_slots[a.drop]
                            if(s)inv.drop_slot(s.index)
                            break
                        }
                        case 2:{
                            const def=inv.owner.app.definitions.game_items.valueNumber[a.drop]
                            if(def)inv.drop_amount(def.id_string)
                            break
                        }
                        case 3:{
                            const s=inv.item_slots[a.drop]
                            if(s)inv.drop_slot(s.index)
                            break
                        }
                        case 4:{
                            const def=inv.owner.app.definitions.game_items.valueNumber[a.drop]
                            const s=inv.slots.find((v)=>v.item?.def===def&&!v.is_default)
                            if(s)inv.drop_slot(s.index)
                            break
                        }
                        case 5:{
                            const def=inv.owner.app.definitions.game_items.valueNumber[a.drop]
                            const g=def?inv.groups.find((v)=>v.includes.includes(def)):undefined
                            if(g)inv.drop_include(g,def)
                            break
                        }
                        case 6:{
                            const s=inv.slots.filter((v)=>v.group.def.type==="change"&&!v.group.def.hand)[a.drop]
                            if(s)inv.drop_slot(s.index)
                            break
                        }
                    }
                    break
                case InputActionType.use_item:{
                    const s=inv.item_slots[a.slot]
                    if(s&&!this.knocked)inv.use_slot(s.index)
                    break
                }
                case InputActionType.set_hand:
                    if(!this.knocked)inv.set_hand_slot(a.hand)
                    break
                case InputActionType.set_scope:{
                    const def=inv.owner.app.definitions.game_items.valueNumber[a.scope_id]
                    const g=def?inv.groups.find((v)=>v.includes.includes(def)):undefined
                    if(g)inv.select_include(g,def)
                    break
                }
            }
        }
        if(!this.knocked)this.interact(this.input.interact)
        this.input.swap_guns=false
        this.input.interact=false
        this.input.reload=false
        this.input.cancel=false
        this.input.actions.length=0
    }

    get_interactables():Interactable[]{
        const area=new CircleCollider2D(this.position,this.interaction.radius)
        const ret=(this.scene.cells.get_objects(area,this.layer) as Interactable[]).filter((o)=>o.id!==this.id&&!o.destroyed&&typeof o.can_interact==="function"&&o.can_interact(this))
        return ret.sort((a,b)=>v2.distanceSquared(a.position,this.position)-v2.distanceSquared(b.position,this.position))
    }
    interact(manual:boolean):Interactable|undefined{
        if(!this.interaction.enabled)return undefined
        const list=this.get_interactables()
        const target=manual?list[0]:this.interaction.auto_pickup?list.find((o)=>o.auto_interact?.(this)):undefined
        target?.on_interact(this)
        return target
    }
    can_interact(_user:Human):boolean{
        return !this.dead&&!this.destroyed&&this.script?.interactable===true
    }
    on_interact(user:Human){
        this.script?.on_interact(user)
    }

    get_reflect_collider():Collider2D|undefined{
        const melee=this.inventory.get_group("melee")?.slots[0]?.item?.def as MeleeDef|undefined
        const reflect=this.inventory.slots[this.inventory.hand_index]?.item?.def===melee?melee?.reflective?.equipped:melee?.reflective?.unequipped
        if(!reflect)return undefined
        return new CircleCollider2D(v2.add_rotate_RadAngle(this.position,reflect.offset,this.rotation),reflect.radius)
    }

    give_boost(amount:number){
        this.boost.value=Numeric.clamp(this.boost.value+amount,0,this.boost.max)
    }

    damage(params:DamageParams){
        if(this.dead||this.health.invencibility>0)return
        if(params.owner&&params.owner.id!==this.id){
            const owner=this.scene.objects.get_object(params.owner.id) as Human|undefined
            if(owner?.object_type===ObjectType.Human&&!this.scene.mode.rules.humans.friendly_fire&&this.scene.mode.is_ally(this,owner))return
        }
        armor_damage(this.inventory,params)
        params.amount*=this.get_modifier("damage_reduction")
        this.piercing_damage(params)
    }
    piercing_damage(params:DamageParams):[number,number]{
        if(this.dead)return [0,0]
        let shield_damage=0
        let health_damage=0
        const shield=this.boost.def.shield
        if(shield&&this.boost.value>0){
            shield_damage=Math.min(this.boost.value,params.amount*shield.multiplier)
            if(params.amount>=this.boost.value*shield.penetrate){
                health_damage=params.amount-this.boost.value
                this.boost.value=0
            }else{
                this.boost.value-=shield_damage
            }
            if(this.boost.value===0){
                this.animations.push({type:HumanAnimationType.ShieldBreak,id:this.boost.def.id_number!})
                this.health.invencibility+=shield.break_invensibility
            }
        }else{
            health_damage=params.amount
        }
        if(params.owner&&params.owner.id!==this.id)this.last_damage_by=params.owner
        if(health_damage>0)this.health.value=Math.max(this.health.value-health_damage,0)
        this.emit_event(human_events.damaged,params,health_damage,shield_damage)
        this.script?.on_damaged(params,health_damage)
        this.boost.def.se?.on_hitted?.(this)
        this.inventory.emit_event("damage",{params,player:this})

        if(this.health.value<=0){
            if((!params.owner||params.owner.id===this.id)&&this.last_damage_by)params.owner=this.last_damage_by
            if(!this.knocked&&(this.scene.mode.can_knock(this)||this.self_revive))this.knock_out(params)
            else this.die(params)
        }
        return [health_damage,shield_damage]
    }
    knock_out(params:DamageParams){
        if(this.knocked||this.dead)return
        this.knocked_by=params.owner
        this.knocked=true
        this.health.value=this.health.max
        this.health.invencibility=0.4
        this.boost.value=0
        if(params.direction!==undefined)this.push(-1,params.direction)
        this.actions.cancel()
        const fist=this.inventory.hand_slots[0]
        if(fist)this.inventory.set_hand(fist.index)
        this.set_dirty_full()
        this.script?.on_knocked(params)
        this.emit_event(human_events.knocked,params)
        this.scene.mode.on_human_knocked(this,params)
    }
    help_up(){
        if(!this.knocked||this.dead)return
        this.knocked_by=undefined
        this.last_damage_by=undefined
        this.knocked=false
        this.health.value=this.health.max*0.3
        this.boost.value=0
        this.set_dirty_full()
        this.emit_event(human_events.help_up)
    }
    die(params:DamageParams){
        if(this.dead)return
        if(this.knocked_by&&(!params.owner||params.owner.id===this.id))params.owner=this.knocked_by
        this.dead=true
        this.knocked=false
        this.downed=false
        this.net_sync_deletion=false
        if(this.effects.size>0){
            this.effects.clear()
            this.effects_dirty=true
        }
        this.health.value=0
        this.actions.cancel()
        this.animations.push({type:HumanAnimationType.Die})
        this.stop_momentary(false)
        const script=this.script
        if(script){
            script.on_die(params)
            if(this.script===script)this.set_script(undefined)
        }
        this.set_dirty_full()
        ;(params.owner as Human|undefined)?.inventory?.emit_event("kill",{...params,owner:params.owner})
        this.emit_event(human_events.die,params)
        this.scene.mode.on_human_die(this,params)
        this.destroy()
    }
    revive(health?:number){
        if(!this.dead)return
        this.knocked_by=undefined
        this.last_damage_by=undefined
        if(!this.registred)this.manager.registry_object(this)
        this.dead=false
        this.knocked=false
        this.downed=false
        this.health.value=health??this.health.max
        this.health.invencibility=1
        this.down_timer=0
        this.secondary_velocity=v2.zero()
        this.velocity=v2.zero()
        this.set_dirty_full()
        this.emit_event(human_events.revive)
    }

    apply_side_effect(effect:SideEffect,owner?:ProjectileOwner){
        if(this.boost.def.se?.can_apply&&!this.boost.def.se.can_apply(effect,this))return
        switch(effect.type){
            case SideEffectType.AddEffect:{
                const def=this.app.definitions.effects.getFromString(effect.effect)
                const current=this.effects.get(def.id_number!)
                if(current){
                    current.owner=owner
                    current.time=effect.merge?current.time+effect.duration:effect.duration
                }else{
                    this.effects.set(def.id_number!,{effect:def,tick_time:0,time:effect.duration,owner})
                    this.effects_dirty=true
                }
                break
            }
            case SideEffectType.Damage:{
                const params:DamageParams={amount:effect.amount,critical:false,position:this.position,direction:0,penetration:1,owner}
                if(effect.piercing)this.piercing_damage(params)
                else this.damage(params)
                break
            }
            case SideEffectType.Heal:
                if(effect.health)this.health.value=Math.min(this.health.value+effect.health.amount,this.health.max*(effect.health.max??1))
                if(effect.boost){
                    const def=this.app.definitions.boosts.getFromStringSafe(effect.boost.def)
                    if(this.boost.def.id_string===effect.boost.def){
                        this.boost.value=Math.min(this.boost.value+effect.boost.amount,this.boost.max*(effect.boost.max??1))
                    }else if(def){
                        this.boost.def=def
                        this.boost.value=effect.boost.amount
                    }
                }
                if(effect.global){
                    if(this.health.value<this.health.max){
                        this.health.value=Math.min(this.health.value+effect.global.amount,this.health.max)
                    }else if(this.boost.value>0&&!effect.boost){
                        this.boost.value=Math.min(this.boost.value+effect.global.amount,this.boost.max)
                    }else if(this.boost.def.id_string===effect.global.boost){
                        this.boost.value=Math.min(this.boost.value+effect.global.amount,this.boost.max)
                    }else if(effect.global.boost){
                        this.boost.value=Math.min(effect.global.amount,this.boost.max)
                        this.boost.def=this.app.definitions.boosts.getFromString(effect.global.boost)
                    }
                }
                break
            default:
                this.emit_event(human_events.side_effect,effect,owner)
        }
    }
    consuming_condition(conditions:ConsumibleCondition[],side_effects:SideEffect[]):boolean{
        for(const c of conditions){
            for(const se of side_effects){
                if(se.type!==SideEffectType.Heal)continue
                if(c===ConsumibleCondition.UnfullHealth&&this.health.value>=this.health.max*(se.health?.max??1))return false
                if(c===ConsumibleCondition.UnfullExtra&&this.boost.def.id_string===se.boost?.def&&this.boost.value>=this.boost.max*(se.boost?.max??1))return false
            }
        }
        return true
    }

    set_script(script?:HumanScript){
        const old=this.script
        if(old===script)return
        this.script=script
        this.controlled=script?.take_control===true
        old?.stop()
        script?.start(this)
    }
    override push(speed:number,direction:number){
        v2m.add(this.secondary_velocity,this.secondary_velocity,v2.from_RadAngle(direction,speed))
    }

    play_momentary(def:string|HumanoidMomentaryDef,options:MomentaryPlayOptions={}):boolean{
        const d=typeof def==="string"?HumanAnimations.getFromString(def):def
        if(this.momentary&&!options.force&&(this.momentary.def.priority??0)>(d.priority??0))return false
        this.stop_momentary(false)
        let duration=d.duration
        if(duration===undefined&&!d.loop)duration=(d.keyframes??[]).reduce((t,k)=>t+k.time,0)
        this.momentary={def:d,time:0,duration:options.duration??duration,on_end:options.on_end}
        this.momentary_dirty=true
        this.actions.cancel()
        return true
    }
    stop_momentary(completed:boolean=false){
        if(!this.momentary)return
        this.momentary.on_end?.(completed)
        this.momentary=undefined
        this.momentary_dirty=true
    }

    set_loadout_preset(preset?:LoadoutPreset){
        if(!preset)return
        const loadout=this.app.definitions.loadout
        const v=this.visual
        v.dirty=true
        if(preset.shirt)v.shirt=loadout.getFromString(preset.shirt) as LoadoutShirtDef
        if(preset.legs)v.legs=loadout.getFromString(preset.legs) as LoadoutLegDef
        if(preset.foot!==undefined)v.foot=loadout.getFromStringSafe(preset.foot??"") as LoadoutFootDef|undefined
        if(preset.eyes)v.eyes=loadout.getFromString(preset.eyes) as LoadoutEyesDef
        if(preset.hair!==undefined){
            v.hair=preset.hair===""?undefined:{def:loadout.getFromString(preset.hair) as LoadoutHairDef,tint:0}
        }
        if(v.hair){
            if(preset.hair_tint!==undefined)v.hair.tint=preset.hair_tint
            if(preset.hair_paint!==undefined)v.hair.paint=preset.hair_paint
        }
        if(preset.body)v.body={def:loadout.getFromString(preset.body) as LoadoutBodyDef,tint:0}
        if(preset.body_tint!==undefined)v.body.tint=preset.body_tint
        if(preset.accessorys!==undefined)v.accessorys=preset.accessorys.map((a)=>loadout.getFromString(a) as LoadoutAccessoryDef)
    }

    on_encode_checkpoint(stream:Stream,_ctx:CheckpointContext){
        stream.write_pos2(this.position)
        .write_pos2(this.velocity)
        .write_rad(this.rotation)
        .write_boolean_group(this.dead)
        .write_string(this.name,1)
        .write_float32(this.down_timer)
        .write_float32(this.scale)
        encode_visual(stream,this.visual)
        stream.write_boolean_group(this.knocked)
        .write_float32(this.health.value)
        .write_float32(this.health.max)
        .write_float32(this.boost.value)
        .write_float32(this.boost.max)
        .write_uint8(this.boost.def.id_number!)
        .write_array(Array.from(this.effects.values()),(e)=>{
            stream.write_uint16(e.effect.id_number!)
            .write_float32(e.time)
            .write_float32(e.tick_time)
        },1)
        this.inventory.encode_checkpoint(stream)
    }
    on_decode_checkpoint(stream:Stream,_ctx:CheckpointContext){
        this.position=stream.read_pos2()
        this.velocity=stream.read_pos2()
        this.rotation=stream.read_rad()
        this.dead=stream.read_boolean_group()[0]
        this.name=stream.read_string(1)
        this.down_timer=stream.read_float32()
        this.scale=stream.read_float32()
        decode_visual(stream,this.app.definitions,this.visual)
        this.visual.dirty=true
        this.set_dirty_full()
        this.knocked=stream.read_boolean_group()[0]
        this.health.value=stream.read_float32()
        this.health.max=stream.read_float32()
        this.boost.value=stream.read_float32()
        this.boost.max=stream.read_float32()
        this.boost.def=this.app.definitions.boosts.getFromNumber(stream.read_uint8())
        this.effects.clear()
        stream.read_array(()=>{
            const effect=this.app.definitions.effects.getFromNumber(stream.read_uint16())
            this.effects.set(effect.id_number!,{effect,time:stream.read_float32(),tick_time:stream.read_float32()})
        },1)
        this.effects_dirty=true
        this.inventory.decode_checkpoint(stream)
    }
    on_net_update(){
        this.visual.dirty=false
        this.momentary_dirty=false
        this.effects_dirty=false
        this.animations.length=0
        this.inventory.net_update()
        this.actions.net_update()
    }
    on_encode_net(stream:Stream,full:boolean){
        const visual=full||this.visual.dirty
        const momentary=full||this.momentary_dirty
        const inv=this.inventory
        const defs=this.app.definitions
        const hand=full||inv.dirty.hand
        const equipment=full||inv.dirty.full||inv.dirty.slots.size>0||inv.dirty.groups.size>0
        const effects=full||this.effects_dirty
    
        stream.write_boolean_group3(
            visual,momentary,this.dead,this.downed,this.swimming,full&&this.name.length>0,
            hand,equipment,
            this.animations.length>0,
            this.controlled,this.knocked,
            this.boost.value>0&&this.boost.def.shield!==undefined,
            effects
        )
        stream.write_pos2(this.position).write_rad(this.rotation)
        if(full)stream.write_float32(this.scale)
        if(visual)encode_visual(stream,this.visual)
        if(momentary){
            stream.write_boolean_group(this.momentary!==undefined)
            if(this.momentary)stream.write_uint16(this.momentary.def.id_number!).write_float32(this.momentary.time)
        }
        if(full&&this.name.length>0)stream.write_string(this.name,1)
        const hand_def=inv.slots[inv.hand_index]?.item?.def
        if(hand)stream.write_int16(hand_def?defs.game_items.keysString[hand_def.id_string]:-1)
        if(equipment){
            const helmet=inv.get_items<EquipmentItem>(GameItemType.helmet)[0]
            stream.write_boolean_group(helmet?.skin!==undefined)
            .write_uint8((helmet?.def.id_number??-1)+1)
            if(helmet?.skin!==undefined)stream.write_uint8(helmet.skin)
            stream.write_uint8((inv.get_items(GameItemType.vest)[0]?.def.id_number??-1)+1)
            .write_uint8((inv.get_items(GameItemType.backpack)[0]?.def.id_number??-1)+1)
            .write_uint16((inv.get_items(GameItemType.melee)[0]?.def.id_number??-1)+1)
        }
        if(this.animations.length>0)stream.write_array(this.animations,(a)=>{
            stream.write_uint8(a.type)
            switch(a.type){
                case HumanAnimationType.Fire:
                    stream.write_boolean_group(a.alt,a.last,a.alt_func)
                    break
                case HumanAnimationType.Reloading:
                    stream.write_boolean_group(a.alt_reload)
                    break
                case HumanAnimationType.Consuming:
                case HumanAnimationType.Switch:
                    stream.write_uint16(a.item)
                    break
                case HumanAnimationType.Emote:
                    stream.write_uint16(a.id)
                    break
                case HumanAnimationType.Message:
                    stream.write_string_sized(a.msg,50)
            }
        },1)
        if(effects)stream.write_array(Array.from(this.effects.values()),(e)=>stream.write_uint16(e.effect.id_number!),1)
    }
}
