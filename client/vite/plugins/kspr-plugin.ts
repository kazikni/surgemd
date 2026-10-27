import { type Plugin } from "vite";
import { DynamicStream } from "../../../common/engine/core/net/stream.ts";
import { kspr, KSPRDefinition, KSPRResolutionDefinition } from "../../../common/engine/core/lang/kspr.ts";
import { NodeFileManager } from "../../../common/engine/nodejs/file.ts";
import { FFmpegDecoder,FFmpegEncoder } from "../../../common/engine/nodejs/audio.ts";
import { createCanvas, loadImage } from "canvas";
const PLUGIN_NAME = "vite-spritesheet-plugin";

export function kspr_plugin(list: Record<string,KSPRDefinition>,resolutions: KSPRResolutionDefinition[]): Plugin[] {
    async function buildAll() {
        const stream=new DynamicStream(3000)

        const fs=new NodeFileManager()
        const audio_decoder=new FFmpegDecoder()
        const audio_encoder=new FFmpegEncoder()
        const canvas=createCanvas(200,200)
        const ctx=canvas.getContext("2d")

        const outputs: Record<string, Uint8Array> = {}
        for (const [name, sheet] of Object.entries(list)) {
            console.log("Building - ", name)
            const data=await kspr.compile({resolutions:resolutions,...sheet},fs,audio_decoder,audio_encoder,canvas,ctx,loadImage)

            /*
            stream.clear()
            kspr.write(data,stream)
            outputs[name+".kspr"]=stream.data.slice(0,stream.length)
            */

            const disassembled=kspr.disassemble(data)
            for(const v in disassembled){
                outputs[name+"/"+v]=disassembled[v]
            }
        }
        return outputs
    }

    return [
        // ======================
        // BUILD
        // ======================
        {
            name: `${PLUGIN_NAME}:build`,
            apply: "build",
            async generateBundle() {
                const outputs = await buildAll()
                for (const [name, buffer] of Object.entries(outputs)) {
                    this.emitFile({
                        type: "asset",
                        fileName: `${name}`,
                        source: buffer
                    })
                }
            }
        },
        {
            name: `${PLUGIN_NAME}:serve`,
            apply: "serve",
            async configureServer(server) {
                let files: Record<string, Uint8Array> = {}

                async function rebuild() {
                    console.log("Rebuilding atlases...")
                    files = await buildAll()
                    server.ws.send({ type: "full-reload" })
                }

                await rebuild()
                server.middlewares.use((req, res, next) => {
                    if (!req.url) return next()
                    for (const name of Object.keys(files)) {
                        if (req.url === `/${name}`) {
                            res.writeHead(200, {
                                "Content-Type": "application/octet-stream"
                            })
                            res.end(files[name])
                            return
                        }
                    }

                    next()
                })
            },
        }
    ]
}