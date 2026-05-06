#!/usr/bin/env -S deno run --allow-read --allow-write

import { load_kspr } from "../../engine/core.ts";

function ensureDir(path: string) {
    try {
        Deno.mkdirSync(path, { recursive: true })
    } catch {}
}
function writeFile(path: string, data: Uint8Array | string) {
    if (typeof data === "string") {
        Deno.writeTextFileSync(path, data)
    } else {
        Deno.writeFileSync(path, data)
    }
}

function parseArgs() {
    const args = Deno.args
    if (args.length < 2) {
        Deno.exit(1)
    }
    return {
        input: args[0],
        output: args[1]
    }
}

async function main() {
    const { input, output } = parseArgs()

    console.log("Reading:", input)

    const buffer = await Deno.readFile(input)
    const kspr = load_kspr(buffer.buffer)

    ensureDir(output)

    for (const [resName, res] of Object.entries(kspr.resolutions)) {

        const resDir = `${output}/${resName}`
        ensureDir(resDir)

        console.log(`Resolution: ${resName}`)

        let atlasIndex = 0

        for (const atlas of res.atlases) {

            const atlasName = `atlas_${atlasIndex}`

            const imgPath = `${resDir}/${atlasName}.png`
            const jsonPath = `${resDir}/${atlasName}.json`

            writeFile(imgPath, atlas.image)
            writeFile(jsonPath, JSON.stringify({
                scale: res.scale,
                image: `${atlasName}.png`,
                frames: atlas.frames
            }, null, 2))

            console.log(`  -> ${atlasName}.png + .json`)

            atlasIndex++
        }
    }

    console.log("Done.")
}

main()

//deno run -A common/programs/kspx/main.ts client\dist\assets\main.kspr dist