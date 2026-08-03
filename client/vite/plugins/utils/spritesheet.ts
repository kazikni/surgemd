import { type Image, createCanvas, loadImage } from "canvas";
import path from "node:path";
import { KSPR, write_kspr,KSPRImageFormat } from "../../../../common/engine/core/lang/kspr.ts";
import { RectPacker } from "../../../../common/engine/core/math/geometry.ts";
import readDirectory from "./readDirectory.ts";
import { Minimatch } from "minimatch"
import fs from "node:fs"
export const cacheDir = ".spritesheet-cache";
export type CacheData = {
    lastModified: number
    fileMap: Record<string, string>
    atlasFiles:Record<string,Record<string,string[]>>
}
export const supportedFormats = ["png", "jpeg"] as const;

export interface CompilerOptions {
    outputFormat: typeof supportedFormats[number]
    margin: number
    removeExtensions: boolean
    maximumSize: number
}

const defaultGlob = "**/*.{png,gif,jpg,bmp,tiff,svg}";
const imagesMatcher = new Minimatch(defaultGlob);

export interface Resolution{scale:number,name:string}
export async function buildKSPRGroup(base: string = "",dir: string,resolutions: Resolution[],insert_assets?:boolean,compilerOpts: CompilerOptions = {
    outputFormat: "png",
    margin: 8,
    removeExtensions: true,
    maximumSize: 2048,
}): Promise<Uint8Array> {
    const images: { image: Image, path: string,id:string }[] = []
    const files = readDirectory(base, dir).filter(x => imagesMatcher.match(x[1]))
    const kspr: KSPR = { resolutions: {},assets:[] }
    for (const file of files) {
        let id = path.basename(file[1])
        if (compilerOpts.removeExtensions) {
            id = id.split(".").slice(0, -1).join("")
        }
        let src = file[1]
        if (!src.startsWith("/"))src="/"+src
        images.push({
            image: await loadImage(file[0]),
            path:src,
            id
        })
        if(insert_assets){
            if(file[0].endsWith(".svg")){
                kspr.assets.push({
                    type:"text",
                    id,
                    path:src,
                    content:fs.readFileSync(file[1]).toString()
                })
            }
        }
    }
    images.sort((a, b)=>(b.image.width * b.image.height)-(a.image.width * a.image.height))
    for (const res of resolutions) {
        const packer = new RectPacker<typeof images[0]>(
            Math.floor(compilerOpts.maximumSize * res.scale),
            Math.floor(compilerOpts.maximumSize * res.scale),
            compilerOpts.margin
        )
        for (const img of images) {
            packer.add(
                Math.ceil(img.image.width * res.scale),
                Math.ceil(img.image.height * res.scale),
                img
            )
        }
        const atlases = []
        for (const bin of packer.bins) {
            const canvas = createCanvas(bin.width, bin.height)
            const ctx = canvas.getContext("2d")
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
            const buffer = canvas.toBuffer("image/png")
            atlases.push({
                image: new Uint8Array(buffer),
                frames,
                width:bin.width,
                height:bin.height,
                format:KSPRImageFormat.PNG,
            })
        }
        kspr.resolutions[res.name] = {
            scale: res.scale,
            atlases,
        }
    }
    const stream = write_kspr(kspr)
    return stream.data.slice(0, stream.length)
}