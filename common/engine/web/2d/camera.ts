import { Renderer } from "../rendering/renderer.ts"
import { CamA, Container2DObject } from "./base.ts"
import { v2, v2m } from "../../core/math/vec2.ts"
import { ResourcesManager } from "../resources/resources.ts"
import {  Context2D } from "../rendering/context.ts";
import { Matrix, matrix4 } from "../../core/math/matrix.ts";
import { Container2D } from "./container.ts";
import { circle, Rect } from "../../core/math/geometry.ts";
import { Vec2 } from "../../core.ts";
export function cam_sort_callback(a:Container2DObject,b:Container2DObject):number{
    return (a._layer-b._layer)||(a._zIndex-b._zIndex)||(a.id_on_parent-b.id_on_parent)
}
export class Camera2D{
    renderer:Renderer
    container:Container2D=new Container2D()
    private _zoom = 1;

    visible:boolean=true

    viewport_camera_matrix!: Matrix
    viewport_matrix!: Matrix

    screen_camera_matrix!: Matrix
    screen_matrix!: Matrix

    camera_matrix!: Matrix

    aspect_lock = false
    reference_width = 1920
    reference_height = 1080

    get zoom(): number { return this._zoom; }
    set zoom(zoom: number) {
        this._zoom = zoom
        this.resize()
    }

    width = 1;
    height = 1;
    size:Vec2=v2.one()

    meter_size: number = 100
    aspect:number=1

    position = v2(0, 0)
    layer:number=0
    old_layer?:number=0
    center_pos:boolean=true

    after_draw:((cam:CamA)=>void)[]=[]

    ctx:Context2D

    _shake?:{
        intensity:number
        duration:number
        priority:number
    }

    visible_callback?:(obj:Container2DObject)=>boolean
    sort_callback?:(a:Container2DObject,b:Container2DObject)=>number
    constructor(renderer:Renderer){
        this.renderer=renderer
        this.zoom=1
        this.container.full_request=false
        this.ctx=renderer.create_context()
    }

    topdown={
        perspective:1,
        parallax:1
    }

    get_topdown_perspective_2d(matrix:Matrix,object_position: Vec2,parallax: number,z_distance: number,max_distance:number=13):void{
        const distance=v2.distance(object_position,this.position)
        const baseParallax=parallax*this.topdown.parallax

        let effectiveParallax=1-(1-baseParallax)
        if (distance>max_distance){
            const t=max_distance/distance
            effectiveParallax=1-(1-effectiveParallax)*t
        }

        matrix4.m.topdown_perspective_2d(matrix,this.position,effectiveParallax,z_distance)
    }
    get_rect():Rect{
        if(this.center_pos){
            const sizeH=v2(this.width,this.height)
            v2m.scale(sizeH,sizeH,0.5)
            return {
                min:v2.sub(this.position,sizeH),
                max:v2.add(this.position,sizeH),
            }
        }else{
            return {
                min:this.position,
                max:v2.add(this.position,v2(this.width,this.height)),
            }
        }
    }

    add_object(...objects: Container2DObject[]): void {
        for(const o of objects){
            this.container.add_child(o);
        }
        this.container.update_real()
    }

    resize(): void {
        const canvas=this.renderer.canvas
        const size=v2(canvas.width, canvas.height)
        const screenAspect=size.x/size.y

        if(this.aspect_lock){
            const referenceAspect=this.reference_width/this.reference_height
            const referenceWidth=this.reference_width/this.meter_size
            const referenceHeight=this.reference_height / this.meter_size
            if (screenAspect>=referenceAspect) {
                this.height=referenceHeight/this._zoom
                this.width=this.height*screenAspect
            } else {
                this.width=referenceWidth/this._zoom
                this.height=this.width/screenAspect
            }
            this.aspect=referenceAspect
            this.size=v2(this.width,this.height)
        }else{
            this.aspect=this.meter_size*this._zoom
            this.size=v2.dscale(size, this.aspect)
            this.width=this.size.x
            this.height=this.size.y
        }

        this.viewport_matrix=matrix4.projection(this.size, 1000)
        this.screen_matrix=matrix4.projection(this.aspect_lock?this.size:v2.dscale(size, this.meter_size),1000)

        if (this.center_pos) {
            const center = v2(this.size.x / 2,this.size.y / 2)
            this.viewport_matrix=matrix4.mul(this.viewport_matrix,matrix4.translation_2d(center))
            this.screen_matrix=matrix4.mul(this.screen_matrix,matrix4.translation_2d(this.aspect_lock?center:v2(size.x / this.meter_size / 2,size.y / this.meter_size / 2)))
        }
    }
    stop_shake(){
        this._shake=undefined
    }
    shake(intensity:number,duration:number,priority:number=0){
        if(this._shake){
            if(priority>=this._shake.priority&&this._shake.intensity<intensity)this._shake={
                intensity:intensity,
                duration:duration,
                priority:priority
            }
        }else{
            this._shake={
                intensity:intensity,
                duration:duration,
                priority:priority
            }
        }
    }
    to_world(position:Vec2):Vec2{
        const canvas=this.renderer.canvas
        const x=position.x/canvas.width*this.size.x
        const y=position.y/canvas.height*this.size.y
        if(this.center_pos)return v2(x-this.size.x*.5,y-this.size.y*.5)
        return v2(x,y)
    }

    to_world_camera(position:Vec2):Vec2{
        const ret=this.to_world(position)
        return v2.add(ret,this.position)
    }

    update(dt:number,resources:ResourcesManager): void {
        let cameraPos=v2.clone(this.position)
        if(this._shake){
            cameraPos=circle.random_point_inside(cameraPos,this._shake.intensity)
            if(this._shake.duration!==-1){
                this._shake.duration-=dt
                if(this._shake.duration<=0)this._shake=undefined
            }
        }

        this.camera_matrix=matrix4.translation_2d(v2.neg(cameraPos))
        this.viewport_camera_matrix=matrix4.mul(this.viewport_matrix,this.camera_matrix)
        this.screen_camera_matrix=matrix4.mul(this.screen_matrix,this.camera_matrix)

        this.container.update(dt,resources)
    }

    draw(dt:number,resources:ResourcesManager){
        this.update(dt,resources)

        if(!this.sort_callback){
            this.sort_callback=cam_sort_callback
        }
        const cam:CamA={
            matrix:[this.viewport_camera_matrix,this.screen_camera_matrix,this.viewport_matrix,this.screen_matrix,this.camera_matrix],
            ctx:this.ctx,
            renderer:this.renderer,
            rect:this.get_rect(),
            meter_size:this.meter_size,

            sort_function:this.sort_callback,
            visible_function:this.visible_callback
        }

        if(this.old_layer!==this.layer){
            this.old_layer=this.layer
            this.container.dirty_zindex=true
        }
        if(this.visible)this.container.draw(cam)
        this.ctx.render(this.renderer)
        this.ctx.clear()

        for(const a of this.after_draw){
            a(cam)
        }
    }

    clear(){
        this.container.clear()
    }
    full_canvas(){
        const sx=this.renderer.canvas.width
        const sy=this.renderer.canvas.height
        this.renderer.full_canvas()
        if(sx!=this.renderer.canvas.width||sy!=this.renderer.canvas.height){
            this.resize()
        }
    }
}