import { Color } from "../../core.ts";
import { FrameDef, FrameTransform, KeyFrameSpriteDef } from "../../core/definition/definitions.ts"
import { ImageModel2D } from "../../core/definition/models.ts"
import { ColorM } from "../../core/math/color.ts"
import { Rect } from "../../core/math/geometry.ts";
import { Matrix, matrix4 } from "../../core/math/matrix.ts";
import { Numeric } from "../../core/math/utils.ts"
import { v2, Vec2, Vec2M } from "../../core/math/vec2.ts"
import { Frame, ResourcesManager } from "../resources/resources.ts"
import { CamA, Container2DObject } from "./base.ts"

export interface ChildSprite2d{
    frame?:Frame
    tint?:Color
    rect?:Rect
    model?:Float32Array
}
export class Sprite2D extends Container2DObject{
    object_type:string="sprite2d"
    _frame?:Frame
    _rect:Rect
    hotspot:Vec2=v2(0,0)
    _size?:Vec2M

    child_sprites?:ChildSprite2d[]

    get size():Vec2|undefined{
        return this._size as Vec2|undefined
    }
    set size(val:Vec2|undefined){
        if(val){
            if(!this._size)this._size=new Vec2M(0,0,this._bid)
            this._size.set(val.x,val.y)
        }else{
            this._size=undefined
        }
        this.dirty_reals=true
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

    meter_size:number=1

    old_ms=1

    override update_real(): void {
        super.update_real()
        this._real_size=this.size??this.frame?.frame_size??v2.zero()
        ImageModel2D(this._real_scale,this._real_rotation,this.hotspot,this._real_size,this.meter_size,this._real_position,this._rect,this.model)
        /*if(this.child_sprites){
            for(const s of this.child_sprites){
                ImageModel2D(this._real_scale,this._real_rotation,this.hotspot,this._real_size,this.meter_size,this._real_position,s.rect,s.model)
            }
        }*/
    }

    model:Float32Array
    matrix_index:number=0

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
        }else if(frame.image==""){
            this.frame=undefined
        }
        this.transform_frame(frame)
        if(frame.tint!==undefined)this.tint=ColorM.number(frame.tint)
        if(frame.alpha!==undefined)this.tint.a=frame.alpha
        if(frame.sub_sprites!==undefined){
            this.child_sprites=frame.sub_sprites?[]:undefined
            if(this.child_sprites!==undefined){
                for(const s of frame.sub_sprites){
                    this.child_sprites.push({frame:resources.get_frame(s.image??""),tint:s.tint===undefined?undefined:ColorM.number(s.tint)})
                }
            }
        }
        this.dirty_reals=true
    }
    override transform_frame(frame:FrameTransform){
        super.transform_frame(frame)
        if(frame.tint!==undefined)this.tint=ColorM.number(frame.tint)
        if(frame.hotspot!==undefined)this.hotspot=frame.hotspot
        if(frame.alpha!==undefined)this.tint.a=frame.alpha
        this.dirty_reals=true
    }
    override get_rect():Rect{
        return this._rect
    }
    override draw(cam:CamA): void {
        if(cam.meter_size&&cam.meter_size!==this.meter_size){
            this.meter_size=cam.meter_size
            this.dirty_reals=true
        }
        this.draw_super()
        let matrix:Matrix=matrix4.clone(cam.matrix[this.matrix_index])
        if(this._real_matrix)matrix=matrix4.mul(matrix,this._real_matrix)
        cam.ctx.draw_frame2d(this.frame,this.model,this._real_tint,matrix)
        if(this.child_sprites)for(const s of this.child_sprites){
            cam.ctx.draw_frame2d(s.frame,this.model,s.tint??this._real_tint,matrix)
        }
    }
}
export class AnimatedSprite2D extends Sprite2D{
    override object_type:string="animated_sprite2d"
    override _has_update: boolean=true

    _frames?:KeyFrameSpriteDef[]
    get frames():KeyFrameSpriteDef[]|undefined{
        return this._frames
    }
    set frames(val:KeyFrameSpriteDef[]|undefined){
        this._frames=val
        this.current_frame=0
        this.current_delay=0
    }

    current_delay:number=0
    current_frame:number=0
    override update(dt:number,resources:ResourcesManager){
        super.update(dt,resources)
        if(this._frames&&this._frames[this.current_frame]){
            if(this.current_delay<this._frames[this.current_frame].delay){
                this.current_delay+=dt
            }else{
                this.current_delay=0
                this.current_frame=Numeric.loop(this.current_frame+1,0,this._frames.length)
                this.set_frame(this._frames[this.current_frame],resources)
            }
        }else{
            this.current_delay=0
            this.current_frame=-1
        }
    }
}