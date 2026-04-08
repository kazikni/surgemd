import { fullCanvas, Renderer, WebglRenderer } from "../rendering/renderer.ts"
import { CamA, Container2DObject } from "./base.ts"
import { v2 } from "../../core/math/vec2.ts"
import { ResourcesManager } from "../resources/resources.ts"
import { Context2D, GLContext2D } from "../rendering/context.ts";
import { Matrix, matrix4 } from "../../core/definition/matrix.ts";
import { RectHitbox2D } from "../../core/math/hitbox.ts";
import { Container2D } from "./container.ts";

export class Camera2D{
    renderer:Renderer
    container:Container2D=new Container2D()
    private _zoom = 1;

    projectionMatrix!: Matrix;
    SubMatrix!: Matrix;

    get zoom(): number { return this._zoom; }
    set zoom(zoom: number) {
        this._zoom = zoom
        this.resize()
    }

    width = 1;
    height = 1;
    meter_size: number = 100

    position = v2(0, 0)
    visual_position=v2(0,0)

    center_pos:boolean=true

    after_draw:((cam:CamA)=>void)[]=[]

    ctx:Context2D
    constructor(renderer:Renderer){
        this.renderer=renderer
        this.zoom=1
        this.container.object_group=true
        this.ctx=new GLContext2D(renderer as WebglRenderer)
    }

    get_hitbox():RectHitbox2D{
        if(this.center_pos){
            return RectHitbox2D.centered(v2.clone(this.position),v2(this.width,this.height))
        }else{
            return RectHitbox2D.positioned(v2.clone(this.position),v2(this.width,this.height))
        }
    }

    addObject(...objects: Container2DObject[]): void {
        for(const o of objects){
            this.container.add_child(o);
        }
        this.container.update_zindex()
        this.container.update_real()
    }

    resize(): void {
        const scale=this.meter_size*this._zoom

        const scaleX = this.renderer.canvas.width / scale
        const scaleY = this.renderer.canvas.height / scale
    
        this.SubMatrix = matrix4.projection(v2(scaleX,scaleY),500)

        this.width = scaleX;
        this.height = scaleY;
    }

    update(dt:number,resources:ResourcesManager): void {
        this.projectionMatrix=this.SubMatrix
        if(this.center_pos){
            const halfViewSize = v2(this.width / 2, this.height / 2);
            const cameraPos = v2.sub(this.position, halfViewSize);

            this.visual_position=cameraPos
            this.projectionMatrix=this.SubMatrix

            this.projectionMatrix = matrix4.mult(this.SubMatrix,matrix4.translation_2d(v2.neg(cameraPos)))
        }else{
            this.visual_position=this.position
            this.projectionMatrix=this.SubMatrix

            this.projectionMatrix = matrix4.mult(this.SubMatrix,matrix4.translation_2d(v2.neg(this.position)))
        }
        this.container.update(dt,resources)
    }

    draw(dt:number,resources:ResourcesManager){
        this.update(dt,resources)
        const cam={
            matrix:this.projectionMatrix,

            position:this.visual_position,
            size:v2(this.width,this.height),

            meter_size:this.meter_size,
            center_pos:this.center_pos,

            ctx:this.ctx,
            renderer:this.renderer,

            hitbox:this.get_hitbox()
        }

        this.container.draw(cam)
        this.ctx.base_matrix=this.projectionMatrix
        this.ctx.render()

        for(const a of this.after_draw){
            a(cam)
        }
    }

    fullCanvas(){
        const sx=this.renderer.canvas.width
        const sy=this.renderer.canvas.height
        fullCanvas(this.renderer.canvas)
        if(sx!=this.renderer.canvas.width||sy!=this.renderer.canvas.height){
            this.resize()
        }
    }
}