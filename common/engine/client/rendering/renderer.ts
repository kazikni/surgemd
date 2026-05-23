import { Vec2 } from "../../core/math/vec2.ts";
import { GL2D_CTXSimpleBatchArgs, GL2D_CTXSimpleBatchAttr, GL2D_GridMatArgs, GL2D_GridMatAttr, GL2D_SimpleBatchArgs, GL2D_SimpleBatchAttr, GL2D_SimpleMatArgs, GL2D_SimpleMatAttr, GL2D_TexBatchArgs, GL2D_TexBatchAttr, GL2D_TexMatArgs, GL2D_TexMatAttr, GL3D_SimpleMatArgs, GL3D_SimpleMatAttr, GLF_CTXSimpleBatch, GLF_Grid, GLF_Simple, GLF_Simple3, GLF_SimpleBatch, GLF_Texture, GLF_TextureBatch } from "./materials.ts";
import { Color, ColorM } from "../../core/math/color.ts";
import { SingleMatBatching2D, SingleMatBatching2DGL } from "./batcher.ts";
import { Matrix } from "../../core/math/matrix.ts";

export type Material=GLMaterial

export abstract class Renderer {
    canvas: HTMLCanvasElement
    background: Color = ColorM.default.white;
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
    }
    abstract draw(material:Material,matrix:Matrix,attr:any):void
    abstract draw_single_mat_batcher2d(matrix:Matrix,batcher:SingleMatBatching2D):void
    abstract clear(): void
}
export class GLDynamicBuffer {
    buffer: WebGLBuffer
    size = 0
    private disposed = false
    constructor(private gl: WebGLRenderingContext) {
        this.buffer = gl.createBuffer()!
    }
    upload(target: number, data: Float32Array, usage: number = 35048) {
        if (this.disposed) return

        const gl = this.gl
        gl.bindBuffer(target, this.buffer)

        if (data.length > this.size) {
            this.size = data.length
            gl.bufferData(target, data, usage)
        } else {
            gl.bufferSubData(target, 0, data)
        }
    }
    exists(): boolean {
        return !!this.buffer && this.gl.isBuffer(this.buffer)
    }
    free() {
        if (this.disposed) return
        if (this.buffer && this.gl.isBuffer(this.buffer)) {
            this.gl.deleteBuffer(this.buffer)
        }

        this.buffer = null as any
        this.size = 0
        this.disposed = true
    }
}
// deno-lint-ignore no-explicit-any
export type GLMaterial<Args=any,Attr=any>={
    group:string
    factory:GLMaterialFactory<Args,Attr>
    draw:(mat:GLMaterial<Args,Attr>,matrix:Matrix,attr:Attr)=>void
    free:()=>void
}&Args
export interface GLMaterialFactory<Args,Attr>{
    create:(arg:Args)=>GLMaterial<Args,Attr>
    program:WebGLProgram
}
export type GLMaterialFactoryCall<Args,Attr>={vertex:string,frag:string,create:(gl:WebglRenderer,fac:GLMaterialFactory<Args,Attr>)=>(arg:Args)=>GLMaterial<Args,Attr>}

export class WebglRenderer extends Renderer {
    readonly gl: WebGLRenderingContext
    readonly factorys2D:{
        simple_batch:GLMaterialFactory<GL2D_SimpleBatchArgs,GL2D_SimpleBatchAttr>,
        ctx_simple_batch:GLMaterialFactory<GL2D_CTXSimpleBatchArgs,GL2D_CTXSimpleBatchAttr>,
        simple:GLMaterialFactory<GL2D_SimpleMatArgs,GL2D_SimpleMatAttr>,
        grid:GLMaterialFactory<GL2D_GridMatArgs,GL2D_GridMatAttr>,
        texture:GLMaterialFactory<GL2D_TexMatArgs,GL2D_TexMatAttr>,
        texture_batch:GLMaterialFactory<GL2D_TexBatchArgs,GL2D_TexBatchAttr>,
        //light:GLMaterialFactory<GL2D_LightMatArgs,GL2D_LightMatAttr>
    }
    readonly factorys3D:{
        simple:GLMaterialFactory<GL3D_SimpleMatArgs,GL3D_SimpleMatAttr>,
    }

    readonly isWebGL2: boolean;
    current_program?:WebGLProgram

    proccess_factory<A,B>(fac_def:GLMaterialFactoryCall<A,B>):GLMaterialFactory<A,B>{
        const prog=this.createProgram(fac_def.vertex,fac_def.frag)
        const fac={
            program:prog
        }
        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        fac.create=fac_def.create(this,fac)
        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        return fac
    }

    quadVBO:WebGLBuffer
    quadTBO:WebGLBuffer
    constructor(canvas: HTMLCanvasElement, background: Color = ColorM.default.white, version: 1 | 2 = 2,antialias: boolean = true) {
        super(canvas);
        const gl =
            version === 2
                ? canvas.getContext("webgl2",{antialias})
                : canvas.getContext("webgl",{antialias})
        
        if (!gl) throw new Error(`Failed to initialize WebGL${version}`)
        // deno-lint-ignore no-explicit-any
        this.gl = gl as any
        this.isWebGL2 = version === 2

        this.background = background;

        this.factorys2D={
            simple_batch:this.proccess_factory(GLF_SimpleBatch),
            ctx_simple_batch:this.proccess_factory(GLF_CTXSimpleBatch),
            simple:this.proccess_factory(GLF_Simple),
            grid:this.proccess_factory(GLF_Grid),
            texture_batch:this.proccess_factory(GLF_TextureBatch),
            texture:this.proccess_factory(GLF_Texture),
            //light:this.proccess_factory(GLF_Light),
        }

        this.factorys3D={
            simple:this.proccess_factory(GLF_Simple3)
        }

        document.body.addEventListener("pointerdown", e => {
            canvas.dispatchEvent(new PointerEvent("pointerdown", {
                pointerId: e.pointerId,
                button: e.button,
                clientX: e.clientX,
                clientY: e.clientY,
                screenY: e.screenY,
                screenX: e.screenX
            }));
        });
        document.body.addEventListener("mousemove", e => {
            canvas.dispatchEvent(new PointerEvent("mousemove", {
                button: e.button,
                clientX: e.clientX,
                clientY: e.clientY,
                screenY: e.screenY,
                screenX: e.screenX
            }))
        })

        canvas.tabIndex = 0

        this.quadVBO = gl.createBuffer()
        this.quadTBO = gl.createBuffer()
    }
    createShader(src: string, type: number): WebGLShader {
        const shader = this.gl.createShader(type);
        if (shader) {
            this.gl.shaderSource(shader, src);
            this.gl.compileShader(shader);
            if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
                throw Error("" + this.gl.getShaderInfoLog(shader));
            }
            return shader;
        }
        throw Error("Can't create shader");
    }
    createProgram(vertex:string,frag:string):WebGLProgram{
        const p = this.gl.createProgram();
        this.gl.attachShader(p!, this.createShader(vertex, this.gl.VERTEX_SHADER))
        this.gl.attachShader(p!, this.createShader(frag, this.gl.FRAGMENT_SHADER))
        this.gl.linkProgram(p!)
        return p!
    }
    override draw(material:Material,matrix:Matrix,attr:any):void{
        material.draw(material,matrix,attr)
    }
    create_single_mat_batcher(mat:Material):SingleMatBatching2DGL{
        return new SingleMatBatching2DGL(this,mat)
    }
    override draw_single_mat_batcher2d(matrix:Matrix,batcher:SingleMatBatching2D):void{
        batcher.render(matrix)
    }
    set_program(program:WebGLProgram){
        if(!this.current_program||program!==this.current_program){
            this.current_program=program
            this.gl.useProgram(program)
        }
    }

    clear() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
        this.gl.clearColor(this.background.r, this.background.g, this.background.b, 1)
        this.canvas.style.backgroundColor=`rgb(${0},${0},${0})`
        this.gl.clear(this.gl.COLOR_BUFFER_BIT |this.gl.DEPTH_BUFFER_BIT);
        
        this.gl.depthMask(true)
        this.gl.depthFunc(this.gl.LEQUAL)
        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
    }
}
export function createCanvas(size: Vec2, pixelated: boolean = true, center: boolean = true): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = size.x;
    canvas.height = size.y;

    canvas.tabIndex = 0
    canvas.focus()
    if (pixelated) {
        canvas.style.imageRendering = "pixelated"
        canvas.style.imageRendering = "crisp-edges"
        canvas.style.imageRendering = "-moz-crisp-edges"
    }
    if (center) {
        canvas.style.position = "absolute"
        canvas.style.left = "0px"
        canvas.style.right = "0px"
        canvas.style.top = "0px"
        canvas.style.bottom = "0px"
        canvas.style.margin = "auto"
    }
    return canvas;
}

export function applyBorder(elem: HTMLElement) {
    elem.style.border = "1px solid #000";
}

export function applyShadow(elem: HTMLElement) {
    elem.style.boxShadow = "0px 4px 17px 0px rgba(0,0,0,0.19)";
}

export function fullCanvas(elem: HTMLCanvasElement) {
    const ratio = self.devicePixelRatio || 1;

    elem.width  = self.innerWidth  * ratio;
    elem.height = self.innerHeight * ratio;

    elem.style.width  = `${self.innerWidth}px`;
    elem.style.height = `${self.innerHeight}px`;

    const ctx = elem.getContext("2d");
    if (ctx) {
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
}
