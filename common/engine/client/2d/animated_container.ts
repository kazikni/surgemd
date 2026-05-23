import { AKeyFrame, FrameTransform } from "../../core/definition/definitions.ts"
import { AnimatedSprite2D, Sprite2D } from "./sprite.ts"
import { Tween } from "../misc/utils.ts"
import { type ClientGame } from "../misc/game.ts"
import { ResourcesManager } from "../resources/resources.ts"
import { Container2D } from "./container.ts";
import { Container2DObject } from "./base.ts";
export type AnimationInstance = {
    loop: boolean
    enabled: boolean
    current_kf: number
    current_delay: number
    keyframes: AKeyFrame[]
    tweens: Tween<any>[]
    playing: boolean
    destroyed: boolean
    on_complete?: () => void
}
export class AnimatedContainer2D extends Container2D{
    objects=new Map<string,Container2DObject>()
    override _has_update: boolean=true

    current_animations:AnimationInstance[]=[]
    game:ClientGame

    constructor(game:ClientGame){
        super()
        this.game=game
    }
    stop_all_animations(){
        for(const a of this.current_animations){
            a.destroyed=true
            for(const t of a.tweens){
                t.kill()
            }
        }
        this.current_animations.length=0
    }
    play_animation(anim:AKeyFrame[],on_complete?:()=>void,loop:boolean=false):AnimationInstance{
        const a:AnimationInstance={
            current_kf:-1,
            current_delay:0,
            keyframes:anim,
            on_complete:on_complete,
            tweens:[],
            loop,
            enabled:true,
            playing:true,
            destroyed:false,
        }
        this.current_animations.push(a)
        return a
    }
    override update(dt: number, resources: ResourcesManager): void {
        super.update(dt,resources)

        for(let i=0;i<this.current_animations.length;i++){
            const a=this.current_animations[i]
            if(!a.enabled || !a.playing) continue
            a.current_delay-=dt
            if(a.current_delay>0) continue
            a.current_kf++
            if(a.current_kf>=a.keyframes.length){
                if(a.loop){
                    a.current_kf = -1
                    a.current_delay = 0
                    continue
                }else{
                    a.playing=false
                    if(a.on_complete) a.on_complete()
                    this.current_animations.splice(i,1)
                    i--
                    continue
                }
            }
            const kf = a.keyframes[a.current_kf]
            a.current_delay = kf.time
            a.tweens.length=0
            for(const action of kf.actions){
                switch(action.type){
                    case "sprite":{
                        const spr=this.get_object(action.fuser)
                        if(spr instanceof Sprite2D){
                            spr.set_frame(action,this.game.resources)
                        }else{
                            spr.transform_frame(action)
                        }
                        break
                    }
                    case "transform":{
                        const spr=this.get_object(action.fuser)
                        spr.transform_frame(action)
                        break
                    }
                    case "tween":{
                        const fuser=this.get_object(action.fuser)
                        if(kf.time>0){
                            if(action.to.position){
                                a.tweens.push(this.game.add_tween({
                                    duration:kf.time,
                                    target:fuser.position,
                                    yoyo:action.yoyo,
                                    ease:action.ease,
                                    to:action.to.position
                                }))
                            }
                            if(action.to.hotspot&&fuser instanceof Sprite2D){
                                a.tweens.push(this.game.add_tween({
                                    duration:kf.time,
                                    target:fuser.hotspot,
                                    yoyo:action.yoyo,
                                    ease:action.ease,
                                    to:action.to.hotspot
                                }))
                            }
                            if(action.to.rotation){
                                a.tweens.push(this.game.add_tween({
                                    duration:kf.time,
                                    target:fuser,
                                    yoyo:action.yoyo,
                                    ease:action.ease,
                                    to:{rotation:action.to.rotation}
                                }))
                            }
                        }else{
                            fuser.transform_frame(action.to)
                        }
                        break
                    }
                }
            }
        }
    }
    add_animated_sprite(id:string,def?:FrameTransform):Sprite2D{
        const spr=new AnimatedSprite2D()
        this.objects.set(id,spr)
        if(def)spr.transform_frame(def)
        this.add_child(spr)
        return spr
    }
    add_sprite(id:string,def?:FrameTransform):Sprite2D{
        const spr=new Sprite2D()
        this.objects.set(id,spr)
        if(def)spr.transform_frame(def)
        this.add_child(spr)
        return spr
    }
    override add_container(id:string=""):Container2D{
        const ret=super.add_container()
        this.objects.set(id,ret)
        return ret
    }
    get_object(id:string):Container2DObject{
        return this.objects.get(id)!
    }
}