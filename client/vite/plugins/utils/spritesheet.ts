import { type Image, createCanvas, loadImage } from "canvas";
import { type IOption, MaxRectsPacker } from "maxrects-packer";
import path from "node:path";
import { KSPR, write_kspr } from "../../../../common/engine/core/lang/kspx.ts";
import readDirectory from "./readDirectory.ts";
import { Minimatch } from "minimatch";
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
    packerOptions: Omit<IOption, "allowRotation">
}

const defaultGlob = "**/*.{png,gif,jpg,bmp,tiff,svg}";
const imagesMatcher = new Minimatch(defaultGlob);

export interface Resolution{scale:number,name:string}
export async function buildKSPRGroup(base:string="",dir: string,resolutions: Resolution[],compilerOpts:CompilerOptions={
    outputFormat: "png",
    margin: 1,
    removeExtensions: true,
    maximumSize: 5000,
    packerOptions: {}
}): Promise<Uint8Array> {
    const images: { image: Image, path: [string,string]}[] = []
    const files=readDirectory(base,dir).filter(x => imagesMatcher.match(x[1]))
    for (const file of files){
        images.push({
            image: await loadImage(file[0]),
            path: file
        })
    }
    const kspr: KSPR = { resolutions: {} }
    for (const res of resolutions) {
        const packer = new MaxRectsPacker(
            compilerOpts.maximumSize * res.scale,
            compilerOpts.maximumSize * res.scale,
            compilerOpts.margin,
            {
                ...compilerOpts.packerOptions,
                allowRotation: false
            }
        )
        for (const img of images) {
            packer.add(
                img.image.width * res.scale,
                img.image.height * res.scale,
                img,
            )
        }
        const atlases = []
        for (const bin of packer.bins) {
            const canvas = createCanvas(bin.width, bin.height)
            const ctx = canvas.getContext("2d")
            const frames: Record<string, any> = {}
            for (const rect of bin.rects) {
                const data = rect.data as { image: Image, path: [string,string] }
                ctx.drawImage(data.image, rect.x, rect.y, rect.width, rect.height)
                let name = path.basename(data.path[1])
                if (compilerOpts.removeExtensions) {
                    name = name.split(".").slice(0, -1).join("")
                }

                let src=data.path[1]
                if(!src.startsWith("/"))src="/"+src
                frames[name] = {
                    src:src,
                    x: rect.x,
                    y: rect.y,
                    w: rect.width,
                    h: rect.height
                }
            }
            const buffer = canvas.toBuffer("image/png")
            atlases.push({
                image: new Uint8Array(buffer),
                frames
            })
        }
        kspr.resolutions[res.name] = {
            scale: res.scale,
            atlases
        }
    }

    const stream = write_kspr(kspr)
    return stream._u8Array.slice(0, stream.length)
}