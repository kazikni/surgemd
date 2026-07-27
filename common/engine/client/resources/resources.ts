import { FrameData, KSPR } from "../../core/lang/kspx.ts"
import { Rect } from "../../core/math/geometry.ts";
import { v2, Vec2 } from "../../core/math/vec2.ts"
import { Renderer, Texture } from "../rendering/renderer.ts"
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

    image?:HTMLImageElement
    texture?:Texture

    frame_rect?:Rect
    frame_size:Vec2

    texcoords:Float32Array

    constructor(texture:Texture,texcoords:number[]){
        this.texture=texture
        this.frame_size=this.texture.size
        this.texcoords=new Float32Array(texcoords)
    }
    free(){
        if(this.texture){
            this.texture.free()
            this.texture=undefined
        }
    }
}

export type Source=Frame|Sound
export class ResourcesManager {
    frames:Record<string,Frame>={}
    sounds:Record<string,Sound>={}

    canvas:HTMLCanvasElement
    ctx:CanvasRenderingContext2D

    renderer:Renderer

    default_frame!:Frame
    default_frame_enabled:boolean=false

    constructor(renderer:Renderer,public audio:AudioEngine){
        this.renderer=renderer

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
            const frame=new Frame(this.renderer.load_texture(image),[
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
    create_frame(texture:Texture,rect:Rect,src:string=""){
        const frame=new Frame(texture,[
            rect.min.x,rect.max.y,
            rect.max.x,rect.max.y,
            rect.min.x,rect.min.y,

            rect.min.x,rect.min.y,
            rect.max.x,rect.max.y,
            rect.max.x,rect.min.y
        ])

        frame.src=src

        return frame
    }
    async load_frame(id:string,src:string,group:string="",callback?:(msg:string)=>void){
        if(callback)callback(src)
        if(this.frames[id]){
            return this.frames[id]
        }
        const image=await this.load_image(src)
        const frame=this.create_frame(this.renderer.load_texture(image),{min:v2.zero(),max:v2.one()},src)
        frame.id=id
        frame.group=group
        this.frames[id]=frame
        return frame
    }
    async load_spritesheet(prefix:string,json:SpritesheetJSON,image_override?:string,group:string="",callback?:(item:string)=>void){
        const image=await this.load_image(image_override??json.meta.image)
        const texture=this.renderer.load_texture(image)

        const iw=image.width
        const ih=image.height

        for(const [id,data] of Object.entries(json.frames)){
            if(callback)callback(data.src)
            const rect={
                min:v2(data.x/iw,1-((data.y+data.h)/ih)),
                max:v2((data.x+data.w)/iw,1-(data.y/ih)),
            }
            const frame=this.create_frame(texture,rect,data.src??id)
            frame.id=prefix+id
            frame.group=group
            frame.frame_rect={
                min:v2(data.x,data.y),
                max:v2(data.x+data.w,data.y+data.h)
            }
            frame.frame_size=v2(data.w/json.meta.scale,data.h/json.meta.scale)
            this.frames[frame.id]=frame
        }
    }
    async load_kspr(kspr:KSPR,resolution:string,group:string="",prefix:string="",callback?:(item:string)=>void){
        const res=kspr.resolutions[resolution]
        for(const atlas of res.atlases){
            const blob=new Blob([atlas.image as BlobPart])
            const url=URL.createObjectURL(blob)
            const image=await this.load_image(url)
            URL.revokeObjectURL(url)
            const texture=this.renderer.load_texture(image)
            const iw=image.width
            const ih=image.height
            for(const [id,data] of Object.entries(atlas.frames)){
                if(callback)callback(data.src)
                const rect={
                    min:v2(data.x/iw,1-((data.y+data.h)/ih)),
                    max:v2((data.x+data.w)/iw,1-(data.y/ih)),
                }

                const frame=this.create_frame(texture,rect,data.src??id)
                frame.image=image
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
    async render_text(text: string, size = 32, color = "white", font = "Arial",max_width?: number,line_height:number=1){
        const canvas = this.canvas
        const ctx = this.ctx

        ctx.font = `${size}px ${font}`
        const lines: string[] = []

        const pushWord = (word: string) => {
            if (!max_width || ctx.measureText(word).width <= max_width) {
                return [word]
            }
            const result: string[] = []
            let current = ""

            for (const ch of word) {
                const test = current + ch

                if (ctx.measureText(test).width <= max_width || current.length === 0) {
                    current = test
                } else {
                    result.push(current)
                    current = ch
                }
            }

            if (current.length > 0) {
                result.push(current)
            }

            return result
        }

        if (max_width === undefined) {
            lines.push(...text.split("\n"))
        } else {
            for (const paragraph of text.split("\n")) {
                let line = ""
                for (const originalWord of paragraph.split(" ")) {
                    const words = pushWord(originalWord)
                    for (const word of words) {
                        if (line.length === 0) {
                            line = word
                            continue
                        }
                        const test = line + " " + word
                        if (ctx.measureText(test).width <= max_width) {
                            line = test
                        } else {
                            lines.push(line)
                            line = word
                        }
                    }
                }
                lines.push(line)
            }
        }
        let width = 0
        for (const line of lines) {
            width = Math.max(width, ctx.measureText(line).width)
        }
        canvas.width = Math.max(1,Math.ceil(max_width ?? width))

        const lineHeight = size * line_height
        canvas.height = Math.max(1,Math.ceil(lines.length * lineHeight))

        ctx.font = `${size}px ${font}`
        ctx.fillStyle = color
        ctx.textBaseline = "top"

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], 0, i * lineHeight)
        }

        return await this.load_frame_from_canvas(canvas)
    }
    load_frame_from_canvas(canvas:HTMLCanvasElement){
        const image=new Image()
        const src=canvas.toDataURL()
        return new Promise<Frame>((resolve)=>{
            image.onload=()=>{
                const texture=this.renderer.load_texture(image)
                const frame=this.create_frame(texture,{min:v2.zero(),max:v2.one()})
                resolve(frame)
            }
            image.src=src
        })
    }
    get_frame(id:string):Frame{
        if(!this.frames[id]){
            if(this.default_frame_enabled){
                return this.default_frame
            }
        }
        return this.frames[id]
    }
    get_sound(id:string):Sound{
        const sound=this.sounds[id]
        return sound
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
    }
    clear(blacklist:string[]=[]){
        for(const r of Object.keys(this.frames)){
            if(blacklist.includes(r)||blacklist.includes(this.frames[r].group))continue
            this.unload_frame(r)
        }
        for(const r of Object.keys(this.sounds)){
            if(blacklist.includes(r)||blacklist.includes(this.sounds[r].group))continue
            this.unload_sound(r)
        }
    }

    async load_json(path:string,callback?:(msg:string)=>void):Promise<any>{
        callback?.(path)
        return await(await fetch(path)).json()
    }
}