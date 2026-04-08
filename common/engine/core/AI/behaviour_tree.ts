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