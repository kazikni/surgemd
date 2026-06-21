import { InputAction, InputActionType} from "common/scripts/packets/input_packet.ts"
import { GameConstants, GameObjectType, HumanAnimationData, HumanHealthData, HumanLoadoutData, HumanStatus, HumanAnimation, HumanAnimationType, ScoreApplyerType } from "common/scripts/others/constants.ts"
import { DamageSplash, MapHumanData, SelfStateUpdate } from "common/scripts/packets/update_packet.ts"
import { DamageReason, HumanDefinition, InventoryItemType, LoadoutPreset } from "common/scripts/definitions/utils.ts"
import { type HumanModifiers } from "common/scripts/others/constants.ts"
import { ServerGameObject } from "../others/gameObject.ts"
import { type Group, type Team } from "../mode/teams.ts"
import { Floors, FloorType } from "common/scripts/others/terrain.ts"
import { Boosts, BoostType } from "common/scripts/definitions/player/boosts.ts"
import { EffectInstance, Effects, SideEffect, SideEffectType } from "common/scripts/definitions/player/effects.ts"
import { GunDef } from "common/scripts/definitions/items/guns.ts"
import { ScopeDef } from "common/scripts/definitions/items/scopes.ts";
import { ActionsManager, astar_path2d, type BaseObject2D, CircleHitbox2D, type GameObjectManager2D, Hitbox2D, Stream, Numeric, PolarMovement, random, Slot, v2, v2m, Vec2, ColorM } from "common/engine/core.ts";
import { type StaticBody } from "./static_body.ts";
import { type VehicleSeat } from "./vehicle.ts";
import { Loot } from "./loot.ts";
import { DamageParams } from "../others/utils.ts";
import { type HumansManager } from "../managers/humans_manager.ts";
import { GInventory, GunItem, LItem, MeleeItem } from "../human/inventory.ts";
import { HelmetDef, VestDef } from "common/scripts/definitions/items/equipaments.ts";
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts";
import { GrenadeDef } from "common/scripts/definitions/items/grenades.ts";
import { GameItem, WeaponDef } from "common/scripts/definitions/game_defs.ts";
import { LoadoutAccessoryDef, LoadoutBodyDef, LoadoutEyesDef, LoadoutHairDef, LoadoutLegDef, LoadoutShirtDef } from "common/scripts/definitions/loadout/skins.ts";
import { EmoteDef } from "common/scripts/definitions/loadout/emotes.ts";
import { BadgeDef } from "common/scripts/definitions/loadout/badges.ts";
import { type Obstacle } from "./obstacle.ts";
import { type Building } from "./building.ts";
import { ConsumibleCondition } from "common/scripts/definitions/items/consumibles.ts";
import { type Action, HelpupAction } from "../human/actions.ts";
import { type SyncedParticle } from "./synced_particle.ts";
import { MeleeDef } from "common/scripts/definitions/items/melees.ts";
import { FeedMessageType } from "common/scripts/packets/feed_packet.ts";
export type HumanPhysicalData=MovingBodyPhysicalData&{
    dirty:boolean
    dirty_part:boolean
    scale:number
    current_floor:FloorType
}
export class Human extends MovingBody{
    // Definition
    string_type:string="human"
    number_type:number=GameObjectType.Human
    name:string=""
    is_player:boolean=false
    is_bot:boolean=false
    is_npc:boolean=false

    humans_manager!:HumansManager

    splashes: DamageSplash[] = []
    splash_delay:number=0
    spawn_body:boolean=false

    // Physical
    old_position:Vec2=v2.zero()
    recoil?:{speed:number,delay:number}
    physical_data:HumanPhysicalData={
        dirty:true,
        dirty_part:true,

        scale:1,
        rotation:0,

        velocity:v2.zero(),

        current_floor:0,
        substeps:2,
    }

    dead:boolean=false
    downed:boolean=false
    health_data:HumanHealthData&{boost_time:number,imortal:boolean,old_health:number,old_boost:number,old_boost_type:number}={
        imortal:false,
        invensibility_time:0,

        health:100,
        max_health:100,

        boost:0,
        max_boost:100,
        boost_def:Boosts[BoostType.Adrenaline],
        boost_time:0,

        old_health:-1,
        old_boost:-1,
        old_boost_type:-1
    }
    team_data:{
        team?:Team
        team_id?:number

        group?:Group
        group_id?:number
        color:number
    }={
        color:0x11aa55
    }
    
    equipment_data!:{
        helmet?:HelmetDef
        helmet_health?:number
        vest?:VestDef
        vest_health?:number
        scope:ScopeDef
        default_scope:ScopeDef
        force_default_scope:boolean

        dirty:boolean
        dirty_part:boolean
    }
    get force_default_scope():boolean{
        return this.equipment_data.force_default_scope||this.downed
    }

    get scope_zoom():number{
        return 20/(this.force_default_scope?this.equipment_data.default_scope.scope_view:this.equipment_data.scope.scope_view)
    }
    emote_time:number=0
    loadout!:HumanLoadoutData&{
        dirty:boolean
        dirty_colors:boolean

        emote_is_item:boolean
        emote?:GameItem|EmoteDef
        emotes:{
            die?:EmoteDef
        }
        badge?:BadgeDef
        original:{
            badge_id?:string
            emotes:{
                die?:string
            }
        }
        colors:Record<string,number>
    }
    animation_data:HumanAnimationData&{current_animation:HumanAnimation[]}={
        dirty:true,
        attacking:false,
        current_animation:[]
    }

    inventory:GInventory
    actions:ActionsManager<this,Action>

    parachute?:{
        value:number
    }
    seat?:VehicleSeat

    human_data:{
        movement_enabled:boolean
        combat_enabled:boolean
        friendly_fire:boolean
        alternative_vehicle_control:boolean

        self_revive:boolean
    }={
        movement_enabled:true,
        combat_enabled:true,
        friendly_fire:false,
        alternative_vehicle_control:true,

        self_revive:false
    }

    input:{
        path?:Vec2[]
        path_move?:Vec2
        on_path_complete?:()=>void

        movement:PolarMovement
        rotation:number
        dist_to_pointer:number

        auto_click:boolean
        using_item:boolean
        using_item_alt:boolean
        using_item_down:boolean

        actions:InputAction[]
        reload:boolean
        interaction:boolean
        swamp_guns:boolean
    }={
        movement:{
            dir:0,
            scale:0
        },
        rotation:0,
        dist_to_pointer:0,

        auto_click:false,
        using_item:false,
        using_item_alt:false,
        using_item_down:false,

        actions:[],
        reload:false,
        interaction:false,
        swamp_guns:false,
    }

    grenade_holding?:{
        def:GrenadeDef
        time:number
        slot?:Slot<LItem>
    }

    killed_by?:Human

    downed_time:number=0
    downed_by?:Human

    modifiers:HumanModifiers={
        size:1,
        boost:1,
        health:1,
        damage_reduction:1,

        damage:1,
        bullet_size:1,
        bullet_speed:1,
        critical_mult:1,

        speed:1,

        luck:1,
        mana_consume:1,
    }

    temp_modifiers:Partial<HumanModifiers>={}

    effects:Map<number,EffectInstance>=new Map()
    effects_dirty:boolean=true
    
    status:HumanStatus

    constructor(){
        super()
        this.old_position=v2.clone(this.position)
        this.inventory=new GInventory(this)

        this.actions=new ActionsManager(this)

        this.base_hitbox = new CircleHitbox2D(
            v2(0,0),
            GameConstants.player.radius
        )

        this.status={
            damage:0,
            damage_taken:0,
            kills:0,
            score:0,
        }
        this.allow_net_update=true
        this.allow_checkpoint=false
    }

    apply_score(type:number,amount:number,multiplier:number=1){
        this.status.score+=amount*multiplier
        if(this.status.score<0)this.status.score=0
    }
    get_reflect_segment(): Hitbox2D|undefined {
        if(!(this.inventory.weapons[0]?.def as MeleeDef).reflective)return undefined
        const reflect=this.inventory.weapon_idx===0?(this.inventory.weapons[0]!.def as MeleeDef).reflective!.equipped:(this.inventory.weapons[0]!.def as MeleeDef).reflective!.unequipped
        if(!reflect)return undefined
        return new CircleHitbox2D(v2.add_rotate_RadAngle(this.position,reflect.offset,this.physical_data.rotation),reflect.radius)
    }
    override on_create(_args: Record<string, void>): void {
        const female=Math.random()<0.5
        this.loadout={
            dirty:true,
            dirty_colors:false,
            original:{
                emotes:{

                }
            },
            body:{
                def:this.game.definitions.loadout.getFromString("body_1") as LoadoutBodyDef,
                tint:random.choose([0xffc166,0xf0a93f])
            },
            hair:{
                def:this.game.definitions.loadout.getFromString(female?random.choose(["hair_2","hair_3"]):random.choose(["hair_1","hair_4"])) as LoadoutHairDef,
                tint:random.choose([0x222222,0xffffff,0xf01041,0x0066ff,0x331f00,0x4d3108,0xfbff05])
            },
            eyes:this.game.definitions.loadout.getFromString(female?"eyes_2":"eyes_1") as LoadoutEyesDef,
            shirt:this.game.definitions.loadout.getFromString(random.choose(female?["white_dress","blue_dress","yellow_dress","red_dress","blue_shirt","white_shirt","red_shirt","yellow_shirt"]:["blue_shirt","white_shirt","red_shirt","yellow_shirt"])) as LoadoutShirtDef,
            legs:this.game.definitions.loadout.getFromString("jeans_pants") as LoadoutLegDef,
            
            emote_is_item:false,
            emotes:{
            },
            accessorys:female?[
                this.game.definitions.loadout.getFromString("hair_bow") as LoadoutAccessoryDef
            ]:[],
            badge:this.game.definitions.badges.getFromString("stone_1_badge"),
            colors:{}
        }
        const default_scope=this.game.definitions.scopes.getFromNumber(0)
        this.equipment_data={
            dirty:true,
            dirty_part:true,
            scope:default_scope,
            default_scope,
            force_default_scope:false
        }
        this.inventory.initialize(this.game.definitions,{
            0:MeleeItem as (new(item:GameItem)=>LItem),
            1:GunItem as (new(item:GameItem)=>LItem),
            2:GunItem as (new(item:GameItem)=>LItem),
        })
    }
    override can_interact(user: Human): boolean {
        return this.downed&&this.game.modeManager.is_ally(this,user)
    }
    override on_interact(user: Human): void {
        user.actions.play(new HelpupAction(this))
    }

    set_loadout_preset(preset?:LoadoutPreset){
        if(!preset)return
        this.loadout.dirty=true
        if(preset.badge!==undefined){
            this.loadout.original.badge_id=preset.badge
            if(preset.badge===""){
                this.loadout.badge=undefined
            }else{
                this.loadout.badge=this.game.definitions.badges.getFromString(preset.badge)
            }
        }
        if(preset.shirt)this.loadout.shirt=this.game.definitions.loadout.getFromString(preset.shirt) as LoadoutShirtDef
        if(preset.legs)this.loadout.legs=this.game.definitions.loadout.getFromString(preset.legs) as LoadoutLegDef
        if(preset.eyes)this.loadout.eyes=this.game.definitions.loadout.getFromString(preset.eyes) as LoadoutEyesDef
        if(preset.hair!==undefined){
            if(preset.hair===""){
                this.loadout.hair=undefined
            }else{
                this.loadout.hair={
                    def:this.game.definitions.loadout.getFromString(preset.hair) as LoadoutHairDef,
                    tint:0
                }
            }
        }
        if(preset.body)this.loadout.body={
            def:this.game.definitions.loadout.getFromString(preset.body) as LoadoutBodyDef,
            tint:0
        }
        if(preset.body_tint!==undefined)this.loadout.body.tint=preset.body_tint
        if(preset.accessorys!==undefined){
            this.loadout.accessorys.length=0
            for(const a of preset.accessorys){
                this.loadout.accessorys.push(this.game.definitions.loadout.getFromString(a) as LoadoutAccessoryDef)
            }
        }
        if(preset.colors!==undefined){
            this.loadout.dirty_colors=true
            for(const v of Object.entries(preset.colors)){
                this.loadout.colors[v[0]]=ColorM.hex2number(v[1])
            }
        }
    }
    set_preset(preset:HumanDefinition|undefined){
        if(!preset)return
        this.set_loadout_preset(preset.loadout)
        if(preset.name){
            this.name = preset.name
            if(this.is_player){
                this.game.players.send_feed_message({
                    type:FeedMessageType.set_name,
                    playerId:this.id,
                    playerName:this.name,
                    playerBadge:this.loadout.badge?.idNumber!
                })
            }
        }
        if(preset.modifiers)this.temp_modifiers=preset.modifiers
        if(preset.inventory)this.inventory.load_preset(preset.inventory)
        if(preset.position)this.position=preset.position
        if(preset.group_color)this.team_data.color=preset.group_color

        this.update_modifiers()

        this.health_data.health=this.health_data.max_health
    }
    apply_modifiers(mods:Partial<HumanModifiers>){
        this.modifiers.size*=mods.size??1
        this.modifiers.boost*=mods.boost??1
        this.modifiers.bullet_size*=mods.bullet_size??1
        this.modifiers.bullet_speed*=mods.bullet_speed??1
        this.modifiers.damage*=mods.damage??1
        this.modifiers.health*=mods.health??1
        this.modifiers.speed*=mods.speed??1
        this.modifiers.damage_reduction*=mods.damage_reduction??1
    }
    update_modifiers(){
        this.modifiers.size=this.modifiers.damage=this.modifiers.speed=this.modifiers.mana_consume=this.modifiers.health=this.modifiers.boost=this.modifiers.bullet_speed=this.modifiers.bullet_size=this.modifiers.critical_mult=this.modifiers.damage_reduction=1
        this.apply_modifiers(this.temp_modifiers)
        if(this.equipment_data.helmet?.modifiers)this.apply_modifiers(this.equipment_data.helmet.modifiers)
        if(this.equipment_data.vest?.modifiers)this.apply_modifiers(this.equipment_data.vest.modifiers)
        const rules=this.game.modeManager.rules.humans

        switch(this.health_data.boost_def.type){
            case BoostType.Adrenaline:
            case BoostType.Shield:
            case BoostType.Mana:
                break
            case BoostType.Addiction:
                this.modifiers.damage+=(1-(this.health_data.boost/this.health_data.max_boost))*rules.boosts.addiction.damage
                break
            case BoostType.GreenBless:
                this.modifiers.damage_reduction*=1-(rules.boosts.green_bless.damage_reduction*(this.health_data.boost/this.health_data.max_boost))
                break
            case BoostType.Death:
                this.modifiers.damage+=(this.health_data.boost/this.health_data.max_boost)*rules.boosts.death.damage
                this.modifiers.speed+=(this.health_data.boost/this.health_data.max_boost)*rules.boosts.death.speed
                this.modifiers.damage_reduction*=0.8
                this.modifiers.damage_reduction-=(this.health_data.boost/this.health_data.max_boost)*rules.boosts.death.damage_reduction
                break
        }
        this.inventory.accessorys.apply_modifiers(this)
        for(const e of this.effects.values()){
            for(const sf of e.effect.side_effects){
                if(sf.type===SideEffectType.Modify){
                    this.apply_modifiers(sf.modify)
                }
            }
        }
        this.health_data.max_health=100*this.modifiers.health
        this.health_data.max_boost=100*this.modifiers.boost
        this.health_data.health=Math.min(this.health_data.health,this.health_data.max_health)
        if(this.physical_data.scale!==this.modifiers.size){
            this.physical_data.dirty=true
            this.physical_data.scale=this.modifiers.size
            this.base_hitbox = new CircleHitbox2D(
                v2(0,0),
                GameConstants.player.radius*this.physical_data.scale
            )
        }
    }
    side_effect(sf:SideEffect,owner?:Human){
        switch(sf.type){
            case SideEffectType.AddEffect:{
                const def=Effects.getFromString(sf.effect)
                if(this.effects.has(def.idNumber!)){
                    if(sf.merge){
                        this.effects.get(def.idNumber!)!.time+=sf.duration
                    }else{
                        this.effects.get(def.idNumber!)!.time=sf.duration
                    }
                }else{
                    this.effects.set(def.idNumber!,{
                        effect:def,
                        tick_time:0,
                        time:sf.duration
                    })
                    this.effects_dirty=true
                }
                break
            }
            case SideEffectType.Damage:
                if(sf.piercing)this.piercing_damage({
                    amount:sf.amount,
                    critical:false,
                    position:this.position,
                    reason:DamageReason.SideEffect,
                    direction:0,
                    owner:owner
                })
                else this.damage({
                    amount:sf.amount,
                    critical:false,
                    position:this.position,
                    reason:DamageReason.SideEffect,
                    direction:0,
                    owner:owner
                })
                break
            case SideEffectType.Heal:
                if(this.health_data.boost_def.type===BoostType.Death){
                    if(sf.boost){
                        if(sf.boost.def.type===BoostType.Death){
                            this.health_data.boost+=sf.boost.amount
                            break
                        }else if(sf.boost.def.type!==BoostType.GreenBless){
                            break
                        }
                    }else{
                        break
                    }
                }
                if(sf.health){
                    this.health_data.health=Math.min(this.health_data.health+sf.health.amount,this.health_data.max_health*(sf.health.max??1))
                }
                if(sf.boost){
                    if(this.health_data.boost_def.type===sf.boost.def.type){
                        this.health_data.boost=Math.min(this.health_data.boost+sf.boost.amount,this.health_data.max_boost*(sf.boost.max??1))
                    }else{
                        this.health_data.boost_def=sf.boost.def
                        this.health_data.boost=sf.boost.amount
                    }
                }
                if(sf.global){
                    if(this.health_data.health<this.health_data.max_health){
                        this.health_data.health=Math.min(this.health_data.health+sf.global.amount,this.health_data.max_health)
                    }else if(this.health_data.boost>0&&!sf.boost){
                        this.health_data.boost=Math.min(this.health_data.boost+sf.global.amount,this.health_data.max_boost)
                    }else if(this.health_data.boost_def.type===sf.global.boost?.type){
                        this.health_data.boost=Math.min(this.health_data.boost+sf.global.amount,this.health_data.max_boost)
                    }else if(sf.global.boost){
                        this.health_data.boost=Math.min(sf.global.amount,this.health_data.max_boost)
                        this.health_data.boost_def=sf.global.boost
                    }
                }
                break
        }
    }
    consuming_condition(conditions:ConsumibleCondition[],side_effects:SideEffect[]):boolean{
        for(const c of conditions){
            for(const se of side_effects){
                if(se.type!==SideEffectType.Heal)continue
                switch(c){
                    case ConsumibleCondition.UnfullHealth:
                        if(
                            this.health_data.health>=this.health_data.max_health*(se.health?.max??1)
                        )return false
                        break
                    case ConsumibleCondition.UnfullExtra:
                        if(
                            (this.health_data.boost_def.type===se.boost?.def.type&&this.health_data.boost>=this.health_data.max_boost*(se.boost?.max??1))
                        )return false
                        break
                }
            }
        }
        return true
    }
    throw_using_projectile(){
        if(!this.grenade_holding||(this.grenade_holding.slot&&this.grenade_holding.slot.quantity<=0)){
            this.grenade_holding=undefined
            return
        }
        const proj=this.game.add_grenade(this.position,this.grenade_holding!.def,this,this.layer)
        proj.physical_data.zpos=0.01
        proj.physical_data.zpos_speed=1.8
        const limit=(this.grenade_holding.def.throw_max_speed??0)
        proj.push(Numeric.clamp(this.input.dist_to_pointer*limit,0,limit),this.physical_data.rotation,10)
        proj.fuse_delay=this.grenade_holding.time
        if(this.grenade_holding.slot){
            this.grenade_holding.slot.remove(1)
            this.inventory.net_sync.items=true
            if(this.grenade_holding.slot.quantity<=0){
                let idx=this.inventory.weapon_idx
                if(!this.inventory.weapons[this.inventory.weapon_idx]){
                    idx=0
                }
                this.inventory.set_weapon_index(idx,true)
            }
        }
        this.grenade_holding=undefined
        this.inventory.net_sync.items=true

        this.animation_data.dirty=true
        this.animation_data.current_animation.push({
            type:HumanAnimationType.Throw
        })
    }
    isBlockedForPath(manager: GameObjectManager2D<BaseObject2D>,hb: Hitbox2D,_x: number,_y: number,layer: number): boolean {
        for (const obj of manager.cells.get_objects(hb, layer)) {
            if ((obj.number_type===GameObjectType.Building||obj.number_type===GameObjectType.Obstacle)&&!(obj as StaticBody).physical_data.no_collision){
                if(hb.colliding_with(obj.hitbox))return true
            }
        }
        return false
    }
    pathfind_to(dest:Vec2,complete_callback?:()=>void,quality:number=0.25):boolean{
        const path = astar_path2d(
            this,
            this.base_hitbox,
            dest,
            this.isBlockedForPath.bind(this),
            {
                cellSize:quality,
                dirs:[
                    [1,0],[0,1],[-1,0],[0,-1],
                    [1,1],[-1,-1],[-1,1],[1,-1]
                ]
            }
        )

        if (!path || path.length === 0) {
            return false
        }

        this.follow_path(path, complete_callback)
        return true
    }
    follow_path(path: Vec2[], complete_callback?: () => void) {
        if (!path || path.length === 0) return

        this.input.path = path.map(p => v2.clone(p))
        this.input.on_path_complete = complete_callback

    }
    clear_path(){
        this.input.path=undefined
        this.input.on_path_complete=undefined
        this.input.path_move=undefined
    }
    update_input(){
        if(this.input.reload&&this.inventory.hand_item&&this.inventory.hand_item.item_type===InventoryItemType.gun){
            (this.inventory.hand_item as GunItem).reloading=true
        }
        if(this.input.swamp_guns){
            this.inventory.swamp_guns()
        }
        if(this.input.interaction){
            if(this.seat){
                this.position=v2.add(this.seat.position,v2.rotate_RadAngle(v2(0,-1),this.seat.vehicle.physical_data.rotation))
                this.seat.clear_human()
            }else if(this.downed&&this.human_data.self_revive){
                this.on_interact(this)
            }
        }
        if(!this.downed&&!this.parachute){
            const executed:InputActionType[]=[]
            for(const a of this.input.actions){
                if(executed.includes(a.type))continue
                executed.push(a.type)
                switch(a.type){
                    case InputActionType.drop:
                        if(a.drop>=0){
                            const drop=a.drop
                            switch(a.drop_kind){
                                case 1:
                                    this.inventory.drop_weapon(Numeric.clamp(drop,0,2))
                                    break
                                case 2:
                                    this.inventory.drop_aitem(drop)
                                    break
                                case 3:
                                    this.inventory.drop_slot(drop)
                                    this.actions.cancel()
                                    break
                                case 4:
                                    this.inventory.drop_item(drop)
                                    this.actions.cancel()
                                    break
                                case 5:
                                    this.inventory.drop_iitem(drop)
                                    break
                                case 6:
                                    if(a.drop===0){
                                        this.inventory.drop_helmet()
                                    }else if(a.drop===1){
                                        this.inventory.drop_vest()
                                    }
                                    break
                            }
                        }
                        break
                    case InputActionType.use_item:{
                        const item=this.inventory.slots[a.slot]?.item
                        if(item){
                            item.on_use(this,this.inventory.slots[a.slot])
                        }
                        break
                    }
                    case InputActionType.set_hand:
                        if(!this.inventory.weapons[a.hand])break
                        this.inventory.set_weapon_index(a.hand)
                        break
                    case InputActionType.set_scope:
                        if(this.inventory.iitems.some((i)=>i.idNumber===a.scope_id)){
                            this.equipment_data.scope=this.game.definitions.scopes.getFromNumber(a.scope_id)
                        }
                        break
                    case InputActionType.emote_emote:{
                        if(this.emote_time>=0)break
                        const def=this.game.definitions.emotes.getFromNumber(a.emote)
                        this.loadout.emote_is_item=false
                        this.loadout.emote=def
                        break
                    }
                    case InputActionType.emote_item:{
                        if(this.emote_time>=0)break
                        const def=this.game.definitions.game_items.valueNumber[a.item]
                        this.loadout.emote_is_item=true
                        this.loadout.emote=def
                        this.emote_time=2
                        break
                    }
                    case InputActionType.ping:
                        /*this.game.pings.push({
                            color:this.team_data.color,
                            def:a.ping,
                            id:this.id,
                            position:a.position,
                        })*/
                        break
                    case InputActionType.buy_on_shop:
                        this.game.modeManager.human_buy_item(this,this.game.definitions.game_items.valueNumber[a.item_id])
                        break
                    case InputActionType.debug_give:
                        if(this.game.debug.debug_menu){
                            const l=this.game.definitions.game_items.valueString[a.item]
                            if(!l)break
                            this.inventory.give_item(l,a.count,true)
                        }
                        break
                    case InputActionType.debug_spawn:
                        if(this.game.debug.debug_menu){
                            const l=this.game.definitions.game_items.valueString[a.item]
                            if(!l)break
                            this.game.add_loot(this.position,l,a.count,this.layer)
                            if(l.item_type===InventoryItemType.gun){
                                this.game.add_loot(this.position,this.game.definitions.ammos.getFromString((l as unknown as GunDef).ammo_type),((l as unknown as GunDef).ammo_spawn?.amount??0)*a.count,this.layer)
                            }
                        }
                        break
                }
            }
        }
        this.input.swamp_guns=false
        this.input.interaction=false
        this.input.reload=false
        this.input.actions.length=0
    }

    _can_interact=true
    override on_collided(obj: ServerGameObject,_dt:number): void {
        switch(obj.number_type){
            case GameObjectType.Obstacle:{
                if((obj as StaticBody).physical_data.no_collision)break
                if(this._can_interact&&this.input.interaction&&obj.can_interact(this)){
                    this._can_interact=false;
                    (obj as Loot).on_interact(this)
                }
                const collision=this.hitbox.overlap_collisions(obj.hitbox)
                for(const col of collision){
                    v2m.sub(this.position,this.position,v2.scale(col.dir,col.pen))
                }
                if((obj as Obstacle).physical_data.stairs.length>0){
                    for(const s of (obj as Obstacle).physical_data.stairs){
                        if(s.hitbox.colliding_with(this.hitbox))this.manager.set_layer(this,obj.layer+s.dest_layer)
                    }
                }
                break
            }
            case GameObjectType.Building:{
                if(!this.equipment_data.force_default_scope){
                    for(const c of (obj as Building).ceilings){
                        if(c.can_below(this.hitbox)){
                            this.equipment_data.force_default_scope=true
                        }
                    }
                }
                if((obj as StaticBody).physical_data.no_collision)break
                if(this._can_interact&&this.input.interaction&&obj.can_interact(this)){
                    this._can_interact=false;
                    (obj as Loot).on_interact(this)
                }
                const collision=this.hitbox.overlap_collisions(obj.hitbox)
                for(const col of collision){
                    v2m.sub(this.position,this.position,v2.scale(col.dir,col.pen))
                }
                break
            }
            case GameObjectType.Vehicle:{
                if(this._can_interact&&this.input.interaction&&obj.can_interact(this)){
                    this._can_interact=false;
                    (obj as Loot).on_interact(this)
                }
                break
            }
            case GameObjectType.SyncedParticle:{
                if((obj as SyncedParticle).def.force_default_scope&&this.hitbox.colliding_with(obj.hitbox)){
                    this.equipment_data.force_default_scope=true
                }
                break
            }
            case GameObjectType.Human:
            case GameObjectType.Loot:
                if(this._can_interact&&this.input.interaction&&obj.can_interact(this)){
                    this._can_interact=false;
                    obj.on_interact(this)
                }
                break
        }
    }
    override on_tick(dt:number): void {
        if(this.dead){
            return
        }
        this.update_modifiers()
        //Movement
        const current_floor=Floors[this.physical_data.current_floor]
        let acceleration=40 * (this.downed?0.1:(current_floor.acceleration??1))
        acceleration=Numeric.dt_expo_inter(acceleration,dt)
        let speed=5.5*(this.recoil?this.recoil.speed:1)
            * (this.actions.current_action?.action_speed??1)
            * ((this.inventory.hand_def as WeaponDef)?.speed_mod??1)
            * this.modifiers.speed
            * (this.downed?0.25:1)
            * (this.parachute?1:((current_floor.speed_mult??1)))
            * (this.grenade_holding?0.7:1)
        if(this.recoil){
            this.recoil.delay-=dt
            if(this.recoil.delay<=0)this.recoil=undefined
        }
        const rules=this.game.modeManager.rules.humans
        switch(this.health_data.boost_def.type){
            case BoostType.Adrenaline:
                if(this.health_data.boost>this.health_data.max_boost/2){
                    speed*=1+rules.boosts.adrenaline.speed
                }
                this.health_data.boost=Math.max(this.health_data.boost-rules.boosts.adrenaline.decay*dt,0)
                this.health_data.health=Math.min(this.health_data.health+(this.health_data.boost*dt)*rules.boosts.adrenaline.regen,this.health_data.max_health)
                break
            case BoostType.Shield:
                break
            case BoostType.Mana:
                this.health_data.boost=Numeric.lerp(this.health_data.boost,this.health_data.max_boost,rules.boosts.mana.regen*dt)
                break
            case BoostType.Addiction:{
                speed*=1+(rules.boosts.addiction.speed*(this.health_data.boost/this.health_data.max_boost))
                this.health_data.boost=Math.max(this.health_data.boost-rules.boosts.addiction.decay*dt,0)
                if(this.health_data.boost_time<=0){
                    this.health_data.boost_time=3
                    this.piercing_damage({
                        amount:((this.health_data.max_boost/this.health_data.boost)*rules.boosts.addiction.abstinence)*100,
                        reason:DamageReason.Abstinence,
                        position:this.position,
                        critical:false,
                        direction:0,
                    })
                }else{
                    this.health_data.boost_time-=dt
                }
                break
            }
            case BoostType.GreenBless:{
                speed*=1+(rules.boosts.green_bless.speed*(this.health_data.boost/this.health_data.max_boost))
                this.health_data.health=Math.min(this.health_data.health+(this.health_data.boost*dt)*rules.boosts.green_bless.regen,this.health_data.max_health)
                break
            }
            case BoostType.Death:{
                if(this.health_data.boost>=this.health_data.max_boost){
                    this.die({
                        amount:this.health_data.health,
                        critical:true,
                        position:this.position,
                        reason:DamageReason.Abstinence,
                        direction:0,
                    })
                }
                if(this.health_data.boost_time<=0){
                    this.health_data.boost_time=1
                    this.health_data.boost=Math.min(this.health_data.boost+((this.health_data.max_boost/rules.boosts.death.life_time)),this.health_data.max_boost)
                }else{
                    this.health_data.boost_time-=dt
                }
                break
            }
        }
        for(const e of this.effects.values()){
            e.tick_time-=dt
            e.time-=dt
            if(e.tick_time<=0){
                for(const sf of e.effect.side_effects){
                    this.side_effect(sf)
                }
                e.tick_time=2
            }
            if(e.time<0){
                this.effects.delete(e.effect.idNumber!)
                this.effects_dirty=true
            }
        }
        if(this.seat){
            if(this.seat.rotation!==undefined)this.physical_data.rotation=this.seat.rotation
            if(this.seat.pillot)this.seat.vehicle.move(this.input.movement,this.input.reload)
        }else{
            if(this.input.path&&this.input.path.length > 0){
                const target = this.input.path[0]
                const dist=v2.distance(this.position,target)
                if (dist < 0.1) {
                    this.input.path.shift()
                    this.input.path_move=undefined
                    if (!this.input.path.length) {
                        const cb=this.input.on_path_complete
                        this.clear_path()
                        if(cb)cb()
                        return
                    }
                }
                const dest_rot = v2.lookTo(this.position,target)
                this.physical_data.rotation = Numeric.lerp_rad(this.physical_data.rotation,dest_rot,Numeric.dt_expo_inter(15,dt))
                this.input.path_move = v2.from_PolarMovement({
                    dir:dest_rot,
                    scale:1
                })
                const mov=v2.scale(this.input.path_move, speed)
                v2m.lerp(this.physical_data.velocity, mov, acceleration)
            }else if(this.human_data.movement_enabled){
                const move=v2.from_PolarMovement(this.input.movement)
                v2m.scale(move,move,speed)
                v2m.lerp(this.physical_data.velocity,move,acceleration)
                if(this.downed){
                    this.physical_data.rotation=Numeric.lerp_rad(this.physical_data.rotation,this.input.rotation,Numeric.dt_expo_inter(1,dt))
                }else{
                    this.physical_data.rotation=this.input.rotation
                }
            }else{
                this.physical_data.rotation=this.input.rotation
                this.physical_data.velocity=v2.zero()
            }
            this.equipment_data.force_default_scope=false
            super.on_tick(dt)
            if(!this.parachute){
                //Hand Use
                this.animation_data.attacking=false
                if(!this.grenade_holding&&this.inventory.hand_item&&this.human_data.combat_enabled&&!this.downed){
                    if(this.input.using_item){
                        this.inventory.hand_item.on_fire(this)
                        this.input.using_item_down=false
                    }else if(this.input.using_item_alt){
                        this.inventory.hand_item.on_fire_alt(this)
                    }
                }
                if(this.grenade_holding){
                    this.grenade_holding.time-=dt
                    if(this.grenade_holding.time<=0){
                        if(this.grenade_holding.def.explosion)this.game.add_explosion(this.position,this.game.definitions.explosions.getFromString(this.grenade_holding.def.explosion!),this,this.grenade_holding.def,this.layer)

                        if(this.grenade_holding.slot){
                            this.grenade_holding.slot.remove(1)

                            this.inventory.net_sync.items=true

                            if(this.grenade_holding.slot.quantity<=0){
                                let idx=this.inventory.weapon_idx
                                if(!this.inventory.weapons[this.inventory.weapon_idx]){
                                    idx=0
                                }
                                this.inventory.weapon_idx=-1
                                this.inventory.set_weapon_index(idx)
                            }
                        }
                        this.grenade_holding=undefined
                    }
                    if(!this.input.using_item){
                        this.throw_using_projectile()
                    }
                }
            }
        }
        this.physical_data.dirty_part=true
        this.set_dirty_part()

        this._can_interact=this.human_data.movement_enabled&&!this.downed
        if(!v2.is(this.position,this.old_position)){
            this.old_position=v2.clone(this.position)
            this.physical_data.current_floor=this.game.map.terrain.get_floor_type(this.position,this.layer,this.game.map.def.default_floor??FloorType.Void)
        }

        if(this.downed){
            this.downed_time+=dt
            if(this.downed_time>=1){
                this.downed_time=0
                this.piercing_damage({
                    amount:1,
                    critical:false,
                    position:this.position,
                    reason:DamageReason.Bleend,
                    direction:0,
                })
            }
        }

        if(this.emote_time>=0){
            this.emote_time-=dt
        }
        //Update Inventory
        this.inventory.update(dt)
        this.update_input()

        this.health_data.invensibility_time-=dt

        this.actions.update(dt)

        if(this.game.deadzone.do_damage&&this.game.deadzone.is_on_deadzone(this.position)&&this.game.deadzone.damage>0){
            this.piercing_damage({
                amount:this.game.deadzone.damageAt(this.position),
                critical:false,
                position:this.position,
                owner:undefined,
                reason:DamageReason.DeadZone,
                direction:0,
            })
        }

        if(this.health_data.health!==this.health_data.old_health||this.health_data.boost!==this.health_data.old_boost||this.health_data.boost_def.type!==this.health_data.old_boost_type){
            this.health_data.old_health=this.health_data.health
            this.health_data.old_boost=this.health_data.boost
            this.health_data.old_boost_type=this.health_data.boost_def.type
            if(this.team_data.group)this.team_data.group.dirty=true
            if(this.team_data.team)this.team_data.team.dirty=true
        }

    }
    override on_net_update(): void {
        super.on_net_update()

        this.physical_data.dirty=false
        this.physical_data.dirty_part=false

        this.animation_data.dirty=false
        this.animation_data.current_animation.length=0

        this.loadout.dirty=false
        this.loadout.dirty_colors=false
        this.loadout.emote=undefined

        this.equipment_data.dirty=false

        this.effects_dirty=false

        this.inventory.net_update()
    }
    self_state(full:boolean):SelfStateUpdate{
        const ret:SelfStateUpdate={
            health:Math.ceil(this.health_data.health),
            max_health:this.health_data.max_health,
            boost:this.health_data.boost,
            max_boost:this.health_data.max_boost,
            boost_type:this.health_data.boost_def.type,

            money:0,

            inventory:{
                items:[],
                aitems:this.inventory.aitems,
                iitems:this.inventory.iitems,
                weapons:[],
                hand:undefined
            },

            action:this.actions.current_action?{
                delay:this.actions.current_delay,
                type:this.actions.current_action.type
            }:undefined,

            current_scope:this.equipment_data.scope.idNumber!,
            force_default_scope:this.force_default_scope,

            dirty:full?{
                action:true,
                group:true,
                inventory:{
                    items:true,
                    aitems:true,
                    iitems:true,
                    weapons:true,
                    hand:true,
                },
            }:{
                inventory:this.inventory.net_sync,
                action:this.actions.dirty,
                group:false
            },
            colors:this.loadout.dirty_colors?this.loadout.colors:undefined
        }
        if(this.team_data.group?.dirty){
            ret.dirty.group=true
            ret.group=this.team_data.group.get_state()
        }
        for(let i=0;i<this.inventory.slots.length;i++){
            const s=this.inventory.slots[i]
            if(s.item){
                ret.inventory!.items.push({count:s.quantity,idNumber:this.game.definitions.game_items.keysString[s.item!.def.idString!],type:s.item.item_type})
            }else{
                ret.inventory!.items.push({count:0,idNumber:0,type:InventoryItemType.consumible})
            }
        }
        if(ret.dirty.inventory.weapons){
            const keys=Object.keys(this.inventory.weapons)
            ret.inventory.weapons=[]
            for(const a of keys){
                ret.inventory.weapons.push((this.inventory.weapons[a as unknown as number]?.def) as WeaponDef)
            }
        }
        if(this.inventory.hand_item){
            if(this.inventory.hand_item.item_type===InventoryItemType.gun){
                ret.inventory.hand={
                    slot:this.inventory.weapon_idx,
                    liquid:(this.inventory.hand_item as GunItem).liquid,
                    ammo:(this.inventory.hand_item as GunItem).ammo
                }
            }else{
                ret.inventory.hand={
                    slot:this.inventory.weapon_idx,
                    liquid:false,
                    ammo:0
                }
            }
        }
        return ret
    }
    give_boost(amount:number){
        if(this.health_data.boost_def.type===BoostType.Death){
            this.health_data.boost=Math.max(this.health_data.boost-(amount/5),0)
        }else{
            this.health_data.boost=Math.min(this.health_data.boost+amount,this.health_data.max_boost)
        }
    }
    clear_boost(){
        this.health_data.boost=0
        this.health_data.boost_time=0
        this.health_data.boost_def=Boosts[0]
    }
    clear(){
        this.inventory.clear()
        this.clear_boost()
        this.set_dirty_full()
    }
    damage(params:DamageParams){
        if(this.dead||!this.human_data.combat_enabled||this.parachute||this.health_data.imortal||this.health_data.invensibility_time>0)return
        let damage=params.amount
        let mod=1
        if(params.owner instanceof Human){
            const is_ally=this.game.modeManager.is_ally(this,params.owner)
            if(params.owner.id!==this.id&&is_ally&&!(this.human_data.friendly_fire&&params.owner.human_data.friendly_fire))return
            mod*=params.owner.modifiers.damage
        }
        if(this.equipment_data.vest){
            mod-=this.equipment_data.vest.reduction
            damage-=this.equipment_data.vest.defence
        }
        if(this.equipment_data.helmet){
            mod-=this.equipment_data.helmet.reduction
            damage-=this.equipment_data.helmet.defence
        }
        if(this.downed){
            mod+=0.2
        }
        if(params.critical){
            mod+=this.modifiers.critical_mult-1
        }
        damage*=this.modifiers.damage_reduction
        damage*=mod
        params.amount=damage
        this.piercing_damage(params)
    }
    piercing_damage(params: DamageParams): [number, number] {
        let shieldDamage = 0
        let healthDamage = 0
        const pos = params.position ?? this.position
        if (this.health_data.boost_def.type === BoostType.Shield && this.health_data.boost > 0) {
            shieldDamage = Math.min(this.health_data.boost, params.amount*this.game.modeManager.rules.humans.boosts.shield.damage_multiplier)
            if (params.amount >= this.health_data.boost * 2) {
                healthDamage = params.amount - this.health_data.boost
                this.health_data.boost = 0
            } else {
                this.health_data.boost -= shieldDamage
            }
            this.add_damage_splash(
                params.owner,
                shieldDamage,
                true,
                params.critical,
                pos,
                this.health_data.boost === 0
            )
            if (this.health_data.boost === 0) {
                this.health_data.invensibility_time = 0.35
            }
        } else {
            healthDamage = params.amount
        }
        if (healthDamage > 0) {
            const damage=Math.min(healthDamage,this.health_data.health)
            this.health_data.health = Math.max(this.health_data.health - healthDamage, 0)
            this.add_damage_splash(
                params.owner,
                healthDamage,
                false,
                params.critical,
                pos,
                false
            )
            if(params.owner&&params.owner.id!==this.id&&!this.game.modeManager.is_ally(this,params.owner)){
                params.owner.status.damage+=damage
                params.owner.apply_score(ScoreApplyerType.DamageDealth,damage*this.game.modeManager.rules.score.damage_reward)
            }
            if(!this.downed){
                this.status.damage_taken+=damage
                this.apply_score(ScoreApplyerType.DamageTaken,damage*-this.game.modeManager.rules.score.damage_taken_penalty)
            }
        }
        if (this.health_data.health === 0) {
            if (!this.downed&&((this.game.modeManager.can_down(this)||this.human_data.self_revive))) {
                this.down(params)
            } else {
                this.die(params)
            }
        }
        this.inventory.accessorys.call_event("damage",{params,player:this})
        return [healthDamage, shieldDamage]
    }
    add_damage_splash(owner: Human | undefined,count: number,shield: boolean,critical: boolean,position: Vec2,shield_break: boolean = false){
        const splash: DamageSplash = {
            count,
            shield,
            critical,
            position,

            taker: this.id,
            taker_layer: this.layer,

            shield_break,
        }
        this.splashes.push(splash)
        if(owner&&owner.is_player&&owner.id !== this.id){
            owner.splashes.push({
                ...splash
            })
            owner.splash_delay = 5
        }
    }
    merge_damage_splashes(){
        if(this.splashes.length <= 1) return
        const merged: DamageSplash[] = []
        for(const splash of this.splashes){
            let found = false
            for(const m of merged){
                const same_taker=m.taker===splash.taker&&m.taker_layer===splash.taker_layer
                const same_damage_type=m.shield === splash.shield
                if(same_taker&&same_damage_type){
                    m.count += splash.count
                    if(splash.critical){
                        m.critical = true
                    }
                    if(splash.shield_break){
                        m.shield_break = true
                    }
                    found = true
                    break
                }
            }
            if(!found){
                merged.push({
                    ...splash
                })
            }
        }

        this.splashes = merged
    }
    reset_status(){
        this.status.damage=0
        this.status.damage_taken=0
        this.status.kills=0
        this.status.score=0
    }
    down(params:DamageParams){
        if(this.downed)return
        this.downed=true
        this.downed_by=params.owner
        this.downed_time=0

        this.health_data.health=this.health_data.max_health
        this.clear_boost()

        this.health_data.invensibility_time=1

        this.inventory.set_weapon_index(0)

        this.push(-10,params.direction)
    }
    help_up(){
        if(!this.downed)return

        this.downed=false
        this.downed_by=undefined
        this.killed_by=undefined
        this.health_data.health=this.health_data.max_health*0.3
        this.health_data.boost=0
    }
    die(params:DamageParams){
        if(this.dead)return

        this.net_sync_deletion=false
        this.dead=true
        this.set_dirty_part()

        if(this.loadout.emotes.die){
            this.game.add_timeout(()=>this.loadout.emote=this.loadout.emotes.die,0.5)
        }

        this.inventory.drop_all()
        this.killed_by=params.owner
        if(!this.downed_by||(params.owner&&this.downed_by===params.owner&&!this.game.modeManager.is_ally(this.downed_by!,params.owner))){
            this.killed_by=params.owner
        }else{
            this.killed_by=this.downed_by
        }

        this.destroy()
        if(this.killed_by){
            if(this.killed_by.id!==this.id&&!this.game.modeManager.is_ally(this,this.killed_by)){
                this.killed_by.on_kill_enemy(this,params)
            }
        }

        this.game.modeManager.on_human_die(this)
        this.game.signals.emit("human_die",{human:this})
        if(this.game.modeManager.is_leader(this)){
            this.game.modeManager.leader_die(this)
        }

        if(this.team_data.team)this.team_data.team.clear_downeds()
        if(this.team_data.group)this.team_data.group.clear_downeds()

        if(this.spawn_body)this.game.add_human_body(this.position,this.name,params.direction,this.loadout.badge,this.layer)
    }
    revive(){
        if(!this.dead)return
        this.dead=false
        this.downed=false
        this.health_data.health=this.health_data.max_health
        this.health_data.boost=0
        this.health_data.boost_def=Boosts[BoostType.Adrenaline]
        if(!this.registred)this.manager.registry_object(this)
        this.game.humans._add_human(this)
    }
    on_kill_enemy(victim:Human,params:DamageParams){
        if(this.game.modeManager.is_leader(victim)){
            this.apply_score(ScoreApplyerType.KillLeader,this.game.modeManager.rules.score.kill_leader)
        }
        this.status.kills++
        this.apply_score(ScoreApplyerType.Kill,this.game.modeManager.rules.score.kill_reward)
        this.game.modeManager.assign_leader(this)
        this.inventory.accessorys.call_event("kill",{
            ...params,
            owner:this
        })
    }
    map_humans():MapHumanData[]{
        return this.team_data.team?.humans??this.team_data.group?.humans??[this]
    }
    override on_destroy(): void {
        const idx=this.humans_manager.humans.indexOf(this)
        if(idx!==-1)this.humans_manager.humans.splice(idx,1)
    }
    override on_encode_net(stream: Stream, full: boolean,utils:any): void {
        stream.write_boolean_group2(
            // Physical
            this.physical_data.dirty_part,this.physical_data.dirty, // 2
            // Equipment
            this.equipment_data.dirty_part,this.equipment_data.dirty, // 1
            // Loadout
            this.loadout.dirty, // 1
            this.animation_data.dirty, // 1
            this.effects_dirty,
            this.health_data.boost_def.type===BoostType.Shield&&this.health_data.boost>0,

            // Inventory
            this.inventory.net_sync.hand,this.inventory.net_sync.melee_world, // 2

            // State
            this.loadout.emote!==undefined, // 1
            this.loadout.emote_is_item,

            this.dead,
            this.downed,

            this.input.path===undefined,
            this.seat!==undefined
        )
        // Physical
        if(full||this.physical_data.dirty_part||this.physical_data.dirty){
            this.physical_encode(stream)
            if(full||this.physical_data.dirty){
                stream.write_float32(this.physical_data.scale)
            }
        }
        // Equipment
        if(full||this.equipment_data.dirty||this.equipment_data.dirty_part){
            stream.write_uint16(this.equipment_data.helmet_health??0)
            stream.write_uint16(this.equipment_data.vest_health??0)
            if(full||this.equipment_data.dirty){
                stream.write_uint8(this.equipment_data.helmet?this.equipment_data.helmet.idNumber!+1:0)
                .write_uint8(this.equipment_data.vest?this.equipment_data.vest.idNumber!+1:0)
                .write_uint8(this.inventory.backpack.idNumber!)
            }
        }
        // Loadout  
        if(full||this.loadout.dirty){
            stream.write_boolean_group(
                this.loadout.hair!==undefined,
                this.loadout.eyes!==undefined,
            )
            stream.write_uint16(this.loadout.body.def.idNumber!)
            if(this.loadout.hair){
                stream.write_uint16(this.loadout.hair.def.idNumber!)
                .write_uint32(this.loadout.hair.tint)
            }
            if(this.loadout.eyes){
                stream.write_uint16(this.loadout.eyes.idNumber!)
            }
            stream.write_uint16(this.loadout.shirt.idNumber!)
            .write_uint16(this.loadout.legs.idNumber!)
            .write_uint32(this.loadout.body.tint)
            .write_array(this.loadout.accessorys,(v)=>{
                stream.write_uint16(v.idNumber!)
            },1)
        }
        if(this.loadout.emote){
            const id=this.loadout.emote_is_item?
            this.game.definitions.game_items.keysString[this.loadout.emote.idString]:
            this.loadout.emote.idNumber!
            stream.write_uint16(id)
        }
        if(full||this.effects_dirty){
            stream.write_array(Array.from(this.effects.values()),(e)=>{
                stream.write_uint16(e.effect.idNumber!)
            },1)
        }
        if(full||this.inventory.net_sync.hand){
            stream.write_int16(this.game.definitions.game_items.keysString[this.inventory.hand_item?.def.idString??""]??-1)
        }
        if(full||this.inventory.net_sync.melee_world){
            stream.write_uint16(this.inventory.weapons[0]?.def.idNumber??0)
        }
        if(full||this.animation_data.dirty){
            stream.write_array(this.animation_data.current_animation,(v)=>{
                stream.write_uint8(v.type)
                switch(v.type){
                    case HumanAnimationType.Fire:
                        stream.write_boolean_group(v.alt,v.last,v.alt_func)
                        break
                    case HumanAnimationType.Reloading:
                        stream.write_uint8(v.alt_reload?1:0)
                        break
                    case HumanAnimationType.Consuming:
                        stream.write_uint16(v.item)
                        break
                    default:
                        break
                }
            },1)
        }
    }
}