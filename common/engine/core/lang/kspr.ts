import { type FileManager } from "../definition/file.ts";
import { RectPacker } from "../math/geometry.ts";
import { Path } from "../math/utils.ts";
import { DynamicStream, Stream } from "../net/stream.ts";
import { audios, AudioSheet,AudioDecoder,AudioEncoder } from "./audiosheet.ts";
export enum KSPRImageFormat {
    RawRGBA = 0,
    PNG = 1,
    JPEG = 2,
}
export interface FrameData {
    x: number
    y: number
    w: number
    h: number
    src:string
}
export interface KSPRAtlas {
    image?: {
        format: KSPRImageFormat
        width:number
        height:number
        data:Uint8Array
    }
    frames: Record<string, FrameData>
}
export interface KSPRSheet {
    scale: number
    atlases: KSPRAtlas[]
}
export interface KSPRResolutionDefinition{name:string,scale:number}
export interface KSPRDefinition{
    save_assets?:boolean
    sprites:{dir:string,base?:string}[]
    resolutions?:{name:string,scale:number}[]
    audios?:string[]

    output_format?:string
    margin?:number
    remove_extensions?:boolean
    maximum_size?: number
}
export type KSPR_Asset=({
    type:"null"
}|{
    type:"text",
    content:string
})&{
    id:string
    path:string
}
export interface KSPR {
    assets:KSPR_Asset[]
    sheets:Record<string, KSPRSheet>
    audios:AudioSheet[]
    sections:Record<string,Uint8Array>
}

export const kspr={
    is_image(img:string):boolean{
        return img.endsWith(".png")||img.endsWith(".svg")||img.endsWith(".webp")
    },
    async compile(def:KSPRDefinition,fs:FileManager,audio_decoder:AudioDecoder,audio_encoder:AudioEncoder,canvas:any,ctx:any,image_loader:(path:string)=>any):Promise<KSPR>{
        const outputFormat=def.output_format??"png"
        const margin=def.margin??8
        const removeExtensions=def.remove_extensions??true
        const maximumSize=def.maximum_size??2048

        const kspr:KSPR=this.zero()
        const sprites_file:[string,string][]=[]

        for(const f of def.sprites){
            for(const p of await fs.list_dir_recursive(f.dir,f.base)){
                if(this.is_image(p))sprites_file.push([Path.join_simple(f.base??"",p),p])
            }
        }
        // Compile KSPR
        const images: { image: any, path: string,id:string }[] = []
        for (const file of sprites_file) {
            let id = Path.basename(file[0])
            if(removeExtensions) {
                id = id.split(".").slice(0, -1).join("")
            }
            let src = file[1]
            if (!src.startsWith("/"))src="/"+src
            images.push({
                image:await image_loader(file[0]),
                path:src,
                id
            })
            if(def.save_assets){
                if(file[0].endsWith(".svg")){
                    kspr.assets.push({
                        type:"text",
                        id,
                        path:src,
                        content:(await fs.read_file(file[1])).toString()
                    })
                }
            }
        }
        images.sort((a, b)=>(b.image.width * b.image.height)-(a.image.width * a.image.height))
        for(const res of def.resolutions??[]){
            const packer = new RectPacker<typeof images[0]>(Math.floor(maximumSize * res.scale),Math.floor(maximumSize * res.scale),margin)
            for(const img of images){
                packer.add(Math.ceil(img.image.width * res.scale),Math.ceil(img.image.height * res.scale),img)
            }
            const atlases=[]
            for (const bin of packer.bins) {
                canvas.width=bin.width
                canvas.height=bin.height
                ctx.clearRect(0,0,canvas.width,canvas.height)
                const frames: Record<string, any> = {}
                for (const rect of bin.rects) {
                    const data = rect.data
                    ctx.drawImage(
                        data.image,
                        rect.x,
                        rect.y,
                        rect.w,
                        rect.h
                    )
                    frames[data.id] = {
                        src:data.path,
                        x: rect.x,
                        y: rect.y,
                        w: rect.w,
                        h: rect.h
                    }
                }

                let buffer = canvas.toBuffer?.("image/png")
                if(!buffer){
                    const blob = await new Promise<Blob>((resolve) => {
                        canvas.toBlob(resolve, "image/png")!
                    })
                    buffer=await blob.arrayBuffer()
                }
                atlases.push({
                    image:{
                        data:new Uint8Array(buffer),
                        width:bin.width,
                        height:bin.height,
                        format:KSPRImageFormat.PNG,
                    },
                    frames,
                })
            }
            kspr.sheets[res.name] = {
                scale: res.scale,
                atlases,
            }
        }

        // Build Audios
        for(const path of def.audios??[]){
            console.log(`Compiling ${path}`)
            const sheet = await audios.compile_group(fs,audio_decoder,audio_encoder,path)
            kspr.audios.push(sheet)
        }
        return kspr
    },

    zero():KSPR{
        return {
            assets:[],
            sheets:{},
            audios:[],
            sections:{}
        }
    },
    write(data: KSPR, stream: Stream){
        // HEADER
        stream.write_string_sized(".KSPR",5)
        stream.write_uint8(4)
        stream.write_array(data.assets,(i)=>{
            stream.write_string(i.id,1)
            stream.write_string(i.path,1)
            switch(i.type){
                case "text":
                    stream.write_uint8(0)
                    stream.write_string(i.content,4)
                    break
            }
        },2)
        stream.write_string_dict(data.sections,(i)=>{
            stream.write_uint32(i.length)
            stream.write_bytes(i)
        },1,1)
        stream.write_array(data.audios,(v)=>audios.write(v,stream),1)
        stream.write_array(Object.entries(data.sheets),(v)=>{
            stream.write_string(v[0])
            stream.write_float32(v[1].scale)
            stream.write_uint16(v[1].atlases.length)
            for (const atlas of v[1].atlases) {
                // imagem
                stream.write_boolean_group(atlas.image!==undefined)
                if(atlas.image){
                    stream.write_uint8(atlas.image.format)
                    stream.write_uint16(atlas.image.width)
                    stream.write_uint16(atlas.image.height)
                    stream.write_uint24(atlas.image.data.length)
                    stream.write_bytes(atlas.image.data)
                }
                // frames
                const entries = Object.entries(atlas.frames)
                stream.write_uint16(entries.length)
                for (const [id, f] of entries) {
                    stream.write_string(id)
                    stream.write_string(f.src,2)
                    stream.write_uint16(f.x)
                    stream.write_uint16(f.y)
                    stream.write_uint16(f.w)
                    stream.write_uint16(f.h)
                }
            }
        },1)
    },
    load(stream:Stream): KSPR {
        const magic = stream.read_string_sized(5)
        if (magic !== ".KSPR") throw "Invalid KSPR file"
        const version = stream.read_uint8()
        const out: KSPR = this.zero()
        out.assets=stream.read_array(()=>{
            const id=stream.read_string(1)
            const path=stream.read_string(1)
            const tp=stream.read_uint8()
            switch(tp){
                case 0:
                    return {
                        type:"text",
                        path,
                        id,
                        content:stream.read_string(4)
                    }
            }
            return {
                type:"null",
                id,
                path
            }
        },2) as KSPR_Asset[]
        out.sections=stream.read_string_dict((v)=>{
            const size=v.read_uint32()
            return stream.read_bytes(size,true)
        })
        stream.read_array(()=>{
            out.audios.push(audios.read(stream))
        },1)
        stream.read_array(()=>{
            const resName = stream.read_string()
            const scale = stream.read_float32()
            const atlasCount = stream.read_uint16()
            const atlases: KSPRAtlas[] = []
            for (let a = 0; a < atlasCount; a++) {
                // imagem
                const [has_image]=stream.read_boolean_group()
                let img:any
                if(has_image){
                    const format = stream.read_uint8()
                    const width = stream.read_uint16()
                    const height = stream.read_uint16()
                    const imgSize = stream.read_uint24()
                    const data = stream.read_bytes(imgSize,true)
                    img={
                        format,
                        width,
                        height,
                        data:data
                    }
                }
                // frames
                const frameCount = stream.read_uint16()
                const frames: Record<string, any> = {}
                for (let i = 0; i < frameCount; i++) {
                    const id = stream.read_string()
                    const src = stream.read_string(2)
                    const x = stream.read_uint16()
                    const y = stream.read_uint16()
                    const w = stream.read_uint16()
                    const h = stream.read_uint16()
                    frames[id] = {src,x,y,w,h}
                }
                atlases.push({
                    frames,
                    image:img
                })
            }
            out.sheets[resName] = {
                scale,
                atlases
            }
        },1)

        return out
    },

    disassemble(val:KSPR,settings_name="settings.json",sound_name="sounds/${i}.ksnd",sheet_name="sheets/sheet_${r}.${e}"/*"sheets/sheet_${r}${n}.${e}"*/):Record<string,Uint8Array>{
        const stream=new DynamicStream(2000)
        const ret:Record<string,Uint8Array>={}
        for(let i=0;i<val.audios.length;i++){
            stream.clear()
            audios.write(val.audios[i],stream)
            ret[sound_name.replaceAll("${i}",(i+1).toString())]=stream.data.slice(0,stream.length)
        }
        for(const s in val.sheets){
            const nkspr:KSPR=this.zero()
            nkspr.sheets[s]=val.sheets[s]
            stream.clear()
            this.write(nkspr,stream)

            const res_name=sheet_name.replaceAll("${r}",(s).toString())
            ret[res_name.replaceAll("${e}","kspr")]=stream.data.slice(0,stream.length)
            /*const res_name=sheet_name.replaceAll("${r}",(s).toString())
            let i=0
            for(const v of nkspr.sheets[s].atlases){
                const name=res_name.replaceAll("${n}","_"+(i+1).toString())
                if(v.image)ret[name.replaceAll("${e}","png")]=v.image.data
                ret[name.replaceAll("${e}","json")]=Stream.encoder.encode(JSON.stringify({frames:v.frames,scale:nkspr.sheets[s].scale}))
                i++
            }*/
        }
        ret[settings_name]=Stream.encoder.encode(JSON.stringify({
            files:Object.keys(ret)
        }))
        return ret
    }
}