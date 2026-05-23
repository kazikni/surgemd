import { NetStream } from "../net/stream.ts";
export interface FrameData {
    x: number
    y: number
    w: number
    h: number
    src:string
}
export interface KSPRAtlas {
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
export function write_kspr(data: KSPR, stream?: NetStream): NetStream {
    const s = stream ?? new NetStream(new ArrayBuffer(10_000_000))
    // HEADER
    s.writeStringSized(5, ".KSPR")
    s.writeUint8(1)
    const resolutions = Object.entries(data.resolutions)
    s.writeUint8(resolutions.length)
    for (const [resolutionName, res] of resolutions) {
        s.writeString(resolutionName)
        s.writeFloat32(res.scale)
        s.writeUint16(res.atlases.length)
        for (const atlas of res.atlases) {
            // imagem
            s.writeUint32(atlas.image.length)
            s._u8Array.set(atlas.image, s.index)
            s.index += atlas.image.length
            // frames
            const entries = Object.entries(atlas.frames)
            s.writeUint16(entries.length)
            for (const [id, f] of entries) {
                s.writeString(id)
                s.writeString(f.src,2)
                s.writeUint16(f.x)
                s.writeUint16(f.y)
                s.writeUint16(f.w)
                s.writeUint16(f.h)
            }
        }
    }

    return s
}
export function load_kspr(buffer: ArrayBuffer): KSPR {
    const stream = new NetStream(buffer)
    const magic = stream.readStringSized(5)
    if (magic !== ".KSPR") throw "Invalid file"
    const version = stream.readUint8()
    const resCount = stream.readUint8()
    const out: KSPR = {
        resolutions: {}
    }
    for (let r = 0; r < resCount; r++) {
        const resName = stream.readString()
        const scale = stream.readFloat32()
        const atlasCount = stream.readUint16()
        const atlases: KSPRAtlas[] = []
        for (let a = 0; a < atlasCount; a++) {
            // imagem
            const imgSize = stream.readUint32()
            const imgBytes = new Uint8Array(buffer, stream.index, imgSize)
            stream.index += imgSize
            // frames
            const frameCount = stream.readUint16()
            const frames: Record<string, any> = {}
            for (let i = 0; i < frameCount; i++) {
                const id = stream.readString()
                const src = stream.readString(2)
                const x = stream.readUint16()
                const y = stream.readUint16()
                const w = stream.readUint16()
                const h = stream.readUint16()
                frames[id] = {src,x,y,w,h}
            }
            atlases.push({
                image: new Uint8Array(imgBytes),
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