import { GunDef } from "common/scripts/definitions/items/guns.ts";
import { AmmoItemBase, ConsumibleItemBase, GInventoryBase, GrenadeItemBase, GunItemBase, MDItem, MeleeItemBase } from "common/scripts/others/inventory.ts";
import { DamageReason, InventoryDroppable, GameItemType, InventoryPreset } from "common/scripts/definitions/utils.ts";
import { ConsumingActionA, ReloadAction } from "./actions.ts";
import { AmmoDef } from "common/scripts/definitions/items/ammo.ts";
import { ConsumibleDef } from "common/scripts/definitions/items/consumibles.ts";
import { MeleeDef } from "common/scripts/definitions/items/melees.ts";
import { BackpackDef, } from "common/scripts/definitions/items/backpacks.ts";
import { type ServerGameObject } from "../others/gameObject.ts";
import { HelmetDef, VestDef } from "common/scripts/definitions/items/equipaments.ts";
import { GameObjectType, HumanAnimationType, LootData } from "common/scripts/others/constants.ts";
import { ScopeDef } from "common/scripts/definitions/items/scopes.ts";
import { Angle, CircleHitbox2D, getPatterningShape, Numeric, random, Slot, v2, v2m, Vec2 } from "common/engine/core.ts";
import { Human } from "../objects/human.ts";
import { type Loot } from "../objects/loot.ts";
import { StaticBody } from "../objects/static_body.ts";
import { GrenadeDef } from "common/scripts/definitions/items/grenades.ts";
import { GameItem, WeaponDef } from "common/scripts/definitions/game_defs.ts";
import { AccessorysManager } from "./accessorys.ts";
import { FireMode } from "common/scripts/others/item.ts";
export abstract class LItem extends MDItem{
    declare inventory:GInventory
    abstract on_use(user:Human,slot?:Slot<LItem>):void
    abstract on_fire(user:Human):boolean
    abstract on_fire_alt(user:Human):void
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

    reloading=false
    dual_d:boolean=false

    ammo:number=0
    get_capacity():number{
        return (this.inventory.extended_capacity?(this.def.reload?.extended_capacity??this.def.reload?.capacity):this.def.reload?.capacity)??0
    }
    on_use(_user: Human, _slot?: Slot<LItem>): void {
        
    }
    on_fire(user:Human){
        if(this.def.fire_mode===FireMode.Single&&!user.input.using_item_down)return false
        if(this.has_ammo(user)){
            if(this.use_delay<=0){
                if(this.def.fire_mode===FireMode.Burst&&this.def.burst&&!this.burst){
                    this.burst={
                        c:this.def.burst.sequence,
                        t:this.def.burst.delay
                    }
                    this.use_delay=0
                }else{
                    this.shot(user)
                    this.use_delay=this.def.fire_delay
                }
                return true
            }
        }else{
            this.burst=undefined
        }
        return false
    }
    on_fire_alt(user:Human):void{
        if(this.def.alt_func){
            switch(this.def.alt_func.type){
                case 0:
                    if(this.use_delay<=0){
                        this.shot_alt(user)
                        this.use_delay=this.def.alt_func.delay
                    }
                    break
            }
        }
    }
    infinity_ammo(){
        return this.inventory.infinity_ammo||this.inventory.infinity_ammos.has(this.def.ammo_type)
    }
    has_ammo(user:Human):boolean{
        return (this.ammo>0||!this.def.reload)//&&(!this.def.man||this.has_mana(user))
    }
    reload(user:Human){
        if(!this.def.reload||user.downed)return
        if(this.ammo>=this.get_capacity()||(!this.infinity_ammo()&&!user.inventory.aitems[this.def.ammo_type])||this.use_delay>0){
            this.reloading=false
            return
        }
        user.animation_data.dirty=true
        user.animation_data.current_animation.push(
            {
                type:HumanAnimationType.Reloading,
                alt_reload:this.ammo===0,
            })

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
            const hit = body.hitbox.overlap_line(
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

        user.animation_data.dirty=true
        user.inventory.net_sync.hand=true

        this.reloading=false
        if(consume){
            if(this.def.reload)this.ammo=Math.max(this.ammo-(this.def.reload!.ammo_consume??1))
            //if(this.def.mana_consume)user.health_data.boost=Math.max(user.health_data.boost-this.def.mana_consume*user.modifiers.mana_consume,0)
        }

        const barrel_position=v2(
            this.def.barrel_length,
            (this.def.barrel_offset??0)+(this.def.dual_from?(this.dual_d?-this.def.dual_offset:this.def.dual_offset):0)
        )
        const barrel_point=v2.rotate_RadAngle(barrel_position,user.physical_data.rotation)
        const position=this.clip_muzzle(user,v2.add(user.position,barrel_point))

        if(this.def.dual_from)this.dual_d=!this.dual_d

        let spread=this.def.spread??0
        const is_idle=v2.len(user.physical_data.velocity)<=0.1
        if(is_idle&&this.def.idle_spread!==undefined){
            spread*=this.def.idle_spread
        }

        if(this.def.bullet){
            const bullets_count=this.def.bullet.count??1
            const patternPoint = getPatterningShape(bullets_count, this.def.jitter_radius??1)
            for(let i=0;i<bullets_count;i++){
                let ang=user.physical_data.rotation
                if(spread){
                    ang+=Angle.deg2rad(random.float(-spread,spread))
                }
                const pos=this.def.jitter_radius?v2.add(position,patternPoint[i]):position
                const b=user.game.add_bullet(pos,this.def.bullet.def,user,this.def.ammo_type,this.def,user.layer,undefined,is_idle?0.25:undefined)
                b.modifiers={
                    speed:user.modifiers.bullet_speed,
                    size:user.modifiers.bullet_size,
                }
                user.inventory.accessorys.call_event("gun_shoot",{user:user,item:this,bullet:b,angle:ang,spread,position:pos})
                b.set_direction(ang)
            }
        }
        if(this.def.synsed_particle){
            const scc=this.def.synsed_particle.count??1
            const patternPoint = getPatterningShape(scc, this.def.jitter_radius??0)
            const pdef=user.game.definitions.synced_particle.getFromString(this.def.synsed_particle.def)

            for(let i=0;i<scc;i++){
                const pos=this.def.jitter_radius?v2.add(position,patternPoint[i]):position
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
        if(this.def.projectile){
            const scc=this.def.projectile.count??1
            const patternPoint = getPatterningShape(scc, this.def.jitter_radius??1)
            const gdef=user.game.definitions.grenades.getFromString(this.def.projectile.def)

            for(let i=0;i<scc;i++){
                const pos=this.def.jitter_radius?v2.add(position,patternPoint[i]):position
                const proj=user.game.add_grenade(pos,gdef,user,user.layer)
                proj.physical_data.zpos=0.5
                proj.physical_data.zpos_speed=1
                const limit=(gdef.throw_max_speed??0)
                proj.push(Numeric.clamp(user.input.dist_to_pointer*limit,0,limit),user.physical_data.rotation,10)
            }
        }
        if(this.def.recoil){
            user.recoil={delay:this.def.recoil.duration,speed:this.def.recoil.speed}
        }

        user.animation_data.current_animation.push({
            type:HumanAnimationType.Fire,
            alt:this.dual_d,
            last:this.ammo===0,
            alt_func:false,
        })
    }
    shot_alt(user:Human){
        user.actions.cancel()

        user.animation_data.dirty=true
        user.inventory.net_sync.hand=true

        this.reloading=false

        const barrel_position=v2(
            this.def.barrel_length,
            (this.def.barrel_offset??0)+(this.def.dual_from?(this.dual_d?-this.def.dual_offset:this.def.dual_offset):0)
        )
        const barrel_point=v2.rotate_RadAngle(barrel_position,user.physical_data.rotation)
        const position=this.clip_muzzle(user,v2.add(user.position,barrel_point))
        if(this.def.dual_from)this.dual_d=!this.dual_d

        const proj_def=user.game.definitions.grenades.getFromString(this.def.alt_func!.projectile)
        const proj=user.game.add_grenade(position,proj_def,user,user.layer)
        proj.physical_data.zpos=0.5
        proj.physical_data.zpos_speed=1
        const limit=this.def.alt_func!.speed
        proj.push(Numeric.clamp(user.input.dist_to_pointer*limit,0,limit),user.physical_data.rotation,10)
        if(this.def.recoil){
            user.recoil={delay:this.def.recoil.duration,speed:this.def.recoil.speed}
        }
        user.animation_data.current_animation.push({
            type:HumanAnimationType.Fire,
            alt:this.dual_d,
            alt_func:true,
            last:this.ammo===0
        })
    }
    update(user:Human,dt:number){
        if(this.use_delay>0)this.use_delay-=dt
        if(user.inventory.hand_item===this&&!user.actions.current_action){
            if((this.ammo<=0||this.reloading)&&this.def.reload&&this.use_delay<=0){
                this.reloading=true
                this.reload(user)
            }
            if(this.use_delay<=0){
                if(this.burst){
                    if(this.burst.c<=0||this.ammo<=0){
                        this.burst=undefined
                        this.use_delay=this.def.fire_delay
                    }else{
                        this.burst.c--
                        this.use_delay=this.burst.t
                        this.shot(user)
                    }
                }
            }
        }
    }
    override load(def?:WeaponDef): void {
        if(this.def.switch_delay&&this.use_delay<=this.def.switch_delay){
            this.use_delay=this.def.switch_delay
            if(def?.item_type===GameItemType.gun&&this.def.class_switch_multiply){
                this.use_delay*=(this.def.class_switch_multiply)[def.class]??1
            }
        }else if(this.def.switch_multiply){
            this.use_delay=Math.min(this.def.fire_delay,this.use_delay*this.def.switch_multiply)
        }
    }
    override unload(): void {
        this.reloading=false
        this.burst=undefined
        if(this.def.unload_multiply!==undefined)this.use_delay=this.def.fire_delay*this.def.unload_multiply
    }
    drop(): Loot[] {
        if(this.ammo>0&&!this.infinity_ammo()){
            this.inventory.give_item(this.inventory.owner.game.definitions.ammos.getFromString((this.def as GunDef).ammo_type),this.ammo)
        }
        if(this.def.dual_from){
            const ret:Loot[]=[]
            for(let i=0;i<2;i++)ret.push(this.inventory.owner.game.add_loot(this.inventory.owner.position,{item:this.inventory.owner.game.definitions.guns.getFromString(this.def.dual_from),count:1},this.inventory.owner.layer))
            return ret
        }else{
            return [this.inventory.owner.game.add_loot(this.inventory.owner.position,{item:this.def,count:1},this.inventory.owner.layer)]
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
    on_fire(_user: Human):boolean{
        return true
    }
    on_fire_alt(user:Human):void{}
    update(_user: Human,dt:number): void {
    }
    drop(): Loot[] {
        return []
    }
}
export class ConsumibleItem extends ConsumibleItemBase implements LItem{
    declare inventory:GInventory
    slot?:Slot<LItem>
    use_delay:number=0
    constructor(def:ConsumibleDef){
        super(def)
        if(this.def.allow_merge!==undefined)this.allow_merge=this.def.allow_merge
    }
    on_use(user: Human,slot?:Slot<LItem>): void {
        if(user.actions.current_action)return
        this.slot=slot
        switch(this.def.consuming.type){
            case 0:
                if(user.consuming_condition(this.def.condition!,this.def.consuming.side_effects)){
                    user.inventory.net_sync.hand=true
                    user.animation_data.dirty=true
                    user.animation_data.current_animation.push(
                        {
                            type:HumanAnimationType.Consuming,
                            item:this.def.idNumber!
                        }
                    )
                    user.actions.play(new ConsumingActionA(this,slot!))
                }
                break
            case 1:
                user.inventory.set_hand_item(this)
                this.inventory.weapon_idx=-1
                this.use_delay=this.def.consuming.delay
                break
        }
    }
    on_fire(user:Human):boolean{
        if(this.use_delay<=0){
            this.fire(user,true)
            return true
        }
        return false
    }
    on_fire_alt(user:Human):void{
        if(this.use_delay<=0){
            this.fire(user)
        }
    }
    fire(user:Human,self=false){
        switch(this.def.consuming.type){
            case 1:{
                const barrel_position=v2(this.def.consuming.length,0)
                const barrel_point=v2.rotate_RadAngle(barrel_position,user.physical_data.rotation)
                const position=v2.add(user.position,barrel_point)
                if(this.def.consuming.synsed_particle){
                    const scc=this.def.consuming.synsed_particle.count??1
                    const patternPoint = getPatterningShape(scc, this.def.consuming.jitterRadius??1)
                    if(this.def.consuming.synsed_particle){
                        const pdef=user.game.definitions.synced_particle.getFromString(this.def.consuming.synsed_particle.def)
                        for(let i=0;i<scc;i++){
                            const pos=this.def.consuming.jitterRadius?v2.add(position,patternPoint[i]):position
                            const part=user.game.add_synced_particle(pos,pdef,user,user.layer)
                            if(self){
                                const rot=user.physical_data.rotation+3.141592
                                part.no_hit_owner=false
                                part.just_owner=false
                                if(this.def.consuming.synsed_particle.self_speed){
                                    part.push(random.random1(this.def.consuming.synsed_particle.self_speed??0),rot)
                                }
                            }else{
                                if(this.def.consuming.synsed_particle.speed){
                                    let ang=user.physical_data.rotation
                                    if(this.def.consuming.spread){
                                        ang+=Angle.deg2rad(random.float(-this.def.consuming.spread,this.def.consuming.spread))
                                    }
                                    part.push(random.random1(this.def.consuming.synsed_particle.speed),ang)
                                }
                            }
                        }
                    }
                }
                this.use_delay=this.def.consuming.delay
                this.slot!.remove(1)
                this.inventory.net_sync.items=true
            }
        }
    }
    update(_user: Human,dt:number): void {
        if(this.use_delay>0)this.use_delay-=dt
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
        this.inventory.weapon_idx=-1
        this.slot=slot
    }
    on_fire(user: Human): boolean{
        if(!this.slot||this.slot?.quantity<=0||!user.input.using_item_down)return true
        user.grenade_holding={
            def:this.def,
            time:this.def.fuse?.time??10,
            active_time:this.def.throw_time??0.1,
            cook_time:this.def.cook_time??0.2,
            slot:this.slot,
            activated:false
        }
        user.animation_data.dirty=true
        user.animation_data.current_animation.push({
            type:HumanAnimationType.Cook,
        })
        return true
    }
    on_fire_alt(user:Human):void{}
    update(_user: Human,dt:number): void {

    }
    drop(): Loot[] {
        return []
    }
}
export class MeleeItem extends MeleeItemBase implements LItem{
    declare inventory:GInventory
    skin?:number
    use_delay:number=0
    firing:boolean=false
    switching:boolean=false
    constructor(def:MeleeDef){
        super(def)
    }
    on_use(_user: Human, _slot?: Slot<LItem>): void {
      
    }
    on_fire(user: Human,_slot?: Slot<LItem>):boolean{
        if(this.def.fire_mode===FireMode.Single&&!user.input.using_item_down)return false
        if(this.use_delay<=0){
            user.actions.cancel()

            user.animation_data.dirty=true
            user.animation_data.current_animation.push({
                type:HumanAnimationType.Melee
            })

            for(const t of this.def.damage_delays){
                user.game.add_timeout(()=>{
                    if(this.inventory.hand_item===this)this.attack(user)
                },t)
                this.use_delay=this.def.attack_delay
            }
            this.firing=true
            return true
        }
        return false
    }
    on_fire_alt(user:Human):void{}
    attack(user:Human):void{
        const hb=new CircleHitbox2D(v2.add_rotate_RadAngle(user.position,this.def.offset,user.physical_data.rotation),this.def.radius)
        const collidibles:ServerGameObject[]=user.manager.cells.get_objects(hb,user.layer)

        for(const c of collidibles){
            if(!hb.colliding_with(c.hitbox))continue
            if(c instanceof StaticBody){
                c.damage({
                    amount:this.def.damage,
                    resistence:this.def.resistence_damage??0,
                    critical:false,
                    position:hb.position,
                    reason:DamageReason.Human,
                    owner:user,
                    source:this.def,
                    direction:v2.lookTo(c.position,user.position),
                    penetration:1,
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
                    direction:v2.lookTo(c.position,user.position),
                    penetration:1,
                })
            }
        }
    }
    update(_user: Human,dt:number): void {
        if(this.use_delay>0){
            this.use_delay-=dt
        }else{
            this.firing=false
        }
    }
    override unload(): void {
        this.use_delay=this.def.attack_delay
    }
    drop(): Loot[] {
        return [this.inventory.owner.game.add_loot(this.inventory.owner.position,{item:this.def,count:1,skin:this.skin},this.inventory.owner.layer)]
    }
}
export class GInventory extends GInventoryBase<LItem>{
    owner:Human

    infinity_ammo:boolean=false
    extended_capacity:boolean=false

    infinity_ammos:Set<string>=new Set()

    droppable:InventoryDroppable={
        backpack:true,
        helmet:true,
        vest:true
    }
    accessorys:AccessorysManager

    constructor(owner:Human){
        super()
        this.owner=owner
        this.accessorys=new AccessorysManager(owner,4)
    }
    override set_backpack(backpack?: BackpackDef,drop=false): void {
        if(drop&&this.backpack.level>=1){
            this.owner.game.add_loot(this.owner.position,{item:this.backpack,count:1},this.owner.layer)
        }
        super.set_backpack(backpack)
        this.net_sync.items=true
    }
    override set_weapon_index(idx:number,force:boolean=false){
        if(this.hand_item!==this.weapons[idx]||force){
            this.owner.recoil=undefined
            this.owner.actions.cancel()
            this.owner.grenade_holding=undefined
            this.owner.animation_data.dirty=true
            this.owner.animation_data.switching=true
        }
        super.set_weapon_index(idx,force)
        this.net_sync.melee_world=true
    }
    override set_weapon(slot: number, wep?: GameItem,skin?:number,drop:boolean=true): boolean {
        if(wep?.idString===this.weapons[slot]?.def.idString)return false
        if(drop){
            if(this.weapons[slot]&&this.weapons[slot].def!=this.weapons_defaults[slot]){
                this.weapons[slot].drop()
                this.weapons[slot]=undefined
            }
        }
        super.set_weapon(slot,wep)
        //@ts-ignore
        if(this.weapons[slot])this.weapons[slot].skin=skin
        this.net_sync.melee_world=true
        return true
    }
    add_gun(dd:GunDef,full_ammo:boolean,skin?:number):boolean{
        const id=dd.idString
        if(dd.dual&&!dd.dual_from){
            for(const w of Object.keys(this.weapons)){
                if(this.weapons[w as unknown as number]?.def.idString==dd.idString){
                    const dd=this.owner.game.definitions.guns.getFromString(id+"_dual")
                    this.set_weapon(w as unknown as number,dd,skin,false)
                    if(full_ammo){
                        (this.weapons[w as unknown as number] as GunItem).ammo=dd.reload?.capacity??0
                    }
                    return true
                }
            }
        }
        for(const w of Object.keys(this.weapons)){
            if(this.weapon_is_free(w as unknown as number)&&this.weapons_kind[w as unknown as number]==GunItem){
                this.set_weapon(w as unknown as number,dd,skin)
                if(full_ammo){
                    (this.weapons[w as unknown as number] as GunItem).ammo=dd.reload?.capacity??0
                }
                return true
            }
        }
        if(this.weapons_kind[this.weapon_idx]==GunItem){
            const set=this.set_weapon(this.weapon_idx,dd,skin)
            if(full_ammo){
                (this.weapons[this.weapon_idx] as GunItem).ammo=dd.reload?.capacity??0
            }
            return set
        }
        return false
    }
    drop_weapon(slot=0):Loot[]{
        if(this.weapon_is_free(slot))return []
        this.net_sync.melee_world=true
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
    drop_aitem(id:number=0,drop_count?:number):Loot|undefined{
        const a=this.owner.game.definitions.ammos.getFromNumber(id)
        if(drop_count===undefined)drop_count=Math.ceil((this.aitems[a.idString]??2)/2)
        const res=this.consume_aitems(a.idString,drop_count)
        if(res){
            this.net_sync.iitems=true
            return this.owner.game.add_loot(this.owner.position,{item:a,count:res},this.owner.layer)
        }
    }
    drop_iitem(item:number):Loot|undefined{
        if(this.owner.equipment_data.default_scope.idNumber===item)return
        for(let idx=0;idx<this.iitems.length;idx++){
            if(this.iitems[idx].idNumber===item){
                const def=this.iitems[idx]
                const ret=this.owner.game.add_loot(this.owner.position,{item:def,count:1},this.owner.layer)
                this.iitems.splice(idx,1)
                if(this.owner.equipment_data.scope===def)this.owner.equipment_data.scope=this.iitems[this.iitems.length-1] as ScopeDef
                this.owner.equipment_data.dirty=true
                this.net_sync.iitems=true
                idx--
                return ret
            }
        }
        return undefined
    }
    drop_helmet(force:boolean=false):Loot|undefined{
        if(!force&&!this.droppable.helmet)return
        if(this.owner.equipment_data.helmet){
            let loot:Loot|undefined
            if(this.droppable.vest){
                loot=this.owner.game.add_loot(this.owner.position,{item:this.owner.equipment_data.helmet,count:1,skin:this.owner.equipment_data.helmet_skin},this.owner.layer)
            }
            this.owner.equipment_data.dirty=true
            this.owner.equipment_data.dirty_part=true
            const helmet=this.owner.equipment_data.helmet
            this.owner.equipment_data.helmet=undefined
            helmet.events?.["drop"]?.({user:this.owner})
            return loot
        }
        return
    }
    set_helmet(helmet:HelmetDef,skin?:number):Loot|undefined{
        const ret=this.drop_helmet()
        this.owner.equipment_data.dirty=true
        this.owner.equipment_data.dirty_part=true
        this.owner.equipment_data.helmet=helmet
        this.owner.equipment_data.helmet_health=helmet.health
        this.owner.equipment_data.helmet_skin=skin
        this.owner.equipment_data.helmet.events?.["pickup"]?.({user:this.owner})
        return ret
    }
    drop_vest(force:boolean=false):Loot|undefined{
        if(!force&&!this.droppable.vest)return
        if(this.owner.equipment_data.vest){
            let loot:Loot|undefined
            if(this.droppable.vest){
                loot=this.owner.game.add_loot(this.owner.position,{item:this.owner.equipment_data.vest,count:1},this.owner.layer)
            }
            this.owner.equipment_data.dirty=true
            this.owner.equipment_data.dirty_part=true
            const vest=this.owner.equipment_data.vest
            this.owner.equipment_data.vest=undefined
            vest.events?.["drop"]?.({user:this.owner})
            return loot
        }
        return
    }
    set_vest(vest:VestDef):Loot|undefined{
        const ret=this.drop_vest()
        this.owner.equipment_data.dirty=true
        this.owner.equipment_data.dirty_part=true
        this.owner.equipment_data.vest=vest
        this.owner.equipment_data.vest_health=vest.health
        this.owner.equipment_data.vest.events?.[name]?.({user:this})
        return ret
    }
    give_item(def:GameItem,count:number,drop_overflow:boolean=true,full_ammo:boolean=false,skin?:number,position?:Vec2,layer?:number):number{
        if(!position)position=this.owner.position
        if(layer===undefined)layer=this.owner.layer
        switch(def.item_type){
            case GameItemType.ammo:{
                this.net_sync.aitems=true

                const max=this.item_limit(def)
                const ac=this.aitems[def.idString]??0

                if(ac>=max){
                    if(drop_overflow)this.owner.game.add_loot(position,{item:def,count,skin},layer)
                    return count
                }

                const drop=Math.max((ac+count)-max,0)
                this.aitems[def.idString]=Numeric.max(ac+count,max)
                if(drop_overflow&&drop>0){
                    this.owner.game.add_loot(position,{item:def,count:drop,skin},layer)
                }
                return drop //Residue
            }
            case GameItemType.consumible:{
                this.net_sync.items=true

                const item=new ConsumibleItem(def as unknown as ConsumibleDef)
                item.inventory=this
                item.limit_per_slot=this.item_limit(item.def)

                let ov=count
                //TODO: PUT A BETTER THING THAN INFINIY
                if(count==Infinity){
                    ov=this.add(item,item.limit_per_slot)
                    if(drop_overflow)this.owner.game.add_loot(position,{item:def,count:Infinity,skin},layer)
                    return count
                }else{
                    ov=this.add(item,count)
                    if(ov&&drop_overflow){
                        this.owner.game.add_loot(position,{item:def,count:ov,skin},layer)
                    }
                }
                return ov
            }
            case GameItemType.grenade:{
                this.net_sync.items=true

                const item=new GrenadeItem(def as unknown as GrenadeDef)
                item.inventory=this
                item.limit_per_slot=this.item_limit(def)

                let ov=count
                //TODO: PUT A BETTER THING THAN INFINIY
                if(count==Infinity){
                    ov=this.add(item,item.limit_per_slot)
                    if(drop_overflow)this.owner.game.add_loot(position,{item:def,count:Infinity,skin},layer)
                    return count
                }else{
                    ov=this.add(item,count)
                    if(ov&&drop_overflow){
                        this.owner.game.add_loot(position,{item:def,count:ov,skin},layer)
                    }
                }
                return ov
            }
            case GameItemType.helmet:{
                const d=def as unknown as HelmetDef
                if(!this.owner.equipment_data.helmet||this.owner.equipment_data.helmet.level<d.level||(this.owner.equipment_data.helmet===def&&this.owner.equipment_data.helmet_skin!==skin)){
                    this.set_helmet(d,skin)
                    if(drop_overflow&&count>1){
                        this.owner.game.add_loot(position,{item:def,count:count-1,skin},layer)
                    }
                    return count-1
                }
                break
            }
            case GameItemType.vest:{
                const d=def as unknown as VestDef
                if(!this.owner.equipment_data.vest||this.owner.equipment_data.vest.level<d.level){
                    this.set_vest(d)
                    if(drop_overflow&&count>1){
                        this.owner.game.add_loot(position,{item:def,count:count-1,skin},layer)
                    }
                    return count-1
                }
                break
            }
            case GameItemType.backpack:{
                const d=def as unknown as BackpackDef
                if(this.backpack.level<d.level){
                    this.owner.equipment_data.dirty=true
                    this.owner.equipment_data.dirty_part=true
                    if(this.backpack.level>0){
                        this.owner.game.add_loot(position,{item:this.backpack,count:1,skin},layer)
                    }
                    this.set_backpack(d)

                    if(drop_overflow&&count>1){
                        this.owner.game.add_loot(position,{item:def,count:count-1,skin},layer)
                    }
                    return count-1
                }
                break
            }
            case GameItemType.gun:{
                const d=def as unknown as GunDef
                const g=this.add_gun(d,full_ammo,skin)
                this.net_sync.weapons=true
                count=g?count-1:count
                if(drop_overflow&&count>0){
                    this.owner.game.add_loot(position,{item:def,count,skin},layer)
                }
                return count
            }
            case GameItemType.melee:{
                const s=this.set_weapon(0,def as unknown as MeleeDef,skin)
                this.net_sync.weapons=true
                count=s?count-1:count
                if(drop_overflow&&count>0){
                    this.owner.game.add_loot(position,{item:def,count,skin},layer)
                }
                return count
            }
            case GameItemType.accessory:{
                const r=this.accessorys.add_accessory(def)
                if(r[0]){
                    this.owner.game.add_loot(this.owner.position,{item:r[0],count:1,skin},this.owner.layer)
                }
                if(r[1])count--
                if(drop_overflow&&count>1){
                    this.owner.game.add_loot(position,{item:def,count,skin},layer)
                }
                return count
            }
            case GameItemType.scope:{
                if(!this.iitems.includes(def)){
                    this.iitems.push(def)
                    this.iitems.sort((a, b) => a.idNumber! - b.idNumber!)
                    if(def.idNumber!>this.owner.equipment_data.scope.idNumber!){
                        this.owner.equipment_data.scope=def
                    }
                    this.owner.equipment_data.dirty=true
                    this.net_sync.iitems=true
                    count--
                    if(drop_overflow&&count>1){
                        this.owner.game.add_loot(position,{item:def,count,skin},layer)
                    }
                    return count
                }
                break
            }
        }
        return count
    }
    give_loot(loot:LootData,drop_overflow?:boolean,full_ammo?:boolean,position?:Vec2,layer?:number){
        this.give_item(loot.item,loot.count,drop_overflow,full_ammo,loot.skin,position,layer)
        if(loot.aditional){
            for(const l of loot.aditional){
                this.give_loot(l)
            }
        }
    }
    drop_slot(si:number=0,count:number=10){
        const s=this.slots[si]
        if(s?.item&&s.quantity>0){
            const c=Math.min(count,s.quantity)
            this.owner.game.add_loot(this.owner.position,{item:s.item.def as GameItem,count:c},this.owner.layer)
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
                this.set_helmet(this.owner.game.definitions.helmets.getFromString(choose.item))
                if(choose.drop_chance)this.droppable.helmet=(Math.random()<=choose.drop_chance)
                else if(choose.droppable!==undefined)this.droppable.helmet=choose.droppable
            }
        }
        if(preset.vest){
            const choose=random.weight2(preset.vest)
            if(choose&&choose.item){
                this.set_vest(this.owner.game.definitions.vests.getFromString(choose.item))
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
                const rc=Math.min(this.aitems[s],100)
                const ll=this.owner.game.add_loot(pos,{item:def,count:rc},this.owner.layer)
                l.push(ll);
                this.aitems[s]-=rc
            }
            delete this.aitems[s]
        }
        for(const s of this.slots){
            if(s.item&&s.quantity>0){
                l.push(this.owner.game.add_loot(this.owner.position,{item:s.item.def as GameItem,count:s.quantity},layer))
                s.remove(s.quantity)
            }
        }

        this.drop_helmet(true)
        this.drop_vest(true)
        if(this.backpack&&this.backpack.level&&this.droppable.backpack){
            l.push(this.owner.game.add_loot(this.owner.position,{item:this.backpack,count:1},layer))
            this.set_backpack()
        }

        for(let i=0;i<this.iitems.length;i++){
            if((this.iitems[i] as ScopeDef).droppable&&this.iitems[i].idNumber!==this.owner.equipment_data.default_scope.idNumber){
                l.push(this.owner.game.add_loot(this.owner.position,{item:this.iitems[i],count:1},layer))
                this.iitems.splice(i,1)
                i--
            }
        }

        for(const s of this.accessorys.slots){
            if(s.item&&s.droppable){
                l.push(this.owner.game.add_loot(this.owner.position,{item:s.item,count:1},layer))
            }
        }
        this.accessorys.clear()
        for(let i=0;i<5;i++){
            for(const loot of l){
                loot.tick(1/30)
            }
        }
        this.set_weapon_index(0)

        this.net_sync.weapons=true
        this.net_sync.items=true
        this.net_sync.aitems=true
        this.net_sync.iitems=true
        this.owner.equipment_data.dirty=true
    }

    net_update(){
        this.net_sync.aitems=false
        this.net_sync.hand=false
        this.net_sync.melee_world=false
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
        if(this.hand_item&&this.hand_item.item_type!==GameItemType.gun&&this.hand_item.item_type!==GameItemType.melee){
            this.hand_item.update(this.owner,dt)
        }
    }
}