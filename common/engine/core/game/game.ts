import { Clock, SignalManager } from "../math/utils.ts"
import { BaseObject2D, type CellsManager2D, GameObjectManager2D } from "./gameObject.ts"
import { DefinitionsSimple } from "../definition/definitions.ts";
import { v2, Vec2 } from "../math/vec2.ts";
export abstract class BaseGameObject2D extends BaseObject2D{
    // deno-lint-ignore no-explicit-any
    public game!:AbstractGame<any>

    constructor(){
        super()
    }
}
export interface Scene2D{
    cellsSize?:number
    objects:Record<number,Array<{
        type:string,
        position?:Vec2
        scale?:Vec2
        rotation?:number
        // deno-lint-ignore no-explicit-any
        vals?:Record<string,any>
        id?:number
    }>>
}
export abstract class GameComponent<Game>{
    game:Game
    constructor(game:Game){
        this.game=game
    }

    on_update(dt:number):void{}
    on_render(dt:number):void{}
    on_run():void{}
    on_stop():void{}
}
export class Scene2DInstance<DefaultGameObject extends BaseGameObject2D=BaseGameObject2D>{
    readonly scene:Scene2D
    readonly objects:GameObjectManager2D<DefaultGameObject>
    readonly cells:CellsManager2D<DefaultGameObject>
    readonly game:AbstractGame<DefaultGameObject>

    constructor(scene:Scene2D,game:AbstractGame<DefaultGameObject>){
        this.scene=scene
        this.objects=new GameObjectManager2D<DefaultGameObject>(scene.cellsSize)
        this.cells=this.objects.cells
        this.game=game
        this.reset()
    }

    private _addObject(obj: DefaultGameObject, layer: number, id?: number, args?: Record<string, any>, sv?: Record<string, any>){
        obj.game = this.game;
        return GameObjectManager2D.prototype.add_object.call(this.objects,obj,layer,id,args);
    }
    reset(){
        this.objects.clear()
        this.objects.add_object = this._addObject.bind(this);
        this.objects.oncreate=(_id:number,_layer:number,t)=>{
            if(!this.game.objects.getFromNumber(t))return undefined
            return new (this.game.objects.getFromNumber(t))()
        }
        for(const c in this.scene.objects){
            const cc=typeof c==="string"?parseInt(c):c
            this.objects.add_layer(cc)
            for(const o of this.scene.objects[c]){
                const obj=this.objects.add_object(new (this.game.objects.getFromString(o.type))(),cc,o.id,o.vals,{"game":this.game})
                if(o.position)obj.position=v2.clone(o.position as Vec2)
            }
        }
    }

    update(dt:number,net_update:boolean=true,destroy_queue:boolean=true):void{
        this.objects.update(dt)
        if(net_update){
            this.objects.update_to_net()
        }
        if(destroy_queue){
            this.objects.apply_destroy_queue()
        }
    }
}

export abstract class AbstractGame<DefaultGameObject2D extends BaseGameObject2D=BaseGameObject2D>{
    readonly tps:number

    readonly clock:Clock

    components:GameComponent<this>[]=[]

    objects:DefinitionsSimple<new()=>DefaultGameObject2D>=new DefinitionsSimple()
    scene_2d:Scene2DInstance<DefaultGameObject2D>

    running:boolean=false

    timeouts:{c:()=>void,delay:number}[]=[]

    signals:SignalManager=new SignalManager()

    delta_time:number=0
    last_time:number=0

    constructor(tps: number,objects:Array<new()=>DefaultGameObject2D>){
        this.tps=tps
        this.clock=new Clock(tps,1,(dt)=>{this.update(dt),this.draw(dt)})

        for(const o of objects){
            const oi=new o()
            this.objects.set(o,oi.string_type,oi.number_type)
        }

        this.scene_2d=new Scene2DInstance<DefaultGameObject2D>({objects:{}},this)
    }
    add_component(component:GameComponent<this>){
        this.components.push(component)
    }
    draw(dt:number):void{
        for(const c of this.components){
            c.on_render(dt)
        }
    }
    update(dt:number,net_update:boolean=true,destroy_queue:boolean=true){
        this.clock.profiler.start(1)
        this.delta_time=dt

        this.signals.emit("update")
        this.on_update(dt)
        for(const c of this.components){
            c.on_update(dt)
        }

        this.scene_2d.update(dt,net_update,destroy_queue)
        this.update_timeouts(dt)

        if(!this.running){
            this.clock.stop()
            this.on_stop()
        }
        this.clock.profiler.end(1)
    }
    update_timeouts(dt:number){
        for(let i=0;i<this.timeouts.length;i++){
            this.timeouts[i].delay-=dt
            if(this.timeouts[i].delay<=0){
                this.timeouts[i].c()
                this.timeouts.splice(i,1) 
                i--
            }
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

    on_update(_dt:number):void{}
    on_run():void{}
    on_stop():void{}

    mainloop(rqf=false,auto_mainloop:boolean=true){
        if(this.running)return
        // Start
        this.running=true
        this.on_run()
        this.signals.emit("start")
        if(auto_mainloop){
            if(rqf){
                this.clock.startRAF()
            }else{
                this.clock.start()
            }
        }
    }
    stop(){
        this.running=false
        this.clock.stop()
    }
    clear(){
        this.scene_2d.objects.clear()
    }
}