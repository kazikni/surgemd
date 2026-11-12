import { random } from "./random.ts";

export const halfpi=Math.PI/2

export type ID=number

export const Path={
    split(path:string):string[]{
        const ret=path.split(/[\\/]/)
        for(let i=0;i<ret.length;i++){
            if(ret[i]==""){
                ret.splice(i,1)
                i--
            }
        }
        if(ret.length==0){
            ret.push("")
        }
        return ret
    },
    join_simple(...path:string[]){
        let ret=path.join("/").replace(/\/+/g, "/")
        if(path[0]=="")ret=ret.substring(1)
        return ret
    },
    join(...parts: string[]): string {
        if (parts.length === 0) return ""
        const absolute=parts[0].startsWith("/")||parts[0].startsWith("\\")
        const stack: string[] = []
        const joined = parts.join("/").replace(/\\/g, "/").split("/")
        for (const part of joined) {
            if (part === "" || part === ".") {
                continue
            }
            if (part === "..") {
                if (stack.length > 0) {
                    stack.pop()
                }
                continue
            }
            stack.push(part)
        }
        const result=stack.join("/")
        return absolute?"/"+result:result
    },
    extname(path:string):string{
        const content=path.split(".")
        return path.length>1?content[content.length-1]:""
    },
    filename(path:string):string{
        const content=path.split(".")
        if(content.length>1){
            content.pop()
        }
        return content.join(".")
    },
    basename(path:string):string{
        const val=path.split("/")
        while(val.length>1&&val[val.length-1]===""){
            val.pop()
        }
        return val[val.length-1]??""
    },
    dirname(path:string):string{
        const val=this.split(path)
        if(val.length>1){
            val.pop()
        }
        return val.join("/")
    },
    strings_array(text:string):string[]{
        const out:string[]=[]

        let current=""
        let quote=""

        for(let i=0;i<text.length;i++){
            const c=text[i]
            if(!quote){
                if(c==="\""||c==="'"){
                    quote=c
                    current=""
                }
                continue
            }
            if(c===quote){
                out.push(current)
                quote=""
                continue
            }
            current+=c
        }

        return out
    },
    relative(from: string, to: string): string {
        const fromParts = this.split(this.join(from))
        const toParts = this.split(this.join(to))

        const fromAbsolute = from.startsWith("/") || from.startsWith("\\")
        const toAbsolute = to.startsWith("/") || to.startsWith("\\")

        if (fromAbsolute !== toAbsolute) {
            return to
        }

        let common=0
        while(common<fromParts.length&&common<toParts.length&&fromParts[common]===toParts[common]){
            common++
        }

        const result: string[] = []
        for (let i = common; i < fromParts.length; i++) {
            result.push("..")
        }
        for (let i = common; i < toParts.length; i++) {
            result.push(toParts[i])
        }
        return result.join("/") || "."
    }
}

export class SignalManager {
    // deno-lint-ignore ban-types
    protected listeners: Map<string, Function[]>

    constructor() {
        this.listeners = new Map()
    }

    // deno-lint-ignore ban-types
    on(signal: string, callback: Function): Function {
        if (!this.listeners.has(signal)) {
            this.listeners.set(signal, [])
        }
        this.listeners.get(signal)!.push(callback)
        return callback
    }

    // deno-lint-ignore ban-types
    off(signal: string, callback: Function): void {
        const signalListeners = this.listeners.get(signal)
        if (signalListeners) {
            const index = signalListeners.indexOf(callback)
            if (index !== -1) {
                signalListeners.splice(index, 1)
            }
        }
    }

    // deno-lint-ignore no-explicit-any
    emit(signal: string, ...parameters:any[]): void {
        const signalListeners = this.listeners.get(signal)
        if (signalListeners) {
            for (const listener of signalListeners) {
                listener(...parameters)
            }
        }
    }
    wait(signal: string): Promise<any[]> {
        return new Promise(resolve => {
            const callback = (...args: any[]) => {
                this.off(signal, callback)
                resolve(args)
            }
            this.on(signal, callback)
        })
    }

    clear(signal: string): void {
        this.listeners.delete(signal)
    }
    clearAll(): void {
        this.listeners.clear()
    }
}

export class TicksProfiler {
    data: Record<number, {
        delta: number
        start: number
    }> = {}

    enabled = true

    start(id:number) {
        if (!this.enabled) return
        if(!this.data[id])this.data[id]={
            delta:0,
            start:0,
        }
        this.data[id].start=performance.now()
    }
    end(id:number) {
        if (!this.enabled) return
        if (!this.data[id]) return

        this.data[id].delta = performance.now() - this.data[id].start
        this.data[id].start=0
    }
}

export interface TweenOptions<T>{
    target: T
    to: Partial<T>
    duration: number
    ease?: (x: number) => number
    yoyo?: boolean
    infinite?: boolean
    onUpdate?: () => void
    onComplete?: () => void
}
export class Tween<T> {
    readonly clock: Clock;

    tick:number=0

    readonly target: T;
    readonly duration: number;

    startValues: Record<string, number> = {};
    endValues: Record<string, number> = {};

    readonly ease: (x: number) => number;

    yoyo: boolean;
    infinite: boolean;

    readonly onUpdate?: () => void;
    readonly onComplete?: () => void;

    constructor(clock:Clock,config: TweenOptions<T>) {
        this.clock=clock;
        this.target = config.target;
        for (const key in config.to) {
            this.startValues[key] = config.target[key] as number;
            this.endValues[key] = config.to[key] as number;
        }

        this.duration = config.duration;
        this.ease = config.ease ?? (t => t);
        this.yoyo = config.yoyo ?? false;
        this.infinite = config.infinite ?? false;
        this.onUpdate = config.onUpdate;
        this.onComplete = config.onComplete;
    }

    update(dt:number): void {
        this.tick+=dt

        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        if(this.target.destroyed){
            this.kill();
            this.onComplete?.();
            return
        }

        const interpFactor = Numeric.clamp(this.tick / this.duration, 0, 1);
        for (const key in this.startValues) {
            const startValue = this.startValues[key];
            const endValue = this.endValues[key];

            (this.target[key as keyof T] as number) = Numeric.lerp(startValue, endValue, this.ease(interpFactor));
        }
        this.onUpdate?.();

        if (this.tick>=this.duration) {
            if (this.yoyo) {
                this.yoyo = this.infinite;
                this.tick=0;
                [this.startValues, this.endValues] = [this.endValues, this.startValues];
            } else {
                this.kill();
                this.onComplete?.();
            }
        }
    }

    kill(): void {
        this.clock.remove_tween(this as unknown as Tween<unknown>);
    }
}
export class Clock {
    private frameDuration: number
    private lastFrameTime: number
    public time_scale:number
    public callback:(dt:number)=>void

    public intervals:Map<number,(dt:number)=>void>=new Map()
    readonly tweens = new Set<Tween<unknown>>();
    timeouts:{c:()=>void,delay:number}[]=[]

    running:boolean=false
    tps:number=60

    profiler:TicksProfiler=new TicksProfiler()

    constructor(targetFPS: number, timeScale: number, callback: (dt:number)=>void) {
        this.frameDuration = 1000 / targetFPS
        this.tps=targetFPS
        this.lastFrameTime = Date.now()
        this.time_scale = timeScale
        this.callback = callback
        this.tick = this.tick.bind(this)

        this.profiler.enabled=true
    }

    private interval?:number=undefined

    clear(){
        this.intervals.clear()
        this.timeouts.length=0
    }
    add_interval(cb:(dt:number)=>void):number{
        let id=0
        while(this.intervals.has(id)){
            id=random.int(0,10000000000)
        }
        this.intervals.set(id,cb)
        return id
    }

    clear_interval(id:number){
        if(this.intervals.has(id))this.intervals.delete(id)
    }
    tick(){
        if(this.running){
            this.profiler.start(0)
            const currentTime = performance.now();
            const elapsedTime = currentTime - this.lastFrameTime;
            this.lastFrameTime = currentTime

            const dt=(elapsedTime/1000)*this.time_scale

            if(this.time_scale>0){
                for(let i=0;i<this.timeouts.length;i++){
                    this.timeouts[i].delay-=dt
                    if(this.timeouts[i].delay<=0){
                        this.timeouts[i].c()
                        this.timeouts.splice(i,1) 
                        i--
                    }
                }
                for(const v of this.tweens){
                    v.update(dt)
                }
                this.callback(dt);
                for (const i of this.intervals.values()) {
                    i(dt)
                }
            }
            this.profiler.end(0)
        }
    }
    _tick(){
        if(this.running){
            this.tick()
            //@ts-ignore
            self.requestAnimationFrame(this._tick)
        }
    }
    public start() {
        if(!this.running){
            this.running=true

            this.frameDuration=1000/this.tps
            this.lastFrameTime = performance.now()
            this.interval=setInterval(() => {
                this.tick()
            }, this.frameDuration) as unknown as number
        }
    }
    public startRAF() {
        if (!this.running) {
            this.running = true;

            this._tick=this._tick.bind(this)
            this.lastFrameTime = performance.now()
            this.frameDuration=1000/this.tps
            //@ts-ignore
            self.requestAnimationFrame(this._tick)
        }
    }

    add_timeout(callback:()=>void,delay:number):number{
        if(delay==0){
            callback()
            return -1
        }
        this.timeouts.push({c:callback,delay:delay})
        return this.timeouts.length-1
    }

    remove_tween(tween: Tween<unknown>): void {
        this.tweens.delete(tween);
    }
    add_tween<T>(config:TweenOptions<T>){
        const t=new Tween(this,config)
        this.tweens.add(t)
        return t
    }
    public stop(){
        this.running=false
        if(this.interval!==undefined)clearInterval(this.interval)
    }
}

//Credits Adaptable part of Suroi.io code
export interface DeepCloneable<T> {
    [cloneDeepSymbol](): T
}
export const cloneSymbol: unique symbol = Symbol("clone")
export const cloneDeepSymbol: unique symbol = Symbol("clone deep")

export interface Cloneable<T> {
    [cloneSymbol](): T
}
// deno-lint-ignore no-explicit-any
export type Func = (...args: any[]) => unknown;
export function setDeep(obj:any,path:string,value:any,split:string="."){
    const parts=path.split(split)
    let cur=obj

    for(let i=0;i<parts.length-1;i++){
        if(!cur[parts[i]])cur[parts[i]]={}
        cur=cur[parts[i]]
    }

    cur[parts[parts.length-1]]=value
}
export function getDeep(obj:any,path:string,split:string="."){
    const parts=path.split(split)
    let cur=obj

    for(const p of parts){
        if(!cur)return undefined
        cur=cur[p]
    }

    return cur
}
export function deleteDeep(obj:any,path:string,split:string="."){
    const parts=path.split(split)
    let cur=obj

    for(let i=0;i<parts.length-1;i++){
        cur=cur?.[parts[i]]
        if(!cur)return false
    }

    const key=parts[parts.length-1]

    if(cur && key in cur){
        delete cur[key]
        return true
    }

    return false
}
export function cloneDeep<T>(object: T): T {
    const clonedNodes = new Map<unknown, unknown>();

    return (function internal<T>(target: T): T {
        if (typeof target!=="object" && !Array.isArray(target)) return target
        if (clonedNodes.has(target)) return clonedNodes.get(target) as T

        if (cloneDeepSymbol in target!) {
            const clone = target[cloneDeepSymbol]
            if (typeof clone === "function" && clone.length === 0) {
                return clone.call(target)
            } else {
                console.warn(`Inappropriate use of ${cloneDeepSymbol.toString()}: it should be a no-arg function`)
            }
        }

        const copyAllPropDescs = <T>(
            to: T,
            entryFilter: (entry: readonly [string, TypedPropertyDescriptor<unknown>]) => boolean = () => true
        ): T => {
            for (const [key, desc] of Object.entries(Object.getOwnPropertyDescriptors(target)).filter(entryFilter)) {
                desc.value = internal(target![key as keyof typeof target])
                Object.defineProperty(to, key, desc)
            }
            return to
        };

        const prototype = Object.getPrototypeOf(target) as object | null

        switch (true) {
            case target instanceof Array: {
                const root = Object.create(prototype) as T & unknown[]
                clonedNodes.set(target, root)

                for (let i = 0, l = target.length; i < l; i++) {
                    root[i] = internal(target[i])
                }

                return copyAllPropDescs(root, ([key]) => Number.isNaN(+key));
            }
            case target instanceof Map: {
                const root = new Map<unknown, unknown>()
                clonedNodes.set(target, root)

                for (const [k, v] of (target as T & Map<unknown, unknown>).entries()) {
                    root.set(internal(k), internal(v))
                }

                Object.setPrototypeOf(root, prototype)
                return copyAllPropDescs(root as T)
            }
            case target instanceof Set: {
                const root = new Set<unknown>()
                clonedNodes.set(target, root)

                for (const v of target) root.add(internal(v))

                Object.setPrototypeOf(root, prototype)
                return copyAllPropDescs(root as T)
            }
            default: {
                const clone = Object.create(prototype) as T
                clonedNodes.set(target, clone)

                return copyAllPropDescs(clone)
            }
        }
    })(object)
}
export function deepFreeze<T>(object:T):T{
    const seen=new WeakSet<object>()
    const freeze=(value:any):any=>{
        if(value===null||typeof value!=="object"||seen.has(value))return value
        seen.add(value)
        for(const key of Reflect.ownKeys(value)){
            const desc=Object.getOwnPropertyDescriptor(value,key)
            if(desc&&"value" in desc)freeze(desc.value)
        }
        return Object.freeze(value)
    }
    return freeze(object)
}
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export function mergeDeep<T>(target: T, ...sources: Array<DeepPartial<T>>): T {
  if (!sources.length) return target;

  const source = sources.shift();
  if (!source) return target;

  for (const key of [
    ...Object.keys(source),
    ...Object.getOwnPropertySymbols(source) as (keyof T & symbol)[]
  ]) {
    //@ts-ignore
    const srcVal = source[key];
    const tgtVal = (target as any)[key];

    // null/undefined just overwrite
    if (srcVal === null || srcVal === undefined) {
      (target as any)[key] = srcVal;
      continue;
    }

    // arrays: choose strategy (replace by default, or concat if desired)
    if (Array.isArray(srcVal)) {
      if (Array.isArray(tgtVal)&&!Object.isFrozen(srcVal)) {
        (target as any)[key] = [...tgtVal, ...srcVal] as any;
      } else {
        (target as any)[key] = [...srcVal] as any;
      }
      continue;
    }

    // objects
    if (typeof srcVal === "object"&&!Object.isFrozen(srcVal)) {
      if (typeof tgtVal === "object" && tgtVal !== null && !Array.isArray(tgtVal)) {
        mergeDeep(tgtVal, srcVal as any);
      } else {
        (target as any)[key] = cloneDeep(srcVal);
      }
      continue;
    }

    // primitives just overwrite
    (target as any)[key] = srcVal as any;
  }

  return mergeDeep(target, ...sources);
}
export function deepEqual(a: any, b: any): boolean {
    if (a === b) return true

    if (
        typeof a !== "object" ||
        typeof b !== "object" ||
        a === null ||
        b === null
    ) {
        return false
    }

    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    if (keysA.length !== keysB.length) {
        return false
    }

    for(const key of keysA) {
        if (!deepEqual(a[key], b[key])) {
            return false
        }
    }

    return true
}
type NameGenerator<T extends string> = `${T}In` | `${T}Out` | `${T}InOut`
function generatePolynomialEasingTriplet<T extends string>(degree: number, type: T): { readonly [K in NameGenerator<T>]: (t: number) => number } {
    const coeffCache = 2 ** (degree - 1);

    return Object.freeze({
        [`${type}In`]: (t: number) => t ** degree,
        [`${type}Out`]: (t: number) => 1 - (1 - t) ** degree,
        [`${type}InOut`]: (t: number) => t < 0.5
            ? coeffCache * t ** degree
            : 1 - (coeffCache * (1 - t) ** degree)
    } as { [K in NameGenerator<T>]: (t: number) => number });
}
export type EaseFunction=(time:number)=>number
export const ease=Object.freeze({
    linear: (t: number) => t,

    sineIn: (t: number) => 1 - Math.cos(t * halfpi),
    sineOut: (t: number) => Math.sin(t * halfpi),
    sineInOut: (t: number) => (1 - Math.cos(Math.PI * t)) / 2,

    circIn: (t: number) => 1 - Math.sqrt(1 - (t * t)),
    circOut: (t: number) => Math.sqrt(1 - (t - 1) ** 2),
    circInOut: (t: number) => t < 0.5
        ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2
        : (Math.sqrt(1 - (-2 * (1 - t)) ** 2) + 1) / 2,

    elasticIn: (t: number) => t === 0 || t === 1
        ? t
        : -(2 ** (10 * (t - 1))) * Math.sin(Math.PI * (40 * (t - 1) - 3) / 6),
    elasticOut: (t: number) => t === 0 || t === 1
        ? t
        : 2 ** (-10 * t) * Math.sin(Math.PI * (40 * t - 3) / 6) + 1,
    elasticInOut: (t: number) => t === 0 || t === 1
        ? t
        : t < 0.5
            ? -(2 ** (10 * (2 * t - 1) - 1)) * Math.sin(Math.PI * (80 * (2 * t - 1) - 9) / 18)
            : 2 ** (-10 * (2 * t - 1) - 1) * Math.sin(Math.PI * (80 * (2 * t - 1) - 9) / 18) + 1,
    elasticOut2: (t: number) => (Math.pow(2, t * -10) * Math.sin(((t - 0.75 / 4) * (Math.PI * 2)) / 0.75) + 1),

    ...generatePolynomialEasingTriplet(2, "quadratic"),
    ...generatePolynomialEasingTriplet(3, "cubic"),
    ...generatePolynomialEasingTriplet(4, "quartic"),
    ...generatePolynomialEasingTriplet(5, "quintic"),
    ...generatePolynomialEasingTriplet(6, "sextic"),

    expoIn: (t: number) => t <= 0
        ? 0
        : 2 ** (-10 * (1 - t)),
    expoOut: (t: number) => t >= 1
        ? 1
        : 1 - 2 ** -(10 * t),
    expoInOut: (t: number) => t === 0 || t === 1
        ? t
        : t < 0.5
            ? 2 ** (10 * (2 * t - 1) - 1)
            : 1 - 2 ** (-10 * (2 * t - 1) - 1),

    backIn: (t: number) => (Math.sqrt(3) * (t - 1) + t) * t ** 2,
    backOut: (t: number) => 1 + ((Math.sqrt(3) + 1) * t - 1) * (t - 1) ** 2,
    backInOut: (t: number) => t < 0.5
        ? 4 * t * t * (3.6 * t - 1.3)
        : 4 * (t - 1) ** 2 * (3.6 * t - 2.3) + 1
})

// deno-lint-ignore no-explicit-any
export function Classes<T extends new (...args: any[]) => any>(
    bases: T[]
  ): new (...args: []) => InstanceType<T> {
    class Bases {
      constructor(...args: []) {
        bases.forEach((Base) => {
          const instance = new Base(...args);
          Object.getOwnPropertyNames(instance).forEach((key) => {
            // deno-lint-ignore no-explicit-any
            (this as any)[key] = instance[key];
          });
        });
      }
    }
  
    const p={};

    [...bases].reverse().forEach((Base) => {
      Object.getOwnPropertyNames(Base.prototype)
        .filter((prop) => prop !== "constructor")
        .forEach((prop) => {
          Object.defineProperty(
            p,
            prop,
            Object.getOwnPropertyDescriptor(Base.prototype, prop) || {}
          );
        });
    });

    Object.setPrototypeOf(Bases,p)
  
    // deno-lint-ignore no-explicit-any
    return Bases as any;
}
export function apply_mixins(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach(baseCtor => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
             if (name !== 'constructor') {
                derivedCtor.prototype[name] = baseCtor.prototype[name];
            }
        });
    }); 
}

// deno-lint-ignore ban-types
export function getEnumValues<E extends Object>(enumObject: E): (E[keyof E])[] {
    return Object.values(enumObject).filter(value => typeof value === 'number') as E[keyof E][]
}
type ExpoSpec = number | [number, number][]
export const Numeric={
    level:{
        calc(xp: number, base: number, increase: number): number {
            return Math.floor(this.calc_nf(xp, base, increase))
        },

        calc_nf(xp: number, base: number, increase: number): number {
            if (xp <= 0) return 0
            if (base <= 0) throw new Error("base must be > 0")
            if (increase < 0) throw new Error("increase must be >= 0")

            const a = increase / 2
            const b = base - increase / 2
            const c = -xp

            if (a === 0) {
                return Math.max(xp / base, 0)
            }

            const delta = b * b - 4 * a * c
            if (delta < 0) return 0

            const level =
                (-b + Math.sqrt(delta)) / (2 * a)

            return Math.max(level, 0)
        }
    },
    level_adv:{
        getExpoForLevel(lvl: number, spec: ExpoSpec): number {
            if (typeof spec === "number") return spec;

            const arr = (spec as [number, number][]).slice().sort((a, b) => a[1] - b[1]);

            let chosen = arr[0][0];
            for (let i = 0; i < arr.length; i++) {
            const [expo, start] = arr[i];
            if (lvl >= start) chosen = expo;
            else break;
            }
            return chosen;
        },
        calc(xp: number, base: number, increase: ExpoSpec, maxIter = 100000): number {
            return Math.floor(this.calc_nf(xp, base, increase, maxIter));
        },

        calc_nf(xp: number, base: number, increase: ExpoSpec, maxIter = 100000): number {
            if (base <= 0) throw new Error("base must be > 0");

            if (typeof increase === "number") {
                const expo = increase;
                if (expo <= 0 || expo === 1) {
                    if (expo === 1) return xp < base ? 0 : xp / base;
                } else {
                    const exact = Math.log(xp / base + 1) / Math.log(expo);
                    return Math.max(0, exact);
                }
            }

            let level = 0;
            let cum = 0;
            while (level < maxIter) {
            const expo = this.getExpoForLevel(level, increase);
            const safeExpo = expo > 0 ? expo : 1;
            const req = base * Math.pow(safeExpo, level);
            if (xp < cum + req) {
                const frac = (xp - cum) / Math.max(1e-9, req);
                return level + Math.max(0, Math.min(1, frac));
            }
            cum += req;
            level++;
            }

            return maxIter;
        },

        distance_to(xp: number, base: number, increase: ExpoSpec, maxIter = 100000): number {
            const nf = this.calc_nf(xp, base, increase, maxIter);
            return nf - Math.floor(nf);
        }
    },
    abs_module(a: number, n: number): number {
        return a >= 0
            ? a % n
            : (a % n + n) % n
    },
    clamp(value:number,min:number,max:number):number{
        return value<max?value>min?value:min:max
    },
    maxDecimals(value: number, decimalPlaces = 3): number {
        if (!isFinite(value)) return value;
        const factor = 10 ** decimalPlaces;
        return Math.trunc(value * factor) / factor;
    },
    lerp(start:number,dest:number,inter:number):number{
        return  (start*(1-inter))+(dest*inter)
    },
    lerp_rad(start: number, dest: number, inter: number): number {
        const twoPi = Math.PI * 2;
        let delta = (dest - start) % twoPi;
        if (delta < -Math.PI) delta += twoPi;
        else if (delta > Math.PI) delta -= twoPi;
        return start + delta * inter;
    },
    dt_expo_inter(k:number,dt:number):number{
        return 1 - Math.exp(-k * dt)
    },
    get_interpolation_t(ntps:number, dt:number) {
        return 1-Math.exp(-dt/(1/ntps))
    },
    normalize_rad(angle: number): number {
        return Math.atan2(Math.sin(angle), Math.cos(angle))
    },
    max(val1:number,val2:number):number{
        return val1<val2?val1:val2
    },
    min(val1:number,val2:number):number{
        return val1>val2?val1:val2
    },
    loop(value: number, min: number, max: number): number {
        const range = max - min;
        return ((value - min) % range + range) % range + min;
    },
    loop_rad(value: number): number {
        const min = 0;
        const max = Math.PI * 2;
        const range = max - min;
        return ((value - min) % range + range) % range + min;
    },
    loop_deg(value: number): number {
        const min = 0;
        const max = 360;
        const range = max - min;
        return ((value - min) % range + range) % range + min;
    }
}

const valid_simple_character="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#.,;!%$*"
export const ValidString={
    simple_characters(str:string):boolean{
        let has_letter=false
        for(let i=0;i<str.length;i++){
            if(str.charAt(i)===" "){
                continue
            }else if(!valid_simple_character.includes(str.charAt(i))){
                return false
            }
            has_letter=true
            
        }
        return has_letter
    }
}
export class IPLocation{
    ip:string
    port?:number
    safe:boolean
    has_prefix:boolean
    aditional:string=""
    constructor(ip:string,port?:number,safe:boolean=false,has_prefix=true,aditional:string=""){
        this.ip=ip
        this.port=port
        this.safe=safe
        this.has_prefix=has_prefix
        this.aditional=aditional
    }
    toString(prefix:string=""):string{
        return this.has_prefix?
        `${prefix}${this.safe ? "s" : ""}://${this.ip}${this.port===undefined?"":`:${this.port}`}${this.aditional}`
        :`${this.aditional}`
    }
}
export async function importFromString(code: string) {
    const blob = new Blob([code], { type: "text/javascript" })
    const url = URL.createObjectURL(blob)

    try {
        return await import(url)
    } finally {
        URL.revokeObjectURL(url)
    }
}
export const sleep = (ms: number) => new Promise(res => setTimeout(res, (ms*1000)))
export function format_time(time:number):string{
    time = Math.floor(time)
    const days = Math.floor(time / 86400)
    const hours = Math.floor((time % 86400) / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = time % 60
    if(days > 0){
        return `${days}:${hours.toString().padStart(2,"0")}d`
    }
    if(hours > 0){
        return `${hours}:${minutes.toString().padStart(2,"0")}h`
    }
    if(minutes > 0){
        return `${minutes}:${seconds.toString().padStart(2,"0")}m`
    }
    return `${seconds}s`
}
export class MinHeap<T> {
    private data:T[]=[]
    constructor(private score:(v:T)=>number){}
    get length(){
        return this.data.length
    }

    push(value:T){
        const data=this.data
        data.push(value)
        let i=data.length-1
        while(i>0){
            const parent=(i-1)>>1
            if(this.score(data[parent])<=this.score(data[i])){
                break
            }
            ;[data[parent],data[i]]=[data[i],data[parent]]
            i=parent
        }
    }
    pop():T|undefined{
        const data=this.data
        if(data.length===0)return undefined
        if(data.length===1)return data.pop()
        const root=data[0]
        data[0]=data.pop()!
        let i=0
        while(true){
            const left=i*2+1
            const right=i*2+2
            let smallest=i
            if(left<data.length&&this.score(data[left])<this.score(data[smallest])){
                smallest=left
            }
            if(right<data.length&&this.score(data[right])<this.score(data[smallest])){
                smallest=right
            }
            if(smallest===i)break
            ;[data[i],data[smallest]]=[data[smallest],data[i]]
            i=smallest
        }
        return root
    }
}
export function formatJSONC(text:string):string{
    /*text = text.replace(/\/\*[\s\S]*?\*\//g, "")
    text = text.replace(/\/\/.*$/gm, "")*/
    return text
}
export function parseJSONC(text: string) {
    return JSON.parse(formatJSONC(text))
}