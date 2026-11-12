import { CheckpointContext, gel_events, GELComponent, Stream, Vec2 } from "../../../../engine/core.ts";
import { type DamageParams, ObjectType } from "../../../others/constants.ts";
import { type CommonObject, type SimulatedObject, type SimulatedScene } from "../../base.ts";

export const projectile_events={
    hit:"projectile_hit",
    finish:"projectile_finish",
}

export type ProjectileOwner=SimulatedObject&{
    dead?:boolean
}
export type ProjectileTarget=SimulatedObject&{
    dead?:boolean
    damage?(params:DamageParams):void
}

export interface ProjectileCreateArgs{
    position?:Vec2
    owner?:ProjectileOwner
    source?:{id_string:string}
}

export interface C_Projectile extends CommonObject{
    owner_id:number
    finished:boolean
}

export const c_projectile:GELComponent<C_Projectile>={
    id_string:"c_projectile",
    events:{
        [gel_events.bind](){
            this.object_type=ObjectType.Projectile
            this.owner_id=0
            this.finished=false
        },
    },
}

export type SI_Projectile=C_Projectile&SimulatedObject&{
    owner?:ProjectileOwner
    source?:{id_string:string}

    set_owner(owner?:ProjectileOwner):void
    owner_alive():boolean
    is_owner(obj:{id:number}):boolean
    hit(target:ProjectileTarget,params:DamageParams):void
    finish():void
    encode_owner(stream:Stream,ctx:CheckpointContext):void
    decode_owner(stream:Stream,ctx:CheckpointContext):void
}

export const si_projectile:GELComponent<SI_Projectile>={
    id_string:"si_projectile",
    extensions:[c_projectile],
    events:{
        [gel_events.create](args?:ProjectileCreateArgs){
            if(!args)return
            if(args.position)this.position=args.position
            if(args.owner)this.set_owner(args.owner)
            if(args.source)this.source=args.source
        },
    },
    methods:{
        set_owner(owner?:ProjectileOwner){
            this.owner=owner
            this.owner_id=owner?.id??0
        },
        owner_alive():boolean{
            return this.owner!==undefined&&!this.owner.dead&&!this.owner.destroyed
        },
        is_owner(obj:{id:number}):boolean{
            return this.owner_id!==0&&obj.id===this.owner_id
        },
        hit(target:ProjectileTarget,params:DamageParams){
            target.damage?.(params)
            this.emit_event(projectile_events.hit,target,params)
        },
        finish(){
            if(this.finished)return
            this.finished=true
            this.emit_event(projectile_events.finish)
            this.destroy()
        },
        encode_owner(stream:Stream,ctx:CheckpointContext){
            const id=this.owner&&!this.owner.destroyed?ctx.idco[this.owner.id]:undefined
            stream.write_boolean_group(id!==undefined)
            if(id!==undefined)stream.write_id(id)
        },
        decode_owner(stream:Stream,ctx:CheckpointContext){
            const [has_owner]=stream.read_boolean_group()
            if(!has_owner)return
            const owner=this.manager.objects[ctx.coid[stream.read_id()]] as ProjectileOwner|undefined
            this.set_owner(owner)
        },
    },
}

export function spawn_projectile<T extends SimulatedObject=SimulatedObject>(scene:SimulatedScene,type:number|string,layer:number,args:ProjectileCreateArgs&Record<string,any>):T{
    const obj=scene.make_object(type)
    if(!obj)throw new Error(`Projectile type ${type} is not registered`)
    return scene.add_object(obj,layer,undefined,args) as T
}
