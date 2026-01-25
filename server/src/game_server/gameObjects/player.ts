import { CircleHitbox2D, Client, NetStream, NullVec2, Numeric, RectHitbox2D, v2, v2m, Vec2 } from "common/scripts/engine/mod.ts"
import { ActionPacket, InputAction, InputActionType } from "common/scripts/packets/action_packet.ts"
import { ActionsType, GameConstants, PlayerAnimation, PlayerAnimationType } from "common/scripts/others/constants.ts"
import { GInventory,GunItem, LItem} from "../player/inventory.ts"
import { DamageSplash, UpdatePacket } from "common/scripts/packets/update_packet.ts"
import { DamageParams } from "../others/utils.ts"
import { type Obstacle } from "./obstacle.ts"
import { ActionsManager, type Slot } from "common/scripts/engine/inventory.ts"
import { DamageReason, InventoryItemType } from "common/scripts/definitions/utils.ts"
import { DamageSourceDef, DamageSources, GameItems, GameObjectDef, GameObjectsDefs, WeaponDef, Weapons } from "common/scripts/definitions/alldefs.ts"
import { type PlayerModifiers } from "common/scripts/others/constants.ts"
import { AccessoriesManager } from "../player/accesories.ts"
import { ServerGameObject } from "../others/gameObject.ts"
import { type Loot } from "./loot.ts"
import { Ammos } from "common/scripts/definitions/items/ammo.ts"
import { type Group, type Team } from "../mode/teams.ts"
import { KillFeedMessageType } from "common/scripts/packets/killfeed_packet.ts"
import {SkinDef, Skins} from "common/scripts/definitions/loadout/skins.ts"
import { type VehicleSeat } from "./vehicle.ts"
import { Floors, FloorType } from "common/scripts/others/terrain.ts"
import { BoostDef, Boosts, BoostType } from "common/scripts/definitions/player/boosts.ts"
import { EffectInstance, Effects, SideEffect, SideEffectType } from "common/scripts/definitions/player/effects.ts"
import { BotAi } from "../player/simple_bot_ai.ts"
import { Emotes } from "common/scripts/definitions/loadout/emotes.ts"
import { GunDef } from "common/scripts/definitions/items/guns.ts"
import { ProjectileDef } from "common/scripts/definitions/objects/projectiles.ts"
import { Explosions } from "common/scripts/definitions/objects/explosions.ts"
import { HelmetDef, VestDef } from "common/scripts/definitions/items/equipaments.ts";
import { GameOverPacket } from "common/scripts/packets/gameOver.ts";
import { Building } from "./building.ts";
import { MeleeDef } from "common/scripts/definitions/items/melees.ts";
import { ScopeDef, Scopes } from "common/scripts/definitions/items/scopes.ts";

export class Player extends ServerGameObject{
    oldPosition:Vec2
    stringType:string="player"
    numberType: number=1
    name:string=""
    rotation:number=0
    velocity:Vec2=v2.new(0,0)
    recoil?:{speed:number,delay:number}

    skin:SkinDef=Skins.getFromString("default_skin")
    loadout={
        skin:"default_skin",
        badge:"stone_1_badge",
        emotes:{
            die:"emote_sad",
        }
    }
    parachute?:{
        value:number
    }
    seat?:VehicleSeat

    health:number=100
    maxHealth:number=100

    boost:number=0
    maxBoost:number=100
    boost_def:BoostDef=Boosts[BoostType.Null]

    actions:ActionsManager<this>

    client?:Client
    is_npc:boolean=false
    is_bot:boolean=false

    inventory:GInventory

    using_healing_speed:number=0.4

    vest?:VestDef
    helmet?:HelmetDef
    accessories:AccessoriesManager

    status={
        damage:0,
        kills:0,
        rank:0,
    }

    account_status={
        coins:0,
        xp:0,
        wins:0,
        special_wins:0,
        games_total:0,
        kills:0,
    }
    earned={
        coins:0,
        xp:0,
        score:0,
        win:0,
    }
    username:string=""
    
    current_animation?:PlayerAnimation

    pvpEnabled:boolean=false

    team?:Team
    teamId?:number

    group?:Group
    groupId?:number

    current_floor:FloorType=0

    boost_t:number=0

    friendly_fire:boolean=false
    alternative_vehicle_control:boolean=true

    input={
        speed:1,
        movement:v2.new(0,0),
        rotation:0,
        using_item:false,
        using_item_down:false,
        interaction:false,
        reload:false,
        swamp_guns:false,
        attacking:false,
        swicthed:false,

        aim_speed:0,

        actions:[] as InputAction[],

        emote:undefined as GameObjectDef|undefined,
        is_mobile:false
    }

    projectile_holding?:{
        def:ProjectileDef
        time:number
        slot?:Slot<LItem>
    }

    ai?:BotAi

    scope:ScopeDef
    constructor(){
        super()
        this.oldPosition=v2.duplicate(this.position)
        this.inventory=new GInventory(this)

        this.actions=new ActionsManager(this)

        this.accessories=new AccessoriesManager(this,3)
        this.base_hitbox = new CircleHitbox2D(
            v2.new(0,0),
            GameConstants.player.playerRadius
        )

        this.scope=Scopes.getFromNumber(0)
    }
    interact(user: Player): void {
        if(!this.downed||user.teamId===undefined||(user.teamId!==this.teamId&&(user.groupId===undefined||user.groupId!==this.groupId)))return
        this.revive()
    }

    dead=false
    downed=false
    connected=false
    activated=false

    invensibility_time:number=0
    imortal:boolean=false

    downedBy?:Player
    downedBySource?:DamageSourceDef

    modifiers:PlayerModifiers={
        boost:1,
        bullet_size:1,
        bullet_speed:1,
        damage:1,
        health:1,
        speed:1,
        critical_mult:1,
        luck:1,
        mana_consume:1,
        damage_reduction:1,
    }

    effects:Map<number,EffectInstance>=new Map()

    privateDirtys={
        inventory:true,
        weapons:true,
        current_weapon:true,
        action:true,
        oitems:true,
        scopes:true
    }

    apply_modifiers(mods:Partial<PlayerModifiers>){
        this.modifiers.boost*=mods.boost??1
        this.modifiers.bullet_size*=mods.bullet_size??1
        this.modifiers.bullet_speed*=mods.bullet_speed??1
        this.modifiers.damage*=mods.damage??1
        this.modifiers.health*=mods.health??1
        this.modifiers.speed*=mods.speed??1
    }

    update_modifiers(){
        this.modifiers.damage=this.modifiers.speed=this.modifiers.mana_consume=this.modifiers.health=this.modifiers.boost=this.modifiers.bullet_speed=this.modifiers.bullet_size=this.modifiers.critical_mult=this.modifiers.damage_reduction=1
        const gamemode=this.game.gamemode
        switch(this.boost_def.type){
            case BoostType.Null:
            case BoostType.Shield:
            case BoostType.Adrenaline:
            case BoostType.Mana:
                break
            case BoostType.Addiction:
                this.modifiers.damage+=(1-(this.boost/this.maxBoost))*gamemode.player.boosts.addiction.damage
                break
            case BoostType.GreenBless:
                this.modifiers.damage_reduction*=1-(gamemode.player.boosts.green_bless.damage_reduction*(this.boost/this.maxBoost))
                break
            case BoostType.Death:
                this.modifiers.damage+=(1-(this.boost/this.maxBoost))*gamemode.player.boosts.death.damage
                this.modifiers.speed+=(1-(this.boost/this.maxBoost))*gamemode.player.boosts.death.speed
                this.modifiers.damage_reduction*=0.8
                this.modifiers.damage_reduction-=(1-(this.boost/this.maxBoost))*gamemode.player.boosts.death.damage_reduction
                break
        }

        for(const acc of this.accessories.slots){
            if(acc.item){
                this.apply_modifiers(acc.item.modifiers)
            }
        }

        for(const e of this.effects.values()){
            for(const sf of e.effect.side_effects){
                if(sf.type===SideEffectType.Modify){
                    this.apply_modifiers(sf.modify)
                }
            }
        }

        this.maxHealth=100*this.modifiers.health
        this.maxBoost=100*this.modifiers.boost

        this.health=Math.min(this.health,this.maxHealth)
    }
    side_effect(sf:SideEffect){
        switch(sf.type){
            case SideEffectType.AddEffect:{
                const def=Effects.getFromString(sf.effect)
                if(this.effects.has(def.idNumber!)){
                    this.effects.get(def.idNumber!)!.time+=sf.duration
                }else{
                    this.effects.set(def.idNumber!,{
                        effect:def,
                        tick_time:0,
                        time:sf.duration
                    })
                }
                break
            }
            case SideEffectType.Damage:
                this.piercingDamage({
                    amount:sf.amount,
                    critical:false,
                    position:this.position,
                    reason:DamageReason.SideEffect,
                })
                break
            case SideEffectType.Heal:
                if(this.boost_def.type===BoostType.Death){
                    if(sf.boost){
                        if(sf.boost.def.type===BoostType.Death){
                            this.boost-=sf.boost.amount/4
                            break
                        }else if(sf.boost.def.type!==BoostType.GreenBless){
                            break
                        }
                    }else{
                        break
                    }
                }
                if(sf.health){
                    this.health=Math.min(this.health+sf.health.amount,this.maxHealth*(sf.health.max??1))
                }
                if(sf.boost){
                    if(this.boost_def.type===sf.boost.def.type){
                        this.boost=Math.min(this.boost+sf.boost.amount,this.maxBoost*(sf.boost.max??1))
                    }else{
                        this.boost_def=sf.boost.def
                        this.boost=sf.boost.amount
                    }
                }
                if(sf.global){
                    if(this.health<this.maxHealth){
                        this.health=Math.min(this.health+sf.global.amount,this.maxHealth)
                    }else if(this.boost>0&&!sf.boost){
                        this.boost=Math.min(this.boost+sf.global.amount,this.maxBoost)
                    }else if(this.boost_def.type===sf.global.boost?.type){
                        this.boost=Math.min(this.boost+sf.global.amount,this.maxBoost)
                    }else if(sf.global.boost){
                        this.boost=Math.min(sf.global.amount,this.maxBoost)
                        this.boost_def=sf.global.boost
                    }
                }
                break
            case SideEffectType.Parachute:
                this.parachute={
                    value:1
                }
                this.seat?.clear_player()
                break
        }
    }

    throw_using_projectile(){
        if(!this.projectile_holding||(this.projectile_holding.slot&&this.projectile_holding.slot.quantity<=0)){
            this.projectile_holding=undefined
            return
        }
        const proj=this.game.add_projectile(this.position,this.projectile_holding!.def,this,this.layer)
        proj.throw_projectile(this.rotation,(this.projectile_holding!.def.throw_max_speed??5)*this.input.aim_speed)
        proj.fuse_delay=this.projectile_holding.time
        if(this.projectile_holding.slot){
            this.projectile_holding.slot.remove(1)
            this.inventory.dirty("items")
            if(this.projectile_holding.slot.quantity<=0){
                let idx=this.inventory.weapon_idx
                if(!this.inventory.weapons[this.inventory.weapon_idx]){
                    idx=0
                }
                this.inventory.weapon_idx=-1
                this.inventory.set_weapon_index(idx)
            }
        }
        this.projectile_holding=undefined
    }
    update(dt:number): void {
        if(this.dead)return
        //Movement
        const gamemode=this.game.gamemode
        const current_floor=Floors[this.current_floor]
        const acceleration=1/(1+dt*(
            200
            * (current_floor.acceleration??1)
        ))
        let speed=4.7*(this.recoil?this.recoil.speed:1)
                  * (this.actions.current_action&&this.actions.current_action.type===ActionsType.Consuming?this.using_healing_speed:1)
                  * ((this.inventory.hand_def as WeaponDef)?.speed_mod??1)
                  * this.modifiers.speed
                  * (this.downed?0.4:1)
                  * (this.parachute?1:((current_floor.speed_mult??1)))
                  * (this.projectile_holding?0.7:1)
                  * (this.input.speed)
        if(this.recoil){
            this.recoil.delay-=dt
            this.current_animation=undefined
            if(this.recoil.delay<=0)this.recoil=undefined
        }
        switch(this.boost_def.type){
            case BoostType.Adrenaline:
                speed*=1+(gamemode.player.boosts.adrenaline.speed*(this.boost/this.maxBoost))
                this.boost=Math.max(this.boost-gamemode.player.boosts.adrenaline.decay*dt,0)
                this.health=Math.min(this.health+(this.boost*dt)*gamemode.player.boosts.adrenaline.regen,this.maxHealth)
                break
            case BoostType.Shield:
                break
            case BoostType.Mana:
                this.boost=Numeric.lerp(this.boost,this.maxBoost,gamemode.player.boosts.mana.regen*dt)
                break
            case BoostType.Addiction:{
                speed*=1+(gamemode.player.boosts.addiction.speed*(this.boost/this.maxBoost))
                this.boost=Math.max(this.boost-gamemode.player.boosts.addiction.decay*dt,0)
                if(this.boost_t<=0){
                    this.boost_t=3
                    this.piercingDamage({
                        amount:((this.maxBoost/this.boost)*gamemode.player.boosts.addiction.abstinence)*100,
                        reason:DamageReason.Abstinence,
                        position:this.position,
                        critical:false,
                    })
                }else{
                    this.boost_t-=dt
                }
                break
            }
            case BoostType.GreenBless:{
                this.health=Math.min(this.health+(this.boost*dt)*gamemode.player.boosts.green_bless.regen,this.maxHealth)
                break
            }
            case BoostType.Death:{
                if(this.boost===0){
                    this.kill({
                        amount:this.health,
                        critical:true,
                        position:this.position,
                        reason:DamageReason.Abstinence
                    })
                }
                if(this.boost_t<=0){
                    this.boost_t=1
                    this.boost=Math.max(this.boost-((this.maxBoost/gamemode.player.boosts.death.life_time)),0)
                }else{
                    this.boost_t-=dt
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
            }
        }
        if(this.seat){
            if(this.seat.rotation!==undefined)this.rotation=this.seat.rotation
            if(this.seat.pillot)this.seat.vehicle.move(this.input.movement,this.input.reload,dt,this.alternative_vehicle_control)
        }else{
            const move=v2.scale(this.input.movement,speed)
            v2m.lerp(this.velocity,move,acceleration)
            const pos=v2.add(this.position,v2.scale(this.velocity,dt))
            this.position=this.game.map.clamp_hitbox(pos,this.hitbox)
            this.rotation=this.input.rotation
            if(this.parachute){
                speed*=1.7+(0.5+this.parachute.value)
                this.parachute.value-=dt*0.05
                if(this.parachute.value<=0){
                    this.parachute=undefined
                    this.dirty=true
                }
            }
        }
        if(!v2.is(this.position,this.oldPosition)){
            this.oldPosition=v2.duplicate(this.position)
            this.current_floor=this.game.map.terrain.get_floor_type(this.position,this.layer,this.game.map.def.default_floor??FloorType.Water)
            this.manager.cells.updateObject(this)
        }

        //Hand Use
        if(this.downed){
            this.piercingDamage({
                amount:1*dt,
                critical:false,
                position:this.position,
                reason:DamageReason.Bleend,
                owner:this.downedBy,
                source:this.downedBySource
            })
        }else if(!this.parachute&&!this.seat){
            this.input.attacking=false
            if(this.input.using_item&&this.inventory.hand_item&&!this.projectile_holding&&(this.pvpEnabled||this.game.debug.deenable_lobby)){
                this.inventory.hand_item.on_fire(this)
                this.input.attacking=this.inventory.hand_item.attacking()
            }

            //Update Inventory
            for(const s of this.inventory.slots){
                if(!s.item)continue
                s.item.update(this)
            }

            if(this.projectile_holding){
                this.projectile_holding.time-=dt
                if(this.projectile_holding.time<=0){
                    if(this.projectile_holding.def.explosion)this.game.add_explosion(this.position,Explosions.getFromString(this.projectile_holding.def.explosion!),this,this.projectile_holding.def,this.layer)
                    this.projectile_holding=undefined
                }
                if(!this.input.using_item){
                    this.throw_using_projectile()
                }
            }
            //Collision
            const objs=this.manager.cells.get_objects(this.hitbox,this.layer)
            let can_interact=this.game.debug.deenable_lobby||this.game.pvpEnabled
            for(const obj of objs){
                if(obj.id===this.id)continue
                switch(obj.stringType){
                    case "obstacle":
                        if((obj as Obstacle).def.no_collision)break
                        if((obj as Obstacle).hitbox&&!(obj as Obstacle).dead){
                            if(can_interact&&this.input.interaction&&obj.can_interact(this)){
                                (obj as Loot).interact(this)
                                can_interact=false
                            }
                            const ov=this.hitbox.overlapCollision((obj as Obstacle).hitbox)
                            for(const c of ov){
                                this.position=v2.sub(this.position,v2.scale(c.dir,c.pen))
                            }
                        }
                        break
                    case "building":{
                        if((obj as Building).def.no_collisions)break
                        const ov=this.hitbox.overlapCollision(obj.hitbox)
                        for(const c of ov){
                            this.position=v2.sub(this.position,v2.scale(c.dir,c.pen))
                        }
                        break
                    }
                    case "loot":
                        if(can_interact&&this.input.interaction&&obj.can_interact(this)){
                            (obj as Loot).interact(this)
                            can_interact=false
                        }
                }
            }
        }
        this.update_input()
        this.input.using_item_down=false
        this.input.interaction=false
        this.invensibility_time-=dt

        this.actions.update(dt)
        this.inventory.update()
        this.dirtyPart=true

        if(this.game.deadzone.do_damage&&!this.game.deadzone.hitbox.pointInside(this.position)){
            this.piercingDamage({
                amount:this.game.deadzone.damageAt(this.position),
                critical:false,
                position:this.position,
                owner:undefined,
                reason:DamageReason.DeadZone,
            })
        }
        
        if(this.ai)this.ai.AI(dt)
    }
    override net_update(): void {
        this.input.emote=undefined
    }
    update_input(){
        this.input.swicthed=false
        if(this.input.reload&&this.inventory.hand_item&&this.inventory.hand_item.item_type===InventoryItemType.gun){
            (this.inventory.hand_item as GunItem).reloading=true
            this.input.reload=false
        }
        if(this.input.interaction&&this.seat){
            this.position=v2.add(this.seat.position,v2.rotate_RadAngle(v2.new(0,-1),this.seat.vehicle.angle))
            this.seat.clear_player()
            this.input.interaction=false
        }
        if(this.input.swamp_guns){
            this.inventory.swamp_guns()
            this.input.swamp_guns=false
        }
        if(!this.downed&&!this.parachute){
            for(const a of this.input.actions){
                switch(a.type){
                    case InputActionType.drop:
                        if(a.drop>=0){
                            const drop=a.drop
                            switch(a.drop_kind){
                                case 1:
                                    this.inventory.drop_weapon(Numeric.clamp(drop,0,2))
                                    break
                                case 2:
                                    this.inventory.drop_oitem(drop)
                                    break
                                case 3:
                                    this.inventory.drop_slot(drop)
                                    break
                                case 4:
                                    this.inventory.drop_item(drop)
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
                        if(this.inventory.scopes.includes(a.scope_id)){
                            this.scope=Scopes.getFromNumber(a.scope_id)
                        }
                        break
                    case InputActionType.emote:
                        this.input.emote=a.emote
                        break
                    case InputActionType.debug_give:
                        if(this.game.debug.debug_menu){
                            const l=GameItems.valueString[a.item]
                            if(!l)break
                            this.inventory.give_item(l,a.count,true)
                        }
                        break
                    case InputActionType.debug_spawn:
                        if(this.game.debug.debug_menu){
                            const l=GameItems.valueString[a.item]
                            if(!l)break
                            this.game.add_loot(this.position,l,a.count,this.layer)
                            if(l.item_type===InventoryItemType.gun){
                                this.game.add_loot(this.position,Ammos.getFromString((l as unknown as GunDef).ammoType),((l as unknown as GunDef).ammoSpawnAmount??0)*a.count)
                            }
                        }
                        break
                }
            }
            this.input.actions.length=0
        }
    }
    clear(){
        this.inventory.clear()
        this.boost=0
        this.boost_def=Boosts[BoostType.Null]
        this.dirty=true
    }
    process_action(action:ActionPacket){
        this.input.movement=v2.normalizeSafe(v2.clamp1(action.movement,-1,1),NullVec2)
        if(this.input.is_mobile){
            this.input.using_item_down=action.use_weapon
        }else if(!this.input.using_item&&action.use_weapon){
            this.input.using_item_down=true
        }
        this.input.rotation=action.angle
        this.input.interaction=action.interact
        this.input.using_item=action.use_weapon
        this.input.reload=action.reload
        this.input.actions=action.actions
        this.input.swamp_guns=action.swamp_guns
        this.input.aim_speed=action.aim_speed
    }
    create(_args: Record<string, void>): void {
        if(this.game.gamemode.player.respawn?.max_respawn){
            this.respawn_count=this.game.gamemode.player.respawn.max_respawn
        }
    }
    damagesSplash:DamageSplash[]=[]

    splashDelay:number=0

    view_objects:ServerGameObject[]=[]

    camera_hb:RectHitbox2D=new RectHitbox2D(v2.new(0,0),v2.new(0,0))
    update2(){
        this.update_modifiers()
        if(this.client&&this.client.opened&&!this.is_npc&&!this.is_bot){
            const up=new UpdatePacket()
            up.priv.health=this.health
            up.priv.max_health=this.maxHealth
            up.priv.boost=this.boost
            up.priv.max_boost=this.maxBoost
            up.priv.boost_type=this.boost_def.type
            up.priv.inventory=[]
            if(this.splashDelay<=0){
                up.priv.damages=this.damagesSplash
                this.damagesSplash=[]
            }else{
                this.splashDelay--
            }
            let ii=0
            for(let i=0;i<this.inventory.slots.length;i++){
                const s=this.inventory.slots[i]
                if(s.item){
                    up.priv.inventory.push({count:s.quantity,idNumber:GameItems.keysString[s.item!.def.idString!],type:s.item.item_type})
                }else{
                    up.priv.inventory.push({count:0,idNumber:0,type:InventoryItemType.consumible})
                }
                ii++
            }
            up.priv.dirty=this.privateDirtys
            up.priv.weapons={
                melee:this.inventory.weapons[0]?.def as MeleeDef,
                gun1:this.inventory.weapons[1]?.def as GunDef,
                gun2:this.inventory.weapons[2]?.def as GunDef,
            }
            if(this.inventory.hand_item&&this.inventory.hand_item.item_type===InventoryItemType.gun){
                up.priv.current_weapon={
                    slot:this.inventory.weapon_idx,
                    liquid:(this.inventory.hand_item as GunItem).liquid,
                    ammo:(this.inventory.hand_item as GunItem).ammo
                }
            }else{
                up.priv.current_weapon={
                    slot:this.inventory.weapon_idx,
                    liquid:false,
                    ammo:0
                }
            }
            if(this.privateDirtys.oitems){
                for(const a of Object.keys(this.inventory.oitems)){
                    up.priv.oitems[Ammos.getFromString(a).idNumber!]=this.inventory.oitems[a]
                }
            }
            up.priv.current_scope=this.scope.idNumber!
            if(this.privateDirtys.scopes){
                up.priv.scopes=this.inventory.scopes
            }
            this.privateDirtys={
                inventory:false,
                weapons:false,
                current_weapon:false,
                action:false,
                oitems:false,
                scopes:false
            }

            if(this.actions.current_action){
                up.priv.action={delay:this.actions.current_delay,type:this.actions.current_action.type}
            }
            const objs=this.get_objects()
            const o=this.game.scene.objects.encode_list(objs,this.view_objects)
            this.view_objects=o.last
            up.objects=o.strm
            this.client.emit(up)
        }
    }
    get_objects(){
        const sz_w=10/this.scope.scope_view
        const sz_h=7.6/this.scope.scope_view
        this.camera_hb.min.x=this.position.x-sz_w
        this.camera_hb.min.y=this.position.y-sz_h

        this.camera_hb.max.x=this.position.x+sz_w
        this.camera_hb.max.y=this.position.y+sz_h
        /*const objs=[
            ...Object.values(this.manager.objects[this.layer].objects),
        ]*/
        const objs=this.manager.cells.get_objects(this.camera_hb,this.layer)
        return objs
    }
    damage(params:DamageParams){
        if(this.dead||!this.pvpEnabled||this.parachute||this.imortal||this.invensibility_time>0)return
        let damage=params.amount
        let mod=1
        if(params.owner&&params.owner instanceof Player){
            const is_ally=this.game.modeManager.is_ally(this,params.owner)
            if(
                (params.owner.id!==this.id&&is_ally&&!(this.friendly_fire&&params.owner.friendly_fire))
            )return
            if(params.owner.id!==this.id)mod*=params.owner.modifiers.damage
        }
        if(this.vest){
            mod-=this.vest.reduction
            damage-=this.vest.defence
        }
        if(this.helmet){
            mod-=this.helmet.reduction
            damage-=this.helmet.defence
        }
        if(params.critical){
            mod+=this.modifiers.critical_mult-1
        }
        damage*=this.modifiers.damage_reduction
        damage*=mod
        params.amount=damage
        this.piercingDamage(params)
    }
    piercingDamage(params: DamageParams) {
        const totalDamage = params.amount
        let shieldDamage = 0
        let healthDamage = 0

        const baseSplash: Omit<DamageSplash, "shield" | "shield_break" | "count"> = {
            critical: params.critical,
            position: params.position,
            taker: this.id,
            taker_layer: this.layer
        }

        const splashes: DamageSplash[] = []

        if (this.boost_def.type === BoostType.Shield && this.boost > 0) {
            shieldDamage = Math.min(this.boost, totalDamage)

            if (totalDamage >= this.boost * 2) {
                shieldDamage = this.boost
                healthDamage = totalDamage - shieldDamage
                this.boost = 0
            } else {
                this.boost -= shieldDamage
            }
            splashes.push({
                ...baseSplash,
                count: Math.ceil(totalDamage),
                shield: true,
                shield_break: this.boost === 0
            })

            if (this.boost === 0) {
                this.invensibility_time = 0.35
                this.boost_def=Boosts[BoostType.Null]
            }
        } else {
            healthDamage = Math.min(this.health, totalDamage)

            splashes.push({
                ...baseSplash,
                count: Math.ceil(totalDamage),
                shield: false,
                shield_break: false
            })
        }

        if (healthDamage > 0) {
            this.health = Math.max(this.health - healthDamage, 0)
        }

        if (params.owner && params.owner instanceof Player && params.owner.id !== this.id && params.reason !== DamageReason.Bleend) {
            params.owner.status.damage += (shieldDamage + healthDamage)

            for (const splash of splashes) {
                let ok = true
                for (const ds of params.owner.damagesSplash) {
                    if (ds.shield === splash.shield && ds.taker === splash.taker) {
                        ds.critical = ds.critical || splash.critical
                        if (ds.shield) {
                            ds.shield_break = ds.shield_break || splash.shield_break
                        }
                        ds.count += splash.count
                        ok = false
                        break
                    }
                }
                if (ok) {
                    params.owner.damagesSplash.push(splash)
                } else {
                    params.owner.splashDelay = 2
                }
            }
        }

        for (const s of splashes) {
            this.damagesSplash.push(s)
        }

        if (this.health === 0) {
            if (!this.downed && this.game.modeManager.can_down(this)) {
                this.down(params)
            } else {
                this.kill(params)
            }
        }

        if(this.ai)this.ai.on_hitted(params)
    }
    down(params:DamageParams){
        if(this.downed)return
        this.downed=true
        this.downedBy=params.owner
        this.downedBySource=params.source
        this.health=this.maxHealth
        this.boost=0
        this.boost_def=Boosts[BoostType.Null]

        if(params.owner&&params.owner instanceof Player){
            this.game.send_killfeed_message({
                killer:(params.reason===DamageReason.Explosion||params.reason===DamageReason.Player)?{
                    id:params.owner.id,
                    kills:params.owner.status.kills,
                    used:DamageSources.keysString[params.source!.idString]
                }:undefined,
                victimId:this.id,
                damage_reason:params.reason,
                type:KillFeedMessageType.down,
            })
        }else{
            this.game.send_killfeed_message({
                killer:undefined,
                victimId:this.id,
                damage_reason:params.reason,
                type:KillFeedMessageType.down,
            })
        }
    }
    revive(){
        if(!this.downed)return
        this.downed=false
        this.downedBy=undefined
        this.downedBySource=undefined
        this.health=this.maxHealth*0.3
        this.boost=0
    }
    respawn_count:number=0
    respawn():boolean{
        if(this.respawn_count<=0)return false
        if(this.game.gamemode.player.respawn?.max_respawn){
            this.respawn_count--
        }
        this.game.addTimeout(()=>{
            this.dead=false
            this.health=this.maxHealth
            this.boost=0
            this.manager.cells.registry(this)
            this.dirty=true
            if(this.game.gamemode.player.respawn?.insert_inventory){
                this.inventory.gift(this.game.gamemode.player.respawn.insert_inventory)
            }
        },2)
        return true
    }
    kill(params:DamageParams){
        if(this.dead)return
        this.dead=true
        if(this.loadout.emotes.die!==""){
            this.game.addTimeout(()=>this.input.emote=Emotes.getFromString(this.loadout.emotes.die),0.5)
        }
        this.update2()
        if(!this.is_npc){
            let killed_by:number=this.id
            if(params.owner&&params.owner instanceof Player){
                if(params.owner.id!==this.id&&(params.owner.username===""||params.owner.username!==this.username||this.is_bot)&&!this.game.modeManager.is_ally(this,params.owner)){
                    params.owner.status.kills++
                    params.owner.earned.coins+=3
                    params.owner.earned.xp+=1
                    params.owner.earned.score+=5
                }
                killed_by=params.owner.id
                this.game.send_killfeed_message({
                    killer:(params.reason===DamageReason.Explosion||params.reason===DamageReason.Player)?{
                        id:params.owner.id,
                        kills:params.owner.status.kills,
                        used:DamageSources.keysString[params.source!.idString]
                    }:undefined,
                    victimId:this.id,
                    type:KillFeedMessageType.kill,
                    damage_reason:params.reason,
                })
                if((!this.game.modeManager.kill_leader&&params.owner.status.kills>=3)||(this.game.modeManager.kill_leader&&this.game.modeManager.kill_leader.status.kills<params.owner.status.kills)){
                    this.game.modeManager.kill_leader=params.owner
                    this.game.send_killfeed_message({
                        type:KillFeedMessageType.killleader_assigned,
                        player:{
                            id:params.owner.id,
                            kills:params.owner.status.kills
                        }
                    })
                }
                
                if(this.game.statistics){
                    this.game.statistics.items.kills[params.source!.idString]=(this.game.statistics.items.kills[params.source!.idString]??0)+1
                }
            }else{
                this.game.send_killfeed_message({
                    killer:undefined,
                    victimId:this.id,
                    type:KillFeedMessageType.kill,
                    damage_reason:params.reason,
                })
            }

            if(this.game.modeManager.kill_leader&&this.game.modeManager.kill_leader===this){
                this.game.send_killfeed_message({
                    type:KillFeedMessageType.killleader_dead,
                    player:{
                        id:this.id,
                        kills:this.status.kills
                    }
                })
            }

            //Respawn
            if(!this.game.gamemode.player.respawn?.keep_inventory){
                this.inventory.drop_all()
            }
            let sg=true
            if(this.game.gamemode.player.respawn){
                sg=!this.respawn()
            }
            if(sg){
                this.game.livingPlayers.splice(this.game.livingPlayers.indexOf(this),1);
                this.send_game_over(false,killed_by)
            }

            this.game.modeManager.on_player_die(this)

            this.game.living_count_dirty=true
            this.game.update_data()
        }else{
            this.inventory.drop_all()
            this.game.modeManager.on_player_die(this)
        }

        this.game.add_player_body(this,v2.lookTo(params.position,this.position),this.layer)
        this.dirty=true
        this.status.rank=this.game.livingPlayers.length+1
    }
    send_game_over(win:boolean=false,eliminated_by:number=0){
        if(this.is_npc||!this.client||!this.client.opened||this.is_bot)return
        const p=new GameOverPacket()
        p.Kills=this.status.kills
        p.DamageDealth=this.status.damage
        p.Win=win
        p.Score=0
        p.Eliminator=eliminated_by
        this.client!.emit(p)
    }
    override on_destroy(): void {
        const idx=this.game.livingPlayers.indexOf(this)
        if(idx!==-1){
            this.game.livingPlayers.splice(idx,1);
        }
    }
    override encode(stream: NetStream, full: boolean): void {
        stream.writePosition(this.position)
        .writeRad(this.rotation)
        .writeBooleanGroup(
            this.dead,
            this.boost_def===Boosts[BoostType.Shield]&&this.boost>0,
            this.seat!==undefined,
            this.parachute!==undefined,
            this.input.emote!==undefined,
            this.input.attacking,
            this.input.swicthed
        )
        if(this.parachute){
            stream.writeFloat(this.parachute.value,0,1,1)
        }
        if(this.input.emote){
            stream.writeUint16(GameObjectsDefs.keysString[this.input.emote.idString])
        }
        if(full){
            stream.writeBooleanGroup(this.current_animation!==undefined)
            .writeUint8(this.vest?this.vest.idNumber!+1:0)
            .writeUint8(this.helmet?this.helmet.idNumber!+1:0)
            .writeUint8(this.inventory.backpack.idNumber!)
            .writeUint16(this.skin.idNumber!)
            .writeInt16(Weapons.keysString[this.inventory.hand_item?.def.idString??""]??-1)
            
            if(this.current_animation!==undefined){
                stream.writeUint8(this.current_animation.type)
                switch(this.current_animation.type){
                    case PlayerAnimationType.Reloading:
                        stream.writeUint8(this.current_animation.alt_reload?1:0)
                        break
                    case PlayerAnimationType.Consuming:
                        stream.writeUint16(this.current_animation.item)
                        break
                    default:
                        break
                }
            }
        }
    }
}