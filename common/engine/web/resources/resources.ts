import { AKeyFrame } from "../../core/definition/definitions.ts";
import { KSPR } from "../../core/lang/kspr.ts"
import { Rect } from "../../core/math/geometry.ts";
import { v2, Vec2 } from "../../core/math/vec2.ts"
import { type Renderer, type Texture } from "../rendering/renderer.ts"
import { type AudioEngine } from "./sounds.ts";
export interface SourceBase{
    id:string
    src:string
}
export interface SoundDef {
    src:string
    volume?:number
    slice?:SoundSlice
}
export interface SoundSlice{
    start:number
    duration:number
}
export interface Sound extends SourceBase{
    volume:number
    buffer:AudioBuffer
    slice?:SoundSlice
}
export interface Animation extends SourceBase{
    keyframes:AKeyFrame[]
}
export class Frame implements SourceBase{
    id:string=""
    src:string=""
    url:string=""
    blob?:Blob
    blob_created?:boolean

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
        if(this.blob&&this.blob_created)URL.revokeObjectURL(this.url)
    }
}

export type Source=Frame|Sound|Animation
export class ResourcesManager {
    // Sources
    imported:Record<string,{frames:string[],sounds:string[]}>={}
    frames:Record<string,Frame>={}
    sounds:Record<string,Sound>={}
    animations:Record<string,Animation>={}

    blobs:Record<string,{blob:Blob,url:string,group:string}>={}

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
            this.default_frame=frame
        }

        image.src=canvas.toDataURL()
    }

    async load_source(id:string,src:string,volume:number=1,callback?:(msg:string)=>void):Promise<Source|undefined>{
        if(src.endsWith(".svg")||src.endsWith(".png")){
            //return await this.load_frame(id,src,group,callback)
        }else if(src.endsWith(".mp3")||src.endsWith(".wav")){
            return await this.load_sound(id,{src:src,volume:volume},callback)
        }else if(src.endsWith(".kanim")){
            return await this.load_animation(id,src,callback)
        }
        return undefined
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
        frame.url=src

        return frame
    }
    async parse_kspr(kspr:KSPR,resolution:string,imported:string="",callback?:(item:string)=>void){
        if(imported&&!this.imported[imported])this.imported[imported]={frames:[],sounds:[]}
        const res=kspr.sheets[resolution]
        /*for(const asset of kspr.assets) {
            if(asset.type !== "text")continue
            if(!asset.path.endsWith(".svg"))continue
            const blob = new Blob([asset.content],{type:"image/svg+xml"})
            this.blobs[asset.id]={
                blob,
                url:URL.createObjectURL(blob),
                group
            }
        }*/
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
                frame.id=id
                frame.url=frame.src
                frame.frame_rect={
                    min:v2(data.x,data.y),
                    max:v2(data.x+data.w,data.y+data.h)
                }
                frame.frame_size=v2(
                    data.w/res.scale,
                    data.h/res.scale
                )
                if(this.blobs[frame.id]){
                    frame.blob=this.blobs[frame.id].blob
                    frame.url=this.blobs[frame.id].url
                }
                this.frames[frame.id]=frame
                if(this.imported[imported])this.imported[imported].frames.push(frame.id)
            }
        }
        for(const v in kspr.audios){
            const s=kspr.audios[v]
            const sound:Sound={
                buffer:await this.audio.ctx.decodeAudioData((s.audio??new Uint8Array()).buffer as ArrayBuffer),
                id:"audio_buffer_"+v,
                src:"audio_buffer_"+v,
                volume:1
            }
            for(const sd of s.sounds){
                callback?.(sd.name)
                this.sounds[sd.name] = {
                    id:sd.name,
                    src:sound.src,
                    volume:sound.volume,
                    buffer:sound.buffer,
                    slice:{
                        start:sd.startSample/s.sampleRate,
                        duration:sd.sampleCount/s.sampleRate,
                    }
                }
                if(this.imported[imported])this.imported[imported].sounds.push(sd.name)
            }
        }
    }
    async load_sound(id:string,def:SoundDef,callback?:(msg:string)=>void){
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
            slice:def.slice
        }

        this.sounds[id]=sound

        return sound
    }
    async load_animation(id:string,keyframes:AKeyFrame[]|string,callback?:(item:string)=>void):Promise<Animation>{
        let path=""
        if(typeof keyframes==="string"){
            path=keyframes
            keyframes=(await this.load_json(keyframes,callback)) as AKeyFrame[]
        }
        this.animations[id]={
            id:id,
            src:path,
            keyframes:keyframes,
        }
        return this.animations[id]
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
    get_animation(id:string):Animation{
        const animation=this.animations[id]
        return animation
    }

    unload_frame(id:string){
        const frame=this.frames[id]
        if(!frame)return
        frame.free()
        delete this.frames[id]
    }
    unload_sound(id:string){
        if(!this.sounds[id])return
        delete this.sounds[id]
    }
    unload_animation(id:string){
        const animation=this.animations[id]
        if(!animation)return
        delete this.animations[id]
    }
    unload_blob(blob:string){
        if(!this.blobs[blob])return
        URL.revokeObjectURL(this.blobs[blob].url)
        delete this.blobs[blob]
    }
    unload_imported(imported:string){
        for(const v of this.imported[imported].frames){
            this.unload_frame(v)
        }
        for(const v of this.imported[imported].sounds){
            this.unload_sound(v)
        }
        delete this.imported[imported]
    }
    clear(){
        for(const r of Object.keys(this.frames)){
            this.unload_frame(r)
        }
        for(const r of Object.keys(this.sounds)){
            this.unload_sound(r)
        }
        for(const r of Object.keys(this.animations)){
            this.unload_sound(r)
        }
        for(const r of Object.keys(this.blobs)){
            this.unload_blob(r)
        }
    }

    async load_json(path:string,callback?:(msg:string)=>void):Promise<any>{
        callback?.(path)
        return await(await fetch(path)).json()
    }
}