import { ActionsManager, CheckpointContext, CircleCollider2D, gel_events, GELComponent, Numeric, Stream, v2, v2m, Vec2 } from "../../../../engine/core.ts"
import { GameItem } from "../../../definitions/game_defs.ts";
import { BadgeDef } from "../../../definitions/loadout/badges.ts";
import { EmoteDef } from "../../../definitions/loadout/emotes.ts";
import { BoostDef } from "../../../definitions/player/boosts.ts";
import { DamageReason, GameObjectDefinitionType, LoadoutPreset } from "../../../definitions/utils.ts";
import { ConsumibleCondition } from "../../../definitions/items/consumibles.ts";
import { type SideEffect, SideEffectType } from "../../../definitions/player/effects.ts";
import { EmptyInputData, InputActionType, type InputAction, type InputData } from "../../../net/input_packet.ts";
import { DamageParams, GameConstants, HumanAnimationType, object_instance_type, ObjectType, type HumanAnimation } from "../../../others/constants.ts";
import { apply_modifiers } from "../../../others/functions.ts";
import { si_human_inventory } from "../../inventory/component.ts";
import { inventory_events, type Inventory, type InventoryAction } from "../../inventory/inventory.ts";
import { si_interactor, type SI_Interactor } from "../interaction.ts";
import { Floors, FloorType } from "../../../others/terrain.ts";
import { C_Humanoid_Animation, c_humanoid_animation, C_Humanoid_Visual, c_humanoid_visual, humanoid_events, type HumanoidMomentaryState, si_humanoid_animation, type SI_Humanoid_Animation, si_humanoid_visual, SI_Humanoid_Visual } from "../human/humanoid.ts";
import { c_moving_body, C_MovingBody, si_moving_body, SI_MovingBody } from "../moving_body/moving_body.ts";
import { human_events } from "./events.ts";
import { type HumanScript } from "./script.ts";

export interface HumanCreateArgs{
    position?:Vec2
    name?:string
    loadout?:LoadoutPreset
}

export interface HumanMessage{
    text:string
    time:number
}
export interface HumanNetExtra{
    hand:boolean
    momentary:boolean
    animations:HumanAnimation[]
    message?:HumanMessage
}

export function encode_human_animation(stream:Stream,a:HumanAnimation){
    stream.write_uint8(a.type)
    switch(a.type){
        case HumanAnimationType.Fire:
            stream.write_boolean_group(a.alt,a.last,a.alt_func)
            break
        case HumanAnimationType.Reloading:
            stream.write_uint8(a.alt_reload?1:0)
            break
        case HumanAnimationType.Consuming:
            stream.write_uint16(a.item)
            break
    }
}
export function decode_human_animation(stream:Stream):HumanAnimation{
    const type=stream.read_uint8() as HumanAnimationType
    switch(type){
        case HumanAnimationType.Fire:{
            const [alt,last,alt_func]=stream.read_boolean_group()
            return {type,alt,last,alt_func}
        }
        case HumanAnimationType.Reloading:
            return {type,alt_reload:stream.read_uint8()===1}
        case HumanAnimationType.Consuming:
            return {type,item:stream.read_uint16()}
        default:
            return {type} as HumanAnimation
    }
}

export type C_Human=C_MovingBody&C_Humanoid_Visual&C_Humanoid_Animation&{
    name:string

    hand?:GameItem
    controlled:boolean
    message?:HumanMessage

    dead:boolean
    knocked:boolean
    downed:boolean
    swimming:boolean

    scale:number

    physical:{
        movement_locked?:boolean
    }

    encode_human_net(stream:Stream,full:boolean,visual:boolean):void
    decode_human_net(stream:Stream,full:boolean):{visual:boolean,state:boolean}
    encode_human_extra(stream:Stream,full:boolean,extra:HumanNetExtra):void
    decode_human_extra(stream:Stream,full:boolean):HumanNetExtra
}
export const c_human:GELComponent<C_Human>={
    id_string:"c_human",
    extensions:[c_moving_body,c_humanoid_visual,c_humanoid_animation],
    events:{
        [gel_events.bind]:function(){
            this.object_type=ObjectType.Human
            this.instance_type=object_instance_type.human

            this.name=""
            this.dead=false
            this.knocked=false
            this.downed=false
            this.swimming=false
            this.scale=1
            this.controlled=false

            this.base_collider=new CircleCollider2D(v2(0,0),GameConstants.humanoid.radius)
        },
        [gel_events.create]:function(args?:HumanCreateArgs){
            if(!args)return
            if(args.position)this.position=args.position
            if(args.name)this.name=args.name
        },
    },
    methods:{
        encode_human_net(stream:Stream,full:boolean,visual:boolean){
            stream.write_boolean_group(
                full||visual,
                this.dead,
                this.knocked,
                this.downed,
                this.swimming,
                full&&this.name.length>0,
            )
            stream.write_pos2(this.position)
            stream.write_rad(this.rotation)
            if(full){
                stream.write_float32(this.scale)
            }
            if(full||visual){
                this.encode_visual(stream)
            }
            if(full&&this.name.length>0){
                stream.write_string(this.name,1)
            }
        },
        decode_human_net(stream:Stream,full:boolean){
            const [visual,dead,knocked,downed,swimming,has_name]=stream.read_boolean_group()
            const state=dead!==this.dead||knocked!==this.knocked||downed!==this.downed||swimming!==this.swimming
            this.dead=dead
            this.knocked=knocked
            this.downed=downed
            this.swimming=swimming

            this.position=stream.read_pos2()
            this.rotation=stream.read_rad()
            if(full){
                this.scale=stream.read_float32()
            }
            if(visual){
                this.decode_visual(stream)
            }
            if(has_name){
                this.name=stream.read_string(1)
            }
            return {visual,state}
        },
        encode_human_extra(stream:Stream,full:boolean,extra:HumanNetExtra){
            const hand=full||extra.hand
            const momentary=full||extra.momentary
            stream.write_boolean_group(hand,momentary,extra.animations.length>0,extra.message!==undefined,this.controlled)
            if(hand){
                stream.write_int16(this.hand?(this.app.definitions.game_items.keysString[this.hand.id_string]??-1):-1)
            }
            if(momentary)this.encode_momentary(stream)
            if(extra.animations.length>0){
                stream.write_array(extra.animations,(a)=>encode_human_animation(stream,a),1)
            }
            if(extra.message){
                stream.write_string(extra.message.text,2)
                stream.write_float32(extra.message.time)
            }
        },
        decode_human_extra(stream:Stream,_full:boolean):HumanNetExtra{
            const [has_hand,has_momentary,has_animations,has_message,controlled]=stream.read_boolean_group()
            this.controlled=controlled
            let hand=false
            let momentary=false
            if(has_hand){
                const id=stream.read_int16()
                const def=id>=0?this.app.definitions.game_items.valueNumber[id]:undefined
                hand=def!==this.hand
                this.hand=def
            }
            if(has_momentary)momentary=this.decode_momentary(stream)
            const animations=has_animations?stream.read_array(()=>decode_human_animation(stream),1):[]
            let message:HumanMessage|undefined
            if(has_message){
                message={text:stream.read_string(2),time:stream.read_float32()}
                this.message=message
            }
            return {hand,momentary,animations,message}
        },
    }
}

export interface HumanHealth{
    value:number
    max:number
    invencibility:number
}
export interface HumanBoost{
    value:number
    max:number
    def:BoostDef
}

export type SI_Human=C_Human&SI_MovingBody&SI_Humanoid_Visual&SI_Humanoid_Animation&SI_Interactor&{
    script?:HumanScript
    animations:HumanAnimation[]
    net_dirty:{
        hand:boolean
        message:boolean
    }
    movement_locks:Set<string>

    health:HumanHealth
    boost:HumanBoost

    knocked_by?:{id:number}
    last_damage_by?:{id:number}
    bleed_timer:number

    inventory:Inventory<SI_Human>
    actions:ActionsManager<SI_Human,InventoryAction>

    input:Omit<InputData,"actions">&{
        actions:InputAction[]
        using_item_down:boolean
        emote?:GameItem|EmoteDef|BadgeDef
        message?:string
    }

    physical:{
        movement_locked:boolean
        secondary_velocity:Vec2
        secondary_acceleration:number
        down_timer:number
        current_floor:FloorType
        dirty:boolean
    }

    modifiers:Record<string,number>
    temp_modifiers:Record<string,number>

    get_modifier(name:string):number

    process_input(data:InputData):void
    clear_input():void
    tick_input(dt:number):void
    tick_physics(current_floor:FloorType,dt:number):void

    push(speed:number,direction:number):void
    give_boost(amount:number):void
    heal(amount:number):void

    damage(params:DamageParams):void
    piercing_damage(params:DamageParams):[number,number]
    knock_out(params:DamageParams):void
    help_up():void
    lay_down(time:number):void
    die(params:DamageParams):void
    revive(health?:number):void

    set_script(script?:HumanScript):void
    hand_locked():boolean
    lock_movement(key:string,locked:boolean):void
    movement_blocked():boolean
    say(text:string,time?:number):void
    play_animation(animation:HumanAnimation):void
    apply_side_effect(effect:SideEffect,owner?:{id:number}):void
    consuming_condition(conditions:ConsumibleCondition[],side_effects:SideEffect[]):boolean
    can_interact(user:SI_Interactor):boolean
    on_interact(user:SI_Interactor):void
}

const default_boost="adrenaline"

export const si_human:GELComponent<SI_Human>={
    id_string:"si_human",
    extensions:[c_human,si_moving_body,si_humanoid_visual,si_humanoid_animation,si_interactor,si_human_inventory],
    events:{
        [gel_events.bind]:function(){
            this.allow_net_update=true
            this.animations=[]
            this.net_dirty={hand:true,message:false}
            this.movement_locks=new Set()
            this.physical={
                ...this.physical,

                movement_locked:false,

                secondary_velocity:v2.zero(),
                secondary_acceleration:1,
                down_timer:0,
                current_floor:FloorType.Void,
                dirty:true,
            }

            this.input={
                ...EmptyInputData(),
                using_item_down:false,
            }
            this.modifiers={}
            this.temp_modifiers={}

            this.health={
                value:100,
                max:100,
                invencibility:0,
            }
            this.bleed_timer=0
        },
        [gel_events.create]:function(args?:HumanCreateArgs){
            this.boost={
                value:0,
                max:100,
                def:this.app.definitions.boosts.getFromString(default_boost),
            }
            if(args?.loadout)this.set_loadout_preset(args.loadout)
        },
        [gel_events.tick](dt:number){
            if(this.dead)return

            if(this.script)this.script.tick(dt)
            if(this.dead)return
            const controlled=this.script!==undefined&&this.script.take_control&&!this.script.stopped
            if(controlled!==this.controlled){
                this.controlled=controlled
                this.physical.dirty=true
            }
            if(this.message){
                this.message.time-=dt
                if(this.message.time<=0)this.message=undefined
            }
            const hand=this.inventory.hand_def
            if(hand!==this.hand){
                this.hand=hand
                this.net_dirty.hand=true
                this.emit_event(human_events.hand_changed,hand)
            }

            this.modifiers={}
            apply_modifiers(this.modifiers,this.temp_modifiers)
            if(this.boost.def.se?.update_modifiers)apply_modifiers(this.modifiers,this.boost.def.se.update_modifiers(this))
            this.emit_event(human_events.update_modifiers,this.modifiers)

            if(this.health.invencibility>0)this.health.invencibility=Math.max(this.health.invencibility-dt,0)
            if(this.boost.def.se?.tick)this.boost.def.se.tick(dt,this)

            const floor=this.scene.map.terrain.get_floor_type(this.position,this.layer,this.scene.map.default_floor) as FloorType
            this.physical.current_floor=floor
            const swimming=Floors[floor]?.deep===true

            if(this.physical.down_timer>0)this.physical.down_timer=Math.max(this.physical.down_timer-dt,0)
            const downed=this.knocked||this.physical.down_timer>0

            if(downed!==this.downed||swimming!==this.swimming){
                this.downed=downed
                this.swimming=swimming
                this.physical.dirty=true
                this.emit_event(human_events.state_changed)
            }

            if(this.knocked){
                this.bleed_timer+=dt
                if(this.bleed_timer>=1){
                    this.bleed_timer=0
                    this.piercing_damage({amount:1,reason:DamageReason.Bleend,position:this.position})
                    if(this.dead)return
                }
            }else{
                this.bleed_timer=0
            }

            this.tick_physics(floor,dt)
            this.emit_event(human_events.tick_physics,dt)
            if(!this.hand_locked())this.emit_event(human_events.use_hand,dt)
            this.tick_input(dt)

            this.set_dirty_part()
        },
        [gel_events.net_encode]:function(stream:Stream,full:boolean){
            this.encode_human_net(stream,full,this.visual.dirty)
            this.encode_human_extra(stream,full,{
                hand:this.net_dirty.hand,
                momentary:this.momentary_dirty,
                animations:this.animations,
                message:this.net_dirty.message?this.message:undefined,
            })
        },
        [gel_events.net_update]:function(){
            this.visual.dirty=false
            this.physical.dirty=false
            this.animations.length=0
            this.net_dirty.hand=false
            this.net_dirty.message=false
        },
        [inventory_events.animation]:function(animation:HumanAnimation){
            this.play_animation(animation)
        },
        [inventory_events.hand]:function(_item:unknown,old:unknown){
            if(old!==undefined)this.play_animation({type:HumanAnimationType.Switch})
        },
        [humanoid_events.momentary_changed]:function(state?:HumanoidMomentaryState){
            if(state?.def.lock_hand)this.actions.cancel()
        },
        [human_events.damaged]:function(params:DamageParams,health_damage:number){
            if(this.script&&!this.script.stopped)this.script.on_damaged(params,health_damage)
        },
        [human_events.knocked]:function(params:DamageParams){
            if(this.script&&!this.script.stopped)this.script.on_knocked(params)
        },
        [human_events.die]:function(params:DamageParams){
            this.stop_momentary(false)
            const script=this.script
            if(script&&!script.stopped){
                script.on_die(params)
                if(this.script===script)this.set_script(undefined)
            }
        },
        [gel_events.checkpoint_encode]:function(stream:Stream,_ctx:CheckpointContext){
            stream.write_pos2(this.position)
            .write_pos2(this.physical.velocity)
            .write_rad(this.rotation)
            .write_boolean_group(this.dead,this.knocked)
            .write_string(this.name,1)
            .write_float32(this.health.value)
            .write_float32(this.health.max)
            .write_float32(this.boost.value)
            .write_float32(this.boost.max)
            .write_string(this.boost.def.id_string,1)
            .write_float32(this.physical.down_timer)
            .write_float32(this.scale)
            this.encode_visual(stream)
        },
        [gel_events.checkpoint_decode]:function(stream:Stream,_ctx:CheckpointContext){const defs=this.app.definitions
            this.position=stream.read_pos2()
            this.physical.velocity=stream.read_pos2()
            this.rotation=stream.read_rad()
            const [dead,knocked]=stream.read_boolean_group()
            this.dead=dead
            this.knocked=knocked
            this.name=stream.read_string(1)
            this.health.value=stream.read_float32()
            this.health.max=stream.read_float32()
            this.boost.value=stream.read_float32()
            this.boost.max=stream.read_float32()
            this.boost.def=defs.boosts.getFromString(stream.read_string(1))
            this.physical.down_timer=stream.read_float32()
            this.scale=stream.read_float32()
            this.decode_visual(stream)
            this.visual.dirty=true
            this.set_dirty_full()
            this.emit_event(humanoid_events.visual_changed)
            this.emit_event(human_events.state_changed)
        },
    },
    methods:{
        get_modifier(name:string):number{
            return this.modifiers[name]??1
        },

        process_input(data:InputData){
            if(this.script&&this.script.take_control&&!this.script.stopped)return
            this.input.movement=data.movement

            this.input.auto_fire=data.auto_fire
            if(this.input.auto_fire){
                this.input.using_item_down=true
            }else if(!this.input.use_weapon&&data.use_weapon){
                this.input.using_item_down=true
            }

            this.input.rotation=data.rotation
            this.input.use_weapon=data.use_weapon
            this.input.alt_use_weapon=data.alt_use_weapon
            this.input.distance_to_aim=data.distance_to_aim

            this.input.interact=data.interact||this.input.interact
            this.input.reload=data.reload||this.input.reload
            this.input.swap_guns=data.swap_guns||this.input.swap_guns
            this.input.cancel=data.cancel||this.input.cancel
            this.input.actions.push(...data.actions)
        },
        clear_input(){
            Object.assign(this.input,EmptyInputData())
            this.input.actions=[]
            this.input.using_item_down=false
        },
        tick_input(_dt:number){
            const executed=new Set<InputActionType>()
            for(const a of this.input.actions){
                if(executed.has(a.type))continue
                executed.add(a.type)
                switch(a.type){
                    case InputActionType.emote:{
                        const def=this.app.definitions.game_objects.valueNumber[a.id] as EmoteDef|GameItem|BadgeDef|undefined
                        if(!(def?.def_type===GameObjectDefinitionType.badge||def?.def_type===GameObjectDefinitionType.emote||def?.def_type===GameObjectDefinitionType.item))break
                        this.input.emote=def
                        break
                    }
                    case InputActionType.message:
                        this.input.message=a.value
                        this.input.emote=undefined
                        break
                }
            }
            this.emit_event(human_events.tick_input,this.input.actions)
            if(!this.knocked)this.interact(this.input.interact)
            this.input.swap_guns=false
            this.input.interact=false
            this.input.reload=false
            this.input.cancel=false
            this.input.using_item_down=false
            this.input.actions.length=0
        },
        tick_physics(current_floor:FloorType,dt:number){
            const floor=Floors[current_floor]
            const slow=this.downed||this.swimming
            let acceleration=40*(slow?0.2:floor.acceleration)
            acceleration=Numeric.dt_expo_inter(acceleration,dt)

            const rotation_locked=this.momentary?.def.lock_rotation===true
            if(!this.movement_blocked()){
                let speed=5.7*floor.speed_mult*this.get_modifier("speed")*(this.inventory.recoil?.speed??1)
                if(this.knocked)speed*=0.3
                else if(this.swimming)speed*=0.6
                const move=v2.from_PolarMovement(this.input.movement)
                v2m.scale(move,move,speed)
                v2m.lerp(this.physical.velocity,move,acceleration)

                if(!rotation_locked){
                    if(slow){
                        if(this.input.movement.scale>0)this.rotation=Numeric.lerp_rad(this.rotation,this.input.movement.dir,Numeric.dt_expo_inter(1,dt))
                    }else{
                        this.rotation=this.input.rotation
                    }
                }
            }else{
                this.physical.velocity=v2.zero()
                if(!rotation_locked&&!slow&&!this.physical.movement_locked)this.rotation=this.input.rotation
            }

            if(v2.len(this.physical.secondary_velocity)>0.07){
                v2m.add(this.physical.velocity,this.physical.velocity,this.physical.secondary_velocity)
                v2m.lerp(this.physical.secondary_velocity,v2.zero,acceleration*this.physical.secondary_acceleration)
            }else if(this.physical.secondary_velocity.x!==0||this.physical.secondary_velocity.y!==0){
                this.physical.secondary_velocity=v2.zero()
            }
        },

        push(speed:number,direction:number){
            v2m.add(this.physical.secondary_velocity,this.physical.secondary_velocity,v2.from_RadAngle(direction,speed))
        },
        give_boost(amount:number){
            this.boost.value=Numeric.clamp(this.boost.value+amount,0,this.boost.max)
        },
        heal(amount:number){
            this.health.value=Numeric.clamp(this.health.value+amount,0,this.health.max)
        },

        damage(params:DamageParams){
            if(this.dead||this.health.invencibility>0)return
            if(params.owner&&params.owner.id!==this.id){
                const owner=this.scene.objects.get_object(params.owner.id) as SI_Human|undefined
                if(owner&&owner.__components.has("si_human")&&!this.scene.mode.rules.humans.friendly_fire&&this.scene.mode.is_ally(this,owner))return
            }
            this.emit_event(human_events.modify_damage,params)
            params.amount*=this.get_modifier("damage_reduction")
            this.piercing_damage(params)
        },
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
                if(this.boost.value===0)this.health.invencibility+=shield.break_invensibility
            }else{
                health_damage=params.amount
            }
            if(params.owner&&params.owner.id!==this.id)this.last_damage_by=params.owner
            if(health_damage>0){
                this.health.value=Math.max(this.health.value-health_damage,0)
            }
            this.emit_event(human_events.damaged,params,health_damage,shield_damage)
            this.boost.def.se?.on_hitted?.(this)

            if(this.health.value<=0){
                if((!params.owner||params.owner.id===this.id)&&this.last_damage_by)params.owner=this.last_damage_by
                if(!this.knocked&&this.scene.mode.can_knock(this)){
                    this.knock_out(params)
                }else{
                    this.die(params)
                }
            }
            return [health_damage,shield_damage]
        },
        knock_out(params:DamageParams){
            if(this.knocked||this.dead)return
            this.knocked_by=params.owner
            this.knocked=true
            this.health.value=this.health.max
            this.health.invencibility=0.4
            this.boost.value=0
            if(params.direction!==undefined)this.push(-10,params.direction)
            this.set_dirty_full()
            this.emit_event(human_events.knocked,params)
            this.scene.mode.on_human_knocked(this,params)
        },
        help_up(){
            if(!this.knocked||this.dead)return
            this.knocked_by=undefined
            this.last_damage_by=undefined
            this.knocked=false
            this.health.value=this.health.max*0.3
            this.boost.value=0
            this.set_dirty_full()
            this.emit_event(human_events.help_up)
        },
        lay_down(time:number){
            this.physical.down_timer=Math.max(this.physical.down_timer,time)
        },
        die(params:DamageParams){
            if(this.dead)return
            if(this.knocked_by&&(!params.owner||params.owner.id===this.id))params.owner=this.knocked_by
            this.dead=true
            this.knocked=false
            this.downed=false
            this.health.value=0
            this.clear_input()
            this.set_dirty_full()
            this.emit_event(human_events.die,params)
            this.scene.mode.on_human_die(this,params)
            this.destroy()
        },
        set_script(script?:HumanScript){
            const old=this.script
            if(old===script)return
            this.script=undefined
            if(old&&!old.stopped)old.stop()
            if(script){
                this.script=script
                script.start(this)
            }
            const controlled=this.script!==undefined&&this.script.take_control&&!this.script.stopped
            if(controlled!==this.controlled){
                this.controlled=controlled
                if(this.manager)this.set_dirty_part()
            }
        },
        hand_locked():boolean{
            return this.momentary?.def.lock_hand===true
        },
        lock_movement(key:string,locked:boolean){
            if(locked)this.movement_locks.add(key)
            else this.movement_locks.delete(key)
        },
        movement_blocked():boolean{
            return this.physical.movement_locked||this.movement_locks.size>0||this.momentary?.def.lock_movement===true
        },
        say(text:string,time:number=3){
            this.message={text,time}
            this.net_dirty.message=true
            if(this.manager)this.set_dirty_part()
            this.emit_event(human_events.message,this.message)
        },
        play_animation(animation:HumanAnimation){
            this.animations.push(animation)
            if(this.manager)this.set_dirty_part()
            this.emit_event(human_events.animation,animation)
        },
        apply_side_effect(effect:SideEffect,owner?:{id:number}){
            if(this.boost.def.se?.can_apply&&!this.boost.def.se.can_apply(effect,this))return
            switch(effect.type){
                case SideEffectType.Damage:{
                    const params:DamageParams={amount:effect.amount,critical:false,position:this.position,reason:DamageReason.SideEffect,direction:0,penetration:1,owner}
                    if(effect.piercing)this.piercing_damage(params)
                    else this.damage(params)
                    break
                }
                case SideEffectType.Heal:
                    if(effect.health){
                        this.health.value=Math.min(this.health.value+effect.health.amount,this.health.max*(effect.health.max??1))
                    }
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
                    break
            }
        },
        consuming_condition(conditions:ConsumibleCondition[],side_effects:SideEffect[]):boolean{
            for(const c of conditions){
                for(const se of side_effects){
                    if(se.type!==SideEffectType.Heal)continue
                    switch(c){
                        case ConsumibleCondition.UnfullHealth:
                            if(this.health.value>=this.health.max*(se.health?.max??1))return false
                            break
                        case ConsumibleCondition.UnfullExtra:
                            if(this.boost.def.id_string===se.boost?.def&&this.boost.value>=this.boost.max*(se.boost?.max??1))return false
                            break
                    }
                }
            }
            return true
        },
        can_interact(_user:SI_Interactor):boolean{
            return !this.dead&&!this.destroyed&&this.script!==undefined&&this.script.interactable&&!this.script.stopped
        },
        on_interact(user:SI_Interactor){
            if(this.script&&!this.script.stopped)this.script.on_interact(user as unknown as SI_Human)
        },
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
            this.physical.down_timer=0
            this.physical.secondary_velocity=v2.zero()
            this.physical.velocity=v2.zero()
            this.clear_input()
            this.set_dirty_full()
            this.emit_event(human_events.revive)
        },
    }
}