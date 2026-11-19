import { Color, ColorM } from "../../core/math/color.ts";
import { Rect } from "../../core/math/geometry.ts";
import { Matrix, matrix4 } from "../../core/math/matrix.ts";
import { v2, v2m, Vec2 } from "../../core/math/vec2.ts";
import { type GLContext2D } from "../rendering/context.ts";
import { type GLTexture, type WebglRenderer } from "../rendering/renderer.ts";
import { Frame } from "../resources/resources.ts";
import { type CamA, Container2DObject } from "./base.ts";
import { type Camera2D } from "./camera.ts";
import { Container2D } from "./container.ts";
import { Sprite2D } from "./sprite.ts";

export class Light2D{
    position:Vec2
    radius:number
    color:Color
    intensity:number=1
    shadow_length:number=0.3
    destroyed:boolean=false

    constructor(position:Vec2,radius:number,color:Color){
        this.position=position
        this.radius=radius
        this.color=color
    }
    destroy(){
        this.destroyed=true
    }
}

export class Shadow2D extends Container2DObject{
    object_type:string="shadow2d"
    target:Container2DObject
    lighting:Lighting2D
    height:number=1
    z_offset:number=-0.5
    offset:Vec2=v2.zero()

    private chain:Container2DObject[]=[]

    constructor(target:Container2DObject,lighting:Lighting2D){
        super()
        this.target=target
        this.lighting=lighting
    }

    override get_rect():Rect{
        return this.target.get_rect()
    }

    override draw(cam:CamA):void{
        this.tint=this.lighting.shadow_color
        const chain=this.chain
        chain.length=0
        const root_container=this.lighting.camera.container
        for(let o:Container2DObject|undefined=this.target;o&&o!==root_container;o=o.parent){
            if(o.destroyed){
                this.destroy()
                return
            }
            chain.push(o)
        }
        const root=chain[chain.length-1]
        this.layer=root.layer
        this.zIndex=root.zIndex+this.z_offset
        for(let i=chain.length-1;i>=0;i--){
            if(!chain[i]._visible)return
            chain[i].draw_super(cam)
        }

        const anchor=root._real_position
        v2m.scale(this.offset,this.lighting.shadow_offset,root._real_scale.x*this.height)
        for(const l of this.lighting.lights){
            const dx=anchor.x-l.position.x
            const dy=anchor.y-l.position.y
            const dist=Math.sqrt(dx*dx+dy*dy)
            if(dist<=0||dist>=l.radius)continue
            const w=(1-dist/l.radius)*l.intensity*l.shadow_length*this.height/dist
            this.offset.x+=dx*w
            this.offset.y+=dy*w
        }

        let matrix=matrix4.translation_2d(this.offset)
        if(this.lighting.shadow_matrix){
            matrix=matrix4.mul(matrix,matrix4.mul(matrix4.translation_2d(anchor),matrix4.mul(this.lighting.shadow_matrix,matrix4.translation_2d(v2.neg(anchor)))))
        }
        this.draw_target(this.target,cam,matrix)
    }

    private draw_target(obj:Container2DObject,cam:CamA,matrix:Matrix){
        obj.draw_super(cam)
        if(obj instanceof Sprite2D){
            let m=matrix4.mul(cam.matrix[obj.matrix_index],matrix)
            if(obj._real_matrix)m=matrix4.mul(m,obj._real_matrix)
            const color=ColorM.clone(ColorM.default.white)
            ColorM.mul(color,obj._real_tint,this._real_tint)
            cam.ctx.draw_frame2d(obj.frame,obj.model,color,m)
        }else if(obj instanceof Container2D){
            for(const c of obj.children){
                if(c._visible&&!c.destroyed)this.draw_target(c,cam,matrix)
            }
        }
    }
}

export class Lighting2D{
    camera:Camera2D

    enabled:boolean=true

    shadows_enabled:boolean=true
    shadow_color:Color=ColorM.rgba(0,0,0,68)
    shadow_offset:Vec2=v2(0.1,0.1)
    shadow_matrix?:Matrix

    ambient:Color=ColorM.rgba(255,255,255,255)
    downscale:number=0.5
    segments:number=24
    lights:Light2D[]=[]

    private texture?:GLTexture
    private frame?:Frame
    private screen_model=new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1])

    constructor(camera:Camera2D){
        this.camera=camera
    }

    create_shadow(target:Container2DObject):Shadow2D|undefined{
        if(!this.enabled||!this.shadows_enabled)return
        const s=new Shadow2D(target,this)
        this.camera.container.add_child(s)
        return s
    }
    create_light(position:Vec2,radius:number,color:Color=ColorM.rgba(255,255,255,255)):Light2D|undefined{
        if(!this.enabled||!this.shadows_enabled)return
        const l=new Light2D(position,radius,color)
        this.lights.push(l)
        return l
    }

    render(){
        for(let i=0;i<this.lights.length;i++){
            if(this.lights[i].destroyed)this.lights.splice(i--,1)
        }
        if(!this.enabled)return
        const renderer=this.camera.renderer as WebglRenderer
        const gl=renderer.gl
        const ctx=this.camera.ctx as GLContext2D
        const w=Math.max(1,Math.floor(renderer.canvas.width*this.downscale))
        const h=Math.max(1,Math.floor(renderer.canvas.height*this.downscale))
        if(!this.texture||this.texture.size.x!==w||this.texture.size.y!==h){
            this.texture?.free()
            this.texture=renderer.create_texture(w,h,true)
            this.frame=new Frame(this.texture,[0,1,1,1,1,0,0,1,1,0,0,0])
        }

        renderer.bind_texture(this.texture)
        gl.clearColor(this.ambient.r/255,this.ambient.g/255,this.ambient.b/255,1)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.blendFunc(gl.ONE,gl.ONE)

        const m=this.camera.viewport_camera_matrix
        const cmd=ctx.batcher.ensure(ctx.default_material!)
        const write=(x:number,y:number,c:Color,f:number)=>{
            cmd.stream.write_float32(m[0]*x+m[4]*y+m[12])
            cmd.stream.write_float32(m[1]*x+m[5]*y+m[13])
            cmd.stream.write_uint8(c.r*f)
            cmd.stream.write_uint8(c.g*f)
            cmd.stream.write_uint8(c.b*f)
            cmd.stream.write_uint8(255)
            cmd.vertex_count++
        }
        const step=Math.PI*2/this.segments
        for(const l of this.lights){
            const p=l.position
            const inner=l.radius*0.45
            const fi=Math.min(l.intensity,1)
            const fm=fi*0.3
            for(let s=0;s<this.segments;s++){
                const c0=Math.cos(s*step)
                const s0=Math.sin(s*step)
                const c1=Math.cos((s+1)*step)
                const s1=Math.sin((s+1)*step)
                write(p.x,p.y,l.color,fi)
                write(p.x+c0*inner,p.y+s0*inner,l.color,fm)
                write(p.x+c1*inner,p.y+s1*inner,l.color,fm)

                write(p.x+c0*inner,p.y+s0*inner,l.color,fm)
                write(p.x+c0*l.radius,p.y+s0*l.radius,l.color,0)
                write(p.x+c1*l.radius,p.y+s1*l.radius,l.color,0)

                write(p.x+c0*inner,p.y+s0*inner,l.color,fm)
                write(p.x+c1*l.radius,p.y+s1*l.radius,l.color,0)
                write(p.x+c1*inner,p.y+s1*inner,l.color,fm)
            }
        }
        ctx.render(renderer)
        ctx.clear()
        renderer.unbind_texture()

        gl.blendFunc(gl.DST_COLOR,gl.ZERO)
        ctx.draw_frame2d(this.frame,this.screen_model)
        ctx.render(renderer)
        ctx.clear()
        gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)
    }
}