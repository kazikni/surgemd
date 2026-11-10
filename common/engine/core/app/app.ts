import { Clock, SignalManager } from "../math/utils.ts"
import {  BaseObject2D, type CellsManager2D, CheckpointSettings, ObjectManager2D } from "./object.ts"
import { Stream } from "../net/stream.ts";
import { Definition } from "../definition/definitions.ts";
import { BaseGEL, BaseGELO, GELComponent, GELOManager } from "./gel.ts";
export abstract class BaseSceneObject2D extends BaseObject2D{
    // deno-lint-ignore no-explicit-any
    public app!:AbstractApplication
    public scene!:Scene2D<any,any>

    constructor(){
        super()
    }
}

export interface SceneGEL extends BaseGEL{
    app:AbstractApplication
    scene:Scene2D<any>
    id:string|number
}

export class Scene{
    app!:AbstractApplication
    _initialized=false

    net_update(){}
    update(dt:number){}

    on_set(){}
    on_unset(){}
    on_init(){}

    init(app:AbstractApplication){
        this.app=app
        if(!this._initialized){
            this._initialized=true
            return this.on_init()
        }
    }
}

export interface GELDefintion<T> extends Definition{
    factory:()=>T
}

export type SceneGELO={
    app:AbstractApplication
    scene:Scene2D<any,any>
}&BaseGELO
export class Scene2D<Object extends BaseSceneObject2D=BaseSceneObject2D,GELO extends SceneGELO=SceneGELO> extends Scene{
    readonly objects:ObjectManager2D<Object>
    readonly gelo:GELOManager<GELO>
    readonly cells:CellsManager2D<Object>

    add_object:(obj: Object,layer: number,id?: number,args?: any)=>Object

    constructor(){
        super()
        this.objects=new ObjectManager2D(5)
        this.gelo=new GELOManager()
        this.add_object=this.objects.add_object.bind(this.objects)

        this.cells=this.objects.cells

        this.objects.registry_object_cb=this._registry_object.bind(this)
        this.gelo.registry_gelo_cb=this._registry_gelo.bind(this)
        this.objects.make_object_net_cb=this.make_object_net.bind(this)
        this.objects.make_object_checkpoint_cb=this.make_object_checkpoint.bind(this)
    }

    override init(app: AbstractApplication): void {
        super.init(app)
    }

    override net_update(){
        this.objects.update_to_net()
    }

    _registry_object(obj:Object){
        obj.scene=this
        obj.app=this.app
    }
    _registry_gelo(gelo:GELO){
        gelo.scene=this
        gelo.app=this.app
    }

    make_component(t:number|string,...args:any[]):GELComponent<any>|undefined{
        return
    }
    make_gelo(t:number|string,...args:any[]):BaseGEL|undefined{
        return
    }

    make_object(type:number|string,...args:any[]):Object|undefined{
        return
    }
    make_object_net(id:number,layer:number,t:number){
        return this.make_object(t,id,layer)
    }
    make_object_checkpoint(stream:Stream,id:number|undefined,layer:number,t:number){
        return this.make_object(t,stream,id,layer)
    }


    clear(){
        this.objects.clear()
    }
    override update(dt:number,net_update:boolean=true,destroy_queue:boolean=true):void{
        this.objects.tick(dt)
        this.gelo.tick(dt,net_update)
        if(net_update)this.net_update()
        if(destroy_queue)this.objects.apply_destroy_queue()
    }

    make_checkpoint(stream:Stream,settings?:CheckpointSettings){
        this.objects.encode_checkpoint(stream,settings)
    }
    load_checkpoint(stream:Stream){
        this.objects.proccess_checkpoint(stream)
    }
}

export abstract class AbstractApplication{
    readonly tps:number

    readonly clock:Clock
    _scene?:Scene
    events:SignalManager=new SignalManager()

    get scene():Scene|undefined{
        return this._scene
    }
    set scene(scene:Scene|undefined){
        if(scene===this._scene)return
        const old=this._scene

        if(scene)scene.init(this)
        this._scene=scene

        old?.on_unset?.()
        scene?.on_set?.()
    }

    running:boolean=false
    

    constructor(tps: number){
        this.tps=tps
        this.clock=new Clock(tps,1,(dt)=>this.update(dt))
    }

    update(dt:number){
        this.on_update(dt)
        this._scene?.update?.(dt)
        if(!this.running){
            this.clock.stop()
            this.on_stop()
        }
    }

    bind(){}
    on_update(_dt:number):void{}
    on_run():void{}
    on_stop():void{}

    mainloop(rqf=false,auto_mainloop:boolean=true){
        if(this.running)return
        // Start
        this.running=true
        this.on_run()
        if(auto_mainloop){
            if(rqf){
                this.clock.startRAF()
            }else{
                this.clock.start()
            }
        }
    }
    stop(){
        if(!this.running)return
        this.running=false
        this.clock.stop()
        this.on_stop()
    }
}
export interface ConsoleLogger{
    clear():void
    log(...val:any[]):void
}