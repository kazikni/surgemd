import { WebglRenderer, type Renderer } from "../rendering/renderer.ts"
import { Tween, TweenOptions } from "./utils.ts"
import { AbstractGame, BaseGameObject2D, Scene2DInstance } from "../../core/game/game.ts"
import { Camera2D } from "../2d/camera.ts"
import { ResourcesManager } from "../resources/resources.ts"
import { ParticlesManager2D } from "../../core/game/particles.ts"
import { ClientParticle2D } from "./particles.ts"
import { InputManager } from "./keys.ts"
import { GameSave } from "../resources/saves.ts"
import { TranslationManager } from "../../core/definition/definitions.ts";
import { UIRoot } from "./html_manager.ts";
import { AudioEngine } from "../resources/sounds.ts";
import { Vec2 } from "../../core/math/vec2.ts";
export const isTablet=/iPad|Tablet|PlayBook|Silk|Kindle|Nexus 7|Nexus 9|SM-T|Tab/i.test(navigator.userAgent)||(navigator.maxTouchPoints > 1 && window.innerWidth >= 600 &&  window.innerWidth <= 1366)
export const isMobile=(/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))

export const isTouchDevice = navigator.maxTouchPoints > 0;
export abstract class ClientGameObject2D extends BaseGameObject2D{
    // deno-lint-ignore no-explicit-any
    declare game:ClientGame<any>
    
    constructor(){
        super()
    }
    render(_camera:Camera2D,_dt:number){}
}
export class ClientGameScene2D<DefaultGameObject extends ClientGameObject2D=ClientGameObject2D> extends Scene2DInstance<DefaultGameObject>{
    particles!:ParticlesManager2D<ClientParticle2D>
    camera!:Camera2D
    declare game:ClientGame<DefaultGameObject>
    constructor(game:ClientGame<any>){
        super(game)
        this.particles=new ParticlesManager2D(this.game as unknown as AbstractGame)
        this.camera=new Camera2D(this.game.renderer)
        this.game.input_manager.camera=this.camera
    }

    set_camera_position(position:Vec2){
        this.camera.position=position
        this.game.sounds.set_listener_position(position)
    }

    override clear(): void {
        super.clear()
        this.particles.clear()
        this.camera.stop_shake()
    }

    override update(dt: number, net_update?: boolean, destroy_queue?: boolean): void {
        super.update(dt,net_update,destroy_queue)
        this.particles.update(dt)
    }
    draw(dt:number){
        this.camera.full_canvas()
        this.camera.draw(dt,this.game.resources)
        for(const l of this.objects.layers_orden){
            for(const o of this.objects.layers[l].render){
                const obj=this.objects.objects[o]
                obj.render(this.camera,dt)
            }
        }
    }
}
export abstract class ClientGame<GObject2D extends ClientGameObject2D=ClientGameObject2D> extends AbstractGame<GObject2D>{
    language:TranslationManager

    renderer:Renderer
    resources:ResourcesManager

    input_manager:InputManager

    sounds:AudioEngine
    save:GameSave
    ui_manager:UIRoot<any>

    constructor(renderer:Renderer,language:TranslationManager=new TranslationManager(),objects:Array<new ()=>GObject2D>=[]){
        super(60,objects)

        this.renderer=renderer
        this.language=language
        this.save=new GameSave()

        this.sounds=new AudioEngine()
        this.resources=new ResourcesManager(renderer as WebglRenderer,this.sounds)

        this.input_manager=new InputManager()
        this.renderer=renderer

        this.save.input_manager=this.input_manager

        this.ui_manager=new UIRoot(this)
    }

    override mainloop(rqf?: boolean, auto_mainloop?: boolean): void {
        this.input_manager.clear()
        super.mainloop(rqf,auto_mainloop)
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

    draw(dt:number){
        this.clock.profiler.start(3)

        this.renderer.clear()
        this.on_before_render(dt)
        for(const c of this.components){
            c.on_render(dt)
        }
        this.on_render(dt)

        this.clock.profiler.end(3)
    }
    override update(dt:number){
        this.clock.profiler.start(2)
        for(const t of this.tweens){
            t.update(dt)
        }
        this.on_update(dt)
        this.draw(dt)
        this.sounds.update()
        this.input_manager.tick()
        this.ui_manager.update(dt)
        this.clock.profiler.end(2)
    }
    on_before_render(_dt:number){}
    abstract listeners_init():void
}