import { random } from "../math/random.ts";
import { Stream } from "../net/stream.ts";

export type GELEvent<Object>=(this:Object,...ev:any)=>any
export type GELMethod<Object>=((this:Object,...ev:any)=>any)&{_super?:GELMethod<any>}

export type GELComponent<Object>={
    id_string?:string
    id_number?:number
    string_names?:string[]

    events?:Record<number|string,((GELEvent<Object>)[])|GELEvent<Object>>
    methods?:Record<string,GELMethod<Object>>

    extensions?:GELComponent<any>[]
}
export class DynamicGELComponent<TObject> implements GELComponent<TObject>{
    events?: Record<string | number, GELEvent<any>[]>;
    methods?: Record<string, GELMethod<any>>;
    __owner?: TObject;

    make_event(event: string | number, method: string) {
        this.events ??= {}
        this.events[event] ??= []
        this.events[event].push((...args: any[]) => {
            return (this as any)[method](this.__owner,...args)
        })
    }
}

export const gel_component={
    normalize_deep(
        val:GELComponent<any>,
        sort?:(a:GELComponent<any>,b:GELComponent<any>)=>number
    ):GELComponent<any>{
        const result:GELComponent<any>[]=[]
        const ids=new Set<string>()
        const refs=new Set<GELComponent<any>>()
        const visiting=new Set<GELComponent<any>>()

        const visit=(component:GELComponent<any>)=>{
            if(visiting.has(component))return
            if(component.id_string!==undefined){
                if(ids.has(component.id_string))return
                ids.add(component.id_string)
            }else{
                if(refs.has(component))return
                refs.add(component)
            }

            visiting.add(component)

            for(const ext of component.extensions??[]){
                visit(ext)
            }

            visiting.delete(component)
            result.push(component)
        }

        for(const ext of val.extensions??[]){
            visit(ext)
        }

        if(sort)result.sort(sort)

        val.extensions=result

        const names=new Set<string>(val.string_names??[])
        if(val.id_string!==undefined)names.add(val.id_string)

        for(const component of result){
            if(component.id_string!==undefined)names.add(component.id_string)
            for(const name of component.string_names??[])names.add(name)
        }

        val.string_names=[...names]

        return val
    },

    insert_deep(
        val:GELComponent<any>,
        other:GELComponent<any>,
        sort?:(a:GELComponent<any>,b:GELComponent<any>)=>number
    ):GELComponent<any>{
        val.extensions??=[]
        val.extensions.push(other)

        this.normalize_deep(val,sort)

        return val
    },

    merge_deep(...components:GELComponent<any>[]):GELComponent<any>{
        const ret:GELComponent<any>={
            events:{},
            methods:{},
            extensions:[],
            string_names:[],
        }

        const ids=new Set<string>()
        const refs=new Set<GELComponent<any>>()
        const visiting=new Set<GELComponent<any>>()
        const names=new Set<string>()

        const visit=(component:GELComponent<any>)=>{
            if(visiting.has(component))return

            if(component.id_string!==undefined){
                if(ids.has(component.id_string))return
                ids.add(component.id_string)
            }else{
                if(refs.has(component))return
                refs.add(component)
            }

            visiting.add(component)

            // Primeiro processa as dependências.
            for(const ext of component.extensions??[]){
                visit(ext)
            }

            visiting.delete(component)

            // Depois incorpora o próprio componente.
            if(component.id_string!==undefined){
                names.add(component.id_string)
            }

            for(const name of component.string_names??[]){
                names.add(name)
            }

            if(component.events){
                for(const key in component.events){
                    const event=component.events[key]
                    const list=Array.isArray(event)?event:[event]
                    ret.events![key]??=[]
                    const target=ret.events![key] as GELEvent<any>[]
                    target.push(...list)
                }
            }

            if(component.methods){
                Object.assign(ret.methods!,component.methods)
            }
        }

        for(const component of components){
            visit(component)
        }

        ret.string_names=[...names]

        return ret
    },
}

export const gel_events={
    none:0,
    bind:1,
    unbind:2,
    create:3,
    registry:4,
    unregistry:5,
    layer_set:6,
    update_collider:7,
    destroy:8,
    tick:9,
    render:10,
    net_encode:11,
    net_decode:12,
    net_update:13,
    checkpoint_encode:14,
    checkpoint_decode:15,
    last:16,
} satisfies Record<string,number>
// Base Game Element 2D
export class BaseGEL{
    __events:Map<number|string,GELEvent<any>[]>=new Map()
    __owner:any=this
    __components:Map<string,GELComponent<any>>=new Map()

    add_component(component: GELComponent<any>,overwrite_methods:boolean=true){
        if(component.id_string!==undefined){
            if(this.__components.has(component.id_string))return
            this.__components.set(component.id_string,component)
        }
        if(component.string_names){
            for(const c of component.string_names){
                if(!this.__components.has(c))this.__components.set(c,component)
            }
        }

        if(component instanceof DynamicGELComponent){
            component.__owner = this.__owner;
        }
        if(component.extensions)for(const c of component.extensions){
            this.add_component(c)
        }
        const events = component.events ?? {};
        for (const key in events) {
            const event = Number.isNaN(Number(key))?key:Number(key)
            if(Array.isArray(events[key]))this.on(event, ...events[key])
            else this.on(event, events[key])
        }
        if(component.methods){
            for(const key in component.methods){
                if(overwrite_methods){
                    const val:GELMethod<any>=component.methods[key].bind(this.__owner)
                    if((this as any)[key]!==undefined)val._super=(this as any)[key]
                    ;(this as any)[key]=val
                }else{
                    if((this as any)[key]===undefined)component.methods[key].bind(this.__owner)
                }
            }
        }

        const bind=component.events?.[gel_events.bind]
        if(bind){
            if(typeof bind==="function")bind.call(this)
            else for(const cb of bind)cb.call(this)
        }
        return events;
    }
    emit_event(event:string|number,...args:any[]){
        const e=this.__events.get(event)
        if(e){
            for(const cb of e){
                cb(...args)
            }
        }
    }
    emit_event_arg_sequence(event:string|number,arg?:any){
        const e=this.__events.get(event)
        if(e){
            for(const cb of e){
                arg=cb(arg)
            }
        }
        return arg
    }
    on(event:string|number,...ev:GELEvent<any>[]){
        if(!this.__events.has(event))this.__events.set(event,[])
        for(const e of ev){
            this.__events.get(event)!.push(e.bind(this))
        }
    }
    son(event:string|number,value:string){
        this.on(event,(this as any)[value] as GELEvent<Object>)
        if(!this.__events.has(event))this.__events.set(event,[])
    }
}

export class BaseGELO extends BaseGEL{
    id!:string|number
    instance_type:number=0
}
export class GELOManager<GELO extends BaseGELO=BaseGELO>{
    content:Record<string|number,GELO>={}

    registry_gelo_cb?:(gelo:GELO)=>void

    make_gelo_net_cb?:(tp:number)=>GELO|undefined
    make_gelo_checkpoint_cb?:(tp:number,stream:Stream)=>GELO|undefined

    generate_object_id():number{
        let ret=0
        do {
            ret = random.id()
        } while (this.content[ret]||ret===0)
        return ret
    }
    registry(gelo:GELO,id?:string|number){
        if(id===undefined)id=this.generate_object_id()
        this.content[id]=gelo
        gelo.id=id
        this.registry_gelo_cb?.(gelo)
        gelo.emit_event(gel_events.registry)
        return gelo
    }
    unregistry(id:string|number){
        const gelo=this.content[id]
        if(gelo){
            gelo.emit_event(gel_events.registry)
            delete this.content[id]
        }
    }

    encode_net_gelo(gelo: GELO, stream: Stream) {
        const size_pos = stream.index

        stream.write_uint24(0)

        const start = stream.index

        stream.write_any(gelo.id)
        stream.write_uint8(gelo.instance_type)

        gelo.emit_event(gel_events.net_encode, stream)

        const end = stream.index

        stream.index = size_pos
        stream.write_uint24(end - start)
        stream.index = end
    }

    proccess_net_gelo(stream: Stream): GELO | undefined {
        const size = stream.read_uint24()

        const start = stream.index
        const end = start + size

        let tp: number | undefined

        try {
            if (end > stream.data.length) {
                throw new Error(`Invalid GELO packet size: ${size}`)
            }

            const id = stream.read_any() as string | number
            tp = stream.read_uint8()

            let gelo:GELO|undefined = this.content[id]
            if (!gelo) {
                gelo = this.make_gelo_net_cb?.(tp)
                if (!gelo) {
                    throw new Error(
                        `Cannot create GELO type=${tp} id=${id}`
                    )
                }

                this.registry(gelo, id)
            }

            if (gelo.instance_type !== tp) {
                throw new Error(
                    `GELO type mismatch: id=${id}, expected=${gelo.instance_type}, received=${tp}`
                )
            }

            gelo.emit_event(gel_events.net_decode, stream)

            return gelo
        } catch (e) {
            console.error(e)
        } finally {
            if (stream.index !== end) {
                console.warn(
                    `GELO size mismatch (${stream.index - start}/${size}) tp:${tp}`
                )
            }

            stream.index = end
        }
    }

    encode(list: GELO[], stream: Stream): Stream {
        stream.write_id(list.length)

        for (const gelo of list) {
            this.encode_net_gelo(gelo, stream)
        }

        return stream
    }

    decode(stream: Stream): GELO[] {
        const ret: GELO[] = []

        const count = stream.read_id()

        for (let i = 0; i < count; i++) {
            const gelo = this.proccess_net_gelo(stream)

            if (gelo) {
                ret.push(gelo)
            }
        }

        return ret
    }

    tick(dt:number,net_update?:boolean){
        for(const g in this.content){
            this.content[g].emit_event(gel_events.tick,dt)
            if(net_update)this.content[g].emit_event(gel_events.net_update,dt)
        }
    }
}