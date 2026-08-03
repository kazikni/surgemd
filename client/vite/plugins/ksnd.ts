import path from "node:path";
import { Plugin } from "vite";
import { audios, AudioSheet } from "../../../common/engine/core/lang/audiosheet.ts";
import { NodeFileManager } from "../../../common/engine/nodejs/file.ts";
import { FFmpegDecoder,FFmpegEncoder } from "../../../common/engine/nodejs/audio.ts";
import { Stream, DynamicStream } from "../../../common/engine/core.ts";
const PLUGIN_NAME = "vite-ksnd";

export interface KSNDConfig{
    input:string;
    output:string
    codec?:string
}

interface CompileOutput{sheet:AudioSheet,stream:Stream}
async function compile(config: KSNDConfig):Promise<CompileOutput>{
    console.log(`Compiling ${config.output+(config.codec??".ogg")}`);
    const fs = new NodeFileManager();

    const decoder = new FFmpegDecoder();
    const encoder = new FFmpegEncoder();

    const sheet = await audios.compile_group(
        fs,
        decoder,
        encoder,
        config.input
    )

    const stream:Stream=new DynamicStream();
    audios.write_definitions(stream, sheet);
    return {sheet,stream}
}

export function KSND(configs:KSNDConfig[]):Plugin[]{
    const files = new Map<string, Uint8Array>()
    async function rebuild() {
        files.clear()
        for (const cfg of configs) {
            try {
                const out = await compile(cfg)
                files.set((cfg.output + (cfg.codec ?? ".ogg")),out.sheet.audio)
                files.set((cfg.output + ".ksnd"),out.stream.data.slice(0, out.stream.length))
            } catch (err) {
                console.error(`[${PLUGIN_NAME}] ${cfg.input}`)
                console.error(err)
            }
        }
        console.log(`[${PLUGIN_NAME}] Builded`)
    }
    return [
        {
            name:`${PLUGIN_NAME}:build`,
            apply:"build",
            async buildStart(){
                await rebuild()
                for(const file of files.keys()){
                    this.emitFile({
                        type:"asset",
                        fileName:file,
                        source:files.get(file)!
                    })
                }
                
            }
        },
        {
            name: `${PLUGIN_NAME}:serve`,
            apply: "serve",
            async configureServer(server) {
                await rebuild()
                server.middlewares.use((req, res, next) => {
                    if(!req.url)return next()
                    const url=req.url.split("?")[0] 
                    const file=files.get(url.substring(1))
                    if (!file)return next()
                    if (url.endsWith(".ogg")) {
                        res.setHeader("Content-Type", "audio/ogg")
                    } else if (url.endsWith(".ksnd")) {
                        res.setHeader("Content-Type", "application/octet-stream")
                    }
                    res.setHeader("Cache-Control", "no-cache")
                    res.end(Buffer.from(file))
                })
            }
        }
    ];
}