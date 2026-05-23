import { Angle, astar_path2d, BTAction, BTCondition, BTNode, BTSelector, BTSequence, BTState, NetStream, Numeric, random, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type Human } from "../../objects/human.ts";
import { BotAi } from "./simple_bot_ai.ts";
import { InputActionType } from "common/scripts/packets/input_packet.ts";
import { InventoryItemType } from "common/scripts/definitions/utils.ts";
import { GunItem } from "../inventory.ts";
import { WeaponDef } from "common/scripts/definitions/game_defs.ts";
import { GunDef } from "common/scripts/definitions/items/guns.ts";
import { Spawn } from "common/scripts/others/constants.ts";
export type BotExecutionContext = {
    human: Human
    target?: Human
    target_pos?: Vec2
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
    move_target?: Vec2

    path?: Vec2[]
    path_index = 0

    pathfinding = false
    rotate_to = false

    repath_timer = 0
    repath_delay = 1

    use_discrete_movement = true
    discrete_directions = 8
    last_dir = 0
    dir_change_delay = 0.08
    dir_timer = 0

    orbit_side = random.choose([-1,1])
    orbit_timer = random.float(1.5,3)
    orbit_distance = 6

    state:0|1|2=0
    reset(){
        this.move_target = undefined
        this.path = undefined
        this.path_index = 0
        this.pathfinding = false
    }
    setTarget(pos:Vec2){
        this.move_target = pos
        this.path = undefined
        this.pathfinding = false
    }
    setPathTarget(pos:Vec2){
        this.move_target = pos
        this.pathfinding = true
        this.path = undefined
        this.path_index = 0
    }

    private computePath(ctx:BotExecutionContext){
        const self = ctx.human
        if(!this.move_target) return
        this.path = astar_path2d(
            self,
            self.base_hitbox,
            this.move_target,
            self.isBlockedForPath.bind(self),
            {
                cellSize:0.5,
                dirs:[
                    [1,0],[0,1],[-1,0],[0,-1],
                    [1,1],[-1,-1],[-1,1],[1,-1]
                ]
            },
        )
        this.path_index = 0
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
    update_orbit(dt:number){
        this.orbit_timer -= dt
        if(this.orbit_timer <= 0){
            this.orbit_side *= -1
            this.orbit_timer = random.float(0.5,3)
        }
    }
    compute_orbit_pos(ctx:BotExecutionContext){
        if(!ctx.target_pos)return
        const self=ctx.human
        const to=v2.sub(ctx.target_pos,self.position)
        const dir=Math.atan2(to.y,to.x)

        const orbitDir = dir + Math.PI/2 * this.orbit_side

        return v2.add(
            ctx.target_pos,
            v2.from_RadAngle(orbitDir, this.orbit_distance)
        )
    }
    update(ctx: BotExecutionContext){
        const human = ctx.human
        let movement = { dir: 0, scale: 0 }
        let rotation: number | undefined = undefined
        if(!this.move_target){
            human.input.movement = movement
            return
        }
        if(this.pathfinding){
            this.repath_timer -= ctx.dt
            if(!this.path || this.repath_timer <= 0){
                this.computePath(ctx)
                this.repath_timer = this.repath_delay
            }
            if(!this.path || this.path.length === 0){
                this.reset()
            }else{
                if(this.path_index >= this.path.length){
                    this.reset()
                }else{
                    const node = this.path[this.path_index]
                    const to = v2.sub(node, human.position)
                    const dist = v2.len(to)

                    if(dist < 0.5){
                        this.path_index++
                    }else{
                        let dir = Math.atan2(to.y, to.x)
                        dir = this.quantizeDir(dir, ctx.dt)

                        movement = { dir, scale: 1 }

                        if(this.rotate_to){
                            rotation = dir
                        }
                    }
                }
            }
        }else{
            const dist = v2.distance(human.position, this.move_target)
            if(dist < 0.5){
                this.reset()
            }else{
                let dir = v2.lookTo(human.position, this.move_target)
                dir = this.quantizeDir(dir, ctx.dt)
                movement = { dir, scale: 1 }
                if(this.rotate_to){
                    rotation = dir
                }
            }
        }
        human.input.movement = movement
        if(rotation !== undefined){
            human.input.rotation = rotation
        }
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
            (weapon.item_type===InventoryItemType.gun && weapon.fireDelay>=0.6)
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
                        (w1.def as GunDef).fireDelay,
                        (w2.def as GunDef).fireDelay
                    )
                }
                return
            }else if(w1s&&!w2s){
                this.quickswitch={
                    type:QuickswitchType.AR,
                    main_weapon:1,
                    alt_weapon:2,
                    switch_delay:.2,
                    burst_delay:(((w2.def as GunDef).reload?.capacity??0)*0.25*(w2.def as GunDef).fireDelay)+((w2.def as GunDef).switchDelay??0)
                }
                return
            }else if(!w1s&&w2s){
                this.quickswitch={
                    type:QuickswitchType.AR,
                    main_weapon:2,
                    alt_weapon:1,
                    switch_delay:.2,
                    burst_delay:(((w1.def as GunDef).reload?.capacity??0)*0.25*(w1.def as GunDef).fireDelay)+((w1.def as GunDef).switchDelay??0)
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

// AI
export class CombatNode implements BTNode<BotExecutionContext> {
    tick(ctx: BotExecutionContext): BTState {
        if (!ctx.target_pos) return BTState.Failure
        const dist = v2.distance(ctx.human.position, ctx.target_pos)
        ctx.human.input.reload = ctx.ai.will_reload()
        ctx.ai.controller.aim.activated = true
        ctx.ai.controller.movement.activated = true
        if(dist>1&&dist<20&&ctx.ai.is_aim_aligned(ctx.target_pos)&&!ctx.human.input.reload){
            ctx.ai.controller.attacking.choose_quickswitch(ctx)
            ctx.ai.controller.attacking.activated = true
        }else if(dist < 1){
            ctx.ai.controller.attacking.quickswitch = {
                type: QuickswitchType.None,
                weapon: 0
            }
            ctx.ai.controller.attacking.activated = true
        }else {
            ctx.ai.controller.attacking.activated = false
        }
        return BTState.Running
    }
}
export class CombatMovementNode implements BTNode<BotExecutionContext> {
    tick(ctx: BotExecutionContext): BTState {
        const ai = ctx.ai
        const human = ctx.human
        const target = ctx.target
        if (!target || !ctx.target_pos) return BTState.Failure
        const move = ai.controller.movement
        const dist = v2.distance(human.position, target.position)
        move.update_orbit(ctx.dt)
        let targetPos: Vec2 | undefined
        if (dist < 2) {
            const dir = v2.lookTo(target.position, human.position)
            targetPos = v2.add(
                human.position,
                v2.from_RadAngle(dir, 4)
            )
        }else if (dist < 10) {
            targetPos = move.compute_orbit_pos(ctx)
        }else {
            targetPos = target.position
        }

        if (targetPos) {
            if(!move.move_target||v2.distance(move.move_target, targetPos) > 0.5){
                move.setTarget(targetPos)
            }
            move.activated = true
            return BTState.Running
        }

        return BTState.Failure
    }
}
class RandomWalkNode implements BTNode<BotExecutionContext> {
    private timer = 0

    tick(ctx: BotExecutionContext): BTState {
        this.timer -= ctx.dt
        if(!ctx.ai.controller.movement.path || this.timer <= 0){
            this.timer = random.float(10,30)

            const pos = ctx.human.game.map.getRandomPosition(ctx.human.base_hitbox,ctx.human.id,ctx.human.layer,Spawn.grass,ctx.human.game.map.random,(h,m,r)=>{
                const ret=r.random_in_circle(30)
                v2m.add(ret,ret,ctx.human.position)
                m.clamp(ret)
                return ret
            },(hb,id,layer,mode,map)=>{
                return !map.game.deadzone.is_on_deadzone(hb.center())&&map.point_is_valid(hb,id,layer,mode,map)
            })
            if(pos)ctx.ai.controller.movement.setPathTarget(pos)
        }
        ctx.ai.controller.aim.activated=false
        ctx.ai.controller.movement.activated = true
        return BTState.Running
    }
}
export class ADVHumanAI extends BotAi{
    controller={
        aim:new AimController(),
        attacking:new AttackingController(),
        movement:new MovementController()
    }

    first_tick:boolean=true

    tree:BTSelector<BotExecutionContext>
    constructor(human:Human){
        super(human)
        const combat=new CombatNode()
        const combat_movement=new CombatMovementNode()
        this.tree = new BTSelector([
            new BTSequence([
                new BTCondition(ctx => !!ctx.target),
                combat,
                combat_movement
            ]),
            new BTSequence([
                new RandomWalkNode(),
                new BTAction(ctx => {
                    this.controller.attacking.activated=false
                    return BTState.Running
                })
            ]),
            new BTAction(ctx => {
                this.controller.aim.activated=false
                this.controller.attacking.activated=false
                this.controller.movement.activated=false
                return BTState.Running
            })
        ])
    }
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
    protected isPlayerVisible(other: Human): boolean {
        const dist=v2.distance(this.human.position, other.position)
        if(other.health_data.dead || !other.is_player) return false
        return dist<=12
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
            ai:this,
            spin:this.controller.aim.startSpin.bind(this.controller.aim)
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
    override net_update(general_update: NetStream): void {
        //throw new Error("Method not implemented.");
    }
}