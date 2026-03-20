import { type Game } from "../../others/game.ts";
import { NetStream, Numeric, PolarMovement, random, v2, Vec2 } from "common/engine/core.ts";
import { InputActionType } from "common/scripts/packets/input_packet.ts";
import { Human } from "../../objects/human.ts";
import { GameObjectDef } from "common/scripts/definitions/game_defs.ts";
export type AIMessage<T = any> = {
    type: string
    origin: Vec2
    sender?: BotAi
    data: T
}
export abstract class BotAi{
    // deno-lint-ignore no-explicit-any
    params:any
    human:Human

    deliveries:Record<string,(bot:BotAi,msg:AIMessage)=>void>={}
    constructor(human:Human){
        this.human=human
    }
    abstract AI(dt:number):void
    abstract net_update(general_update:NetStream):void
}
export type BotStateHandler = (self: Human,begin:boolean,dt: number) => void
export abstract class StatedBotAi<TState extends string = string> extends BotAi{
    rot_target = 0
    rot_speed = 0
    move_speed = 1

    protected movement:PolarMovement={dir:0,scale:0}
    protected state!: TState
    protected stateTime = 0
    protected stateHandlers: Partial<Record<TState, BotStateHandler>> = {}
    protected setState(state: TState, resetTime = true) {
        if (this.state === state) return
        this.state = state
        if (resetTime)this.stateTime = 0
    
        const fn = this.stateHandlers[this.state]
        if (fn)fn(this.human,true,0)
    }
    protected tickState(dt: number) {
        const fn = this.stateHandlers[this.state]
        if (fn)fn(this.human,false, dt)
        this.stateTime += dt
    }
    protected apply(dt: number) {
        if(!this.human)return
        this.human.input.rotation = Numeric.lerp_rad(
            this.human.physical_data.rotation,
            this.rot_target,
            1 / (1 + dt * this.rot_speed*100)
        )
        this.human.input.movement={dir:this.movement.dir,scale:this.movement.scale*this.move_speed}
        this.human.input.using_item=false
        this.human.input.using_item_down=false
    }
    AI(dt: number): void {
        this.apply(dt)
        this.tickState(dt)
    }
}
export class SimpleBotAi extends BotAi{
    constructor(human:Human){
        super(human)
        this.rot_speed=random.float(-0.1,0.1)

        this.emotes=[
            human.game.definitions.emotes.getFromString("emote_sad"),
            human.game.definitions.emotes.getFromString("emote_happy"),
            human.game.definitions.emotes.getFromString("emote_md_logo"),
            human.game.definitions.emotes.getFromString("emote_neutral"),
            ...Object.values(human.game.definitions.ammos.value),
            ...Object.values(human.game.definitions.consumibles.value)
        ]
    }
    rot_speed:number
    movement_time=0
    emotes!:GameObjectDef[]
    override net_update(): void {}
    override AI(dt:number): void {
        if(!this.human)return

        this.human.input.interaction=this.human.seat?Math.random()<0.001:Math.random()<0.1
        this.human.input.using_item=Math.random()<0.2
        this.human.input.using_item_down=this.human.input.using_item

        this.human.input.rotation=Numeric.lerp_rad(this.human.physical_data.rotation,this.human.physical_data.rotation+this.rot_speed,0.9)
        if(this.movement_time>0){
            this.movement_time-=dt
        }else{
            this.movement_time=random.float(1,3)
            this.human.input.movement={
                dir:random.rad(),
                scale:1,
            }
        }
        if(Math.random()<=0.003){
            this.human.input.actions.push({type:InputActionType.emote,emote:random.choose(this.emotes).idNumber!})
        }
    }
}
export type UtilityContext = {
    human:Human
    dt: number
    time: number
}
export type UtilityAction<T extends string = string> = {
    id: T
    score(ctx: UtilityContext): number
    enter?(ctx: UtilityContext): void
    update?(ctx: UtilityContext): void
    exit?(ctx: UtilityContext): void
    cooldown?: number
}
export abstract class BotAction<T extends string = string>
    implements UtilityAction<T> {

    id!: T
    cooldown = 0

    abstract score(ctx: UtilityContext): number
    enter?(ctx: UtilityContext): void
    update?(ctx: UtilityContext): void
    exit?(ctx: UtilityContext): void
}
export abstract class UtilityStatedBotAi<
    TState extends string,
    TAction extends string
> extends BotAi {
    rot_target = 0
    rot_speed = 0
    move_speed=1
    protected movement:PolarMovement={dir:0,scale:0}

    protected state!: TState
    protected stateTime = 0
    protected setState(state: TState) {
        if (this.state === state) return
        this.onExitState?.(this.state)
        this.state = state
        this.stateTime = 0
        this.onEnterState?.(state)
    }

    protected tickState(dt: number) {
        this.stateTime += dt
        this.onUpdateState?.(this.state, dt)
    }

    protected onEnterState?(state: TState): void
    protected onExitState?(state: TState): void
    protected onUpdateState?(state: TState, dt: number): void

    protected actions = new Map<TAction, UtilityAction<TAction>>()
    protected currentAction?: UtilityAction<TAction>
    protected actionCooldowns = new Map<TAction, number>()

    protected utilityInterval = 0.35
    protected utilityTimer = 0

    protected evaluateUtility(ctx: UtilityContext) {
        let best: UtilityAction<TAction> | undefined
        let bestScore = -Infinity

        for (const action of this.actions.values()) {
            const cd = this.actionCooldowns.get(action.id)
            if (cd && cd > 0) continue

            const s = action.score(ctx)
            if (s > bestScore) {
                bestScore = s
                best = action
            }
        }

        if (best && best !== this.currentAction) {
            this.currentAction?.exit?.(ctx)
            this.currentAction = best
            best.enter?.(ctx)
        }
    }

    protected tickUtility(dt: number) {
        this.utilityTimer += dt
        for (const [k, v] of this.actionCooldowns) {
            this.actionCooldowns.set(k, Math.max(0, v - dt))
        }

        if (this.utilityTimer >= this.utilityInterval) {
            this.utilityTimer = 0
            this.evaluateUtility({
                human: this.human,
                dt,
                time: performance.now() / 1000,
            })
        }
    }

    protected applyAction(ctx: UtilityContext) {
        this.currentAction?.update?.(ctx)
    }
    protected apply(dt: number) {
        if(!this.human)return
        this.human.input.rotation = Numeric.lerp_rad(
            this.human.physical_data.rotation,
            this.rot_target,
            1 / (1 + dt * this.rot_speed*100)
        )
        this.human.input.movement={dir:this.movement.dir,scale:this.movement.scale*this.move_speed}
        this.human.input.using_item=false
        this.human.input.using_item_down=false
    }
    override AI(dt: number): void {
        const ctx: UtilityContext = {
            human: this.human,
            dt,
            time: performance.now() / 1000,
        }

        this.tickUtility(dt)
        this.applyAction(ctx)
        this.tickState(dt)
        this.apply(dt)
    }
}
export class AINetworkBase {
    baseRadius = 12
    baseDelay = 0.15

    bots = new Set<BotAi>()
    game:Game
    constructor(game:Game){
        this.game=game
    }
    register(bot: BotAi) {
        this.bots.add(bot)
    }
    unregister(bot: BotAi) {
        this.bots.delete(bot)
    }
    broadcast(msg: AIMessage) {
        for (const bot of this.bots) {
            if (bot === msg.sender) continue
            if (!this.can_receive(bot, msg)) continue

            const delay = this.baseDelay
            if (delay > 0) {
                setTimeout(() => this.deliver(bot, msg), delay * 1000)
            } else {
                this.deliver(bot, msg)
            }
        }
    }
    private can_receive(bot: BotAi, msg: AIMessage): boolean {
        return this.baseRadius >= v2.distance(bot.human?.position??v2.zero(), msg.origin)
    }
    private deliver(bot: BotAi, msg: AIMessage) {
        const handler = bot.deliveries[msg.type]
        if (handler) {
            handler(bot, msg)
        }
    }
}