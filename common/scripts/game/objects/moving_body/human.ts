import { CheckpointContext, CircleCollider2D, gel_events, GELComponent, Numeric, Stream, v2, v2m, Vec2 } from "../../../../engine/core.ts"
import { GameItem } from "../../../definitions/game_defs.ts";
import { BadgeDef } from "../../../definitions/loadout/badges.ts";
import { EmoteDef } from "../../../definitions/loadout/emotes.ts";
import { BoostDef } from "../../../definitions/player/boosts.ts";
import { GameItemType, GameObjectDefinitionType, LoadoutPreset } from "../../../definitions/utils.ts";
import { EmptyInputData, InputActionType, type InputAction, type InputData } from "../../../net/input_packet.ts";
import { DamageParams, GameConstants, object_instance_type, ObjectType } from "../../../others/constants.ts";
import { apply_modifiers } from "../../../others/functions.ts";
import { GInventoryBase, GunItemBase, MeleeItemBase, MDItem } from "../../../others/inventory.ts";
import { Floors, FloorType } from "../../../others/terrain.ts";
import { C_Humanoid_Visual, c_humanoid_visual, humanoid_events, si_humanoid_visual, SI_Humanoid_Visual } from "./humanoid.ts";
import { c_moving_body, C_MovingBody, si_moving_body, SI_MovingBody } from "./moving_body.ts";

export const human_events={
    update_modifiers:humanoid_events.last+1,
    tick_physics:humanoid_events.last+2,
    knocked:humanoid_events.last+3,
    help_up:humanoid_events.last+4,
    die:humanoid_events.last+5,
    revive:humanoid_events.last+6,
    state_changed:humanoid_events.last+7,
    damaged:humanoid_events.last+8,
    last:humanoid_events.last+9,
}

export interface HumanCreateArgs{
    position?:Vec2
    name?:string
    loadout?:LoadoutPreset
}

export type C_Human=C_MovingBody&C_Humanoid_Visual&{
    name:string

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
}
export const c_human:GELComponent<C_Human>={
    id_string:"c_human",
    extensions:[c_moving_body,c_humanoid_visual],
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
        }
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

export type SI_Human=C_Human&SI_MovingBody&SI_Humanoid_Visual&{
    health:HumanHealth
    boost:HumanBoost

    inventory:GInventoryBase<MDItem>

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
}

const default_boost="adrenaline"

export const si_human:GELComponent<SI_Human>={
    id_string:"si_human",
    extensions:[c_human,si_moving_body,si_humanoid_visual],
    events:{
        [gel_events.bind]:function(){
            this.allow_net_update=true
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
        },
        [gel_events.create]:function(args?:HumanCreateArgs){
            this.boost={
                value:0,
                max:100,
                def:this.app.definitions.boosts.getFromString(default_boost),
            }
            this.inventory=new GInventoryBase<MDItem>()
            this.inventory.initialize(this.app.definitions,{
                [GameItemType.gun]:GunItemBase,
                [GameItemType.melee]:MeleeItemBase,
            } as Record<number,new(inventory:GInventoryBase,def:GameItem)=>MDItem>)

            if(args?.loadout)this.set_loadout_preset(args.loadout)
        },
        [gel_events.tick](dt:number){
            if(this.dead)return

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

            this.tick_input(dt)
            this.tick_physics(floor,dt)
            this.emit_event(human_events.tick_physics,dt)

            this.set_dirty_part()
        },
        [gel_events.net_encode]:function(stream:Stream,full:boolean){
            this.encode_human_net(stream,full,this.visual.dirty)
        },
        [gel_events.net_update]:function(){
            this.visual.dirty=false
            this.physical.dirty=false
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
            const weapons:Record<string,string>={}
            for(const k in this.inventory.weapons){
                const w=this.inventory.weapons[k]
                if(w)weapons[k]=w.def.id_string
            }
            stream.write_any({
                weapons,
                aitems:this.inventory.aitems,
                backpack:this.inventory.backpack.id_string,
                weapon_idx:this.inventory.weapon_idx,
            },2,2)
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
            const inv=stream.read_any(2,2) as {weapons:Record<string,string>,aitems:Record<string,number>,backpack:string,weapon_idx:number}
            this.inventory.set_backpack(defs.backpacks.getFromString(inv.backpack))
            for(const k in inv.weapons){
                this.inventory.set_weapon(Number(k),defs.game_items.valueString[inv.weapons[k]])
            }
            this.inventory.aitems=inv.aitems
            this.inventory.set_weapon_index(inv.weapon_idx,true)
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
                    case InputActionType.set_hand:
                        if(!this.knocked)this.inventory.set_weapon_index(a.hand)
                        break
                }
            }
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

            if(!this.physical.movement_locked){
                let speed=5.7*floor.speed_mult*this.get_modifier("speed")
                if(this.knocked)speed*=0.3
                else if(this.swimming)speed*=0.6
                const move=v2.from_PolarMovement(this.input.movement)
                v2m.scale(move,move,speed)
                v2m.lerp(this.physical.velocity,move,acceleration)

                if(slow){
                    if(this.input.movement.scale>0)this.rotation=Numeric.lerp_rad(this.rotation,this.input.movement.dir,Numeric.dt_expo_inter(1,dt))
                }else{
                    this.rotation=this.input.rotation
                }
            }else{
                this.physical.velocity=v2.zero()
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
                if(owner&&owner.__components.has("si_human")&&this.scene.mode.is_ally(this,owner))return
            }
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
            if(health_damage>0){
                this.health.value=Math.max(this.health.value-health_damage,0)
            }
            this.emit_event(human_events.damaged,params,health_damage,shield_damage)
            this.boost.def.se?.on_hitted?.(this)

            if(this.health.value<=0){
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
            this.knocked=true
            this.health.value=this.health.max
            this.health.invencibility=0.4
            this.boost.value=0
            this.inventory.set_weapon_index(0)
            if(params.direction!==undefined)this.push(-10,params.direction)
            this.set_dirty_full()
            this.emit_event(human_events.knocked,params)
            this.scene.mode.on_human_knocked(this,params)
        },
        help_up(){
            if(!this.knocked||this.dead)return
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
        revive(health?:number){
            if(!this.dead)return
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