import { FrameData, KSPR } from "../../core/lang/kspx.ts"
import { Rect } from "../../core/math/geometry.ts";
import { v2, Vec2 } from "../../core/math/vec2.ts"
import { Material, WebglRenderer } from "../rendering/renderer.ts"
import { AudioEngine } from "./sounds.ts";
export interface SpritesheetJSON{
    meta:{
        image:string
        scale:number
        size:{
            w:number
            h:number
        }
    }
    frames:Record<string,FrameData>
}
export interface SoundDef {
    src:string
    volume?:number
}
export interface Sound {
    id:string
    src:string
    volume:number
    buffer:AudioBuffer
    group:string
}
export class Frame {
    id:string=""

    src:string=""
    group:string=""

    image!:HTMLImageElement
    texture!:WebGLTexture
    batch_mat:Material

    frame_rect?:Rect
    frame_size:Vec2=v2(1,1)

    texcoords:Float32Array

    constructor(public gl:WebGLRenderingContext,texcoords:number[]){
        this.texcoords=new Float32Array(texcoords)
    }
    free(){
        if(this.texture){
            this.gl.deleteTexture(this.texture)
        }
    }
}

export type Source=Frame|Sound
export class TextureUtils {
    static create(gl:WebGLRenderingContext,image:HTMLImageElement,smooth=true){
        const texture=gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D,texture)
        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_S,
            gl.CLAMP_TO_EDGE
        )
        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_T,
            gl.CLAMP_TO_EDGE
        )
        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            smooth?gl.LINEAR:gl.NEAREST
        )
        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MAG_FILTER,
            smooth?gl.LINEAR:gl.NEAREST
        )
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        )
        return texture
    }
}
export class ResourcesManager {
    frames:Record<string,Frame>={}
    sounds:Record<string,Sound>={}
    materials:Record<string,Material>={}

    canvas:HTMLCanvasElement
    ctx:CanvasRenderingContext2D

    gl:WebGLRenderingContext
    renderer:WebglRenderer

    default_frame!:Frame

    constructor(renderer:WebglRenderer,public audio:AudioEngine){
        this.renderer=renderer
        this.gl=renderer.gl

        this.canvas=document.createElement("canvas")
        this.ctx=this.canvas.getContext("2d")!

        this.init_default_frame()
    }
    private init_default_frame(){
        const canvas=document.createElement("canvas")

        canvas.width=64
        canvas.height=64

        const ctx=canvas.getContext("2d")!

        ctx.fillStyle="magenta"
        ctx.fillRect(0,0,64,64)

        ctx.fillStyle="black"
        ctx.fillRect(0,0,32,32)

        ctx.fillRect(32,32,32,32)

        const image=new Image()

        image.onload=()=>{
            const frame=new Frame(this.gl,[
                0,1,
                1,1,
                0,0,

                0,0,
                1,1,
                1,0
            ])

            frame.id="default"
            frame.src="default"
            frame.group="internal"

            frame.image=image
            frame.texture=TextureUtils.create(
                this.gl,
                image
            )

            frame.frame_size=v2(
                image.width,
                image.height
            )

            this.default_frame=frame
        }

        image.src=canvas.toDataURL()
    }

    async load_source(id:string,src:string,volume:number=1,group:string="",callback?:(msg:string)=>void):Promise<Source|undefined>{
        if(src.endsWith(".svg")||src.endsWith(".png")){
            return await this.load_frame(id,src,group,callback)
        }else if(src.endsWith(".mp3")||src.endsWith(".wav")){
            return await this.load_sound(id,{src:src,volume:volume},group,callback)
        }
        return undefined
    }
    async load_group(path:string,name:string="",callback?:(msg:string)=>void){
        const files=await(await fetch(path)).json()
        for(const f of Object.keys(files.files)){
            await this.load_source(f,files.files[f],undefined,name,callback)
        }
    }
    load_image(src:string){
        return new Promise<HTMLImageElement>((resolve,reject)=>{
            const img=new Image()
            img.onload=()=>resolve(img)
            img.onerror=reject
            img.src=src
        })
    }
    create_frame(image:HTMLImageElement,texture:WebGLTexture,rect:Rect,src:string=""){
        const frame=new Frame(this.gl,[
            rect.min.x,rect.max.y,
            rect.max.x,rect.max.y,
            rect.min.x,rect.min.y,

            rect.min.x,rect.min.y,
            rect.max.x,rect.max.y,
            rect.max.x,rect.min.y
        ])

        frame.image=image
        frame.texture=texture
        frame.src=src

        return frame
    }
    async load_frame(id:string,src:string,group:string="",callback?:(msg:string)=>void){
        if(callback)callback(src)
        if(this.frames[id]){
            return this.frames[id]
        }
        const image=await this.load_image(src)
        const texture=TextureUtils.create(
            this.gl,
            image
        )
        const frame=this.create_frame(image,texture,{min:v2.zero(),max:v2.one()},src)
        frame.id=id
        frame.group=group
        frame.frame_size=v2(
            image.width,
            image.height
        )
        this.frames[id]=frame
        return frame
    }
    async load_spritesheet(prefix:string,json:SpritesheetJSON,image_override?:string,group:string="",callback?:(item:string)=>void){
        const image=await this.load_image(image_override??json.meta.image)

        const texture=TextureUtils.create(this.gl,image)

        const iw=image.width
        const ih=image.height

        for(const [id,data] of Object.entries(json.frames)){
            if(callback)callback(data.src)
            const rect={
                min:v2(data.x/iw,1-((data.y+data.h)/ih)),
                max:v2((data.x+data.w)/iw,1-(data.y/ih)),
            }
            const frame=this.create_frame(image,texture,rect,data.src??id)
            frame.id=prefix+id
            frame.group=group
            frame.frame_rect={
                min:v2(data.x,data.y),
                max:v2(data.x+data.w,data.y+data.h)
            }
            frame.frame_size=v2(
                data.w/json.meta.scale,
                data.h/json.meta.scale
            )
            this.frames[frame.id]=frame
        }
    }
    async load_kspr(kspr:KSPR,resolution:string,group:string="",prefix:string="",callback?:(item:string)=>void){
        const res=kspr.resolutions[resolution]
        for(const atlas of res.atlases){
            const blob=new Blob([atlas.image])
            const url=URL.createObjectURL(blob)
            const image=await this.load_image(url)
            URL.revokeObjectURL(url)
            const texture=TextureUtils.create(
                this.gl,
                image
            )
            const iw=image.width
            const ih=image.height
            for(const [id,data] of Object.entries(atlas.frames)){
                if(callback)callback(data.src)
                const rect={
                    min:v2(data.x/iw,1-((data.y+data.h)/ih)),
                    max:v2((data.x+data.w)/iw,1-(data.y/ih)),
                }

                const frame=this.create_frame(image,texture,rect,data.src??id)
                frame.batch_mat=this.renderer.factorys2D.texture_batch.create({
                    texture
                })

                frame.id=prefix+id
                frame.group=group

                frame.frame_rect={
                    min:v2(data.x,data.y),
                    max:v2(data.x+data.w,data.y+data.h)
                }
                frame.frame_size=v2(
                    data.w/res.scale,
                    data.h/res.scale
                )
                this.frames[frame.id]=frame
            }
        }
    }
    async load_sound(id:string,def:SoundDef,group:string="",callback?:(msg:string)=>void){
        if(callback)callback(def.src)
        if(this.sounds[id]){
            return this.sounds[id]
        }

        const response=await fetch(def.src)

        const arrayBuffer=await response.arrayBuffer()

        const buffer=await this.audio.ctx.decodeAudioData(
            arrayBuffer
        )

        const sound:Sound={
            id,
            src:def.src,
            volume:def.volume??1,
            buffer,
            group
        }

        this.sounds[id]=sound

        return sound
    }
    load_material(id:string,material:Material){
        this.materials[id]=material
    }
    async render_text(text:string,size=32,color="white",font="Arial"){
        const canvas=this.canvas
        const ctx=this.ctx
        ctx.font=`${size}px ${font}`
        const metrics=ctx.measureText(text)
        canvas.width=Math.max(1,Math.ceil(metrics.width))
        canvas.height=Math.max(1,Math.ceil(size*1.5))
        ctx.clearRect(0,0,canvas.width,canvas.height)
        ctx.font=`${size}px ${font}`
        ctx.fillStyle=color
        ctx.textBaseline="top"
        ctx.fillText(text,0,0)
        return await this.load_frame_from_canvas(canvas)
    }
    load_frame_from_canvas(canvas:HTMLCanvasElement){
        const image=new Image()
        const src=canvas.toDataURL()
        return new Promise<Frame>((resolve)=>{
            image.onload=()=>{
                const texture=TextureUtils.create(this.gl,image)
                const frame=this.create_frame(image,texture,{min:v2.zero(),max:v2.one()})
                frame.batch_mat=this.renderer.factorys2D.texture_batch.create({texture})
                frame.frame_size=v2(image.width,image.height)
                resolve(frame)
            }
            image.src=src
        })
    }
    get_frame(id:string,allow_default=true):Frame{
        if(!this.frames[id]){
            if(allow_default){
                return this.default_frame
            }
        }
        return this.frames[id]
    }
    get_sound(id:string):Sound{
        const sound=this.sounds[id]
        return sound
    }
    get_material(id:string):Material{
        const material=this.materials[id]
        return material
    }

    unload_frame(id:string){
        const frame=this.frames[id]
        if(!frame)return
        frame.free()
        delete this.frames[id]
    }
    unload_sound(id:string){
        delete this.sounds[id]
    }
    unload_material(id:string){
        delete this.materials[id]
    }
    unload_group(group:string){
        for(const id in this.frames){
            if(this.frames[id].group===group){
                this.unload_frame(id)
            }
        }
        for(const id in this.sounds){
            if(this.sounds[id].group===group){
                this.unload_sound(id)
            }
        }
        for(const id in this.materials){
            if(this.materials[id].group===group){
                this.unload_material(id)
            }
        }
    }
    clear(blacklist:string[]=[]){
        for(const r of Object.keys(this.frames)){
            if(blacklist.includes(r)||blacklist.includes(this.frames[r].group))continue
            console.log("Unloading: ",r)
            this.unload_frame(r)
        }
        for(const r of Object.keys(this.sounds)){
            if(blacklist.includes(r)||blacklist.includes(this.sounds[r].group))continue
            console.log("Unloading: ",r)
            this.unload_sound(r)
        }
    }
}