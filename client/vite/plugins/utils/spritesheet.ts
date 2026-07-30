import { type Image, createCanvas, loadImage } from "canvas";
import path from "node:path";
import { KSPR, write_kspr,KSPRImageFormat } from "common/engine/core/lang/kspr.ts";
import { RectPacker } from "../../../../common/engine/core/math/geometry.ts";
import readDirectory from "./readDirectory.ts";
import { Minimatch } from "minimatch"
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
export async function buildKSPRGroup(base: string = "",dir: string,resolutions: Resolution[],compilerOpts: CompilerOptions = {
        outputFormat: "png",
        margin: 8,
        removeExtensions: true,
        maximumSize: 2048,
}): Promise<Uint8Array> {
    const images: { image: Image, path: [string, string] }[] = []
    const files = readDirectory(base, dir).filter(x => imagesMatcher.match(x[1]))
    for (const file of files) {
        images.push({
            image: await loadImage(file[0]),
            path: file
        })
    }
    images.sort((a, b) =>
        (b.image.width * b.image.height) -
        (a.image.width * a.image.height)
    )
    const kspr: KSPR = { resolutions: {} }
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
                let name = path.basename(data.path[1])
                if (compilerOpts.removeExtensions) {
                    name = name.split(".").slice(0, -1).join("")
                }
                let src = data.path[1]
                if (!src.startsWith("/")) src = "/" + src
                frames[name] = {
                    src,
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