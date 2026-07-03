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
    interruptible = true
    reevaluateInterval = 0.2
    timeout = 0
    elapsed = 0

    score(ctx: Ctx): number{
        return 0
    }
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
    score_to_change:number=20

    constructor(public goals: GoalNode<Ctx>[]) {}

    next_node(ctx: Ctx){
        let best: GoalNode<Ctx> | undefined
        let bestScore = -Infinity
        for(const goal of this.goals){
            if(!goal.condition(ctx))continue
            const score = goal.score(ctx)
            if(score > bestScore){
                bestScore = score
                best = goal
            }
        }
        if(best&&best!==this.current){
            if(!this.current){
                this.current = best
                this.current.enter(ctx)
            }else if(this.current.interruptible){
                if(this.current.interruptible){
                    const currentScore = this.current.score(ctx)
                    if(bestScore > currentScore+this.score_to_change){
                        this.current.exit(ctx)
                        this.current.reset()

                        this.current = best
                        this.current.enter(ctx)
                    }
                }
            }
        }
    }
    close_node(ctx:Ctx){
        if(!this.current)return
        this.current.exit(ctx)
        this.current.reset()
        this.current = undefined
    }
    tick(ctx: Ctx, dt = 0.01): BTState {
        if(!this.current)return BTState.Failure

        if(this.current.timeout){
            this.current.elapsed += dt
            if(this.current.elapsed > this.current.timeout){
                this.close_node(ctx)
                return BTState.Failure
            }
        }

        const state = this.current.tick(ctx)
        if(state !== BTState.Running){
            this.close_node(ctx)
        }
        return state
    }
}