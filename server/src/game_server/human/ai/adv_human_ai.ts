import { Angle, astar_path2d, Numeric, random, v2, Vec2 } from "common/engine/core.ts";
import { type Human } from "../../objects/human.ts";
import { BotAi } from "./simple_bot_ai.ts";
import { NetStream } from "common/engine/core/net/stream.ts";
import { InputActionType } from "common/scripts/packets/input_packet.ts";
import { InventoryItemType } from "common/scripts/definitions/utils.ts";
import { type GunItem } from "../inventory.ts";
import { type GunDef } from "common/scripts/definitions/items/guns.ts";
import { WeaponDef } from "common/scripts/definitions/game_defs.ts";

export type BotExecutionContext = {
    human: Human
    target?: Human
    target_pos?: Vec2
    dt: number
    spin:(human:Human, duration:number)=>void
}
export abstract class BotExecutor{
    activated:boolean=false
    constructor() {
        
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
            { cellSize:0.5 }
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
    update(ctx:BotExecutionContext){
        const human = ctx.human
        if(!this.move_target){
            human.input.movement = {dir:0,scale:0}
            return
        }

        if(this.pathfinding){
            this.repath_timer -= ctx.dt
            if(!this.path || this.repath_timer <= 0){
                this.computePath(ctx)
                this.repath_timer = this.repath_delay
            }
            const node = this.path?.[this.path_index]
            if(!node){
                this.path = undefined
                return
            }
            const to = v2.sub(node,human.position)
            if(v2.len(to) < 0.4){
                this.path_index++
                return
            }
            let dir = Math.atan2(to.y,to.x)
            dir = this.quantizeDir(dir, ctx.dt)
            human.input.movement = {
                dir:dir,
                scale:1
            }
            if(this.rotate_to){
                human.input.rotation = dir
            }
            return
        }
        let dir = v2.lookTo(human.position,this.move_target)
        dir = this.quantizeDir(dir,ctx.dt)
        human.input.movement = {
            dir:dir,
            scale:1
        }
        if(this.rotate_to){
            human.input.rotation = dir
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
        this.spin_progress += ctx.dt
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
}
export class CombatBrain{
    ai:ADVHumanAI

    enabled:boolean=true
    melee_distance:number=1
    firing_distance:number=20
    shoot_angle_epsilon:number=1

    switch_delay:number=0.2

    constructor(ai:ADVHumanAI){
        this.ai=ai
    }
    quickswitable(weapon?:WeaponDef){
        return weapon&&(weapon.item_type===InventoryItemType.melee||(weapon.item_type===InventoryItemType.gun&&weapon.fireDelay>=0.6))
    }
    choose_quickswitch(){
        const w1=this.ai.human.inventory.weapons[1]
        const w2=this.ai.human.inventory.weapons[2]

        if(!w1&&!w2){
            this.ai.controller.attacking.quickswitch={
                type:QuickswitchType.None,
                weapon:0
            }
            return
        }
        if(w1&&w2){
            const w1s=this.quickswitable(w1.def as GunDef)
            const w2s=this.quickswitable(w2.def as GunDef)
            if(w1s&&w2s){
                this.ai.controller.attacking.quickswitch={
                    type:QuickswitchType.Dual,
                    primary_weapon:1,
                    secondary_weapon:2,
                    switch_delay:this.switch_delay,
                    cycle_delay:Math.max((w1.def  as GunDef).fireDelay,(w2.def  as GunDef).fireDelay)
                }
                return
            }else if(w1s&&!w2s){
                this.ai.controller.attacking.quickswitch={
                    type:QuickswitchType.AR,
                    main_weapon:1,
                    alt_weapon:2,
                    switch_delay:this.switch_delay,
                    burst_delay:(((w2.def as GunDef).reload?.capacity??0)*0.25*(w2.def as GunDef).fireDelay)+((w2.def as GunDef).switchDelay??0)
                }
                return
            }else if(!w1s&&w2s){
                this.ai.controller.attacking.quickswitch={
                    type:QuickswitchType.AR,
                    main_weapon:2,
                    alt_weapon:1,
                    switch_delay:this.switch_delay,
                    burst_delay:(((w1.def as GunDef).reload?.capacity??0)*0.25*(w1.def as GunDef).fireDelay)+((w1.def as GunDef).switchDelay??0)
                }
                return
            }
        }else if(w1){
            const w1s=this.quickswitable(w1.def as GunDef)
            if(w1s){
                this.ai.controller.attacking.quickswitch={
                    type:QuickswitchType.Single,
                    alt_weapon:0,
                    main_weapon:1,
                    cycle_delay:(w1.def  as GunDef).fireDelay,
                    switch_delay:this.switch_delay,
                }
            }else{
                this.ai.controller.attacking.quickswitch={
                    type:QuickswitchType.None,
                    weapon:1,
                }
            }
        }
    }
    will_reload(self: Human):boolean{
        return self.inventory.hand_item?.item_type === InventoryItemType.gun &&(
            (self.inventory.hand_item as GunItem).reloading ||
            !(self.inventory.hand_item as GunItem).has_ammo(self)
        )
    }
    is_aim_aligned(self: Human, target: Vec2): boolean {
        const desired = Math.atan2(
            target.y - self.position.y,
            target.x - self.position.x
        )
        return Math.abs(
            Angle.delta_rad(self.physical_data.rotation, desired)
        ) <= this.shoot_angle_epsilon
    }
    update(ctx:BotExecutionContext){
        if(!ctx.target_pos)return
        const dist=v2.distance(ctx.human.position,ctx.target!.position)

        ctx.human.input.reload = this.will_reload(ctx.human)
        this.ai.controller.aim.activated=true

        this.ai.controller.movement.activated=true
        if(dist>this.melee_distance&&dist<this.firing_distance&&this.is_aim_aligned(ctx.human,ctx.target_pos)&&!ctx.human.input.reload){
            this.choose_quickswitch()
            this.ai.controller.attacking.activated=true
        }else if(dist<this.melee_distance){
            this.ai.controller.attacking.quickswitch={
                type:QuickswitchType.None,
                weapon:0
            }
            this.ai.controller.attacking.activated=true
        }else{
            this.ai.controller.attacking.activated=false
        }
    }
}
export class MovementBrain{
    ai:ADVHumanAI
    enabled=true

    orbit_distance=6
    orbit_side=random.choose([-1,1])

    orbit_change_timer=random.float(1.5,3)

    aggression_phase:"push"|"backoff"="push"
    aggression_timer=random.float(1.5,3)

    max_distance=20

    constructor(ai:ADVHumanAI){
        this.ai=ai
    }

    private compute_aggression(ctx:BotExecutionContext){
        const self=ctx.human
        const target=ctx.target!

        const enemyWeapon=target.inventory.hand_item
        const enemyQuick=this.ai.brain.combat.quickswitable(enemyWeapon?.def as WeaponDef)

        const healthRatio=self.health_data.health/self.health_data.max_health

        let aggression=this.ai.params.aggression

        if(enemyQuick) aggression*=0.4
        if(healthRatio<0.4) aggression*=0.3

        return Numeric.clamp(aggression,0,1)
    }
    private update_orbit_side(dt:number){
        this.orbit_change_timer-=dt
        if(this.orbit_change_timer<=0){
            this.orbit_side*=-1
            this.orbit_change_timer=random.float(0.5,3)
        }
    }
    private update_aggression_cycle(dt:number){
        this.aggression_timer-=dt
        if(this.aggression_timer<=0){
            if(this.aggression_phase==="push"){
                this.aggression_phase="backoff"
                this.aggression_timer=random.float(1.2,2)
            }else{
                this.aggression_phase="push"
                this.aggression_timer=random.float(1.2,2)
            }
        }
    }
    private update_orbit_distance(ctx:BotExecutionContext){
        const aggression=this.compute_aggression(ctx)
        const base=this.max_distance*(1-aggression)
        if(base<=2){
            if(this.aggression_phase==="push"){
                this.orbit_distance=0.1
            }else{
                this.orbit_distance=3
            }
        }else{
            this.orbit_distance=base
        }
        
    }
    private move_orbit(ctx:BotExecutionContext){
        const human=ctx.human
        const target=ctx.target!
        const toTarget=v2.sub(target.position,human.position)
        const dir=Math.atan2(toTarget.y,toTarget.x)
        const orbitDir = dir + Math.PI/2 * this.orbit_side
        const orbitPos = v2.add(
            target.position,
            v2.scale(v2.from_RadAngle(orbitDir),this.orbit_distance)
        )
        this.ai.controller.movement.setTarget(orbitPos)
    }

    update(ctx:BotExecutionContext){
        if(!ctx.target)return
        this.update_orbit_side(ctx.dt)
        this.update_aggression_cycle(ctx.dt)
        this.update_orbit_distance(ctx)
        this.ai.controller.movement.activated=true
        this.move_orbit(ctx)
    }
}
export class ADVHumanAI extends BotAi{
    controller={
        aim:new AimController(),
        attacking:new AttackingController(),
        movement:new MovementController()
    }
    brain={
        combat:new CombatBrain(this),
        movement:new MovementBrain(this)
    }
    override params={
        aggression: random.float(0,1),
    }

    first_tick:boolean=true
    constructor(human:Human){
        super(human)
    }
    override reset_inputs(): void {
        super.reset_inputs()

        this.controller.aim.activated=false
        this.controller.attacking.activated=false
        this.controller.movement.activated=false
    }
    protected isPlayerVisible(other: Human): boolean {
        const dist=v2.distance(this.human.position, other.position)
        if(other.health_data.dead || !other.is_player) return false
        return dist<=12
    }
    override AI(dt: number): void {
        this.reset_inputs()

        let t:Human|undefined=undefined
        for(const p of this.human.game.humans.humans){
            if(p.id===this.human.id)continue
            if(!p.game.modeManager.is_ally(p,this.human)&&this.isPlayerVisible(p)){
                t=p
                break
            }
        }
        const e_ctx:BotExecutionContext={
            dt:dt,
            human:this.human,
            target:t,
            target_pos:t?.position,
            spin:this.controller.aim.startSpin.bind(this.controller.aim)
        }

        if(this.brain.combat.enabled){
            this.brain.combat.update(e_ctx)
        }
        if(this.brain.movement.enabled){
            this.brain.movement.update(e_ctx)
        }

        if(this.controller.aim.activated){
            this.controller.aim.update(e_ctx)
        }
        if(this.controller.attacking.activated){
            this.controller.attacking.update(e_ctx)
        }
        if(this.controller.movement.activated){
            this.controller.movement.update(e_ctx)
        }
    }
    override net_update(general_update: NetStream): void {
        //throw new Error("Method not implemented.");
    }
}