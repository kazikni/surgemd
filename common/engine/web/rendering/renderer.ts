import { v2, Vec2 } from "../../core/math/vec2.ts";
import { GL2D_SimpleBatchArgs, GL2D_SimpleBatchAttr, GL2D_SimpleMatArgs, GL2D_SimpleMatAttr, GL2D_TexBatchArgs, GL2D_TexBatchAttr, GL2D_TexMatArgs, GL2D_TexMatAttr, GL3D_SimpleMatArgs, GL3D_SimpleMatAttr, GLF_Simple, GLF_Simple3, GLF_SimpleBatch, GLF_Texture, GLF_TextureBatch } from "./materials.ts";
import { Color, ColorM } from "../../core/math/color.ts";
import { Matrix } from "../../core/math/matrix.ts";
import { Context2D, GLContext2D } from "./context.ts";
export interface Material{
    draw(material:Material,matrix:Matrix,attr:any):void
    free():void
}
export interface Texture{
    size:Vec2
    material:Material

    to_blob(canvas:HTMLCanvasElement,ctx:CanvasRenderingContext2D,type?:string):Promise<Blob|undefined>
    free():void
}

export class GLTexture implements Texture{
    size:Vec2

    renderer:WebglRenderer
    texture?:WebGLTexture
    framebuffer?:WebGLFramebuffer
    material:Material

    constructor(size: Vec2,texture:WebGLTexture,renderer:WebglRenderer,material:Material){
        this.renderer=renderer
        this.size=size
        this.texture=texture
        this.material=material
    }

    to_blob(canvas:HTMLCanvasElement,ctx: CanvasRenderingContext2D, type: string="image/png"): Promise<Blob|undefined>{
        if(!this.framebuffer)return new Promise(resolve=>resolve(undefined))

        const pixels = new Uint8Array(this.size.x*this.size.y*4)
        this.renderer.gl.bindFramebuffer(this.renderer.gl.FRAMEBUFFER,this.framebuffer)
        this.renderer.gl.readPixels(0,0,this.size.x,this.size.y,this.renderer.gl.RGBA,this.renderer.gl.UNSIGNED_BYTE,pixels)
        
        
        canvas.width = this.size.x;
        canvas.height = this.size.y;

        ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels),this.size.x,this.size.y),0,0)

        return new Promise(resolve=>{
            canvas.toBlob(blob=>resolve(blob!),type)
        })
    }

    free(): void {
        if(this.texture){
            if(this.framebuffer)this.renderer.gl.deleteFramebuffer(this.framebuffer)
            this.renderer.gl.deleteTexture(this.texture)
            this.texture=undefined
        }
    }
}
export abstract class Renderer {
    canvas: HTMLCanvasElement
    draw_calls:number=0
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
    }

    abstract empty_texture(): Texture
    abstract create_texture(width:number,height:number,smooth?:boolean):Texture
    abstract load_texture(img:HTMLImageElement,smooth?:boolean):Texture

    abstract bind_texture(texture:Texture):void
    abstract unbind_texture():void

    abstract create_context():Context2D

    abstract set_background_color(color:Color):void
    abstract clear(): void

    full_canvas(max_ration?:number,roundPixels?:boolean){
        fullCanvas(this.canvas,max_ration,roundPixels)
    }
}
export class GLDynamicBuffer {
    buffer: WebGLBuffer
    size = 0
    draw_calls:number=0
    private disposed = false
    constructor(private gl: WebGLRenderingContext) {
        this.buffer = gl.createBuffer()!
    }
    upload_f32(target: number, data: Float32Array, usage: number = 35048) {
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
    upload_u8(target: number, data: Uint8Array, usage: number = 35048) {
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
        simple:GLMaterialFactory<GL2D_SimpleMatArgs,GL2D_SimpleMatAttr>,
        texture:GLMaterialFactory<GL2D_TexMatArgs,GL2D_TexMatAttr>,
        texture_batch:GLMaterialFactory<GL2D_TexBatchArgs,GL2D_TexBatchAttr>,
        //light:GLMaterialFactory<GL2D_LightMatArgs,GL2D_LightMatAttr>
    }
    readonly factorys3D:{
        simple:GLMaterialFactory<GL3D_SimpleMatArgs,GL3D_SimpleMatAttr>,
    }
    readonly isWebGL2: boolean

    current_program?:WebGLProgram
    background:Color

    current_texture?:GLTexture

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

    constructor(canvas: HTMLCanvasElement, version: 1 | 2 = 2,antialias: boolean = true) {
        super(canvas);
        const gl =
            version === 2
                ? canvas.getContext("webgl2",{antialias})
                : canvas.getContext("webgl",{antialias})
        
        if (!gl) throw new Error(`Failed to initialize WebGL${version}`)
        // deno-lint-ignore no-explicit-any
        this.gl = gl as any
        this.isWebGL2 = version === 2
        this.background=ColorM.default.white

        this.factorys2D={
            simple_batch:this.proccess_factory(GLF_SimpleBatch),
            simple:this.proccess_factory(GLF_Simple),
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
        this.canvas.style.backgroundColor=`rgb(${0},${0},${0})`
    }
    create_context():GLContext2D{
        return new GLContext2D(this)
    }

    override bind_texture(texture: GLTexture): void {
        if(this.current_texture)return
        const gl=this.gl

        if(texture.framebuffer){
            gl.bindFramebuffer(gl.FRAMEBUFFER,texture.framebuffer)
        }else{
            texture.framebuffer=gl.createFramebuffer()!
            gl.bindFramebuffer(gl.FRAMEBUFFER,texture.framebuffer)
            gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture.texture!,0)
        }

        this.current_texture=texture
        gl.viewport(0,0,texture.size.x,texture.size.y)
    }
    unbind_texture(){
        if(!this.current_texture?.framebuffer)return
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null)
        this.gl.viewport(0,0,this.canvas.width,this.canvas.height)
        this.current_texture=undefined
    }
    override empty_texture(): GLTexture {
        const te=this.gl.createTexture()!
        return new GLTexture(v2.zero(),te,this,this.factorys2D.texture_batch.create({texture:te}))
    }
    override create_texture(width:number,height:number,smooth:boolean=false):GLTexture{
        const gl=this.gl;
        const tex=gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D,tex);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
        );

        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,smooth?this.gl.LINEAR:this.gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,smooth?this.gl.LINEAR:this.gl.NEAREST);

        return new GLTexture(v2(width,height),tex,this,this.factorys2D.texture_batch.create({texture:tex}))
    }
    override load_texture(img:HTMLImageElement,smooth:boolean=true):Texture{
        const texture=this.gl.createTexture()!
        this.gl.bindTexture(this.gl.TEXTURE_2D,texture)
        this.gl.texParameteri(
            this.gl.TEXTURE_2D,
            this.gl.TEXTURE_WRAP_S,
            this.gl.CLAMP_TO_EDGE
        )
        this.gl.texParameteri(
            this.gl.TEXTURE_2D,
            this.gl.TEXTURE_WRAP_T,
            this.gl.CLAMP_TO_EDGE
        )
        this.gl.texParameteri(
            this.gl.TEXTURE_2D,
            this.gl.TEXTURE_MIN_FILTER,
            smooth?this.gl.LINEAR:this.gl.NEAREST
        )
        this.gl.texParameteri(
            this.gl.TEXTURE_2D,
            this.gl.TEXTURE_MAG_FILTER,
            smooth?this.gl.LINEAR:this.gl.NEAREST
        )
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            img
        )
        const tex=new GLTexture(v2(img.width,img.height),texture,this,this.factorys2D.texture_batch.create({texture}))
        return tex
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
    set_program(program:WebGLProgram){
        if(!this.current_program||program!==this.current_program){
            this.current_program=program
            this.gl.useProgram(program)
        }
    }

    clear() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
        this.gl.clearColor(this.background.r/255, this.background.g/255, this.background.b/255, 1)
        this.gl.clear(this.gl.COLOR_BUFFER_BIT |this.gl.DEPTH_BUFFER_BIT);
        this.gl.depthMask(true)
        this.gl.depthFunc(this.gl.LEQUAL)
        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
        this.draw_calls=0
    }
    override set_background_color(color: Color): void {
        this.background=color
    }
}


export function fullCanvas(canvas: HTMLCanvasElement,maxRatio: number = 2,roundPixels: boolean = true): boolean {
    const cssWidth=self.innerWidth;
    const cssHeight=self.innerHeight;

    const ratio = Math.min(self.devicePixelRatio || 1, maxRatio);
    const width = roundPixels?Math.round(cssWidth*ratio):cssWidth*ratio;
    const height = roundPixels?Math.round(cssHeight*ratio):cssHeight*ratio;

    const resized = canvas.width !== width || canvas.height !== height;
    if (resized) {
        canvas.width = width;
        canvas.height = height;

        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
    }
    return resized;
}