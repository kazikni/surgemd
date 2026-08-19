import { DynamicStream, StaticStream, Stream } from "../net/stream.ts";
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
    format: KSPRImageFormat
    width:number
    height:number
    image: Uint8Array
    frames: Record<string, FrameData>
}
export interface KSPRResolution {
    scale: number
    atlases: KSPRAtlas[]
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
    resolutions: Record<string, KSPRResolution>
}
export function write_kspr(data: KSPR, stream?: Stream): Stream {
    const s = stream ?? new DynamicStream()
    // HEADER
    s.write_string_sized(".KSPR",5)
    s.write_uint8(3)
    s.write_array(data.assets,(i)=>{
        s.write_string(i.id,1)
        s.write_string(i.path,1)
        switch(i.type){
            case "text":
                s.write_uint8(0)
                s.write_string(i.content,4)
                break
        }
    },2)
    s.write_array(Object.entries(data.resolutions),(v)=>{
        s.write_string(v[0])
        s.write_float32(v[1].scale)
        s.write_uint16(v[1].atlases.length)
        for (const atlas of v[1].atlases) {
            // imagem
            s.write_uint8(atlas.format)
            s.write_uint16(atlas.width)
            s.write_uint16(atlas.height)
            s.write_uint24(atlas.image.length)
            s.write_bytes(atlas.image)
            // frames
            const entries = Object.entries(atlas.frames)
            s.write_uint16(entries.length)
            for (const [id, f] of entries) {
                s.write_string(id)
                s.write_string(f.src,2)
                s.write_uint16(f.x)
                s.write_uint16(f.y)
                s.write_uint16(f.w)
                s.write_uint16(f.h)
            }
        }
    },1)
    return s
}
export function load_kspr(buffer: ArrayBuffer): KSPR {
    const stream = new StaticStream(buffer)
    const magic = stream.read_string_sized(5)
    if (magic !== ".KSPR") throw "Invalid KSPR file"
    const version = stream.read_uint8()
    const out: KSPR = {
        assets:[],
        resolutions: {},
    }
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
    stream.read_array(()=>{
        const resName = stream.read_string()
        const scale = stream.read_float32()
        const atlasCount = stream.read_uint16()
        const atlases: KSPRAtlas[] = []
        for (let a = 0; a < atlasCount; a++) {
            // imagem
            const format = stream.read_uint8()
            const width = stream.read_uint16()
            const height = stream.read_uint16()
            const imgSize = stream.read_uint24()
            const image = stream.read_bytes(imgSize)
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
                format,
                width,
                height,
                image: new Uint8Array(image),
                frames
            })
        }
        out.resolutions[resName] = {
            scale,
            atlases
        }
    },1)

    return out
}