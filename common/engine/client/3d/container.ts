import "../../core/definition/models.ts"
import { v3, Vec3 } from "../../core/math/vec3.ts"
import "../../core/math/color.ts"
import { Color, ColorM } from "../../core/math/color.ts"
import { ResourcesManager } from "../resources/resources.ts"
import { Renderer } from "../rendering/renderer.ts"
import { Angle } from "../../core/math/geometry.ts"
import { Matrix, matrix4 } from "../../core/definition/matrix.ts";
export interface CamA3{
    matrix:Matrix
    position:Vec3
    meter_size:number
}
export abstract class Container3DObject {
    abstract object_type: string;

    parent?: Container3D;
    id_on_parent:number=0

    position: Vec3 = v3.new(0, 0, 0);
    scale: Vec3 = v3.new(1, 1, 1);
    rotation: Vec3 = v3.new(0, 0, 0);
    tint: Color = ColorM.default.white;

    _real_position: Vec3 = v3.new(0, 0, 0);
    _real_scale: Vec3 = v3.new(1, 1,1);
    _real_rotation: Vec3 = v3.new(0, 0, 0);
    _real_tint: Color = ColorM.default.white;

    sync_rotation:boolean=true
    visible:boolean=true

    destroyed:boolean=false
    destroy(){
        this.destroyed=true
        if(this.parent)this.parent.children.splice(this.parent.children.indexOf(this),1)
    }

    update(_dt:number,_resources:ResourcesManager): void {
        if (this.parent) {

            this._real_scale = v3.mult(this.parent._real_scale, this.scale);
            if(this.sync_rotation){
                this._real_rotation = v3.add(this.parent._real_rotation,this.parent._real_rotation);
                /*this._real_position = v3.add(
                    v3.rotate_RadAngle(
                        v3.mult(this.parent._real_scale, this.position),
                        this.parent._real_rotation
                    ),
                    this.parent._real_position
                );*/
            }else{
                this._real_rotation=this.rotation
                this._real_position = v3.add(
                    v3.mult(this.parent._real_scale, this.position),
                    this.parent._real_position
                );
            }

            this._real_tint = {
                r: this.parent._real_tint.r * this.tint.r,
                g: this.parent._real_tint.g * this.tint.g,
                b: this.parent._real_tint.b * this.tint.b,
                a: this.parent._real_tint.a * this.tint.a
            };
        } else {
            this._real_position = this.position;
            this._real_scale = this.scale;
            this._real_rotation = this.rotation;
            this._real_tint = this.tint;
        }
    }

    abstract draw(cam:CamA3,renderer: Renderer): void
}
/*export class Sprite3D extends Container3DObject{
    object_type:string="sprite2d"
    _frame?:Frame
    hotspot:Vec2=v2(0,0)
    size?:Vec2

    private _old_scale?:Vec2
    private _old_hotspot?:Vec2
    private _old_size?:Vec2

    _real_size:Vec2=v2(0,0)

    get frame():Frame|undefined{
        return this._frame
    }
    set frame(f:Frame|undefined){
        this._frame=f
        this.update_model()
    }

    frames?:KeyFrameSpriteDef[]
    current_delay:number=0
    current_frame:number=0

    old_ms=1

    cam?:CamA3

    update_model(){
        if(!this.frame||!this.cam)return
        this._real_size=this.size??this.frame.frame_size??v2(this.frame.source.width,this.frame.source.height)
        this.model=ImageModel3D(this._real_scale,this._real_rotation,this.hotspot,this._real_size,100)
        this._old_hotspot=v2.clone(this.hotspot)
        this._old_scale=v2.clone(this._real_scale)
        this._old_size=v2.clone(this._real_size)
        this.old_ms=this.cam.meter_size
    }

    model:Float32Array

    constructor(){
        super()
        this.model=ImageModel3D(this.scale,this.rotation,this.hotspot,v2(0,0),100)
    }
    override update(dt:number,resources:ResourcesManager){
        super.update(dt,resources)
        if(this.frames){
            if(this.current_delay<this.frames[this.current_frame].delay){
                this.current_delay+=dt
            }else{
                this.current_delay=0
                this.current_frame=Numeric.loop(this.current_frame+1,0,this.frames.length)
                this.set_frame(this.frames[this.current_frame],resources)
            }
        }
    }
    
    set_frame(frame:FrameDef,resources:ResourcesManager){
        if(frame.hotspot)this.hotspot=v2.clone(frame.hotspot)
        if(frame.visible)this.visible=frame.visible
        if(frame.image)this.frame=resources.get_sprite(frame.image)
    }
    material:Material3D
    override draw(cam:CamA3,renderer: Renderer): void {
        this.cam=cam
        if(this.frame)renderer.draw_3d(this.model,this.material,this._real_position,this.model,cam.matrix,this._real_tint)
    }
}*/
/*export class ContainerModel3D extends Container3DObject{
    
}*/
export class Container3D extends Container3DObject{
    object_type:string="container3d"
    children:Container3DObject[]=[]

    update_deletions(){
        this.children = this.children.filter(c => !c.destroyed);
    }
    override update(dt:number,resources:ResourcesManager){
        super.update(dt,resources);
        for (const c of this.children) c.update(dt,resources);
    }
    draw(cam:CamA3,renderer:Renderer,objects?:Container3DObject[]):void{
        if(!objects)objects=this.children
        for(let o =0;o<objects.length;o++){
            const c=objects[o]
            if(c.visible)c.draw(cam,renderer)
        }
    }
    add_child(c:Container3DObject){
        c.id_on_parent=this.children.length+1
        c.parent=this
        this.children.push(c)
    }
    constructor(){
        super()
    }
}
export class Camera3D{
    renderer:Renderer
    container:Container3D=new Container3D()
    mainMatrix!: Matrix;
    SubMatrix!: Matrix;

    fov:number=Angle.deg2rad(80)
    near:number=0.001
    far:number=2000
    meter_size: number = 100

    position = v3.new(0,0,0)
    rotation = v3.new(0,0,0)

    constructor(renderer:Renderer){
        this.renderer=renderer
        this.resize()
    }

    addObject(...objects: Container3DObject[]): void {
        for(const o of objects){
            this.container.add_child(o);
        }
    }

    resize(): void {
        this.SubMatrix=matrix4.perspective(this.fov,this.renderer.canvas.width/this.renderer.canvas.height,this.near,this.far)
    }

    update(dt:number,resources:ResourcesManager): void {
        if(!this.SubMatrix)this.resize()
        this.mainMatrix = matrix4.mult(
            matrix4.mult(this.SubMatrix,matrix4.mult(
                matrix4.xRotation(this.rotation.x),
                matrix4.mult(
                    matrix4.yRotation(this.rotation.y),
                    matrix4.zRotation(this.rotation.z)
                )
            )),
            matrix4.translation_3d(v3.neg(this.position))
        )

        this.container.update(dt,resources)
    }

    draw(renderer:Renderer){
        this.container.draw({
            matrix:this.mainMatrix,
            position:this.position,
            meter_size:this.meter_size,
        },renderer)
    }
}