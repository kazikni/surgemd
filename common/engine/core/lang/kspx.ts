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
export interface KSPR {
    resolutions: Record<string, KSPRResolution>
}
export function write_kspr(data: KSPR, stream?: Stream): Stream {
    const s = stream ?? new DynamicStream()
    // HEADER
    s.write_string_sized(".KSPR",5)
    s.write_uint8(2)
    const resolutions = Object.entries(data.resolutions)
    s.write_uint8(resolutions.length)
    for (const [resolutionName, res] of resolutions) {
        s.write_string(resolutionName)
        s.write_float32(res.scale)
        s.write_uint16(res.atlases.length)
        for (const atlas of res.atlases) {
            // imagem
            s.write_uint8(atlas.format)
            s.write_uint16(atlas.width)
            s.write_uint16(atlas.height)
            s.write_uint32(atlas.image.length)
            s.data.set(atlas.image,s.index)
            s.index += atlas.image.length
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
    }

    return s
}
export function load_kspr(buffer: ArrayBuffer): KSPR {
    const stream = new StaticStream(buffer)
    const magic = stream.read_string_sized(5)
    if (magic !== ".KSPR") throw "Invalid file"
    const version = stream.read_uint8()
    const resCount = stream.read_uint8()
    const out: KSPR = {
        resolutions: {}
    }
    for (let r = 0; r < resCount; r++) {
        const resName = stream.read_string()
        const scale = stream.read_float32()
        const atlasCount = stream.read_uint16()
        const atlases: KSPRAtlas[] = []
        for (let a = 0; a < atlasCount; a++) {
            // imagem
            const format = stream.read_uint8()
            const width = stream.read_uint16()
            const height = stream.read_uint16()
            const imgSize = stream.read_uint32()
            const image = new Uint8Array(buffer,stream.index,imgSize)
            stream.index += imgSize
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
    }
    return out
}