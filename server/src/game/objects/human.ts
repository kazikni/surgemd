import { InputAction, InputActionType} from "common/scripts/packets/input_packet.ts"
import { GameConstants, GameObjectType, HumanAnimationData, HumanLoadoutData, HumanStatus, HumanAnimation, HumanAnimationType, ScoreApplyerType, LootData } from "common/scripts/others/constants.ts"
import { DamageSplash, MapHumanData, PingData, SelfStateUpdate } from "common/scripts/packets/update_packet.ts"
import { DamageReason, HumanAIDef, HumanDefinition, GameItemType, LoadoutPreset } from "common/scripts/definitions/utils.ts"
import { type HumanModifiers } from "common/scripts/others/constants.ts"
import { ServerGameObject } from "../others/gameObject.ts"
import { type Group, type Team } from "../mode/teams.ts"
import { Floors, FloorType } from "common/scripts/others/terrain.ts"
import { EffectInstance, Effects, SideEffect, SideEffectType } from "common/scripts/definitions/player/effects.ts"
import { GunDef } from "common/scripts/definitions/items/guns.ts"
import { ScopeDef } from "common/scripts/definitions/items/scopes.ts";
import { ActionsManager, astar_path2d, type BaseObject2D, CircleHitbox2D, type GameObjectManager2D, Hitbox2D, Stream, Numeric, PolarMovement, random, Slot, v2, v2m, Vec2, ColorM, cloneDeep } from "common/engine/core.ts";
import { type StaticBody } from "./static_body.ts";
import { type VehicleSeat } from "./vehicle.ts";
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
import { BotAi } from "../human/ai/simple_bot_ai.ts";
import { ADVHumanAI } from "../human/ai/adv_human_ai.ts";
import { EnemyNPCAI } from "../human/ai/enemy_npc_ai.ts";
import { DumbBotAI } from "../human/ai/dumb_bot_ai.ts";
import { ADVHumanAILegacy } from "../human/ai/adv_human_ai_legacy.ts";
import { FeedMessageType } from "common/scripts/packets/general_update.ts";
import { BoostDef } from "common/scripts/definitions/player/boosts.ts";
import { type Bullet } from "./bullet.ts";
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
    advanced_permitions:boolean=false

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
    }

    dead:boolean=false
    downed:boolean=false
    swimming:boolean=false

    health!:{
        value:number
        max:number
        old:number

        invensibility:number
    }
    boost!:{
        value:number
        max:number
        old:number

        old_def?:BoostDef
        def:BoostDef

        time:number
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
        helmet_skin?:number
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
        return 11/(this.force_default_scope?this.equipment_data.default_scope.scope_view:this.equipment_data.scope.scope_view)
    }
    emote_time:number=0
    loadout!:HumanLoadoutData&{
        dirty:boolean
        dirty_colors:boolean

        emotes:{
            death?:EmoteDef
            victory?:EmoteDef
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
        switching:true,
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
        emote?:GameItem|EmoteDef
        ping?:PingData
        message?:string

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
        active_time:number
        cook_time:number
        slot?:Slot<LItem>
        activated:boolean
    }

    last_damage_by?:Human
    killed_by?:Human

    downed_time:number=0
    downed_by?:Human

    being_helpup_by?:Human

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
        if(this.downed||!(this.inventory.weapons[0]?.def as MeleeDef).reflective)return undefined
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

            emotes:{},
            accessorys:female?[
                this.game.definitions.loadout.getFromString("hair_bow") as LoadoutAccessoryDef
            ]:[],
            colors:{},
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

        this.health={
            invensibility:0,
            max:100,
            value:100,
            old:-1,
        }
        this.clear_boost()
        this.update_modifiers()
    }
    override can_interact(user: Human): boolean {
        return this.downed&&this.game.modeManager.is_ally(this,user)
    }
    override on_interact(user: Human): void {
        if(this.being_helpup_by)return
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
        if(preset.hair_tint!==undefined&&this.loadout.hair)this.loadout.hair.tint=preset.hair_tint
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
        if(preset.wrapping){
            this.loadout.wrapping=this.game.definitions.wrapping.getFromStringSafe(typeof preset.wrapping==="string"?preset.wrapping:random.choose(preset.wrapping))
        }
    }
    set_preset(preset:HumanDefinition|undefined){
        if(!preset)return
        this.set_loadout_preset(preset.loadout)
        if(preset.name){
            this.name = preset.name
            if(this.is_player){
                this.game.feed_messages.push({
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
        if(preset.layer!==undefined)this.manager.set_layer(this,preset.layer)
        if(preset.group_color)this.team_data.color=preset.group_color
        if(preset.team){
            const team=this.game.modeManager.get_team(preset.team)
            if(team){
                team.add_human(this)
            }
        }
        if(preset.boosts){
            const choose=random.weight2(preset.boosts)
            if(choose){
                const choose_def=this.game.definitions.boosts.getFromStringSafe(choose.def)
                if(choose_def){
                    this.boost.def=choose_def
                    this.boost.value=this.boost.max*choose.value
                }
            }
        }
        this.update_modifiers()
        this.health.value=this.health.max
    }
    make_ai_from_def(def:HumanAIDef):BotAi|undefined{
        let ai:BotAi|undefined
        switch(def.kind){
            case "advanced":
                ai = new ADVHumanAI(this)
                break
            case "advanced_legacy":
                ai = new ADVHumanAILegacy(this)
                break
            case "dumb":
                ai = new DumbBotAI(this)
                break
            default:
                ai = new EnemyNPCAI(this)
                break
        }
        if(def.params){
            ai.params = cloneDeep(def.params)
        }
        return ai
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
        if(this.boost.def.se?.update_modifiers)this.apply_modifiers(this.boost.def.se.update_modifiers(this))
        this.inventory.accessorys.apply_modifiers(this)
        for(const e of this.effects.values()){
            for(const sf of e.effect.side_effects){
                if(sf.type===SideEffectType.Modify){
                    this.apply_modifiers(sf.modify)
                }
            }
        }
        this.health.max=100*this.modifiers.health
        this.boost.max=100*this.modifiers.boost
        this.health.value=Math.min(this.health.value,this.health.max)
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
        if(this.boost.def.se?.can_apply&&!this.boost.def.se.can_apply(sf,this))return
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
                    penetration:1,
                    owner:owner
                })
                else this.damage({
                    amount:sf.amount,
                    critical:false,
                    position:this.position,
                    reason:DamageReason.SideEffect,
                    direction:0,
                    penetration:1,
                    owner:owner
                })
                break
            case SideEffectType.Heal:
                if(sf.health){
                    this.health.value=Math.min(this.health.value+sf.health.amount,this.health.max*(sf.health.max??1))
                }
                if(sf.boost){
                    const def=this.game.definitions.boosts.getFromStringSafe(sf.boost.def)
                    if(this.boost.def.idString===sf.boost.def){
                        this.boost.value=Math.min(this.boost.value+sf.boost.amount,this.boost.max*(sf.boost.max??1))
                    }else if(def){
                        this.boost.def=def
                        this.boost.value=sf.boost.amount
                    }
                }
                if(sf.global){
                    if(this.health.value<this.health.max){
                        this.health.value=Math.min(this.health.value+sf.global.amount,this.health.max)
                    }else if(this.boost.value>0&&!sf.boost){
                        this.boost.value=Math.min(this.boost.value+sf.global.amount,this.boost.max)
                    }else if(this.boost.def.idString===sf.global.boost){
                        this.boost.value=Math.min(this.boost.value+sf.global.amount,this.boost.max)
                    }else if(sf.global.boost){
                        this.boost.value=Math.min(sf.global.amount,this.boost.max)
                        this.boost.def=this.game.definitions.boosts.getFromString(sf.global.boost)
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
                            this.health.value>=this.health.max*(se.health?.max??1)
                        )return false
                        break
                    case ConsumibleCondition.UnfullExtra:
                        if(
                            (this.boost.def.idString===se.boost?.def&&this.boost.value>=this.boost.max*(se.boost?.max??1))
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
        const position=v2.scale(this.grenade_holding.def.throw_position??v2(0.3,0.4),this.physical_data.scale)
        v2m.rotate_RadAngle(position,this.physical_data.rotation)
        v2m.add(position,position,this.position)
        const proj=this.game.add_grenade(position,this.grenade_holding!.def,this,this.layer)
        proj.physical_data.zpos=0.01
        proj.physical_data.zpos_speed=1.8
        const limit=(this.grenade_holding.def.throw_max_speed??0)
        proj.push(Numeric.clamp(this.input.dist_to_pointer*limit,0,limit),this.physical_data.rotation,10)
        v2m.add(proj.physical_data.velocity,proj.physical_data.velocity,this.physical_data.velocity)
        proj.fuse_delay=this.grenade_holding.def.fuse?.allow_hand?this.grenade_holding.time:(this.grenade_holding.def.fuse?.time??this.grenade_holding.time)
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
        if(this.input.reload&&this.inventory.hand_item&&this.inventory.hand_item.item_type===GameItemType.gun){
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
                        if(this.emote_time>=0&&!this.advanced_permitions)break
                        const def=this.game.definitions.emotes.getFromNumber(a.emote)
                        this.input.emote=def
                        break
                    }
                    case InputActionType.emote_item:{
                        if(this.emote_time>=0&&!this.advanced_permitions)break
                        const def=this.game.definitions.game_items.valueNumber[a.item]
                        this.input.emote=def
                        this.input.message=undefined
                        this.emote_time=1
                        break
                    }
                    case InputActionType.message:{
                        if(this.emote_time>=0&&a.value.length>0&&!this.advanced_permitions)break
                        this.emote_time=1.5
                        this.input.message=a.value
                        this.input.emote=undefined
                        break
                    }
                    case InputActionType.ping:
                        if(this.team_data.group?.pings){
                            this.team_data.group.pings.push({
                                color:this.team_data.color,
                                def:a.ping,
                                id:this.id,
                                position:a.position,
                            })
                        }else{
                            this.input.ping={
                                color:this.team_data.color,
                                def:a.ping,
                                id:this.id,
                                position:a.position,
                            }
                        }
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
                            const aditional:LootData[]=[]
                            if(l.item_type===GameItemType.gun){
                                aditional.push({
                                    item:this.game.definitions.ammos.getFromString((l as unknown as GunDef).ammo_type),
                                    count:((l as unknown as GunDef).ammo_spawn?.amount??0)*a.count
                                })
                            }
                            this.game.add_loot(this.position,{item:l,count:a.count,aditional},this.layer)
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

    _interact_object?:ServerGameObject
    _interact_score:number=Infinity
    _interacted_objects:Set<number>=new Set()
    override on_collided(obj: ServerGameObject,_dt:number): void {
        switch(obj.number_type){
            case GameObjectType.Obstacle:{
                if((obj as Obstacle).physical_data.stairs.length>0){
                    for(const s of (obj as Obstacle).physical_data.stairs){
                        if(s.hitbox.colliding_with(this.hitbox))this.manager.set_layer(this,obj.layer+s.dest_layer)
                    }
                }
                if(this.input.interaction&&obj.can_interact(this)&&!this._interacted_objects.has(obj.id)){
                    obj.on_interact(this)
                    this._interacted_objects.add(obj.id)
                }
                if((obj as StaticBody).physical_data.no_collision)break
                const collision=this.hitbox.overlap_collisions(obj.hitbox)
                for(const col of collision){
                    v2m.sub(this.position,this.position,v2.scale(col.dir,col.pen))
                }
                break
            }
            case GameObjectType.Building:{
                if((obj as StaticBody).physical_data.stairs.length>0){
                    for(const s of (obj as StaticBody).physical_data.stairs){
                        if(s.hitbox.colliding_with(this.hitbox))this.manager.set_layer(this,obj.layer+s.dest_layer)
                    }
                }
                if(!this.equipment_data.force_default_scope){
                    for(const c of (obj as Building).ceilings){
                        if(c.can_below(this.hitbox)){
                            this.equipment_data.force_default_scope=true
                        }
                    }
                }
                if(this.input.interaction&&obj.can_interact(this)&&!this._interacted_objects.has(obj.id)){
                    obj.on_interact(this)
                    this._interacted_objects.add(obj.id)
                }
                if((obj as StaticBody).physical_data.no_collision)break
                const collision=this.hitbox.overlap_collisions(obj.hitbox)
                for(const col of collision){
                    v2m.sub(this.position,this.position,v2.scale(col.dir,col.pen))
                }
                break
            }
            case GameObjectType.Loot:
            case GameObjectType.Vehicle:{
                if(this.input.interaction&&obj.can_interact(this)){
                    const dist=v2.distance(this.position,obj.position)
                    if(dist<this._interact_score){
                        this._interact_object=obj
                        this._interact_score=dist
                    }
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
                if((obj as Human).dead)break
                if(this.input.interaction&&obj.can_interact(this)&&!this._interacted_objects.has(obj.id)){
                    obj.on_interact(this)
                    this._interacted_objects.add(obj.id)
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
        let acceleration=40*(this.downed||this.swimming?0.2:current_floor.acceleration)
        acceleration=Numeric.dt_expo_inter(acceleration,dt)
        let speed=5.3*(this.recoil?this.recoil.speed:1)
            * (this.actions.current_action?.action_speed??1)
            * ((this.inventory.hand_def as WeaponDef)?.speed_mod??1)
            * this.modifiers.speed
            * (this.downed?0.25:1)
            * (this.parachute?1:(current_floor.speed_mult))
            * (this.grenade_holding?0.7:1)
        this.swimming=current_floor.deep||false
        if(this.recoil){
            this.recoil.delay-=dt
            if(this.recoil.delay<=0)this.recoil=undefined
        }
        if(this.boost.def.se?.tick)speed*=this.boost.def.se.tick(dt,this)
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
                if(this.downed||this.swimming){
                    this.physical_data.rotation=Numeric.lerp_rad(this.physical_data.rotation,this.input.rotation,Numeric.dt_expo_inter(1,dt))
                }else{
                    this.physical_data.rotation=this.input.rotation
                }
            }else{
                this.physical_data.rotation=this.input.rotation
                this.physical_data.velocity=v2.zero()
            }
            this.equipment_data.force_default_scope=false
            this._interact_object=undefined
            this._interacted_objects.clear()
            this._interact_score=Infinity
            super.on_tick(dt)
            if(this.human_data.movement_enabled&&!this.downed&&this._interact_object){
                (this._interact_object as ServerGameObject).on_interact(this)
            }
            if(!this.parachute){
                //Hand Use
                if(!this.grenade_holding&&this.inventory.hand_item&&this.human_data.combat_enabled&&!this.downed&&!this.swimming){
                    if(this.input.using_item){
                        this.inventory.hand_item.on_fire(this)
                        this.input.using_item_down=false
                    }else if(this.input.using_item_alt){
                        this.inventory.hand_item.on_fire_alt(this)
                    }
                }
                if(this.grenade_holding){
                    if(this.grenade_holding.cook_time>0){
                        this.grenade_holding.cook_time-=dt
                    }else{
                        if(!this.input.using_item&&!this.grenade_holding.activated){
                            this.grenade_holding.activated=true
                            this.animation_data.dirty=true
                            this.animation_data.current_animation.push({
                                type:HumanAnimationType.Throw
                            })
                        }
                        if(this.grenade_holding.activated){
                            this.grenade_holding.active_time-=dt
                            this.throw_using_projectile()
                        }else if(this.grenade_holding.def.fuse?.allow_hand){
                            this.grenade_holding.time-=dt
                            if(this.grenade_holding.time<=0&&!this.grenade_holding.activated){
                                this.grenade_holding.cook_time=0
                                this.grenade_holding.activated=true
                                this.animation_data.dirty=true
                                this.animation_data.current_animation.push({
                                    type:HumanAnimationType.Reset
                                })
                            }
                        }
                    }
                }
            }
        }
        this.physical_data.dirty_part=true
        this.set_dirty_part()

        if(!v2.is(this.position,this.old_position)){
            this.old_position=v2.clone(this.position)
            this.physical_data.current_floor=this.game.map.terrain.get_floor_type(this.position,this.layer,this.game.map.default_floor)
        }

        if(this.downed&&!this.being_helpup_by){
            this.downed_time+=dt
            if(this.downed_time>=1){
                this.downed_time=0
                this.piercing_damage({
                    amount:1,
                    critical:false,
                    position:this.position,
                    reason:DamageReason.Bleend,
                    direction:0,
                    penetration:1,
                })
            }
        }

        if(this.emote_time>=0){
            this.emote_time-=dt
        }
        //Update Inventory
        this.inventory.update(dt)
        this.update_input()

        if(this.health.invensibility>0)this.health.invensibility-=dt

        this.actions.update(dt)

        if(this.game.deadzone.do_damage&&this.game.deadzone.damage>0&&this.game.deadzone.is_on_deadzone(this.position)){
            this.piercing_damage({
                amount:this.game.deadzone.damageAt(this.position),
                critical:false,
                position:this.position,
                owner:undefined,
                reason:DamageReason.DeadZone,
                direction:0,
                penetration:1,
            })
        }

        if(this.health.value!==this.health.old||this.boost.value!==this.boost.old||this.boost.def!==this.boost.old_def){
            this.health.old=this.health.value
            this.boost.old=this.boost.value
            this.boost.old_def=this.boost.def
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
        this.animation_data.switching=false

        this.loadout.dirty=false
        this.loadout.dirty_colors=false
        this.input.emote=undefined
        this.input.message=undefined
        this.input.ping=undefined

        this.equipment_data.dirty=false

        this.effects_dirty=false

        this.inventory.net_update()
    }
    self_state(full:boolean):SelfStateUpdate{

        const ret:SelfStateUpdate={
            health:Math.ceil(this.health.value),
            max_health:this.health.max,

            boost:this.boost.value,
            max_boost:this.boost.max,
            boost_def:this.boost.def.idNumber!,

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
                ret.inventory!.items.push({count:0,idNumber:0,type:GameItemType.consumible})
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
            if(this.inventory.hand_item.item_type===GameItemType.gun){
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
        this.boost.value=Math.min(this.boost.value+amount,this.boost.max)
    }
    clear_boost(){
        this.boost={
            value:0,
            max:100,
            def:this.game.definitions.boosts.getFromNumber(0),
            old:-1,
            time:0,
        }
    }
    damage(params:DamageParams){
        if(this.dead||!this.human_data.combat_enabled||this.parachute||this.health.invensibility>0)return
        const penetration=params.penetration
        let damage=params.amount
        let mod=1
        if(params.owner instanceof Human){
            const is_ally=this.game.modeManager.is_ally(this,params.owner)
            if(params.owner.id!==this.id&&is_ally&&!(this.human_data.friendly_fire&&params.owner.human_data.friendly_fire))return
            mod*=params.owner.modifiers.damage
        }
        if(this.equipment_data.vest){
            mod-=this.equipment_data.vest.reduction*penetration
            damage-=this.equipment_data.vest.defence*penetration
        }
        if(this.equipment_data.helmet){
            mod-=this.equipment_data.helmet.reduction*penetration
            damage-=this.equipment_data.helmet.defence*penetration
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
        if(this.boost.def.shield&&this.boost.value>0){
            shieldDamage = Math.min(this.boost.value, params.amount*this.boost.def.shield.multiplier)
            if (params.amount >= this.boost.value*this.boost.def.shield.penetrate) {
                healthDamage = params.amount - this.boost.value
                this.boost.value=0
            } else {
                this.boost.value-=shieldDamage
            }
            if(this.boost.value===0){
                this.health.invensibility+=this.boost.def.shield.break_invensibility
            }
            this.add_damage_splash(params.owner, shieldDamage, true, params.critical, pos,this.boost.value===0)
        }else{
            healthDamage=params.amount
        }
        if (healthDamage>0) {
            const damage=Math.min(healthDamage,this.health.value)
            this.health.value=Math.max(this.health.value-healthDamage,0)
            this.add_damage_splash(params.owner,healthDamage,false,params.critical,pos,false)
            if(params.owner&&params.owner.id!==this.id&&!this.game.modeManager.is_ally(this,params.owner)){
                this.last_damage_by=params.owner
                params.owner.status.damage+=damage
                params.owner.apply_score(ScoreApplyerType.DamageDealth,damage*this.game.modeManager.rules.score.damage_reward)
            }
            if(!this.downed){
                this.status.damage_taken+=damage
                this.apply_score(ScoreApplyerType.DamageTaken,damage*-this.game.modeManager.rules.score.damage_taken_penalty)
            }
        }
        if(this.health.value===0){
            if(this.last_damage_by&&!this.last_damage_by.dead&&(!params.owner||params.owner===this))params.owner=this.last_damage_by
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

        this.actions.cancel()
        this.health.value=this.health.max
        this.clear_boost()

        this.health.invensibility=1

        this.inventory.set_weapon_index(0)

        this.grenade_holding=undefined
        if(this.seat)this.seat.clear_human()
        this.push(-10,params.direction)
    }
    help_up(){
        if(!this.downed)return

        this.downed=false
        this.downed_by=undefined
        this.killed_by=undefined
        this.last_damage_by=undefined
        this.health.value=this.health.max*0.3
        this.clear_boost()
        this.being_helpup_by=undefined
        this.actions.cancel()
    }
    die(params:DamageParams){
        if(this.dead)return

        this.net_sync_deletion=false
        this.dead=true
        this.set_dirty_part()

        if(this.loadout.emotes.death){
            this.input.emote=this.loadout.emotes.death
        }

        this.inventory.drop_all()
        if(this.seat)this.seat.clear_human()
        this.killed_by=params.owner
        if(!this.downed_by||(params.owner&&this.downed_by===params.owner&&!this.game.modeManager.is_ally(this.downed_by!,params.owner))){
            this.killed_by=params.owner
        }else{
            this.killed_by=this.downed_by
        }

        if(this.killed_by){
            if(this.killed_by.id!==this.id&&!this.game.modeManager.is_ally(this,this.killed_by)){
                this.killed_by.on_kill_enemy(this,params)
            }
        }

        this.game.modeManager.on_human_die(this)
        this.game.signals.emit("human_die",{human:this})
        if(this.game.modeManager.is_leader(this)){
            this.game.modeManager.leader_die(this)
            if(this.game.modeManager.rules.leader.search)this.game.modeManager.search_leader()
        }

        if(this.team_data.team)this.team_data.team.clear_downeds()
        if(this.team_data.group)this.team_data.group.clear_downeds()

        if(this.spawn_body)this.game.add_human_body(this.position,this.name,params.direction,this.loadout.badge,this.layer)

        this.destroy()
    }
    revive(){
        if(!this.dead)return
        this.dead=false
        this.downed=false
        this.killed_by=undefined
        this.downed_by=undefined
        this.last_damage_by=undefined
        this.health.value=this.health.max
        this.clear_boost()
        this.set_dirty_full()
        if(this.seat)this.seat.clear_human()
        this.effects.clear()
        if(!this.registred)this.manager.registry_object(this)
        this.game.humans._add_human(this)
        this.equipment_data.scope=this.equipment_data.default_scope
        this.inventory.net_sync.aitems=true
        this.inventory.net_sync.hand=true
        this.inventory.net_sync.iitems=true
        this.inventory.net_sync.items=true
        this.inventory.net_sync.melee_world=true
        this.inventory.net_sync.weapons=true
    }
    on_kill_enemy(victim:Human,params:DamageParams){
        const rules=this.game.modeManager.rules
        this.status.kills++

        let kill_reward=rules.score.kill_reward
        if(this.game.modeManager.is_leader(victim)){
            kill_reward*=rules.score.leader_kill
        }
        if(params.object&&params.object.number_type===GameObjectType.Bullet){
            if((params.object as Bullet).reflectionCount>0)kill_reward+=rules.score.bounce_kill
        }
        this.apply_score(ScoreApplyerType.Kill,kill_reward)

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
        stream.write_boolean_group3(
            // Physical
            this.physical_data.dirty_part,this.physical_data.dirty, // 2
            // Equipment
            this.equipment_data.dirty_part,this.equipment_data.dirty, // 1
            // Loadout
            this.loadout.dirty, // 1
            this.animation_data.dirty, // 1
            this.effects_dirty,
            this.boost.def.shield&&this.boost.value>0,

            this.animation_data.switching,

            // Inventory
            this.inventory.net_sync.hand,this.inventory.net_sync.melee_world, // 2

            // State
            this.input.emote!==undefined, // 1
            this.input.message!==undefined,

            this.dead,
            this.downed,
            this.swimming,

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
            stream.write_boolean_group(
                this.equipment_data.helmet_skin!==undefined,
                this.equipment_data.helmet_health!==undefined,

                this.equipment_data.vest_health!==undefined,
            )
            if(this.equipment_data.helmet_health!==undefined)stream.write_uint16(this.equipment_data.helmet_health??0)
            if(this.equipment_data.vest_health!==undefined)stream.write_uint16(this.equipment_data.vest_health??0)
            if(full||this.equipment_data.dirty){
                if(this.equipment_data.helmet_skin!==undefined)stream.write_uint8(this.equipment_data.helmet_skin)
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
            .write_uint16(this.loadout.wrapping===undefined?0:(this.loadout.wrapping.idNumber!+1))
        }
        if(this.input.emote){
            stream.write_uint16(this.game.definitions.game_objects.keysString[this.input.emote.idString])
        }
        if(this.input.message!==undefined){
            stream.write_string_sized(this.input.message,50)
        }
        if(full||this.effects_dirty){
            stream.write_array(Array.from(this.effects.values()),(e)=>{
                stream.write_uint16(e.effect.idNumber!)
            },1)
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
        if(full||this.inventory.net_sync.hand){
            stream.write_int16(this.game.definitions.game_items.keysString[this.inventory.hand_item?.def.idString??""]??-1)
        }
        if(full||this.inventory.net_sync.melee_world){
            stream.write_uint16(this.inventory.weapons[0]?.def.idNumber??0)
        }
    }
}