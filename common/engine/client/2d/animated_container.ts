import { AKeyFrame, FrameTransform } from "../../core/definition/definitions.ts"
import { AnimatedSprite2D, Sprite2D } from "./sprite.ts"
import { Tween } from "../misc/utils.ts"
import { type ClientGame } from "../misc/game.ts"
import { ResourcesManager } from "../resources/resources.ts"
import { Container2D } from "./container.ts";

export class AnimatedContainer2D extends Container2D{
    objects=new Map<string,Sprite2D>()
    override _has_update: boolean=true

    current_animations:{
        current_kf:number
        current_delay:number
        keyframes:AKeyFrame[]
        on_complete?:()=>void
        tweens:Tween<any>[]
    }[]=[]
    game:ClientGame

    constructor(game:ClientGame){
        super()
        this.game=game
    }
    stop_all_animations(){
        for(const a of this.current_animations){
            for(const t of a.tweens){
                t.kill()
            }
        }
        this.current_animations=[]
    }
    play_animation(anim:AKeyFrame[],on_complete?:()=>void){
        const a={
            current_kf:-1,
            current_delay:0,
            keyframes:anim,
            on_complete:on_complete,
            tweens:[]
        }
        this.current_animations.push(a)
    }
    override update(dt: number, resources: ResourcesManager): void {
      super.update(dt,resources)
      for(let i=0;i<this.current_animations.length;i++){
        const a=this.current_animations[i]
        a.current_delay-=dt
        if(a.current_delay<=0){
            a.current_kf++
            if(a.current_kf>=a.keyframes.length){
                if(a.on_complete)a.on_complete()
                this.current_animations.splice(i,1)
                i--
                continue
            }else{
                a.tweens.length=0
                const nd=a.keyframes[a.current_kf].time
                a.current_delay=nd
                for(const action of a.keyframes[a.current_kf].actions){
                    switch(action.type){
                        case "sprite":
                            this.get_spr(action.fuser).set_frame(action,this.game.resources)
                            this.update_zindex()
                            break
                        case "tween":{
                            const fuser=this.get_spr(action.fuser)
                            if(nd>0){
                                if(action.to.position){
                                    this.current_animations[i].tweens.push(this.game.add_tween({
                                        duration:nd,
                                        target:fuser.position,
                                        yoyo:action.yoyo,
                                        ease:action.ease,
                                        to:action.to.position
                                    }))
                                }
                                if(action.to.hotspot){
                                    this.current_animations[i].tweens.push(this.game.add_tween({
                                        duration:nd,
                                        target:fuser.hotspot,
                                        yoyo:action.yoyo,
                                        ease:action.ease,
                                        to:action.to.hotspot
                                    }))
                                }
                                if(action.to.rotation){
                                    this.current_animations[i].tweens.push(this.game.add_tween({
                                        duration:nd,
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