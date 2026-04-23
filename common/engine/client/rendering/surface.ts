import { WebglRenderer } from "../rendering/renderer.ts"
import { GLContext2D } from "../rendering/context.ts"
import { Matrix, matrix4 } from "../../core/math/matrix.ts"
import { v2 } from "../../core/math/vec2.ts"
import { Color } from "../../core/math/color.ts"
import { model2d } from "../../core/definition/models.ts"

export class Surface2D{
    renderer:WebglRenderer
    ctx:GLContext2D

    width:number
    height:number

    texture:WebGLTexture
    fbo:WebGLFramebuffer

    projection:Matrix

    constructor(renderer:WebglRenderer,width:number,height:number){
        this.renderer=renderer
        this.width=width
        this.height=height

        const gl=renderer.gl

        this.texture=gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D,this.texture)

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
        )

        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR)

        this.fbo=gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo)

        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            this.texture,
            0
        )

        gl.bindFramebuffer(gl.FRAMEBUFFER,null)

        this.ctx=new GLContext2D(renderer)

        this.projection=matrix4.projection(v2(width,height),1)
    }
    bind(){
        const gl=this.renderer.gl

        gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo)
        gl.viewport(0,0,this.width,this.height)

        this.ctx.base_matrix=this.projection
    }
    unbind(){
        const gl=this.renderer.gl

        gl.bindFramebuffer(gl.FRAMEBUFFER,null)
        gl.viewport(0,0,this.renderer.canvas.width,this.renderer.canvas.height)
    }
    clear(color:Color={r:0,g:0,b:0,a:0}){
        const gl=this.renderer.gl
        this.bind()

        gl.clearColor(color.r,color.g,color.b,color.a)
        gl.clear(gl.COLOR_BUFFER_BIT)

        this.unbind()
    }

    render(){
        this.ctx.render()
    }
    fill_rect(x:number,y:number,w:number,h:number){
        this.ctx.fill_rect(x,y,w,h)
    }
    stroke_rect(x:number,y:number,w:number,h:number){
        this.ctx.stroke_rect(x,y,w,h)
    }
    draw_circle(x:number,y:number,r:number){
        this.ctx.begin_path()
        this.ctx.arc(x,y,r,0,Math.PI*2)
        this.ctx.fill()
    }
    blit(src:Surface2D,x:number,y:number,w?:number,h?:number){

        const model=model2d.rect(
            {x,y},
            {x:x+(w??src.width),y:y+(h??src.height)}
        )

        const mat=this.renderer.factorys2D.texture.create({
            texture:src.texture,
            tint:{r:1,g:1,b:1,a:1}
        })

        this.ctx.draw_model2d(mat,model,{})
    }
}