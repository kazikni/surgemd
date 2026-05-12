import { v2, v2m, Vec2, Vec2M } from "../../core/math/vec2.ts"
import { Vec4M, Color, ColorM} from "../../core/math/color.ts"
import { ResourcesManager } from "../resources/resources.ts"
import { type Context2D } from "../rendering/context.ts";
import { Renderer } from "../rendering/renderer.ts";
import { Matrix } from "../../core/math/matrix.ts";
import { type Container2D } from "./container.ts";
import { FrameTransform } from "../../core/definition/definitions.ts";
import { Rect } from "../../core/math/geometry.ts";

export interface CamA{
    matrix:Matrix

    position:Vec2
    size:Vec2
    layer:number

    meter_size:number
    center_pos:boolean

    ctx:Context2D
    renderer:Renderer

    rect:Rect

    visible_function?:(obj:Container2DObject)=>boolean
    sort_function:(a:Container2DObject,b:Container2DObject)=>number
}
export abstract class Container2DObject {
    abstract object_type: string

    parent?: Container2D
    id_on_parent:number=0

    _layer: number = 0
    get layer():number{
        return this._layer
    }
    set layer(val:number){
        if(val===this._layer)return
        this._layer=val
        if(this.parent){
            this.parent.dirty_zindex=true
        }
    }
    _zIndex: number = 0
    get zIndex():number{
        return this._zIndex
    }
    set zIndex(val:number){
        if(val===this._zIndex)return
        this._zIndex=val
        if(this.parent){
            this.parent.dirty_zindex=true
        }
    }

    _position: Vec2M
    get position(): Vec2 {
        return this._position as Vec2
    }
    set position(val: Vec2) {
        this._position.set(val.x,val.y)
    }
    _scale: Vec2M
    get scale(): Vec2 {
        return this._scale as Vec2
    }
    set scale(val: Vec2) {
        this._scale.set(val.x,val.y)
    }

    _rotation: number = 0
    get rotation():number{
        return this._rotation
    }
    set rotation(val:number){
        this._rotation=val
        this.dirty_reals=true
    }

    _tint: Vec4M
    get tint(): Color {
        return this._tint as Color
    }
    set tint(val: Color) {
        this._tint.set(val.r,val.g,val.b,val.a)
    }

    _real_position: Vec2 = v2(0, 0)
    _real_scale: Vec2 = v2(1, 1)
    _real_rotation: number = 0;
    _real_tint: Color = ColorM.rgba(255,255,255)

    sync_rotation:boolean=true

    _has_update:boolean=false
    get has_update():boolean{
        return this._has_update
    }
    set has_update(val:boolean){
        this._has_update=val
        if(this.parent)this.parent.dirty_children=true
    }

    _visible:boolean=true
    get visible():boolean{
        return this._visible
    }
    set visible(val:boolean){
        this._visible=val
        if(this.parent)this.parent.dirty_children=true
    }

    destroyed:boolean=false
    destroy(){
        this.destroyed=true
        this.visible = false; 
        if(this.parent){
            let i=this.parent.children.indexOf(this)
            if(i!==-1)this.parent.children.splice(i,1)
            i=this.parent.update_children.indexOf(this)
            if(i!==-1)this.parent.update_children.splice(i,1)
            i=this.parent.visible_children.indexOf(this)
            if(i!==-1)this.parent.visible_children.splice(i,1)
        }
    }

    constructor(){
        const bid=()=>{
            this.dirty_reals=true
        }
        this._position=new Vec2M(0,0,bid)
        this._scale=new Vec2M(1,1,bid)
        this._tint=new Vec4M(1,1,1,1,bid)
    }

    dirty_reals=true
    update_real(){
        if (this.parent&&!this.parent.object_group) {
            v2m.mul(this._real_scale,this.parent._real_scale, this._scale)
            if(this.sync_rotation){
                this._real_rotation = this.parent._real_rotation + this._rotation
                v2m.mul(this._real_position,this._position,this.parent._real_scale)
                v2m.rotate_RadAngle(this._real_position,this.parent._real_rotation)
                v2m.add(this._real_position,this._real_position,this.parent._real_position)
            }else{
                this._real_rotation=this._rotation
                v2m.mul(this._real_position,this.parent._real_scale, this._position)
                v2m.add(this._real_position,this._real_position,this.parent._real_position)
            }
            ColorM.mult(this._real_tint,this._tint,this.parent._tint)
        } else {
            v2m.set(this._real_position,this._position._x,this._position._y)
            v2m.set(this._real_scale,this._scale._x,this._scale._y)
            this._real_rotation = this._rotation

            if (this.parent)
                ColorM.mult(this._real_tint,this._tint,this.parent._tint)
            else
                ColorM.set1(this._real_tint,this._tint)
        }
    }
    update(_dt:number,_resources:ResourcesManager): void {
    }
    draw_super(){
        if(this.dirty_reals){
            this.update_real()
            this.dirty_reals=false
        }
    }
    get_rect():Rect{
        return {min:v2.zero,max:v2.zero}
    }
    transform_frame(frame:FrameTransform){
        if(frame.scale!==undefined)this.scale=v2(frame.scale,frame.scale)
        if(frame.scale2!==undefined)this.scale=frame.scale2
        if(frame.rotation!==undefined)this.rotation=frame.rotation
        if(frame.visible!==undefined)this.visible=frame.visible
        if(frame.zIndex!==undefined)this.zIndex=frame.zIndex
        if(frame.position!==undefined)this.position=v2.clone(frame.position)
        if(frame.layer!==undefined)this.layer=frame.layer
        this.dirty_reals=true
    }
    abstract draw(cam:CamA): void;
}