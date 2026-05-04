import path from "node:path";
import { type Plugin } from "vite";
import * as fs from "node:fs";
import readDirectory from "./utils/readDirectory.ts";

const PLUGIN_NAME = "vite-audios-list";

export interface AudioListConfig {
    input: string
    output: string
}

export interface AudioList {
    files: Record<string, string>
}

function generateAudioList(base: string, current: string): string[] {
    const files = readDirectory(base, current);
    return files
        .filter(f => /\.(mp3|ogg|wav|flac)$/i.test(f[0]))
        .map(f => {
            return f[1].replace(/\\/g, "/")
        });
}

export function AudiosLists(
    configs: AudioListConfig[],
    base: string = "public"
): Plugin[] {
    async function buildAll(): Promise<Record<string, AudioList>> {
        const ret: Record<string, AudioList> = {};
        for (const { input, output } of configs) {
            if (!fs.existsSync(base+"/"+input)) {
                console.warn(`[${PLUGIN_NAME}] Input path not found: ${input}`)
                continue
            }

            const audios = generateAudioList(base, input)
            const files: Record<string, string> = {}

            for (const a of audios) {
                const name = path.basename(a).split(".")[0]
                files[name] = "/" + a
            }

            ret[output] = {files}
        }

        return ret;
    }

    return [
        // ======================
        // BUILD
        // ======================
        {
            name: `${PLUGIN_NAME}:build`,
            apply: "build",

            async buildStart() {
                const data = await buildAll();

                for (const fileName of Object.keys(data)) {
                    this.emitFile({
                        type: "asset",
                        fileName,
                        source: JSON.stringify(data[fileName], null, 2)
                    });
                }
            }
        },

        // ======================
        // DEV SERVER
        // ======================
        {
            name: `${PLUGIN_NAME}:serve`,
            apply: "serve",

            async configureServer(server) {
                const files = new Map<string, string>()
                async function rebuild() {
                    const data = await buildAll()
                    files.clear()
                    for (const fileName of Object.keys(data)) {
                        const key = "/" + fileName.replace(/\\/g, "/")

                        files.set(key, JSON.stringify(data[fileName], null, 2))
                    }

                    console.log(`[${PLUGIN_NAME}] dev cache rebuilt`)
                }
                await rebuild()
                server.middlewares.use(async (req, res, next) => {
                    if (!req.url) return next()
                    const url = req.url.split("?")[0]
                    const file = files.get(url)
                    if (!file) return next()
                    res.setHeader("Content-Type", "application/json")
                    res.setHeader("Cache-Control", "no-cache")
                    res.end(file)
                })
            }
        }
    ];
}