export enum NodeStatus {
  Success = 'SUCCESS',
  Failure = 'FAILURE',
  Running = 'RUNNING',
}
export interface Default_Tree_Settings{ reaction_time: number; decision_update_rate: number }
export interface TickContext<OBJ, Settings> {
  object: OBJ
  blackboard: Blackboard
  settings: Settings&Default_Tree_Settings
  tree:BehaviourTree<OBJ,Settings>
  dt: number
}
export interface ActionDefinition<OBJ, Settings, Params = undefined> {
  name: string
  onStart?: (ctx: TickContext<OBJ, Settings>, params: Params) => void
  onTick: (ctx: TickContext<OBJ, Settings>, params: Params) => NodeStatus
  onReset?: (ctx: TickContext<OBJ, Settings>, params: Params) => void
}

export class Blackboard {
  private map = new Map<string, any>()
  set(key: string, value: any) { this.map.set(key, value) }
  get<T = any>(key: string): T | undefined { return this.map.get(key) }
  has(key: string) { return this.map.has(key) }
  remove(key: string) { this.map.delete(key) }
  clear() { this.map.clear() }
}

export interface BTNode<OBJ, Settings> {
  name?: string
  tick(ctx: TickContext<OBJ, Settings>): NodeStatus
  reset?(ctx: TickContext<OBJ, Settings>): void
}

export abstract class CompositeNode<OBJ, Settings> implements BTNode<OBJ, Settings> {
  children: BTNode<OBJ, Settings>[]
  name?: string
  constructor(children: BTNode<OBJ, Settings>[] = [], name?: string) { this.children = children; this.name = name }
  abstract tick(ctx: TickContext<OBJ, Settings>): NodeStatus
  reset(ctx: TickContext<OBJ, Settings>) { for (const c of this.children) if (c.reset) c.reset(ctx) }
}

export class SequenceNode<OBJ, Settings> extends CompositeNode<OBJ, Settings> {
  private runningIndex = 0
  tick(ctx: TickContext<OBJ, Settings>) {
    for (let i = this.runningIndex; i < this.children.length; i++) {
      const status = this.children[i].tick(ctx)
      if (status === NodeStatus.Running) { this.runningIndex = i; return NodeStatus.Running }
      if (status === NodeStatus.Failure) { this.runningIndex = 0; return NodeStatus.Failure }
    }
    this.runningIndex = 0
    return NodeStatus.Success
  }
  override reset(ctx: TickContext<OBJ, Settings>) { this.runningIndex = 0; super.reset(ctx) }
}

export class SelectorNode<OBJ, Settings> extends CompositeNode<OBJ, Settings> {
  private runningIndex = 0
  tick(ctx: TickContext<OBJ, Settings>) {
    for (let i = this.runningIndex; i < this.children.length; i++) {
      const status = this.children[i].tick(ctx)
      if (status === NodeStatus.Running) { this.runningIndex = i; return NodeStatus.Running }
      if (status === NodeStatus.Success) { this.runningIndex = 0; return NodeStatus.Success }
    }
    this.runningIndex = 0
    return NodeStatus.Failure
  }
  override reset(ctx: TickContext<OBJ, Settings>) { this.runningIndex = 0; super.reset(ctx) }
}

export class ParallelNode<OBJ, Settings> extends CompositeNode<OBJ, Settings> {
  successThreshold: number
  constructor(children: BTNode<OBJ, Settings>[], successThreshold: number, name?: string) {
    super(children, name)
    this.successThreshold = successThreshold
  }
  tick(ctx: TickContext<OBJ, Settings>) {
    let success = 0
    let failure = 0
    for (const c of this.children) {
      const s = c.tick(ctx)
      if (s === NodeStatus.Success) success++
      if (s === NodeStatus.Failure) failure++
    }
    if (success >= this.successThreshold) return NodeStatus.Success
    if (failure > (this.children.length - this.successThreshold)) return NodeStatus.Failure
    return NodeStatus.Running
  }
}

export class ActionNode<OBJ, Settings> implements BTNode<OBJ, Settings> {
  name?: string
  private fn: (ctx: TickContext<OBJ, Settings>) => NodeStatus
  constructor(fn: (ctx: TickContext<OBJ, Settings>) => NodeStatus, name?: string) { this.fn = fn; this.name = name }
  tick(ctx: TickContext<OBJ, Settings>) { return this.fn(ctx) }
}

export class ConditionNode<OBJ, Settings> implements BTNode<OBJ, Settings> {
  name?: string
  private fn: (ctx: TickContext<OBJ, Settings>) => boolean
  constructor(fn: (ctx: TickContext<OBJ, Settings>) => boolean, name?: string) { this.fn = fn; this.name = name }
  tick(ctx: TickContext<OBJ, Settings>) { return this.fn(ctx) ? NodeStatus.Success : NodeStatus.Failure }
}

export class InverterNode<OBJ, Settings> implements BTNode<OBJ, Settings> {
  child: BTNode<OBJ, Settings>
  name?: string
  constructor(child: BTNode<OBJ, Settings>, name?: string) { this.child = child; this.name = name }
  tick(ctx: TickContext<OBJ, Settings>) {
    const r = this.child.tick(ctx)
    if (r === NodeStatus.Success) return NodeStatus.Failure
    if (r === NodeStatus.Failure) return NodeStatus.Success
    return NodeStatus.Running
  }
}

export class SucceederNode<OBJ, Settings> implements BTNode<OBJ, Settings> {
  child: BTNode<OBJ, Settings>
  name?: string
  constructor(child: BTNode<OBJ, Settings>, name?: string) { this.child = child; this.name = name }
  tick(ctx: TickContext<OBJ, Settings>) {
    const _ = this.child.tick(ctx)
    return NodeStatus.Success
  }
}

export class FailerNode<OBJ, Settings> implements BTNode<OBJ, Settings> {
  child: BTNode<OBJ, Settings>
  name?: string
  constructor(child: BTNode<OBJ, Settings>, name?: string) { this.child = child; this.name = name }
  tick(ctx: TickContext<OBJ, Settings>) {
    const _ = this.child.tick(ctx)
    return NodeStatus.Failure
  }
}

export class WaitNode<OBJ, Settings> implements BTNode<OBJ, Settings> {
  private remaining = 0
  name?: string
  duration: number
  constructor(duration: number, name?: string) { this.duration = duration; this.name = name }
  tick(ctx: TickContext<OBJ, Settings>) {
    if (this.remaining <= 0) this.remaining = this.duration
    this.remaining -= ctx.dt
    if (this.remaining > 0) return NodeStatus.Running
    this.remaining = 0
    return NodeStatus.Success
  }
  reset(ctx: TickContext<OBJ, Settings>) { this.remaining = 0 }
}

export class RepeatNode<OBJ, Settings> implements BTNode<OBJ, Settings> {
  child: BTNode<OBJ, Settings>
  times: number
  private counter = 0
  name?: string
  constructor(child: BTNode<OBJ, Settings>, times = -1, name?: string) { this.child = child; this.times = times; this.name = name }
  tick(ctx: TickContext<OBJ, Settings>) {
    const status = this.child.tick(ctx)
    if (status === NodeStatus.Success) {
      this.counter++
      if (this.times === -1) return NodeStatus.Running
      if (this.counter >= this.times) { this.counter = 0; return NodeStatus.Success }
      return NodeStatus.Running
    }
    if (status === NodeStatus.Failure) { this.counter = 0; return NodeStatus.Failure }
    return NodeStatus.Running
  }
  reset(ctx: TickContext<OBJ, Settings>) { this.counter = 0; if (this.child.reset) this.child.reset(ctx) }
}

export type ActionTreeDef<OBJ, Settings> = BTNode<OBJ, Settings>
export class DoActionNode<OBJ, Settings, Params = any> implements BTNode<OBJ, Settings> {
  name?: string
  private actionName: string
  private params: Params
  private started = false

  constructor(actionName: string, params: Params, name?: string) {
    this.actionName = actionName
    this.params = params
    this.name = name ?? `Do(${actionName})`
  }

  tick(ctx: TickContext<OBJ, Settings>) {
    const tree = (ctx as any).tree as BehaviourTree<OBJ, Settings>
    const action = tree.getAction(this.actionName)
    if (!action) throw new Error(`Action ${this.actionName} not registered`)

    if (!this.started) {
      if (action.onStart) action.onStart(ctx, this.params)
      this.started = true
    }

    return action.onTick(ctx, this.params)
  }

  reset(ctx: TickContext<OBJ, Settings>) {
    const tree = (ctx as any).tree as BehaviourTree<OBJ, Settings>
    const action = tree.getAction(this.actionName)
    if (this.started && action?.onReset) {
      action.onReset(ctx, this.params)
    }
    this.started = false
  }
}

export class BehaviourTree<OBJ, Settings> {
  object: OBJ
  settings: { reaction_time: number; decision_update_rate: number } & Settings
  tree: ActionTreeDef<OBJ, Settings>
  blackboard: Blackboard = new Blackboard()
  last_update: number
  private rootStatus: NodeStatus | null = null

  actions = new Map<string, ActionDefinition<OBJ, Settings,any>>()

  constructor(
    object: OBJ,
    settings: { reaction_time: number; decision_update_rate: number } & Settings,
    tree: ActionTreeDef<OBJ, typeof settings>,
    actions:ActionDefinition<OBJ, Settings,any>[]=[]
  ) {
    this.object = object
    this.settings = settings
    this.tree = tree
    this.last_update = settings.decision_update_rate
    for(const a of actions){
      this.registerAction(a)
    }
  }

  registerAction<Params = any>(
    action: ActionDefinition<OBJ, Settings, Params>
  ) {
    this.actions.set(action.name, action)
  }

  getAction(name: string) {
    return this.actions.get(name)
  }

  update(dt: number) {
    this.last_update -= dt
    if (this.last_update <= 0) {
      const ctx: TickContext<OBJ, Settings> = { tree:this,object: this.object, blackboard: this.blackboard, settings: this.settings, dt }
      this.rootStatus = this.tree.tick(ctx)
      this.last_update = this.settings.decision_update_rate
    }
    const continuousCtx: TickContext<OBJ, Settings> = { tree:this, object: this.object, blackboard: this.blackboard, settings: this.settings, dt }
    if (this.rootStatus === NodeStatus.Running) {
      this.tree.tick(continuousCtx)
    }
  }

  reset() {
    const ctx: TickContext<OBJ, Settings> = { tree:this,object: this.object, blackboard: this.blackboard, settings: this.settings, dt: 0 }
    if (this.tree.reset) this.tree.reset(ctx)
    this.rootStatus = null
    this.blackboard.clear()
    this.last_update = this.settings.decision_update_rate
  }
}