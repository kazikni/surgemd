import { Angle, astar_path2d, BTAction, BTSelector, BTSequence, BTState, Stream, Numeric, random, v2, Vec2, CircleHitbox2D } from "common/engine/core.ts";
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
    path_finding:boolean=false
    path?: Vec2[]
    path_index = 0
    follow_path = false
    rotate_to = false

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
    set_target(target:Vec2,path_finding:boolean){
        if(!this.target){
            this.path_finding=path_finding
            this.repath_timer=0
        }
        this.target=target
    }
    calculate_path(ctx: BotExecutionContext) {
        if(!this.target)return
        this.path = astar_path2d(
            ctx.human,
            ctx.human.base_hitbox,
            this.target!,
            ctx.human.isBlockedForPath.bind(self),
            {
                cellSize:0.25,
                dirs:[
                    [1,0],[0,1],[-1,0],[0,-1],
                    [1,1],[-1,-1],[-1,1],[1,-1]
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
        if (v2.distance(ctx.human.position, node) < 0.01) {
            this.path_index++
            return
        }

        const dir=v2.lookTo(ctx.human.position, node)
        ctx.human.input.movement = {
            dir,
            scale: 1
        }

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
type ADVHumanAICurrentState = {
    timer?: number
}&({
    type: 0
    stage: 0 | 1 | 2
    timer: number
    item:GameItem
    sender:Human
}|{
    type: 1
    target: Vec2
    ideal_distance: number
    urgency: number
}|{
    type: 2
    loot_type: number
    obj: ServerGameObject
    timer: number
})
export const tree_action_functions={
    // Team
    proccess_allies(ctx){
        if(ctx.ai.current_state?.type===0)return BTState.Running
        for(const a of ctx.nearby_allies){
            if(a.loadout.emote_is_item&&a.loadout.emote){
                const item=(a.loadout.emote as GameItem)
                switch(item.item_type!){
                    case InventoryItemType.ammo:{
                        const percentAmmo = ((ctx.human.inventory.aitems[item.idString]??0)/ctx.human.inventory.item_limit(item))*100
                        if(percentAmmo==0||percentAmmo>ctx.ai.params.team_work)continue
                        ctx.ai.current_state={
                            type:0,
                            item:item,
                            sender:a,
                            stage:0,
                            timer:0
                        }
                        return BTState.Running
                    }
                }
            }
        }
        return BTState.Failure
    },
    support_request(ctx){
        if(ctx.ai.current_state?.type!==0)return BTState.Failure
        const req=ctx.ai.current_state
        switch(req.stage){
            case 0:{
                ctx.ai.controller.movement.activated = true
                ctx.ai.controller.movement.set_target(req.sender.position,true)
                const dist = v2.distance(ctx.human.position,req.sender.position)
                if(dist <= 4){
                    req.stage = 1
                    req.timer = random.float(0.5,1.5)
                    ctx.ai.controller.movement.clear()
                }
                break
            }
            case 1:
                ctx.ai.controller.aim.activated = true
                ctx.target_pos = req.sender.position
                if(req.timer <= 0){
                    req.stage = 2
                }
                break
            case 2:
                ctx.human.inventory.drop_aitem(req.item.idNumber)
                ctx.ai.current_state = undefined
                return BTState.Success
        }
        return BTState.Running
    },
    process_group(ctx: BotExecutionContext) {
        if(ctx.ai.current_state)return BTState.Failure
        const ally=ctx.ai.get_follow_target()
        if(!ally)return BTState.Failure
        const t=ctx.ai.params.team_work_dominance/100
        const maxDistance=4+Math.pow(t,2)*30
        const idealDistance = Numeric.lerp(2,50,t)
        const dist = v2.distance(ctx.human.position,ally.position)
        const urgency = Numeric.clamp((dist - maxDistance) / maxDistance,0,1)

        if(urgency <= 0)return BTState.Failure
        if(Math.random() > urgency)return BTState.Failure

        ctx.ai.current_state = {
            type:1,
            target:v2.clone(ally.position),
            ideal_distance:idealDistance,
            urgency
        }

        return BTState.Running
    },
    get_close(ctx: BotExecutionContext) {
        if(ctx.ai.current_state?.type !== 1) return BTState.Failure
        const state = ctx.ai.current_state
        const dist = v2.distance(ctx.human.position,state.target)
        if(dist <= state.ideal_distance){
            ctx.ai.current_state = undefined
            ctx.ai.controller.movement.clear()
            return BTState.Success
        }
        ctx.ai.controller.movement.activated = true
        if(!ctx.ai.controller.movement.target || v2.distance(ctx.ai.controller.movement.target,state.target) > 2){
            ctx.ai.controller.movement.set_target(state.target,true)
        }
        return BTState.Running
    },

    //General
    process_loot(ctx){
        if(ctx.ai.current_state){
            return ctx.ai.current_state.type !== 2?BTState.Success:BTState.Failure
        }
        let bestScore = 0
        let bestTarget:Loot|Obstacle|undefined = undefined
        let bestLootType=0
        for(const obj of ctx.visible_objects){
            if(obj.number_type===GameObjectType.Loot){
                const dist=v2.distance(obj.position,ctx.human.position)
                const score=ctx.ai.get_item_score((obj as Loot).loot_data.item)-dist*3
                if(score > bestScore){
                    bestScore = score
                    bestTarget = obj as Loot
                    bestLootType=0
                }
            }
        }
        if(bestScore < 20||!bestTarget){
            return BTState.Failure
        }
        ctx.ai.current_state = {
            type:2,
            loot_type:bestLootType,
            obj:bestTarget,
            timer:random.float(2,6)
        }
        return BTState.Success
    },
    loot(ctx){
        if(ctx.ai.current_state?.type !== 2) return BTState.Failure
        const state = ctx.ai.current_state
        state.timer -= ctx.dt
        if(state.timer <= 0){
            ctx.ai.current_state = undefined
            return BTState.Success
        }

        ctx.ai.controller.movement.activated = true
        ctx.ai.controller.movement.set_target(state.obj.position,true)

        const dist = v2.distance(ctx.human.position,state.obj.position)

        switch(state.loot_type){
            case 0:
                if(dist < 0.1){
                    ctx.human.input.interaction = true
                    ctx.ai.controller.movement.clear()
                    ctx.ai.current_state = undefined
                }
                break
            case 1:
                if(dist < 2){
                    ctx.ai.current_state = undefined
                }
                break
        }
        return BTState.Running
    },
    reset(ctx){
        ctx.ai.controller.aim.activated=false
        ctx.ai.controller.attacking.activated=false
        ctx.ai.controller.movement.activated=false
        return BTState.Running
    }
} satisfies Record<string,(ctx: BotExecutionContext) => BTState>
export function make_adv_human_ai_tree(allow_group_mode:boolean=true):BTSelector<BotExecutionContext>|undefined{
    if(allow_group_mode){
        return new BTSelector([
            new BTSequence([
                new BTAction(tree_action_functions.process_group),
            ]),
            /*new BTSequence([
                new BTAction(tree_action_functions.process_loot),
            ]),*/
            new BTSequence([
                new BTAction(tree_action_functions.proccess_allies),
            ]),

            new BTAction(tree_action_functions.support_request),
            new BTAction(tree_action_functions.get_close),
            new BTAction(tree_action_functions.loot),
            new BTAction(tree_action_functions.reset)
        ])
    }
}
export class ADVHumanAI extends BotAi{
    controller={
        aim:new AimController(),
        attacking:new AttackingController(),
        movement:new MovementController(),
    }

    first_tick:boolean=true
    current_state?: ADVHumanAICurrentState

    tree:BTSelector<BotExecutionContext>
    constructor(human:Human){
        super(human)
        this.tree = make_adv_human_ai_tree()!
        this.params={
            aim_skills:random.float(0,100),
            quick_switch_skills:random.float(0,100),
            game_notion:random.float(0,100),
            bravery:random.float(0,100),
            team_work:random.float(0,100),
            team_work_dominance:random.float(0,100),
        }
    }
    override AI(dt: number): void {
        this.reset_inputs()

        let target:Human|undefined

        for(const p of this.human.game.humans.humans){
            if(p.id===this.human.id) continue
            if(!p.game.modeManager.is_ally(p,this.human) && this.isPlayerVisible(p)){
                target = p
                break
            }
        }

        const ctx:BotExecutionContext={
            dt,
            human:this.human,
            target,
            target_pos:target?.position,
            nearby_allies:[],
            nearby_enemies:[],
            visible_objects:[],
            vision_hitbox:new CircleHitbox2D(this.human.position,this.human.scope_zoom),
            ai:this,
            spin:this.controller.aim.startSpin.bind(this.controller.aim)
        }

        if(this.current_state&&this.current_state.timer!==undefined&&this.current_state.timer>0){
            this.current_state.timer -= ctx.dt
        }

        const objects:ServerGameObject[]=this.human.manager.cells.get_objects(ctx.vision_hitbox,this.human.layer)
        for(const obj of objects){
            if(!obj.hitbox.colliding_with(ctx.vision_hitbox))continue
            ctx.visible_objects.push(obj)
            if(obj.number_type===GameObjectType.Human){
                if(obj.id===this.human.id)continue
                if(this.human.game.modeManager.is_ally((obj as Human),this.human)){
                    ctx.nearby_allies.push((obj as Human))
                }else{
                    ctx.nearby_enemies.push((obj as Human))
                }
            }
        }
        this.tree.tick(ctx)

        if(this.controller.aim.activated){
            this.controller.aim.update(ctx)
        }
        if(this.controller.attacking.activated){
            this.controller.attacking.update(ctx)
        }
        if(this.controller.movement.activated){
            this.controller.movement.update(ctx)
        }
    }
    override net_update(general_update: Stream): void {
        //throw new Error("Method not implemented.");
    }
    get_item_score(item:GameItem):number{
        switch(item.item_type!){
            case InventoryItemType.gun:
                break
            case InventoryItemType.ammo:{
                const percent=((this.human.inventory.aitems[item.idString]??0)/this.human.inventory.item_limit(item))*100
                if(percent===100)return 0
                return 100-percent
            }
            case InventoryItemType.consumible:
            case InventoryItemType.helmet:
            case InventoryItemType.vest:
            case InventoryItemType.grenade:
            case InventoryItemType.melee:
            case InventoryItemType.accessory:
            case InventoryItemType.backpack:
            case InventoryItemType.scope:
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