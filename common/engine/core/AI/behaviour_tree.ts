export enum BTState {
    Success,
    Failure,
    Running
}

export interface BTNode<Context>{
    tick(ctx:Context): BTState
    reset?():void
}

export class BTSequence<Context> implements BTNode<Context> {
    constructor(public children: BTNode<Context>[]) {}
    private i = 0
    tick(ctx: Context): BTState {
        while (this.i < this.children.length) {
            const s=this.children[this.i].tick(ctx)
            if (s===BTState.Failure) {
                this.i=0
                return BTState.Failure
            }
            this.i++
        }
        this.i = 0
        return BTState.Success
    }
    reset(){
        this.i = 0
        this.children.forEach(c=>c.reset?.())
    }
}
export class BTSelector<Context> implements BTNode<Context> {
    constructor(public children: BTNode<Context>[]) {}
    private i = 0

    tick(ctx: Context): BTState {
        for (this.i=0; this.i < this.children.length; this.i++) {
            const s = this.children[this.i].tick(ctx)
            if (s === BTState.Running) return BTState.Running
            if (s === BTState.Success) {
                this.i = 0
                return BTState.Success
            }
        }
        return BTState.Failure
    }
    reset() {
        this.i = 0
        this.children.forEach(c => c.reset?.())
    }
}
export class BTCondition<Context> implements BTNode<Context> {
    constructor(private fn: (ctx: Context) => boolean) {}
    tick(ctx: Context): BTState {
        return this.fn(ctx) ? BTState.Success : BTState.Failure
    }
}
export class BTAction<Context> implements BTNode<Context> {
    constructor(private fn: (ctx: Context) => BTState) {}
    tick(ctx: Context): BTState {
        return this.fn(ctx)
    }
}

export abstract class GoalNode<Ctx> {
    priority = 0
    interruptible = true
    reevaluateInterval = 0.2
    timeout = 10
    cooldown = 0
    elapsed = 0

    abstract score(ctx: Ctx): number
    condition(ctx: Ctx): boolean {
        return true
    }

    enter(ctx: Ctx): void{}
    tick(ctx: Ctx): BTState {
        return BTState.Success
    }
    exit(ctx: Ctx): void{}

    reset() {
        this.elapsed = 0
    }
}
export class BTGoalPlanner<Ctx> implements BTNode<Ctx> {

    current?: GoalNode<Ctx>

    timer = 0
    delay = 0.25

    switchThreshold = 15

    constructor(public goals: GoalNode<Ctx>[]) {}

    tick(ctx: Ctx, dt = 0.01): BTState {
        this.timer -= dt
        if(this.timer <= 0){
            this.timer = this.delay
            let best: GoalNode<Ctx> | undefined
            let bestScore = -Infinity
            for(const goal of this.goals){
                if(goal.cooldown > 0)continue
                if(!goal.condition(ctx))continue
                const score = goal.score(ctx)
                if(score > bestScore){
                    bestScore = score
                    best = goal
                }
            }
            if(best){
                if(!this.current){
                    this.current = best
                    this.current.enter(ctx)
                }else{
                    const currentScore = this.current.score(ctx)
                    const shouldSwitch =this.current.interruptible && best !== this.current && bestScore > currentScore + this.switchThreshold
                    if(shouldSwitch){
                        this.current.exit(ctx)
                        this.current.reset()

                        this.current = best
                        this.current.enter(ctx)
                    }
                }
            }
        }
        if(!this.current)return BTState.Failure
        this.current.elapsed += dt
        if(this.current.elapsed > this.current.timeout){
            this.current.exit(ctx)
            this.current.reset()
            this.current.cooldown = 2
            this.current = undefined

            return BTState.Failure
        }
        const state = this.current.tick(ctx)
        if(state !== BTState.Running){
            this.current.exit?.(ctx)
            this.current.reset()
            this.current = undefined
        }
        return state
    }
}