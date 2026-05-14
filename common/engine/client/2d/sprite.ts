import { FrameDef, FrameTransform, KeyFrameSpriteDef } from "../../core/definition/definitions.ts"
import { ImageModel2D } from "../../core/definition/models.ts"
import { ColorM } from "../../core/math/color.ts"
import { Rect } from "../../core/math/geometry.ts";
import { Numeric } from "../../core/math/utils.ts"
import { v2, Vec2, Vec2M } from "../../core/math/vec2.ts"
import { Frame, ResourcesManager } from "../resources/resources.ts"
import { CamA, Container2DObject } from "./base.ts"
export class Sprite2D extends Container2DObject{
    object_type:string="sprite2d"
    _frame?:Frame
    _rect:Rect
    hotspot:Vec2=v2(0,0)
    _size?:Vec2M

    get size():Vec2|undefined{
        return this._size as Vec2|undefined
    }
    set size(val:Vec2|undefined){
        if(val){
            if(!this._size)this._size=new Vec2M(0,0,this._position.on_set)
            this._size.set(val.x,val.y)
        }else{
            this._size=undefined
        }
    }

    _real_size:Vec2=v2(0,0)

    get frame():Frame|undefined{
        return this._frame
    }
    set frame(f:Frame|undefined){
        if(f?.id&&f.id===this.frame?.id)return
        this._frame=f
        this.dirty_reals=true
    }

    frames?:KeyFrameSpriteDef[]
    current_delay:number=0
    current_frame:number=0

    old_ms=1

    override update_real(): void {
        super.update_real()
        this.update_model()
    }

    update_model(){
        if(!this.frame)return
        this._real_size=this.size??this.frame.frame_size
        ImageModel2D(this._real_scale,this._real_rotation,this.hotspot,this._real_size,100,this._real_position,this._rect,this.model)
    }

    model:Float32Array

    constructor(){
        super()
        this._rect={
            min:v2(0,0),
            max:v2(1,1),
        }   
        this.model=new Float32Array(2*3*2)
    }
    
    set_frame(frame:FrameDef,resources:ResourcesManager){
        if(frame.image){
            this.frame=resources.get_frame(frame.image)
        }else{
            this.frame=undefined
        }
        this.transform_frame(frame)
        if(frame.tint!==undefined)this.tint=ColorM.number(frame.tint)
        if(frame.alpha!==undefined)this.tint.a=frame.alpha
        this.dirty_reals=true
    }
    override transform_frame(frame:FrameTransform){
        super.transform_frame(frame)
        if(frame.tint!==undefined)this.tint=ColorM.number(frame.tint)
        if(frame.hotspot!==undefined)this.hotspot=frame.hotspot
    }
    override get_rect():Rect{
        return this._rect
    }
    override draw(cam:CamA): void {
        this.draw_super()
        cam.ctx.draw_frame2d(this.frame,this.model,this._real_tint)
    }
}
export class AnimatedSprite2D extends Sprite2D{
    override object_type:string="animated_sprite2d"
    override _has_update: boolean=true
    override update(dt:number,resources:ResourcesManager){
        super.update(dt,resources)
        if(this.frames&&this.frames[this.current_frame]){
            if(this.current_delay<this.frames[this.current_frame].delay){
                this.current_delay+=dt
            }else{
                this.current_delay=0
                this.current_frame=Numeric.loop(this.current_frame+1,0,this.frames.length)
                this.set_frame(this.frames[this.current_frame],resources)
            }
        }else{
            this.current_delay=0
            this.current_frame=-1
        }
    }
}