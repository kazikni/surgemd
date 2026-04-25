import { FireMode, GunDef } from "common/scripts/definitions/items/guns.ts";
import { AmmoItemBase, ConsumibleItemBase, GInventoryBase, GrenadeItemBase, GunItemBase, MDItem, MeleeItemBase } from "common/scripts/others/inventory.ts";
import { DamageReason, InventoryDroppable, InventoryItemType, InventoryPreset } from "common/scripts/definitions/utils.ts";
import { ConsumingAction, ReloadAction } from "./actions.ts";
import { AmmoDef } from "common/scripts/definitions/items/ammo.ts";
import { ConsumibleCondition, ConsumibleDef } from "common/scripts/definitions/items/consumibles.ts";
import { MeleeDef } from "common/scripts/definitions/items/melees.ts";
import { BackpackDef, } from "common/scripts/definitions/items/backpacks.ts";
import { type ServerGameObject } from "../others/gameObject.ts";
import { Boosts, BoostType } from "common/scripts/definitions/player/boosts.ts";
import { SideEffectType } from "common/scripts/definitions/player/effects.ts";
import { HelmetDef, VestDef } from "common/scripts/definitions/items/equipaments.ts";
import { GameObjectType, PlayerAnimationType } from "common/scripts/others/constants.ts";
import { ScopeDef } from "common/scripts/definitions/items/scopes.ts";
import { Angle, CircleHitbox2D, getPatterningShape, Numeric, random, Slot, v2, v2m, Vec2 } from "common/engine/core.ts";
import { Human } from "../objects/human.ts";
import { type Loot } from "../objects/loot.ts";
import { StaticBody } from "../objects/static_body.ts";
import { GrenadeDef } from "common/scripts/definitions/items/grenades.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";
import { AccessorysManager } from "./accessorys.ts";
import { type Obstacle } from "../objects/obstacle.ts";
export abstract class LItem extends MDItem{
    declare inventory:GInventory
    abstract on_use(user:Human,slot?:Slot<LItem>):void
    abstract on_fire(user:Human):void
    abstract attacking():boolean
    abstract update(user:Human,dt:number):void
    abstract drop():Loot[]
}
export class GunItem extends GunItemBase implements LItem{
    declare inventory:GInventory
    constructor(def?:GunDef){
        super(def)
    }
    use_delay:number=0
    burst?:{
        t:number
        c:number
    }
    firing:boolean=false
    ammo:number=0
    reloading=false
    dd:boolean=false
    get_capacity():number{
        return (this.inventory.extended_capacity?(this.def.reload?.extended_capacity??this.def.reload?.capacity):this.def.reload?.capacity)??0
    }
    on_use(_user: Human, _slot?: Slot<LItem>): void {
        
    }
    on_fire(user:Human){
        if(this.def.fireMode===FireMode.Single&&!user.input.using_item_down)return
        if(this.has_ammo(user)){
            if(this.use_delay<=0){
                this.switching=false
                this.firing=true
                if(this.def.fireMode===FireMode.Burst&&this.def.burst&&!this.burst){
                    this.burst={
                        c:this.def.burst.sequence,
                        t:this.def.burst.delay
                    }
                    this.use_delay=0
                }else{
                    this.shot(user)
                    this.use_delay=this.def.fireDelay
                }
            }
        }else{
            this.burst=undefined
        }
    }
    has_ammo(user:Human):boolean{
        return (this.ammo>0||!this.def.reload)&&(!this.def.mana_consume||this.has_mana(user))
    }
    has_mana(user:Human){
        return user.health_data.boost_def.type===BoostType.Mana&&this.def.mana_consume!*user.modifiers.mana_consume<=user.health_data.boost
    }
    switching:boolean=false
    attacking():boolean{
        return this.use_delay>0&&this.firing&&!this.reloading&&!this.switching
    }
    reload(user:Human){
        if(!this.def.reload||user.health_data.downed)return
        if(this.ammo>=this.get_capacity()||(!this.inventory.infinity_ammo&&!user.inventory.aitems[this.def.ammoType])||this.use_delay>0){
            this.reloading=false
            return
        }
        user.net_sync.part=true
        user.animation_data.dirty=true
        user.animation_data.current_animation={
            type:PlayerAnimationType.Reloading,
            alt_reload:this.ammo===0,
        }

        user.actions.play(new ReloadAction(this))
    }
    private clip_muzzle(user: Human, muzzle: Vec2): Vec2 {
        const start = user.position
        let bestDist = v2.distance(start, muzzle)
        const objs = user.manager.cells.ray(
            start,
            muzzle,
            user.layer
        )

        for(const obj of objs){
            if(obj.number_type!==GameObjectType.Obstacle||obj.number_type!==GameObjectType.Building)continue

            const body = obj as StaticBody
            const hit = body.hitbox.overlapLine(
                start,
                muzzle
            )

            if(!hit)continue

            const dist = v2.distance(
                start,
                hit.point
            )

            if(dist < bestDist){
                bestDist = dist - 0.03
            }
        }
        if(bestDist < 0)bestDist = 0

        const ret=v2.sub(muzzle,start)
        v2m.normalizeSafe(ret,v2(1,0))
        v2m.scale(ret,ret,bestDist)
        v2m.add(ret,start,ret)
        return ret
    }
    shot(user:Human,consume:boolean=true){
        user.actions.cancel()

        user.net_sync.part=true
        user.animation_data.dirty=true
        user.inventory.net_sync.hand=true

        this.reloading=false
        if(consume){
            if(this.def.reload)this.ammo=Math.max(this.ammo-(this.def.reload!.ammo_consume??1))
            if(this.def.mana_consume)user.health_data.boost=Math.max(user.health_data.boost-this.def.mana_consume*user.modifiers.mana_consume,0)
        }

        const barrel_position=v2(
            this.def.lenght,
            this.def.dual_from
                ? (this.dd ? -this.def.dual_offset : this.def.dual_offset)
                : 0
        )
        const barrel_point=v2.rotate_RadAngle(barrel_position,user.physical_data.rotation)
        const position=this.clip_muzzle(user,v2.add(user.position,barrel_point))

        if(this.def.dual_from){
            this.dd=!this.dd
        }
        if(this.def.bullet){
            const bc=this.def.bullet.count??1
            const patternPoint = getPatterningShape(bc, this.def.jitterRadius??1)
            for(let i=0;i<bc;i++){
                let ang=user.physical_data.rotation
                if(this.def.spread){
                    ang+=Angle.deg2rad(random.float(-this.def.spread,this.def.spread))
                }
                const pos=this.def.jitterRadius?v2.add(position,patternPoint[i]):position
                const b=user.game.add_bullet(pos,this.def.bullet.def,user,this.def.ammoType,this.def,user.layer)
                b.modifiers={
                    speed:user.modifiers.bullet_speed,
                    size:user.modifiers.bullet_size,
                }
                b.set_direction(ang)
                user.inventory.accessorys.call_event("gun_shoot",{user:user,item:this,bullet:b,angle:ang,position:pos})
            }
        }
        if(this.def.synsed_particle){
            const scc=this.def.synsed_particle.count??1
            const patternPoint = getPatterningShape(scc, this.def.jitterRadius??1)
            const pdef=user.game.definitions.synced_particle.getFromString(this.def.synsed_particle.def)

            for(let i=0;i<scc;i++){
                const pos=this.def.jitterRadius?v2.add(position,patternPoint[i]):position
                const part=user.game.add_synced_particle(pos,pdef,user,user.layer)
                if(this.def.synsed_particle.speed){
                    let ang=user.physical_data.rotation
                    if(this.def.spread){
                        ang+=Angle.deg2rad(random.float(-this.def.spread,this.def.spread))
                    }
                    part.push(random.random1(this.def.synsed_particle.speed),ang)
                }
            }
        }
        if(this.def.recoil){
            user.recoil={delay:this.def.recoil.duration,speed:this.def.recoil.speed}
        }

        //if(!this.def.supresed)user.game.play_sound(position,user.layer,"shot",user)
    }
    update(user:Human){
        if(this.use_delay>0)this.use_delay-=user.game.delta_time
        if(user.inventory.hand_item===this&&!user.actions.current_action){
            if((this.ammo<=0||this.reloading)&&this.def.reload&&!this.attacking()){
                this.reloading=true
                this.reload(user)
            }
            if(this.use_delay<=0){
                this.firing=false
                if(this.burst){
                    if(this.burst.c<=0||this.ammo<=0){
                        this.burst=undefined
                        this.use_delay=this.def.fireDelay
                    }else{
                        this.burst.c--
                        this.use_delay=this.burst.t
                        this.shot(user)
                    }
                }
            }
        }
    }
    override load(): void {
        if(this.def.switchDelay&&this.use_delay<=this.def.switchDelay){
            this.use_delay=this.def.switchDelay
        }
    }
    override unload(): void {
        this.reloading=false
    }
    drop(): Loot[] {
        if(this.ammo>0){
            this.inventory.give_item(this.inventory.owner.game.definitions.ammos.getFromString((this.def as GunDef).ammoType),this.ammo)
        }
        if(this.def.dual_from){
            const ret:Loot[]=[]
            for(let i=0;i<2;i++)ret.push(this.inventory.owner.game.add_loot(this.inventory.owner.position,this.inventory.owner.game.definitions.guns.getFromString(this.def.dual_from),1,this.inventory.owner.layer))
            return ret
        }else{
            return [this.inventory.owner.game.add_loot(this.inventory.owner.position,this.def,1)]
        }
    }
}
export class AmmoItem extends AmmoItemBase implements LItem{
    declare inventory:GInventory
    constructor(def:AmmoDef){
        super(def)
        this.def=def
    }
    on_use(_user: Human,_slot?: Slot<LItem>): void {
    }
    on_fire(_user: Human):void{
    }
    update(_user: Human): void {
    }
    drop(): Loot[] {
        return []
    }
    attacking():boolean{
        return false
    }
}
export class ConsumibleItem extends ConsumibleItemBase implements LItem{
    declare inventory:GInventory
    constructor(def:ConsumibleDef){
        super(def)
    }
    on_use(user: Human,slot?:Slot<LItem>): void {
        if(this.def.side_effects[0].type!==SideEffectType.Heal)return
        if(this.def.condition){
            for(const c of this.def.condition){
            switch(c){
                case ConsumibleCondition.UnfullHealth:
                    
                    if(user.health_data.health>=user.health_data.max_health*(this.def.side_effects[0].health?.max??1))return
                    break
                case ConsumibleCondition.UnfullExtra:
                    if(!(user.health_data.boost<user.health_data.max_boost*(this.def.side_effects[0].boost?.max??1)||user.health_data.boost_def.type!==this.def.boost_type))return
                    break
            }
            }
        }

        user.net_sync.part=true
        user.animation_data.dirty=true
        user.inventory.net_sync.hand=true

        user.animation_data.current_animation={
            type:PlayerAnimationType.Consuming,
            item:this.def.idNumber!
        }
        user.actions.play(new ConsumingAction(this,slot!))
    }
    on_fire(_user:Human):void{
    }
    attacking():boolean{
        return false
    }
    update(_user: Human): void {
    }
    drop(): Loot[] {
        return []
    }
}
export class GrenadeItem extends GrenadeItemBase implements LItem{
    declare inventory:GInventory
    slot?:Slot<LItem>
    constructor(def:GrenadeDef){
        super(def)
    }
    on_use(user: Human,slot?: Slot<LItem>): void {
        user.inventory.set_hand_item(this)
        this.slot=slot
    }
    on_fire(user: Human): void {
        if(!this.slot||this.slot?.quantity<=0)return
        user.grenade_holding={
            def:this.def,
            time:this.def.cook?.fuse_time??10,
            slot:this.slot
        }
    }
    attacking():boolean{
        return this.inventory.owner.grenade_holding!==undefined
    }
    update(_user: Human): void {

    }
    drop(): Loot[] {
        return []
    }
}
export class MeleeItem extends MeleeItemBase implements LItem{
    declare inventory:GInventory
    use_delay:number=0
    firing:boolean=false
    switching:boolean=false
    constructor(def:MeleeDef){
        super(def)
    }
    attacking():boolean{
        return this.use_delay>0&&this.firing
    }
    on_use(_user: Human, _slot?: Slot<LItem>): void {
      
    }
    on_fire(user: Human,_slot?: Slot<LItem>): void {
        if(this.use_delay<=0){
            user.actions.cancel()

            user.net_sync.part=true
            user.animation_data.dirty=true

            user.animation_data.current_animation={
                type:PlayerAnimationType.Melee
            }

            for(const t of this.def.damage_delays){
                user.game.add_timeout(()=>{
                    if(this.inventory.hand_item===this)this.attack(user)
                },t)
                this.use_delay=this.def.attack_delay
            }
            this.firing=true
        }
    }
    attack(user:Human):void{
        const position=v2.add(
            user.position,
            v2.from_RadAngle(user.physical_data.rotation,this.def.offset)
        )
        const hb=new CircleHitbox2D(position,this.def.radius)
        const collidibles:ServerGameObject[]=user.manager.cells.get_objects(hb,user.layer)

        user.animation_data.current_animation=undefined

        for(const c of collidibles){
            if(!hb.collidingWith(c.hitbox))continue
            if(c instanceof StaticBody){
                if(c.number_type===GameObjectType.Obstacle){
                    if(!(c as Obstacle).def.interactDestroy&&(c as Obstacle).def.expanded_behavior&&c.can_interact(user)){
                        user._can_interact=false
                        c.interact(user)
                    }
                }
                c.damage({
                    amount:this.def.damage,
                    resistence:this.def.resistence_damage??0,
                    critical:false,
                    position:hb.position,
                    reason:DamageReason.Human,
                    owner:user,
                    source:this.def,
                    direction:v2.lookTo(user.position,c.position)
                })
            }else if(c instanceof Human&&c.id!==user.id){
                c.damage({
                    amount:this.def.damage,
                    resistence:this.def.resistence_damage??0,
                    critical:false,
                    position:hb.position,
                    reason:DamageReason.Human,
                    owner:user,
                    source:this.def,
                    direction:v2.lookTo(user.position,c.position)
                })
            }
        }
    }
    update(user: Human): void {
        if(this.use_delay>0){
            this.use_delay-=user.game.delta_time
        }else{
            this.firing=false
        }
    }
    override unload(): void {
        this.use_delay=this.def.attack_delay
    }
    drop(): Loot[] {
        return [this.inventory.owner.game.add_loot(this.inventory.owner.position,this.def,1,this.inventory.owner.layer)]
    }
}
export class GInventory extends GInventoryBase<LItem>{
    owner:Human

    infinity_ammo:boolean=false
    extended_capacity:boolean=false

    droppable:InventoryDroppable={
        backpack:true,
        helmet:true,
        vest:true
    }
    accessorys:AccessorysManager

    constructor(owner:Human){
        super()
        this.owner=owner
        this.accessorys=new AccessorysManager(owner,3)
    }
    override set_backpack(backpack?: BackpackDef,drop=false): void {
        if(drop&&this.backpack.level>=1){
            this.owner.game.add_loot(this.owner.position,this.backpack,1,this.owner.layer)
        }
        super.set_backpack(backpack)
        this.net_sync.items=true
    }
    override set_weapon_index(idx:number,force:boolean=false){
        if(this.hand_item!==this.weapons[idx]||force){
            this.owner.recoil=undefined
            this.owner.actions.cancel()

            this.owner.throw_using_projectile()
            this.owner.animation_data.switching=true
            this.owner.animation_data.dirty=true
        }
        super.set_weapon_index(idx,force)
    }
    override set_weapon(slot: number, wep?: GameItem,drop:boolean=true): boolean {
        if(wep?.idString===this.weapons[slot]?.def.idString)return false
        if(drop){
            if(this.weapons[slot]&&this.weapons[slot].def!=this.weapons_defaults[slot]){
                this.weapons[slot].drop()
                this.weapons[slot]=undefined
            }
        }
        super.set_weapon(slot,wep)
        return true
    }
    add_gun(dd:GunDef,full_ammo:boolean):boolean{
        const id=dd.idString
        if(dd.dual&&!dd.dual_from){
            for(const w of Object.keys(this.weapons)){
                if(this.weapons[w as unknown as number]?.def.idString==dd.idString){
                    const dd=this.owner.game.definitions.guns.getFromString(id+"_dual")
                    this.set_weapon(w as unknown as number,dd,false)
                    if(full_ammo){
                        (this.weapons[w as unknown as number] as GunItem).ammo=dd.reload?.capacity??0
                    }
                    return true
                }
            }
        }
        for(const w of Object.keys(this.weapons)){
            if(this.weapon_is_free(w as unknown as number)&&this.weapons_kind[w as unknown as number]==GunItem){
                this.set_weapon(w as unknown as number,dd)
                if(full_ammo){
                    (this.weapons[w as unknown as number] as GunItem).ammo=dd.reload?.capacity??0
                }
                return true
            }
        }
        if(this.weapons_kind[this.weapon_idx]==GunItem){
            const set=this.set_weapon(this.weapon_idx,dd)
            if(full_ammo){
                (this.weapons[this.weapon_idx] as GunItem).ammo=dd.reload?.capacity??0
            }
            return set
        }
        return false
    }
    drop_weapon(slot=0):Loot[]{
        if(this.weapon_is_free(slot))return []
        const loots:Loot[]=this.weapons[slot]!.drop()
        for(const l of loots){
            l.velocity.x-=1.5
        }
        this.owner.actions.cancel()
        super.set_weapon(slot,undefined)
        return loots
    }
    swamp_guns(){
        const gun1=this.weapons[1]
        const gun2=this.weapons[2]
        this.weapons[1]=gun2
        this.weapons[2]=gun1
        if(this.weapon_idx===1){
            this.weapon_idx=2
        }else if(this.weapon_idx===2){
            this.weapon_idx=1
        }

        this.net_sync.hand=true
        this.net_sync.weapons=true
    }
    drop_oitem(idx:number=0,drop_count:number=60){
        const a=this.owner.game.definitions.ammos.getFromNumber(idx)
        const res=this.consume_aitems(a.idString,drop_count)
        if(res){
            this.net_sync.iitems=true
            this.owner.game.add_loot(this.owner.position,a,res,this.owner.layer)
        }
    }
    give_item(def:GameItem,count:number,drop_overflow:boolean=true,full_ammo:boolean=false):number{
        switch(def.item_type){
            case InventoryItemType.ammo:{
                this.net_sync.aitems=true

                const max=this.item_limit(def)
                const ac=this.aitems[def.idString]??0

                if(ac>=max){
                    if(drop_overflow)this.owner.game.add_loot(this.owner.position,def,count,this.owner.layer)
                    return count
                }

                const drop=Math.max((ac+count)-max,0)
                this.aitems[def.idString]=Numeric.max(ac+count,max)

                if(drop_overflow&&drop>0){
                    this.owner.game.add_loot(this.owner.position,def,drop,this.owner.layer)
                }
                return drop //Residue
            }
            case InventoryItemType.consumible:{
                this.net_sync.items=true

                const item=new ConsumibleItem(def as unknown as ConsumibleDef)
                item.inventory=this
                item.limit_per_slot=this.item_limit(item.def)

                let ov=count
                //TODO: PUT A BETTER THING THAN INFINIY
                if(count==Infinity){
                    ov=this.add(item,item.limit_per_slot)
                    if(drop_overflow)this.owner.game.add_loot(this.owner.position,def,Infinity,this.owner.layer)
                    return count
                }else{
                    ov=this.add(item,count)
                    if(ov&&drop_overflow){
                        this.owner.game.add_loot(this.owner.position,def,ov,this.owner.layer)
                    }
                }
                return ov
            }
            case InventoryItemType.grenade:{
                this.net_sync.items=true

                const item=new GrenadeItem(def as unknown as GrenadeDef)
                item.inventory=this
                item.limit_per_slot=this.item_limit(def)

                let ov=count
                //TODO: PUT A BETTER THING THAN INFINIY
                if(count==Infinity){
                    ov=this.add(item,count)
                    if(drop_overflow)this.owner.game.add_loot(this.owner.position,def,Infinity,this.owner.layer)
                    return count
                }else{
                    ov=this.add(item,count)
                    if(ov&&drop_overflow){
                        this.owner.game.add_loot(this.owner.position,def,ov,this.owner.layer)
                    }
                }
                return ov
            }
            case InventoryItemType.vest:{
                const d=def as unknown as VestDef
                if(!this.owner.equipment_data.vest||this.owner.equipment_data.vest.level<d.level){
                    if(this.owner.equipment_data.vest)this.owner.game.add_loot(this.owner.position,this.owner.equipment_data.vest,1)

                    this.owner.equipment_data.dirty=true
                    this.owner.equipment_data.dirty_part=true
                    this.owner.equipment_data.vest=d
                    this.owner.equipment_data.vest_health=d.health

                    if(drop_overflow&&count>1){
                        this.owner.game.add_loot(this.owner.position,def,count-1,this.owner.layer)
                    }
                    return count-1
                }
                break
            }
            case InventoryItemType.helmet:{
                const d=def as unknown as HelmetDef
                if(!this.owner.equipment_data.helmet||this.owner.equipment_data.helmet.level<d.level){
                    if(this.owner.equipment_data.helmet)this.owner.game.add_loot(this.owner.position,this.owner.equipment_data.helmet,1,this.owner.layer)

                    this.owner.equipment_data.dirty=true
                    this.owner.equipment_data.dirty_part=true
                    this.owner.equipment_data.helmet=d
                    this.owner.equipment_data.helmet_health=d.health

                    if(drop_overflow&&count>1){
                        this.owner.game.add_loot(this.owner.position,def,count-1,this.owner.layer)
                    }
                    return count-1
                }
                break
            }
            case InventoryItemType.backpack:{
                const d=def as unknown as BackpackDef
                if(this.backpack.level<d.level){
                    this.owner.equipment_data.dirty=true
                    this.owner.equipment_data.dirty_part=true
                    if(this.backpack.level>0){
                        this.owner.game.add_loot(this.owner.position,this.backpack,1,this.owner.layer)
                    }
                    this.set_backpack(d)

                    if(drop_overflow&&count>1){
                        this.owner.game.add_loot(this.owner.position,def,count-1,this.owner.layer)
                    }
                    return count-1
                }
                break
            }
            case InventoryItemType.gun:{
                const d=def as unknown as GunDef
                const g=this.add_gun(d,full_ammo)
                this.net_sync.weapons=true
                return g?count-1:count
            }
            case InventoryItemType.melee:{
                const s=this.set_weapon(0,def as unknown as MeleeDef)
                this.net_sync.weapons=true
                return s?count-1:count
            }
            case InventoryItemType.accessory:{
                const r=this.accessorys.add_accessory(def)
                if(r[0]){
                    this.owner.game.add_loot(this.owner.position,r[0],1,this.owner.layer)
                }
                if(r[1])count--
                if(drop_overflow&&count>1){
                    this.owner.game.add_loot(this.owner.position,def,count,this.owner.layer)
                }
                return count
            }
            case InventoryItemType.scope:{
                if(!this.iitems.includes(def)){
                    this.iitems.push(def)

                    if(def.idNumber!>this.owner.equipment_data.scope.idNumber!){
                        this.owner.equipment_data.scope=def
                    }
                    this.owner.equipment_data.dirty=true
                    this.net_sync.iitems=true
                    return count-1
                }
                break
            }
        }
        return count
    }
    drop_slot(si:number=0,count:number=10){
        const s=this.slots[si]
        if(s?.item&&s.quantity>0){
            const c=Math.min(count,s.quantity)
            this.owner.game.add_loot(this.owner.position,s.item.def as GameItem,c,this.owner.layer)
            s.remove(c)

            this.net_sync.items=true
        }
    }
    drop_item(id:number,count:number=5){
        for(const s in this.slots){
            if(this.slots[s].item&&this.owner.game.definitions.game_items.keysString[this.slots[s].item.def.idString]===id){
              this.drop_slot(s as unknown as number,count)
              break
            }
        }
    }
    load_preset(preset:InventoryPreset){
        if(preset.accessorys){
            for(const s of preset.accessorys){
                const w=random.weight2(s)
                if(w)this.accessorys.add_accessory(this.owner.game.definitions.accessorys.getFromString(w.item),w.droppable,w.droppable)
            }
        }
        if(preset.helmet){
            const choose=random.weight2(preset.helmet)
            if(choose&&choose.item){
                this.owner.equipment_data.helmet=this.owner.game.definitions.helmets.getFromString(choose.item)
                if(choose.drop_chance)this.droppable.helmet=(Math.random()<=choose.drop_chance)
                else if(choose.droppable!==undefined)this.droppable.helmet=choose.droppable
            }
        }
        if(preset.vest){
            const choose=random.weight2(preset.vest)
            if(choose&&choose.item){
                this.owner.equipment_data.vest=this.owner.game.definitions.vests.getFromString(choose.item)
                if(choose.drop_chance)this.droppable.vest=(Math.random()<=choose.drop_chance)
                else if(choose.droppable!==undefined)this.droppable.vest=choose.droppable
            }
        }
        if(preset.backpack){
            const choose=random.weight2(preset.backpack)
            if(choose&&choose.item){
                this.set_backpack(this.owner.game.definitions.backpacks.getFromString(choose.item))
                if(choose.drop_chance)this.droppable.vest=(Math.random()<=choose.drop_chance)
                else if(choose.droppable!==undefined)this.droppable.vest=choose.droppable
            }
        }

        if(preset.melee)this.set_weapon(0,this.owner.game.definitions.melees.getFromString(random.weight2(preset.melee)?.item!))
        if(preset.gun1){
            const choose=random.weight2(preset.gun1)!
            this.set_weapon(1,this.owner.game.definitions.guns.getFromString(choose.item))
            const wep=this.weapons[1] as GunItem
            wep.ammo=wep.get_capacity()
        }
        if(preset.gun2){
            const choose=random.weight2(preset.gun2)!
            this.set_weapon(2,this.owner.game.definitions.guns.getFromString(choose.item))
            const wep=this.weapons[2] as GunItem
            wep.ammo=wep.get_capacity()
        }
        if(preset.aitems){
            for(const o of Object.keys(preset.aitems)){
                const def=this.owner.game.definitions.game_items.valueString[o]
                const max=this.item_limit(def)
                const ac=this.aitems[o]??0
                this.aitems[o]=Numeric.max(ac+preset.aitems[o],max)
            }
        }
        if(preset.iitems){
            for(const s of preset.iitems){
                const scope=this.owner.game.definitions.scopes.getFromString(s)
                this.give_item(scope,1)
            }
        }
        if(preset.hand){
            this.set_weapon_index(preset.hand)
        }
        if(preset.infinity_ammo!==undefined)this.infinity_ammo=preset.infinity_ammo
        if(preset.droppables){
            if(preset.droppables.helmet!==undefined)this.droppable.helmet=preset.droppables.helmet
            if(preset.droppables.vest!==undefined)this.droppable.vest=preset.droppables.vest
            if(preset.droppables.backpack!==undefined)this.droppable.backpack=preset.droppables.backpack
        }
        if(preset.boosts){
            const choose=random.weight2(preset.boosts)
            if(choose){
                this.owner.health_data.boost_def=Boosts[choose.boost_type]
                this.owner.health_data.boost=this.owner.health_data.max_boost*choose.boost
            }
        }
        for(const slot of preset.items??[]){
            const choose=random.weight2(slot)
            if(choose&&this.owner.game.definitions.game_items.valueString[choose.item]){
                const item=this.owner.game.definitions.game_items.valueString[choose.item]
                this.give_item(item,choose.count??1,false)
            }
        }
    }
    drop_all(){
        const layer=this.owner.layer

        const l:Loot[]=[]
        for(const w of Object.keys(this.weapons)){
            l.push(...this.drop_weapon(w as unknown as number))
        }
        for(const s of Object.keys(this.aitems)){
            const def=this.owner.game.definitions.game_items.valueString[s]
            const dir=random.float(-3.141592,3.141592)
            const r=(this.owner.hitbox as CircleHitbox2D).radius
            const pos=v2.add(this.owner.position,v2((Math.cos(dir)*r),(Math.sin(dir)*r)))
            while(this.aitems[s]>0){
                const rc=Math.min(this.aitems[s],80)
                const ll=this.owner.game.add_loot(pos,def,rc,this.owner.layer)
                l.push(ll);
                this.aitems[s]-=rc
            }
            delete this.aitems[s]
        }
        if(this.owner.equipment_data.helmet&&this.droppable.helmet){
            l.push(this.owner.game.add_loot(this.owner.position,this.owner.equipment_data.helmet,1,layer))
            this.owner.equipment_data.helmet=undefined
        }
        if(this.owner.equipment_data.vest&&this.droppable.vest){
            l.push(this.owner.game.add_loot(this.owner.position,this.owner.equipment_data.vest,1,layer))
            this.owner.equipment_data.vest=undefined
        }
        if(this.backpack&&this.backpack.level&&this.droppable.backpack){
            l.push(this.owner.game.add_loot(this.owner.position,this.backpack,1,layer))
            this.set_backpack()
        }
        for(const s of this.slots){
            if(s.item&&s.quantity>0){
                l.push(this.owner.game.add_loot(this.owner.position,s.item.def as GameItem,s.quantity,layer))
                s.remove(s.quantity)
            }
        }
        for(const i of this.iitems){
            if((i as ScopeDef).droppable)l.push(this.owner.game.add_loot(this.owner.position,i,1,layer))
        }
        for(const s of this.accessorys.slots){
            if(s.item&&s.droppable){
                l.push(this.owner.game.add_loot(this.owner.position,s.item,1,layer))
            }
        }
        this.accessorys.clear()
        for(let i=0;i<5;i++){
            for(const loot of l){
                loot.update(1/30)
            }
        }
        for(const loot of l){
            loot.is_new=true
        }

        this.net_sync.weapons=true
        this.net_sync.items=true
        this.net_sync.aitems=true
        this.net_sync.iitems=true
    }

    net_update(){
        this.net_sync.aitems=false
        this.net_sync.hand=false
        this.net_sync.iitems=false
        this.net_sync.items=false
        this.net_sync.weapons=false
    }
    update(dt:number){
        for(const w of Object.keys(this.weapons)){
            this.weapons[w as unknown as number]?.update(this.owner,dt)
        }
        for(const s of this.slots){
            if(!s.item)continue
            s.item.update(this.owner,dt)
        }
    }
}