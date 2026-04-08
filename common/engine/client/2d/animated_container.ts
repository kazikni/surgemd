import { AKeyFrame, FrameTransform } from "../../core/definition/definitions.ts"
import { AnimatedSprite2D, Sprite2D } from "./sprite.ts"
import { Tween } from "../misc/utils.ts"
import { type ClientGame } from "../misc/game.ts"
import { ResourcesManager } from "../resources/resources.ts"
import { Container2D } from "./container.ts";
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
    objects=new Map<string,Sprite2D>()
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
                    case "sprite":
                        this.get_spr(action.fuser).set_frame(action,this.game.resources)
                        this.update_zindex()
                        break
                    case "tween":{
                        const fuser=this.get_spr(action.fuser)
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
                            if(action.to.hotspot){
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
    get_spr(id:string):Sprite2D{
        return this.objects.get(id)!
    }
}