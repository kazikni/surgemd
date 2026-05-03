import { Language } from "../definition/definitions.ts";
import { type Scene2D } from "../game/game.ts";
import { random } from "./random.ts";
import { v2, Vec2 } from "./vec2.ts";

export const halfpi=Math.PI/2

export type ID=number
export function joinPath(...p: string[]) {
    return p.join("/").replace(/\/+/g, "/")
}
export function splitPath(path:string):string[]{
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
}

export type Tags=string[]
export function hasTag(tags:Tags,tag:string):boolean{
    return tags.includes(tag)
}
export function hasTags(tags1:Tags,tags2:Tags):boolean{
    for(const t of tags1){
        if (tags2.includes(t)){
            return true
        }
    }
    return false
}
export function combineWithoutEqual<T>(...arrays: T[][]): T[] {
    const resultado: T[] = []

    for (const array of arrays) {
        for (const elemento of array) {
            if (!resultado.includes(elemento)) {
                resultado.push(elemento)
            }
        }
    }

    return resultado
}

export class SignalManager {
    // deno-lint-ignore ban-types
    protected listeners: Map<string, Function[]>

    constructor() {
        this.listeners = new Map()
    }

    // deno-lint-ignore ban-types
    on(signal: string, callback: Function): void {
        if (!this.listeners.has(signal)) {
            this.listeners.set(signal, [])
        }
        this.listeners.get(signal)!.push(callback)
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
export class Clock {
    private frameDuration: number;
    private lastFrameTime: number;
    accumulator:number=0
    public timeScale: number;
    public callback: (dt:number)=>void;
    public intervals:Map<number,(dt:number)=>void>=new Map()

    running:boolean=false
    tps:number=60

    profiler:TicksProfiler=new TicksProfiler()

    constructor(targetFPS: number, timeScale: number, callback: (dt:number)=>void) {
        this.frameDuration = 1000 / targetFPS
        this.tps=targetFPS
        this.lastFrameTime = Date.now()
        this.timeScale = timeScale
        this.callback = callback
        this.tick = this.tick.bind(this)

        this.profiler.enabled=true
    }

    private interval?:number=undefined

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

            const dt = (elapsedTime / 1000) * this.timeScale

            this.callback(dt);
            for (const i of this.intervals.values()) {
                i(dt);
            }
            this.profiler.end(0)
        }
    }
    _tick(){
        if(this.running){
            this.tick()
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
            }, this.frameDuration)
        }
    }
    public startRAF() {
        if (!this.running) {
            this.running = true;

            this._tick=this._tick.bind(this)
            this.lastFrameTime = performance.now()
            this.frameDuration=1000/this.tps
            self.requestAnimationFrame(this._tick)
        }
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
      if (Array.isArray(tgtVal)) {
        (target as any)[key] = [...tgtVal, ...srcVal] as any;
      } else {
        (target as any)[key] = [...srcVal] as any;
      }
      continue;
    }

    // objects
    if (typeof srcVal === "object") {
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
export class WebPath{
    IP:string
    Port:number
    HTTP:boolean
    constructor(IP:string,Port:number,HTTP:boolean=false){
        this.IP=IP
        this.Port=Port
        this.HTTP=HTTP
    }
    toString():string{
        return `${this.HTTP ? "s" : ""}://${this.IP}:${this.Port}`
    }
}

// deno-lint-ignore ban-types
export function getEnumValues<E extends Object>(enumObject: E): (E[keyof E])[] {
    return Object.values(enumObject).filter(value => typeof value === 'number') as E[keyof E][]
}
// deno-lint-ignore ban-types
export async function loadJson<val extends {}>(path:string):Promise<val>{
    return await(await(fetch(path))).json()
}
export const loadScene2D=loadJson<Scene2D>
export const loadLanguage=loadJson<Language>
export function getPatterningShape(
    spawnCount: number,
    radius: number
): Vec2[] {
    const makeSimpleShape = (points: number) => {
        const tauFrac = Math.PI / points;
        return (radius: number, offset = 0): Vec2[] => Array.from(
            { length: points },
            (_, i)=>v2.from_RadAngle(i * tauFrac + offset, radius)
        );
    };

    const [
        makeTriangle,
        makeSquare,
        makePentagon,
        makeHexagon
    ] = [3, 4, 5, 6].map(makeSimpleShape);

    switch (spawnCount) {
        case 1: return [v2(0, 0)];
        case 2: return [
            v2(0, radius),
            v2(0, -radius)
        ];
        case 3: return makeTriangle(radius);
        case 4: return [v2(0, 0), ...makeTriangle(radius)];
        case 5: return [v2(0, 0), ...makeSquare(radius)];
        case 6: return [v2(0, 0), ...makePentagon(radius)];
        case 7: return [v2(0, 0), ...makeHexagon(radius, halfpi)];
        case 8: return [
            v2(0, 0),
            ...makeTriangle(radius / 2),
            ...makeSquare(radius, halfpi)
        ];
        case 9: return [
            v2(0, 0),
            ...makeTriangle(radius / 2),
            ...makePentagon(radius)
        ];
    }

    return [
        ...getPatterningShape(spawnCount - 6, radius * 3 / 4),
        ...makeHexagon(radius, halfpi)
    ];
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
    IP:string
    Port:number
    HTTP:boolean
    has_prefix:boolean
    aditional:string=""
    constructor(IP:string,Port:number,HTTP:boolean=false,has_prefix=true,aditional:string=""){
        this.IP=IP
        this.Port=Port
        this.HTTP=HTTP
        this.has_prefix=has_prefix
        this.aditional=aditional
    }
    toString(prefix:string=""):string{
        return this.has_prefix?
        `${prefix}${this.HTTP ? "s" : ""}://${this.IP}:${this.Port}${this.aditional}`
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