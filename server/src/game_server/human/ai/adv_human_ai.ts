import { Angle, astar_path2d, BTState, Stream, Numeric, random, v2, Vec2, CircleHitbox2D, GoalNode, BTGoalPlanner } from "common/engine/core.ts";
import { type Human } from "../../objects/human.ts";
import { BotAi } from "./simple_bot_ai.ts";
import { InputActionType } from "common/scripts/packets/input_packet.ts";
import { InventoryItemType } from "common/scripts/definitions/utils.ts";
import { GunItem } from "../inventory.ts";
import { GameItem, WeaponDef } from "common/scripts/definitions/game_defs.ts";
import { GunDef } from "common/scripts/definitions/items/guns.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { type Obstacle } from "../../objects/obstacle.ts";
import { type ServerGameObject } from "../../others/gameObject.ts";
import { type Loot } from "../../objects/loot.ts";
import { HelmetDef, VestDef } from "common/scripts/definitions/items/equipaments.ts";
import { BackpackDef } from "common/scripts/definitions/items/backpacks.ts";
export type BotExecutionContext = {
    human: Human
    target?: Human|Obstacle
    target_pos?: Vec2
    nearby_allies: Human[]
    nearby_enemies: Human[]
    visible_objects: ServerGameObject[]
    vision_hitbox:CircleHitbox2D

    dt: number
    ai:ADVHumanAI
    spin:(human:Human, duration:number)=>void
}
export abstract class BotExecutor{
    activated:boolean=false
    constructor(){
        
    }
    abstract update(ctx: BotExecutionContext): void
}
export class MovementController extends BotExecutor {
    target?: Vec2
    last_target?: Vec2
    path_finding:boolean=false
    path?: Vec2[]
    path_index = 0
    follow_path = false
    rotate_to = true

    repath_timer = 0
    repath_delay = 1

    use_discrete_movement = true
    discrete_directions = 8
    last_dir = 0
    dir_change_delay = 0.08
    dir_timer = 0
    clear() {
        this.target = undefined
        this.path = undefined
        this.path_index = 0
    }
    set_target(target: Vec2, path_finding: boolean){
        if(!this.last_target||v2.distance(this.last_target,target) > 1){
            this.repath_timer = 0
            this.path_finding = path_finding
            this.last_target = v2.clone(target)
        }
        this.target = v2.clone(target)
    }
    calculate_path(ctx: BotExecutionContext) {
        if(!this.target)return
        this.path = astar_path2d(
            ctx.human,
            ctx.human.base_hitbox,
            this.target!,
            ctx.human.isBlockedForPath.bind(self),
            {
                cellSize:0.2,
                dirs:[
                    [1,0],[0,1],[-1,0],[0,-1],
                    [1,1],[1,-1],[-1,-1],[-1,1]
                ]
            },
        )
        this.path_index = 0
    }
    update(ctx: BotExecutionContext) {
        if(!this.target) return

        this.repath_timer-=ctx.dt
        if(this.repath_timer<=0||!this.path){
            this.repath_timer=this.repath_delay
            this.calculate_path(ctx)
        }
        if(!this.path)return

        if(this.path_index >= this.path.length) {
            this.clear()
            return
        }
        const node = this.path[this.path_index]
        if (v2.distance(ctx.human.position, node) < 0.05) {
            this.path_index++
            return
        }

        const dir=v2.lookTo(ctx.human.position, node)
        ctx.human.input.movement.dir=dir
        ctx.human.input.movement.scale=1

        if(this.rotate_to){
            ctx.human.input.rotation = dir
        }
    }

    private quantizeDir(angle:number, dt:number){
        if(!this.use_discrete_movement) return angle
        this.dir_timer -= dt
        if(this.dir_timer <= 0){
            const step = (Math.PI*2) / this.discrete_directions
            this.last_dir = Math.round(angle / step) * step
            this.dir_timer = this.dir_change_delay
        }
        return this.last_dir
    }
}
export class AimController extends BotExecutor{
    aim_follow = random.float(10,15)
    aim_follow_variation = random.float(0,10)

    angle_variation = random.float(0,0.4)
    
    spinning = false
    spin_progress = 0
    spin_duration = 0
    spin_start_angle = 0
    spin_target_angle = 0
    startSpin(human:Human, duration:number){
        if(this.spinning)return
        this.spinning = true
        this.spin_progress = 0
        this.spin_duration = duration

        this.spin_start_angle = human.physical_data.rotation
        this.spin_target_angle = this.spin_start_angle + Math.PI*2
    }
    private updateSpin(ctx:BotExecutionContext){
        if(!this.spinning) return
        this.spin_progress += ctx.dt*random.float(0.5,2)
        const t = this.spin_progress / this.spin_duration
        if(t >= 1){
            this.spinning = false
            return
        }
        const angle = Numeric.lerp(
            this.spin_start_angle,
            this.spin_target_angle,
            t
        )
        ctx.human.input.rotation = angle
    }
    update(ctx: BotExecutionContext){
        if(!ctx.target_pos) return
        const self = ctx.human
        const dst_angle=v2.lookTo(ctx.human.position,ctx.target_pos)
        if(this.spinning){
            this.updateSpin(ctx)
        }else{
            self.input.rotation = Numeric.lerp_rad(
                self.physical_data.rotation,
                dst_angle+random.float(-this.angle_variation,this.angle_variation),
                Numeric.dt_expo_inter(this.aim_follow+(this.aim_follow_variation*Math.random()),ctx.dt)
            )
        }
    }
}
export enum QuickswitchType{
    None = 0,
    Dual,
    AR,
    Single,
}
export type QuickswitchSettings={
    type:QuickswitchType.None
    weapon:number
}|{
    type:QuickswitchType.Dual
    primary_weapon:number
    secondary_weapon:number
    switch_delay:number
    cycle_delay:number
}|{
    type:QuickswitchType.AR
    main_weapon:number
    alt_weapon:number
    switch_delay:number
    burst_delay:number
}|{
    type:QuickswitchType.Single
    main_weapon:number
    alt_weapon:number
    switch_delay:number
    cycle_delay:number
}
export class AttackingController extends BotExecutor {
    cycle_step = 0
    cycle_timer = 0

    quickswitch:QuickswitchSettings = {
        type: QuickswitchType.None,
        weapon:0,
    }

    private switchWeapon(human:Human, hand:number){
        human.input.actions.push({
            type: InputActionType.set_hand,
            hand: hand
        })
    }
    private shoot(human:Human){
        human.input.using_item = true
        human.input.using_item_down = true
    }
    update(ctx: BotExecutionContext){
        const human = ctx.human

        if(this.cycle_timer > 0){
            this.cycle_timer -= ctx.dt
            if(this.cycle_timer < 0)this.cycle_timer=0
        }

        switch(this.quickswitch.type){
            // ========================
            // No quickswitch
            // ========================
            case QuickswitchType.None:
                if(human.inventory.weapon_idx!==this.quickswitch.weapon){
                    this.switchWeapon(human,this.quickswitch.weapon)
                }else{
                    this.shoot(human)
                }
                break
            // ========================
            // Dual weapon quickswitch
            // ========================
            case QuickswitchType.Dual: {
                const qs = this.quickswitch
                switch(this.cycle_step){
                    // shot primary
                    case 0:
                        if(this.cycle_timer === 0){
                            this.shoot(human)
                            this.cycle_timer = qs.switch_delay
                            this.cycle_step = 1
                            ctx.spin(human, random.float(0.3,0.4))
                        }
                        break
                    // switch to secondary
                    case 1:
                        if(this.cycle_timer === 0){
                            this.switchWeapon(human, qs.secondary_weapon)
                            this.cycle_timer = qs.switch_delay*2
                            this.cycle_step = 2
                        }
                        break
                    // shot secondary
                    case 2:
                        if(this.cycle_timer === 0){
                            this.shoot(human)
                            this.cycle_timer = qs.switch_delay
                            this.cycle_step = 3
                            ctx.spin(human, random.float(0.3,0.4))
                        }
                        break
                    // switch back to primary (recoil cancel)
                    case 3:
                        if(this.cycle_timer === 0){
                            this.switchWeapon(human, qs.primary_weapon)
                            this.cycle_timer = qs.cycle_delay
                            this.cycle_step = 0
                        }
                        break
                }
                break
            }
            // ========================
            // AR quickswitch
            // ========================
            case QuickswitchType.AR: {
                const qs = this.quickswitch
                switch(this.cycle_step){
                    // main weapon shot
                    case 0:
                        this.shoot(human)
                        if(this.cycle_timer === 0){
                            ctx.spin(human, random.float(0.3,0.4))
                            this.cycle_timer = qs.switch_delay
                            this.cycle_step = 1
                        }
                        break
                    // switch to AR
                    case 1:
                        if(this.cycle_timer === 0){
                            this.switchWeapon(human, qs.alt_weapon)
                            this.cycle_timer = qs.burst_delay
                            this.cycle_step = 2
                        }
                        break
                    // AR burst
                    case 2:
                        this.shoot(human)
                        if(this.cycle_timer === 0){
                            this.switchWeapon(human, qs.main_weapon)
                            this.cycle_timer = qs.switch_delay*2
                            this.cycle_step = 0
                        }
                        break
                }

                break
            }
            // ========================
            // Single weapon quickswitch
            // ========================
            case QuickswitchType.Single: {
                const qs = this.quickswitch
                switch(this.cycle_step){
                    // shot main weapon
                    case 0:
                        if(this.cycle_timer === 0){
                            this.shoot(human)
                            this.cycle_timer = qs.switch_delay
                            this.cycle_step = 1
                            ctx.spin(human, random.float(0.3,0.4))
                        }
                        break
                    // switch to melee (cancel recoil)
                    case 1:
                        if(this.cycle_timer === 0){
                            this.switchWeapon(human, qs.alt_weapon)
                            this.cycle_timer = qs.switch_delay
                            this.cycle_step = 2
                        }
                        break
                    // switch back to weapon
                    case 2:
                        if(this.cycle_timer === 0){
                            this.switchWeapon(human, qs.main_weapon)
                            this.cycle_timer = qs.cycle_delay
                            this.cycle_step = 0
                        }
                        break
                }
                break
            }
        }
    }
    start(){
        if(!this.activated)return
        this.activated=true
        this.cycle_timer=0
        switch(this.quickswitch.type){
            case QuickswitchType.None:
                break
            case QuickswitchType.Dual:
                this.cycle_step=3
                break
            case QuickswitchType.AR:
                this.cycle_step=2
                break
            case QuickswitchType.Single:
                this.cycle_step=3
                break
        }
    }
    quickswitable(weapon?:WeaponDef){
        return weapon && (
            weapon.item_type===InventoryItemType.melee ||
            (weapon.item_type===InventoryItemType.gun && weapon.fire_delay>=0.6)
        )
    }
    choose_quickswitch(ctx:BotExecutionContext){
        const w1=ctx.human.inventory.weapons[1]
        const w2=ctx.human.inventory.weapons[2]

        if(!w1 && !w2){
            this.quickswitch = { type:QuickswitchType.None, weapon:0 }
            return
        }
        if(w1 && w2){
            const w1s=this.quickswitable(w1.def as GunDef)
            const w2s=this.quickswitable(w2.def as GunDef)
            if(w1s&&w2s){
                this.quickswitch={
                    type:QuickswitchType.Dual,
                    primary_weapon:1,
                    secondary_weapon:2,
                    switch_delay:0.2,
                    cycle_delay:Math.max(
                        (w1.def as GunDef).fire_delay,
                        (w2.def as GunDef).fire_delay
                    )
                }
                return
            }else if(w1s&&!w2s){
                this.quickswitch={
                    type:QuickswitchType.AR,
                    main_weapon:1,
                    alt_weapon:2,
                    switch_delay:.2,
                    burst_delay:(((w2.def as GunDef).reload?.capacity??0)*0.25*(w2.def as GunDef).fire_delay)+((w2.def as GunDef).switch_delay??0)
                }
                return
            }else if(!w1s&&w2s){
                this.quickswitch={
                    type:QuickswitchType.AR,
                    main_weapon:2,
                    alt_weapon:1,
                    switch_delay:.2,
                    burst_delay:(((w1.def as GunDef).reload?.capacity??0)*0.25*(w1.def as GunDef).fire_delay)+((w1.def as GunDef).switch_delay??0)
                }
                return
            }
        }
        if(w1){
            this.quickswitch={
                type:QuickswitchType.None,
                weapon:1
            }
        }
    }
}
export class LootGoal extends GoalNode<BotExecutionContext> {
    target?: Loot

    override score(ctx: BotExecutionContext): number {
        let bestScore=0
        let bestTarget:Loot|undefined
        for(const obj of ctx.visible_objects){
            if(obj.number_type!==GameObjectType.Loot)continue
            if(ctx.ai.gifts[obj.id])continue
            const loot=obj as Loot
            const itemScore = ctx.ai.get_item_score(loot.loot_data.item)
            if(itemScore<=0)continue

            const dist = v2.distance(ctx.human.position,loot.position)

            const maxLootDistance = Numeric.lerp(10,50,ctx.ai.params.game_notion / 100)
            const distanceFactor = 1 - Numeric.clamp(dist / maxLootDistance,0,1)
            const score=(itemScore * 60)+(distanceFactor * 40)

            if (score > bestScore) {
                bestScore = score
                bestTarget = loot
            }
        }
        if (!bestTarget || bestScore < 20){
            this.target=undefined
            return 0
        }
        this.target = bestTarget
        return bestScore
    }
    override tick(ctx: BotExecutionContext): BTState {
        if(!this.target||this.target.destroyed)return BTState.Failure

        ctx.ai.controller.movement.activated=true
        ctx.ai.controller.movement.set_target(this.target.position,true)

        const dist = v2.distance(ctx.human.position,this.target.position)
        if (dist <= 0.1) {
            ctx.human.input.interaction = true
            return BTState.Success
        }
        return BTState.Running
    }

    override exit(ctx: BotExecutionContext) {
        this.target = undefined
        ctx.ai.controller.movement.clear()
        ctx.ai.controller.movement.activated = false
    }
}
export class SupportAllyGoal extends GoalNode<BotExecutionContext> {
    requester?: Human
    item?: GameItem
    timer:number=0
    override score(ctx: BotExecutionContext): number {
        if(this.requester)return 80
        for(const ally of ctx.nearby_allies){
            if(!ally.loadout.emote_is_item||!ally.loadout.emote)continue

            const item = ally.loadout.emote as GameItem
            if(item.item_type !== InventoryItemType.ammo)continue
            const percent = ((ctx.human.inventory.aitems[item.idString] ?? 0)/ctx.human.inventory.item_limit(item))*100
            if(percent===0||percent>ctx.ai.params.team_work)continue

            this.requester = ally
            this.item = item
            this.timer=2
            return 80
        }
        return 0
    }
    override tick(ctx: BotExecutionContext): BTState {
        if(!this.requester || !this.item)return BTState.Failure

        ctx.ai.controller.movement.set_target(this.requester.position,true)
        const dist = v2.distance(ctx.human.position,this.requester.position)
        if(dist < 4){
            this.timer-=ctx.dt
            ctx.ai.controller.movement.activated=false
            if(this.timer<=0){
                const loot=ctx.human.inventory.drop_aitem(this.item.idNumber)
                if(ctx.ai.group_mode&&loot)ctx.ai.gifts[loot.id]={
                    loot,
                    expire_timer:6
                }
                return BTState.Success
            }
        }else{
            ctx.ai.controller.movement.activated=true
            this.timer=1
        }
        return BTState.Running

    }
    override exit(ctx: BotExecutionContext) {
        this.requester = undefined
        this.item = undefined
        ctx.ai.controller.movement.activated=false
        ctx.ai.controller.movement.clear()
    }
}
export class StayWithGroupGoal extends GoalNode<BotExecutionContext> {
    ally?: Human

    private get_urgency(ctx: BotExecutionContext): number {
        if (!this.ally)return 0

        const dominance = ctx.ai.params.team_dominance / 100
        if (dominance >= 1)return 0

        const minDistance = 10 + (100 * dominance)
        const maxDistance = minDistance * 2

        const dist = v2.distance(ctx.human.position,this.ally.position)

        return Numeric.clamp((dist - minDistance) / (maxDistance - minDistance),0,1)
    }
    override score(ctx: BotExecutionContext): number {
        this.ally = ctx.ai.get_follow_target()
        if (!this.ally) return 0

        const urgency = this.get_urgency(ctx)
        return urgency >= 0.2 ?urgency*150:0
    }
    override tick(ctx: BotExecutionContext): BTState {
        if (!this.ally)return BTState.Failure

        const urgency = this.get_urgency(ctx)
        if (urgency <= 0)return BTState.Success

        ctx.ai.controller.movement.activated = true
        ctx.ai.controller.movement.set_target(this.ally.position,true)
        return BTState.Running
    }
    override exit(ctx: BotExecutionContext){
        ctx.ai.controller.movement.clear()
        ctx.ai.controller.movement.activated=true
    }
}
export class ADVHumanAI extends BotAi{
    controller={
        aim:new AimController(),
        attacking:new AttackingController(),
        movement:new MovementController(),
    }

    first_tick:boolean=true

    planner:BTGoalPlanner<BotExecutionContext>

    group_mode:boolean
    gifts:Record<number,{
        loot: Loot
        expire_timer: number
    }>={}

    ctx:BotExecutionContext
    constructor(human:Human,allow_group_mode:boolean=true){
        super(human)
        this.group_mode=allow_group_mode
        this.params={
            aim_skills:random.float(0,100),
            quick_switch_skills:random.float(0,100),
            game_notion:random.float(0,100),
            bravery:random.float(0,100),
            team_work:random.float(0,100),
            team_dominance:random.float(0,100),
        }
        this.planner=new BTGoalPlanner([
            ...(allow_group_mode?[
                new LootGoal(),
                new StayWithGroupGoal(),
                new SupportAllyGoal(),
            ]:[])
        ].filter(Boolean))

        this.ctx={
            ai:this,
            dt:0,
            human:this.human,
            nearby_allies:[],
            nearby_enemies:[],
            visible_objects:[],
            vision_hitbox:new CircleHitbox2D(v2.zero(),0),
            spin:this.controller.aim.startSpin.bind(this.controller.aim.startSpin),
        }
    }
    override AI(dt: number): void {
        this.reset_inputs()

        if(this.human!==this.ctx.human){
            this.gifts={}
        }
        for(const g in this.gifts){
            const gift=this.gifts[g]
            gift.expire_timer-=dt
            if(gift.expire_timer<=0)delete this.gifts[g]
        }

        this.ctx.dt=dt
        this.ctx.vision_hitbox.position=this.human.position
        this.ctx.vision_hitbox.radius=this.human.scope_zoom
        this.ctx.nearby_allies.length=0
        this.ctx.nearby_enemies.length=0
        this.ctx.visible_objects.length=0



        const objects:ServerGameObject[]=this.human.manager.cells.get_objects(this.ctx.vision_hitbox,this.human.layer)
        for(const obj of objects){
            if(!obj.hitbox.colliding_with(this.ctx.vision_hitbox))continue
            this.ctx.visible_objects.push(obj)
            if(obj.number_type===GameObjectType.Human){
                if(obj.id===this.human.id||(obj as Human).dead)continue
                if(this.human.game.modeManager.is_ally((obj as Human),this.human)){
                    this.ctx.nearby_allies.push((obj as Human))
                }else{
                    this.ctx.nearby_enemies.push((obj as Human))
                }
            }
        }

        this.planner.tick(this.ctx,dt)

        if(this.controller.aim.activated){
            this.controller.aim.update(this.ctx)
        }
        if(this.controller.attacking.activated){
            this.controller.attacking.update(this.ctx)
        }
        if(this.controller.movement.activated){
            this.controller.movement.update(this.ctx)
        }
    }
    override net_update(_general_update: Stream): void {
        this.planner.next_node(this.ctx)
    }
    get_item_score(item:GameItem):number{
        switch(item.item_type!){
            case InventoryItemType.gun:
                break
            case InventoryItemType.ammo:{
                const percent=(this.human.inventory.aitems[item.idString]??0)/this.human.inventory.item_limit(item)
                if(percent===1)return 0
                return 1-percent
            }
            case InventoryItemType.consumible:
                break
            case InventoryItemType.helmet:
                return (this.human.equipment_data.helmet?.level??0)<(item as HelmetDef).level?1:0
            case InventoryItemType.vest:
                return (this.human.equipment_data.vest?.level??0)<(item as VestDef).level?1:0
            case InventoryItemType.backpack:
                return (this.human.equipment_data.vest?.level??0)<(item as BackpackDef).level?1:0
            case InventoryItemType.grenade:
            case InventoryItemType.melee:
            case InventoryItemType.accessory:
                break
            case InventoryItemType.scope:
                return this.human.inventory.iitems.includes(item)?0:1
        }
        return 0
    }
    get_weapon_score(slot:number,weapon:WeaponDef):number{
        return 0
    }

    // Mask Distance
    will_reload(){
        const h=this.human
        return h.inventory.hand_item?.item_type === InventoryItemType.gun && (
            (h.inventory.hand_item as GunItem).reloading ||
            !(h.inventory.hand_item as GunItem).has_ammo(h)
        )
    }
    is_aim_aligned(target:Vec2){
        const self=this.human
        const desired = Math.atan2(
            target.y - self.position.y,
            target.x - self.position.x
        )
        return Math.abs(
            Angle.delta_rad(self.physical_data.rotation, desired)
        ) <= 1
    }
    get_follow_target(): Human | undefined {
        const allies = this.human.team_data.group?.get_living_humans?.()
        if (!allies) return
        let nearest: Human | undefined
        let nearestDist = Infinity
        for (const ally of allies) {
            if (ally === this.human) continue
            const dist = v2.distance(this.human.position,ally.position)
            if (dist < nearestDist) {
                nearestDist = dist
                nearest = ally
            }
        }
        return nearest
    }
    protected isPlayerVisible(other: Human): boolean {
        const dist=v2.distance(this.human.position, other.position)
        if(other.dead || !other.is_player) return false
        return dist<=12
    }
}