import { AbstractApplication, BaseSceneObject2D, Scene2D, SceneGELO } from "../../core/app/app.ts"
import { Camera2D } from "../2d/camera.ts"
import { ParticlesManager2D } from "../../core/app/particles.ts"
import { ClientParticle2D } from "./particles.ts"
import { InputManager } from "./keys.ts"
import { ResourcesManager } from "../resources/resources.ts";
import { Renderer } from "../rendering/renderer.ts";
import { AudioEngine } from "../resources/sounds.ts";
import {SaveManager} from "../resources/saves.ts"
const isTablet=/iPad|Tablet|Tab/i.test(navigator.userAgent)
const isMobile=(/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))

declare global{
    let force_mobile:boolean
    let block_mobile:boolean
}
//@ts-ignore
globalThis.force_mobile=false
//@ts-ignore
globalThis.block_mobile=false
export function is_mobile(){
    return (isTablet||isMobile||force_mobile)&&!block_mobile
}

export const isTouchDevice = navigator.maxTouchPoints > 0;

export class ClientSceneObject2D extends BaseSceneObject2D{
    override object_type: number=-1;
    declare app:ClientApplication
}
export class ClientScene2D<Object extends ClientSceneObject2D=ClientSceneObject2D,GELO extends SceneGELO=SceneGELO> extends Scene2D<Object,GELO>{
    declare app:ClientApplication
    particles:ParticlesManager2D<ClientParticle2D>
    camera!:Camera2D
    constructor(){
        super()
        this.particles=new ParticlesManager2D(this)
    }

    override on_init(): void {
        this.camera=new Camera2D(this.app.renderer)
    }
    override on_set(): void {
        this.app.input.camera=this.camera
    }

    override clear(): void {
        super.clear()
        this.particles.clear()
        this.camera.stop_shake()
    }

    override update(dt: number, net_update?: boolean, destroy_queue?: boolean): void {
        this.app.sounds.set_listener_position(this.camera.position)
        super.update(dt,net_update,destroy_queue)
        this.particles.update(dt)
        this.draw(dt)
    }
    draw(dt:number){
        this.app.renderer.clear()
        this.camera.full_canvas()
        this.camera.draw(dt,this.app.resources)
        this.objects.render(dt)
        this.camera.render()
    }
}

export class ClientApplication extends AbstractApplication{
    input:InputManager
    save:SaveManager
    resources:ResourcesManager
    sounds:AudioEngine
    renderer:Renderer

    constructor(renderer:Renderer,tps:number=60){
        super(tps)

        this.renderer=renderer
        this.sounds=new AudioEngine()
        this.input=new InputManager()
        this.save=new SaveManager()
        this.save.input_manager=this.input
        this.resources=new ResourcesManager(this.renderer,this.sounds)
    }

    override update(dt:number){
        this.on_update(dt)
        this._scene?.update?.(dt)
        if(!this.running){
            this.clock.stop()
            this.on_stop()
        }
        this.sounds.update()
        this.input.tick(dt)
    }
    on_bind(){

    }
    override bind(){
        this.renderer.canvas.addEventListener("click",(_e)=>{
            this.input.focus=true
        })
        this.input.bind(this.renderer.canvas)
        return this.on_bind()
    }
}