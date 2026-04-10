import { WebglRenderer, type Renderer } from "../rendering/renderer.ts"
import { Tween, TweenOptions } from "./utils.ts"
import { AbstractGame, BaseGameObject2D } from "../../core/game/game.ts"
import { Camera2D } from "../2d/camera.ts"
import { ResourcesManager } from "../resources/resources.ts"
import { ParticlesManager2D } from "../../core/game/particles.ts"
import { ClientParticle2D } from "./particles.ts"
import { InputManager } from "./keys.ts"
import { GameSave } from "../resources/saves.ts"
import { SoundManager } from "../resources/sounds.ts"
import { TranslationManager } from "../../core/definition/definitions.ts";
import { UIRoot } from "./html_manager.ts";
export const isMobile=/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
export abstract class ClientGameObject2D extends BaseGameObject2D{
    // deno-lint-ignore no-explicit-any
    declare game:ClientGame<any>
    
    constructor(){
        super()
    }
    render(_camera:Camera2D,_dt:number){}
}
export abstract class ClientGame<GObject2D extends ClientGameObject2D=ClientGameObject2D> extends AbstractGame<GObject2D>{
    cam2d:Camera2D

    language:TranslationManager

    renderer:Renderer
    resources:ResourcesManager

    particles:ParticlesManager2D<ClientParticle2D>
    input_manager:InputManager

    sounds:SoundManager
    save:GameSave
    ui_manager:UIRoot<any>

    happening:boolean=false

    constructor(renderer:Renderer,language:TranslationManager=new TranslationManager({code:"none",name:"none",values:{}}),objects:Array<new ()=>GObject2D>=[]){
        super(60,objects)

        this.renderer=renderer
        this.cam2d=new Camera2D(renderer)
        this.language=language
        this.save=new GameSave()

        this.sounds=new SoundManager()
        this.resources=new ResourcesManager(renderer as WebglRenderer,this.sounds)

        this.input_manager=new InputManager(this.cam2d.meter_size)
        this.renderer=renderer

        this.save.input_manager=this.input_manager
        this.particles=new ParticlesManager2D(this as unknown as AbstractGame)

        this.ui_manager=new UIRoot(this)
    }
    override clear(){
        super.clear()
        this.particles.clear()
    }
    set_meter_size(size:number){
        this.cam2d.meter_size=size
        this.input_manager.mouse.meter_size=size
        this.cam2d.resize()
    }
    bind(){
        this.renderer.canvas.addEventListener("click",(_e)=>{
            this.input_manager.focus=true
        })

        this.input_manager.bind(this.renderer.canvas)

        this.listeners_init()
    }
    readonly tweens = new Set<Tween<unknown>>();
    remove_tween(tween: Tween<unknown>): void {
        this.tweens.delete(tween);
    }
    add_tween<T>(config:TweenOptions<T>){
        const t=new Tween(this,config)
        this.tweens.add(t)
        return t
    }

    override draw(dt:number){
        this.clock.profiler.start(3)
        this.cam2d.fullCanvas()
        this.renderer.clear()

        this.on_before_render(dt)

        for(const l of this.scene_2d.objects.layers){
            for(const o of this.scene_2d.objects.objects[l].renderizables){
                const obj=this.scene_2d.objects.objects[l].objects[o]
                obj.render(this.cam2d,dt)
            }
        }

        this.cam2d.draw(dt,this.resources)
        super.draw(dt)
    
        this.on_render(dt)
        this.clock.profiler.end(3)
    }
    override update(dt:number,new_list: boolean=true, destroy_queue: boolean=true){
        this.clock.profiler.start(2)
        super.update(dt,new_list,destroy_queue)
        for(const t of this.tweens){
            t.update(dt)
        }

        this.particles.update(dt)
        this.sounds.update(dt)
        this.input_manager.tick()
        this.clock.profiler.end(2)
    }
    on_render(_dt:number){}
    on_before_render(_dt:number){}
    abstract listeners_init():void
}