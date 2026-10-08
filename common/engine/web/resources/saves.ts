import { type FileManager } from "../../core/definition/file.ts";
import { Path } from "../../core/math/utils.ts";
import { DynamicStream, StaticStream } from "../../core/net/stream.ts";
import { InputAction, InputManager } from "../misc/keys.ts";

/**
 * Represents a successful operation
 * @template Res The type of the successful operation's result
 */
export type ResultRes<Res> = { res: Res };
/**
 * Represents a failed operation
 * @template Err The type of the failed operation's result
 */
export type ResultErr<Err> = { err: Err };
/**
 * Represents a result whose state is unknown
 * @template Res The type of the successful operation's result
 * @template Err The type of the failed operation's result
 */
export type Result<Res, Err> = ResultRes<Res> | ResultErr<Err>;
export const Casters = Object.freeze({
    toString<T extends string>(val: T): ResultRes<T> {
        return { res: val };
    },
    toNumber(val: string): Result<number, string> {
        const num = +val;

        if (Number.isNaN(num)) {
            return { err: `'${val}' is not a valid numeric value` };
        }

        return { res: num };
    },
    toInt(val: string): Result<number, string> {
        const num = Casters.toNumber(val);

        if ("err" in num) return num;

        if (num.res % 1) {
            return { err: `'${val}' is not an integer value` };
        }

        return num;
    },
    toBoolean(val: string|boolean): Result<boolean, string> {
        if(typeof val==="boolean"){
            return {res:val}
        }else{
            val = val.toLowerCase();

            switch (true) {
                case ["1", "t", "true", "y", "yes"].includes(val): return { res: true };
                case ["0", "f", "false", "n", "no"].includes(val): return { res: false };
                default: {
                    return { err: `'${val}' is not a valid boolean value` };
                }
            }
        }
    },
    generateUnionCaster<const T extends string>(options: readonly T[]) {
        const errorStr = options.map((v, i, a) => `${i === a.length - 1 ? "or " : ""}'${v}'`).join(", ");

        return (val: string): Result<T, string> => {
            if (options.includes(val as T)) return { res: val as T };

            return {
                err: `Value must be either ${errorStr}; received ${val}`
            };
        };
    },
});
export type SettingInputConfig=({
    type:"select"
    options:{value:string,name:string}[]
})
export interface GameSettingsSaveFile{
    version:number
    settings:Record<string,any>
    actions:Record<string,InputAction>
}
export type SetCallback = (n:any,o:any)=>void
export type SaveKind={
    type:"file",
    path:string,
    fs:FileManager
}|{
    type:"localstorage",
    key:string,
}|{
    type:"localstorage",
    key:string
}
export class SettingsSaveManager{
    manager:SaveManager
    casters:Record<string,(val:any)=>Result<any,any>>={}
    default_values:Record<string, any>={}
    content:Record<string,any>={}

    variable_set_callbacks:Partial<Record<keyof typeof this.casters,(SetCallback)[]>>={}
    save_kind?:SaveKind
    default_actions:Record<string,InputAction>={}

    compatible_version=0
    version:number=0

    constructor(manager:SaveManager){
        this.manager=manager
    }

    set_action(name:string,action:InputAction){
        if(!this.manager.input_manager)return
        this.manager.input_manager.actions[name]=action
        if(this.save_kind){
            this.save(this.save_kind)
        }
    }

    get_var(key: keyof typeof this.content): any {
        const v = this.content[key]
        return v === undefined ? this.default_values[key] : v
    }
    set_var(key:keyof typeof this.content,value:any):any{
        const old=this.content[key]
        this.content[key]=value
        if(this.variable_set_callbacks[key]){
            for(const cb of this.variable_set_callbacks[key]){
                cb(value,old)
            }
        }
        if(this.save_kind){
            this.save(this.save_kind)
        }
    }

    add_variables_set_callback(key:string,callback:SetCallback){
        if(!this.variable_set_callbacks[key])this.variable_set_callbacks[key]=[]
        this.variable_set_callbacks[key]!.push(callback)
    }
    load_settings_save(file:GameSettingsSaveFile){
        if(!file.actions)return
        if(this.manager.input_manager){
            this.manager.input_manager.default_actions=this.default_actions
            this.manager.input_manager.loadConfig(file.actions??{})
        }
        if(file.version===undefined||file.version<this.compatible_version){
            this.reset()
            return 
        }
        this.content={}
        for(const o of Object.keys(file.settings)){
            if(this.default_values[o]===undefined)continue
            const res=this.casters[o](file.settings[o])
            if("err" in res) {
                this.content[o] = this.default_values[o]
            } else {
                this.content[o] = res.res
            }
        }
    }

    async load(save:SaveKind){
        this.save_kind=save
        switch(save.type){
            case "file":
                try{
                    if(await save.fs.exist(save.path)){
                        const f=JSON.parse(await save.fs.read_file(save.path)) as GameSettingsSaveFile
                        this.load_settings_save(f)
                    }else{
                        await this.save(save)
                        const f=JSON.parse(await save.fs.read_file(save.path)) as GameSettingsSaveFile
                        this.load_settings_save(f)
                    }
                }catch(e){
                    await this.save(save)
                }
                break
            case "localstorage":{
                const s=self.localStorage.getItem(save.key)
                if(s){
                    const f=JSON.parse(s) as GameSettingsSaveFile
                    this.load_settings_save(f)
                }else{
                    await this.save(save)
                    const f=JSON.parse(self.localStorage.getItem(save.key)??"{}") as GameSettingsSaveFile
                    this.load_settings_save(f)
                }
                break
            }
        }
    }
    async save(save:SaveKind){
        this.save_kind=save
        const s={
            settings:this.content,
            actions:this.manager.input_manager?.saveConfig?.(),
            version:this.version
        }
        switch(save.type){
            case "file":{
                const dir=Path.dirname(save.path)
                if(!await save.fs.exist(dir)){
                    await save.fs.make_dir(dir)
                }
                await save.fs.write_file(save.path,JSON.stringify(s, null, 4))
                break
            }
            case "localstorage":
                self.localStorage.setItem(save.key,JSON.stringify(s))
                break
        }
    }
    export():string{
        const stream=new DynamicStream()
        stream.write_uint16(this.version)
        stream.write_any(this.content)
        stream.write_any(this.manager.input_manager?.saveConfig?.())
        stream.lock()
        return btoa(String.fromCharCode(...(stream.data as Uint8Array)))
    }
    import(val:string){
        const bin=atob(val)
        const bytes=new Uint8Array(bin.length)
        for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i)
        const stream=new StaticStream(bytes.buffer)

        const save:GameSettingsSaveFile={
            version:stream.read_uint16(),
            settings:stream.read_any(),
            actions:stream.read_any(),
        }
        this.load_settings_save(save)
        if(this.save_kind)this.save(this.save_kind)
    }
    async init(save:SaveKind){
        await this.load(save)
    }


    reset(){
        this.content={}
        this.manager.input_manager?.resetAllActions?.()
    }
}
export class SaveManager{
    input_manager?:InputManager
    settings:SettingsSaveManager
    fs?:FileManager

    constructor(){
        this.settings=new SettingsSaveManager(this)
    }
}