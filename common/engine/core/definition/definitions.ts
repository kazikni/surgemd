import { FrameTD, FrameTransformTD, tdm, TDObject, TDType } from "../lang/td.ts";
import { EaseFunction, mergeDeep, Path } from "../math/utils.ts"
import { type Vec2 } from "../math/vec2.ts"
import { type Stream } from "../net/stream.ts";

export const DefinitionTD:TDObject={
    type:TDType.object,
    content:[{name:"idString",content:tdm.string1}]
}
export interface Definition{
    idString:string,
    idNumber?:number
}
export class DefinitionsSimple<Type,Base=null>{
    public value:Record<string,Type&Base>
    public valueNumber:Record<number,Type&Base>
    did=1
    forall?:(obj:Type&Partial<Base>)=>Type
    constructor(forall?:(obj:Type&Partial<Base>)=>Type){
        this.value={}
        this.valueNumber={}
        this.forall=forall
    }
    set(val:Type,id:string,n:number|undefined=undefined):number{
        if(this.forall)val=this.forall((val as (Type&Partial<Base>)))
        this.value[id]=val as (Type&Base)
        this.valueNumber[n??this.did]=val as (Type&Base)
        this.did++
        return this.did
    }
    getFromString(id:string):Type{
        if(!this.value[id]){
            throw new Error(`idString:${id} Dont Exist In Definition`)
        }
        return this.value[id]
    }
    getFromNumber(id:number):Type{
        if(!this.valueNumber[id]){
            throw new Error(`idNumber:${id} Dont Exist In Definition`)
        }
        return this.valueNumber[id]
    }
    getFromStringSafe(id:string):Type|undefined{
        return this.value[id]
    }
    getFromNumberSafe(id:number):Type|undefined{
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
        this.did=1
    }
}
export class Definitions<Type extends Definition,Base> extends DefinitionsSimple<Type,Base>{
    insert(...val:Type[]):void{
        for(let vv of val){
            if(this.forall)vv=this.forall(vv as (Type&Partial<Base>))
            vv.idNumber=undefined
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
            const idn=Object.keys(this.keysNumber).length+1
            this.valueNumber[idn]=vv
            this.valueString[vv.idString]=vv
            this.keysNumber[idn]=vv.idString
            this.keysString[vv.idString]=idn
        }
    }
    insert_def(def:Record<string,TP>){
        for(const dv of Object.values(def)){
            const idn=Object.keys(this.keysNumber).length+1
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
    constructor(forall?:(tp:Type&Partial<Base>)=>Type){
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
        const divisions:string[]=Path.split(name)
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
export interface LanguageLayer{
    tag:string
    language:Language
}
export class TranslationManager {
    private language_layers: LanguageLayer[] = []
    private default_layers: LanguageLayer[] = []
    constructor() {

    }
    load_language(language:Language,tag:string){
        this.language_layers.push({
            tag,
            language
        })
    }
    load_default_language(language:Language,tag:string){
        this.default_layers.push({
            tag,
            language
        })
    }
    clear(tag:string){
        this.language_layers=this.language_layers.filter(v=>v.tag!==tag)
        this.default_layers=this.default_layers.filter(v=>v.tag!==tag)
    }
    get(key:string,replace:Record<string,string>={},default_value?:string){
        let value=this.get_value(this.language_layers,key)
        if(value===undefined){
            value=this.get_value(this.default_layers,key)
        }
        if(default_value!==undefined){
            return default_value
        }else if(typeof value!=="string"){
            console.error(`[TranslationManager] Missing translation "${key}"`)
            return key
        }
        return this._interpolate(value,replace)
    }
    private get_value(layers:{tag:string,language:Language}[],key:string){
        for(let i=layers.length-1;i>=0;i--){
            const value=this._getFromLang(layers[i].language,key)
            if(value!==undefined){
                return value
            }
        }

        return undefined
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
    position?:Vec2
    rotation?:number
    scale?:number
    scale2?:Vec2
    tint?:number
    hotspot?:Vec2
    alpha?:number
    zIndex?:number
    layer?:number
    visible?:boolean
}
export type FrameDef={image?:string,sub_sprites?:{image:string,tint?:number}[]}&FrameTransform
export type KeyFrameSpriteDef={
    delay:number
}&FrameDef
export interface AKeyFrameSpriteAction extends FrameDef {
    type: "sprite"
    fuser: string
}
export interface AKeyFrameTransformAction extends FrameTransform {
    type: "transform"
    fuser: string
}
export interface AKeyFrameTweenAction {
    type: "tween"
    ease?:EaseFunction|string
    fuser:string
    yoyo?:boolean
    to: FrameTransform
}
export interface AKeyFrameCallMode{
    type:"callmode"
    mode:string
    args?:any[]
}
export type AKeyFrameAction = AKeyFrameSpriteAction
    | AKeyFrameTweenAction
    | AKeyFrameTransformAction
    | AKeyFrameCallMode
export interface AKeyFrame{
    actions:AKeyFrameAction[]
    time:number
}
export function encode_akeyframe(stream:Stream,keyframe:AKeyFrame){
    stream.write_float32(keyframe.time)
    stream.write_array(keyframe.actions,(i)=>{
        switch(i.type){
            case "sprite":
                stream.write_uint8(0)
                .write_td(i,FrameTD)
                .write_string(i.fuser,1)
                break
            case "transform":
                stream.write_uint8(1)
                .write_td(i,FrameTransformTD)
                .write_string(i.fuser,1)
                break
            case "tween":
                stream.write_uint8(2)
                .write_string(i.fuser,1)
                .write_td(i.to,FrameTransformTD)
                .write_boolean_group(i.yoyo??false,typeof i.ease==="string")
                if(typeof i.ease==="string"){
                    stream.write_string(i.ease,1)
                }
                break
            case "callmode":
                stream.write_uint8(3)
                stream.write_string(i.mode,1)
                stream.write_any(i.args,2,2)
                break
            default:
                stream.write_uint8(255)
                break
        }
    },1)
}
export function decode_akeyframe(stream:Stream):AKeyFrame{
    return {
        time:stream.read_float32(),
        actions:stream.read_array(()=>{
            const type=stream.read_uint8()
            switch(type){
                case 0:{
                    const val=stream.read_td(FrameTD)
                    return {
                        type:"sprite",
                        fuser:stream.read_string(1),
                        ...val,
                    }
                }
                case 1:{
                    const val=stream.read_td(FrameTransformTD)
                    return {
                        type:"transform",
                        fuser:stream.read_string(1),
                        ...val,
                    }
                }
                case 2:{
                    const fuser=stream.read_string(1)
                    const to=stream.read_td(FrameTransformTD)
                    const [yoyo,hasEase]=stream.read_boolean_group()
                    let ease:string|undefined
                    if(hasEase){
                        ease=stream.read_string(1)
                    }
                    return {
                        type:"tween",
                        fuser,
                        to,
                        yoyo,
                        ease,
                    }
                }
                case 3:{
                    return {
                        type:"callmode",
                        mode:stream.read_string(1),
                        args:stream.read_any(2,2),
                    }
                }
                case 255:{
                    return undefined
                }
                default:
                    throw new Error(`Unknown AKeyFrame action type: ${type}`)
            }
        },1),
    }
}
export interface KDate{
    second:number
    minute:number
    hour:number
    day:number
    month:number
    year:number
}