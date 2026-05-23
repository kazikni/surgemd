import { EaseFunction, mergeDeep, splitPath } from "../math/utils.ts"
import { Vec2 } from "../math/vec2.ts"

export interface Definition{
    idString:string,
    idNumber?:number
}
export class DefinitionsSimple<Type,Base=null>{
    public value:Record<string,Type&Base>
    public valueNumber:Record<number,Type&Base>
    protected did=0
    forall?:(obj:Type&Partial<Base>)=>void
    constructor(forall?:(obj:Type&Partial<Base>)=>void){
        this.value={}
        this.valueNumber={}
        this.forall=forall
    }
    set(val:Type,id:string,n:number|undefined=undefined):number{
        if(this.forall)this.forall(val as (Type&Partial<Base>))
        this.value[id]=val as (Type&Base)
        this.valueNumber[n??this.did]=val as (Type&Base)
        this.did++;
        return this.did
    }
    getFromString(id:string):Type{
        if(!this.value[id]){
            throw new Error(`idString:${id} Dont Exist In Definition`)
        }
        return this.value[id]
    }
    getFromNumber(id:number):Type{
        if(!this.valueNumber[id])throw new Error(`idNumber:${id} Dont Exist In Definition`)
        return this.valueNumber[id]
    }
    exist(id:string):boolean{
        return Object.hasOwn(this.value,id)
    }
    extends(extend:string,val:Partial<Type>,id:string){
        this.set(mergeDeep<Type>(this.getFromString(extend)!,val),id)
    }
    clear(){
        this.value={}
        this.valueNumber={}
        this.did=0
    }
}
export class Definitions<Type extends Definition,Base> extends DefinitionsSimple<Type,Base>{
    insert(...val:Type[]):void{
        for(const vv of val){
            if(this.forall)this.forall(vv as (Type&Partial<Base>))
            this.value[vv.idString]=vv as (Type&Base)
            if(vv.idNumber===undefined){
                vv.idNumber=this.did
                this.valueNumber[this.did]=vv as (Type&Base)
                this.did++
            }else{
                this.valueNumber[vv.idNumber]=vv as (Type&Base)
            }
        }
    }
    insert_defs(...defs:Definitions<Type,Base>[]){
        for(const d of defs){
            this.insert(...Object.values(d.valueNumber))
        }
    }
}
export class DefinitionsMerge<TP extends Definition>{
    valueString:Record<string,TP>={}
    valueNumber:Record<number,TP>={}
    keysString:Record<string,number>={}
    keysNumber:Record<number,string>={}
    constructor(){

    }
    insert(...val:TP[]):void{
        for(const vv of val){
            const idn=Object.keys(this.keysNumber).length
            this.valueNumber[idn]=vv
            this.valueString[vv.idString]=vv
            this.keysNumber[idn]=vv.idString
            this.keysString[vv.idString]=idn
        }
    }
    insert_def(def:Record<string,TP>){
        for(const dv of Object.values(def)){
            const idn=Object.keys(this.keysNumber).length
            this.valueNumber[idn]=dv
            this.valueString[dv.idString]=dv
            this.keysNumber[idn]=dv.idString
            this.keysString[dv.idString]=idn
        }
    }
    clear(){
        this.keysNumber={}
        this.keysString={}
        this.valueNumber={}
        this.valueString={}
    }
}
export class Tree<Type,Base> extends DefinitionsSimple<Type,Base>{
    childs:Record<string,Tree<Type,Base>>
    constructor(forall?:(tp:Type&Partial<Base>)=>void){
        super(forall)
        this.childs={}
    }
    define_tree(name:string):Tree<Type,Base>{
        Object.defineProperty(this.childs,name,{
            value:new Tree<Type,Base>(this.forall)
        })
        return this.childs[name]
    }
    get_tree(name:string):Tree<Type,Base>{
        return this.childs[name]
    }
    delete_tree(name:string){
        delete this.childs[name]
    }
    list_tree():string[]{
        return Object.keys(this.childs)
    }
    exist_tree(tree:string):boolean{
        return this.childs[tree]!=undefined
    }
    //** mysub/sub/1 */
    get_item(name:string):Type|undefined{
        const divisions:string[]=splitPath(name)
        // deno-lint-ignore no-this-alias
        let act:Tree<Type,Base>=this
        for(let i=0;i<divisions.length;i++){
            const d=divisions[i]
            if(act.exist_tree(d)){
                act=this.get_tree(d)
            }else if(act.value[d]!=undefined){
                return act.value[d]
            }else{
                return undefined
            }
        }
    }
}
export class ExtendedMap<K, V> extends Map<K, V> {
    private _get(key: K): V {
        // it's up to callers to verify that the key is valid
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return super.get(key)!
    }

    /**
     * Retrieves the value at a given key, placing (and returning) a user-defined
     * default value if no mapping for the key exists
     * @param key      The key to retrieve from
     * @param fallback A value to place at the given key if it currently not associated with a value
     * @returns The value emplaced at key `key`; either the one that was already there or `fallback` if
     *          none was present
     */
    getAndSetIfAbsent(key: K, fallback: V): V {
        // pretty obvious why this is okay
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (this.has(key)) return this.get(key)!

        this.set(key, fallback)
        return fallback
    }

    /**
     * Retrieves the value at a given key, placing (and returning) a user-defined
     * default value if no mapping for the key exists
     * @param key      The key to retrieve from
     * @param fallback A function providing a value to place at the given key if it currently not
     *                 associated with a value
     * @returns The value emplaced at key `key`; either the one that was already there
     *          or the result of `fallback` if none was present
     */
    getAndGetDefaultIfAbsent(key: K, fallback: () => V): V {
        // pretty obvious why this is okay
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (this.has(key)) return this.get(key)!

        const value = fallback()
        this.set(key, value)
        return value
    }

    ifPresent(key: K, callback: (obstacle: V) => void): void {
        this.ifPresentOrElse(key, callback, () => { /* no-op */ })
    }

    ifPresentOrElse(key: K, callback: (obstacle: V) => void, ifAbsent: () => void): void {
        const mappingPresent = super.has(key)

        if (!mappingPresent) {
            return ifAbsent()
        }

        callback(this._get(key))
    }

    mapIfPresent<U = V>(key: K, mapper: (value: V) => U): U | undefined {
        if (!super.has(key)) return undefined

        return mapper(this._get(key))
    }
}
export interface Language {
    code: string
    name: string
    values: Record<string, any>
    all_values?: string
}
export class TranslationManager {
    private _language: Language
    default_language?: Language

    constructor(language: Language, defaultLanguage?: Language) {
        this._language = language
        this.default_language = defaultLanguage
    }
    setLanguage(language: Language) {
        this._language = language
    }
    setDefaultLanguage(language: Language) {
        this.default_language = language
    }
    getLanguage(): Language {
        return this._language
    }
    get(key: string, replace: Record<string, string> = {}): string {
        let value = this._getFromLang(this._language, key)
        if ((value === undefined || typeof value !== "string") && this.default_language) {
            value = this._getFromLang(this.default_language, key)
        }
        if (value === undefined || typeof value !== "string") {
            console.warn(`[TranslationManager] Missing translation for "${key}"`)
            return key
        }
        return this._interpolate(value, replace)
    }
    private _getFromLang(lang: Language, key: string): any {
        if (lang.all_values !== undefined) {
            return lang.all_values
        }
        return this._resolveValue(lang.values, key.split("."))
    }
    private _resolveValue(obj: Record<string, any>, path: string[]): any {
        let current: any = obj
        for (let i = 0; i < path.length; i++) {
            current = current?.[path[i]]
            if (current === undefined) return undefined
        }
        return current
    }
    private _interpolate(template: string, values: Record<string, string>): string {
        let result = template
        result = result.replace(/\$\{([^}]+)\}/g, (_, key) => {
            return values[key] ?? "${" + key + "}"
        })
        result = result.replace(/\$\[([^\]]+)\]/g, (_, key) => {
            return values[key] ?? "$[" + key + "]"
        })
        return result
    }
}
export interface FrameTransform{
    scale?:number
    scale2?:Vec2
    hotspot?:Vec2
    rotation?:number
    position?:Vec2
    visible?:boolean
    zIndex?:number
    tint?:number
    alpha?:number
    layer?:number
}
export type FrameDef={image?:string}&FrameTransform
export type KeyFrameSpriteDef={
    delay:number
}&FrameDef
export interface AKeyFrameSpriteAction extends FrameTransform {
    type: "sprite"
    image?: string
    fuser: string
}
export interface AKeyFrameTransformAction extends FrameTransform {
    type: "transform"
    fuser: string
}

export interface AKeyFrameTweenAction {
    type: "tween"
    ease?:EaseFunction
    fuser:string
    yoyo?:boolean
    to: FrameTransform
}
export type AKeyFrameAction =
    | AKeyFrameSpriteAction
    | AKeyFrameTweenAction
    | AKeyFrameTransformAction
export interface AKeyFrame{
    actions:AKeyFrameAction[]
    time:number
}
export interface KDate{
    second:number
    minute:number
    hour:number
    day:number
    month:number
    year:number
}