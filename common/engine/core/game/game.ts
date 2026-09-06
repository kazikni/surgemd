import { Clock, SignalManager } from "../math/utils.ts"
import { BaseObject2D, type CellsManager2D, CheckpointSettings, GameObjectManager2D } from "./gameObject.ts"
import { DefinitionsSimple } from "../definition/definitions.ts";
import { Stream } from "../net/stream.ts";
export abstract class BaseGameObject2D extends BaseObject2D{
    // deno-lint-ignore no-explicit-any
    public game!:AbstractGame<any>
    public scene!:Scene2DInstance<any>

    constructor(){
        super()
    }
}
export abstract class GameComponent<Game=any>{
    game!:Game
    binded:boolean=false

    constructor(){
    }

    on_bind(){}
    on_unbind(){}
    on_tick(dt:number):void{}
    on_render(dt:number):void{}
    on_run():void{}
    on_stop():void{}
}
export class Scene2DInstance<DefaultGameObject extends BaseGameObject2D=BaseGameObject2D>{
    readonly objects:GameObjectManager2D<DefaultGameObject>
    readonly cells:CellsManager2D<DefaultGameObject>
    game:AbstractGame<DefaultGameObject>

    constructor(game:AbstractGame){
        this.game=game
        this.objects=new GameObjectManager2D<DefaultGameObject>(5)
        this.cells=this.objects.cells
        this.objects.add_object=this.add_object.bind(this)
        this.objects.make_object_net=this.make_object_net.bind(this)

        this.objects.make_object_checkpoint=this.make_object_checkpoint.bind(this)
    }

    net_update(){
        this.objects.update_to_net()
    }

    add_object(obj: DefaultGameObject, layer: number, id?: number, args?: Record<string, any>, sv?: Record<string, any>){
        obj.game=this.game;
        obj.scene=this;
        return GameObjectManager2D.prototype.add_object.call(this.objects,obj,layer,id,args,sv);
    }
    make_object_net(id:number,layer:number,t:number){
        if(!this.game.objects.getFromNumberSafe(t))return undefined
        return new (this.game.objects.getFromNumber(t))()
    }

    make_object_checkpoint(_stream:Stream,_id:number|undefined,_layer:number,t:number){
        if(!this.game.objects.getFromNumberSafe(t))return undefined
        return new (this.game.objects.getFromNumber(t))()
    }

    clear(){
        this.objects.clear()
    }
    update(dt:number,net_update:boolean=true,destroy_queue:boolean=true):void{
        this.objects.tick(dt)
        if(net_update){
            this.objects.update_to_net()
        }
        if(destroy_queue){
            this.objects.apply_destroy_queue()
        }
    }

    make_checkpoint(stream:Stream,settings?:CheckpointSettings){
        this.objects.encode_checkpoint(stream,settings)
    }
    load_checkpoint(stream:Stream){
        this.objects.proccess_checkpoint(stream)
    }
}

export abstract class AbstractGame<DefaultGameObject2D extends BaseGameObject2D=any>{
    readonly tps:number

    readonly clock:Clock

    components:GameComponent<this>[]=[]
    objects:DefinitionsSimple<new()=>DefaultGameObject2D>=new DefinitionsSimple()
    running:boolean=false
    signals:SignalManager=new SignalManager()
    delta_time:number=0

    constructor(tps: number,objects:Array<new()=>DefaultGameObject2D>){
        this.tps=tps
        this.clock=new Clock(tps,1,(dt)=>this.update(dt))

        for(const o of objects){
            const oi=new o()
            this.objects.set(o,oi.string_type,oi.number_type)
        }
    }

    call_event(event:string,...args:any[]){
        for(const c of this.components){
            if((c as any)["on_"+event])(c as any)["on_"+event](...args)
        }
        this.signals.emit(event,...args)
    }
    async call_event_async(event:string,...args:any[]):Promise<void>{
        for(const c of this.components){
            if((c as any)["on_"+event])await (c as any)["on_"+event](...args)
        }
        this.signals.emit(event,...args)
    }
    add_component(component:any):GameComponent{
        if(component.binded)return component
        component.game=this
        this.components.push(component)
        if(this.running){
            component.on_bind()
            component.binded=true
        }
        return component
    }
    update(dt:number){
        this.clock.profiler.start(1)
        this.delta_time=dt

        this.on_update(dt)
        this.call_event("tick",dt)

        if(!this.running){
            this.clock.stop()
            this.on_stop()
            this.call_event("stop")
        }
        this.clock.profiler.end(1)
    }

    on_render(dt:number):void{}
    on_update(_dt:number):void{}
    on_run():void{}
    on_stop():void{}

    mainloop(rqf=false,auto_mainloop:boolean=true){
        if(this.running)return
        // Start
        this.running=true
        this.on_run()
        for(const c of this.components){
            if(!c.binded){
                c.on_bind()
                c.binded=true
            }
        }
        this.call_event("run")
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
        this.call_event("stop")
    }
}