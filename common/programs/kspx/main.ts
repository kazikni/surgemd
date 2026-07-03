#!/usr/bin/env -S deno run -A

import { createCanvas } from "https://deno.land/x/canvas/mod.ts";
import { load_kspr, KSPRImageFormat } from "../../engine/core.ts";

function ensureDir(path: string) {
    try {
        Deno.mkdirSync(path, { recursive: true });
    } catch {}
}
async function saveAtlasPNG(image: Uint8Array,width: number,height: number,format: KSPRImageFormat,output: string) {
    switch (format) {
        case KSPRImageFormat.PNG:
        case KSPRImageFormat.JPEG: {
            await Deno.writeFile(output, image);
            return;
        }
        case KSPRImageFormat.RawRGBA: {
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext("2d");
            const imgData = new ImageData(
                new Uint8ClampedArray(image),
                width,
                height
            );
            ctx.putImageData(imgData, 0, 0);
            await Deno.writeFile(
                output,
                new Uint8Array(canvas.toBuffer("image/png"))
            );
            return;
        }
    }
}
export async function extract_kspr(input:string,output:string){
    const buffer = await Deno.readFile(input);
    const kspr = load_kspr(
        buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
        )
    )
    ensureDir(output);
    for (const [resName, res] of Object.entries(kspr.resolutions)) {
        const resDir = `${output}/${resName}`;
        ensureDir(resDir);
        let atlasIndex = 0;

        for (const atlas of res.atlases) {
            const atlasName = `atlas_${atlasIndex}`;

            const imagePath = `${resDir}/${atlasName}.png`;
            const jsonPath = `${resDir}/${atlasName}.json`;

            await saveAtlasPNG(
                atlas.image,
                atlas.width,
                atlas.height,
                atlas.format,
                imagePath
            );

            await Deno.writeTextFile(
                jsonPath,
                JSON.stringify({
                    scale: res.scale,
                    image: `${atlasName}.png`,
                    frames: atlas.frames
                }, null, 2)
            );
            console.log(`Extracted ${resName}/${atlasName}`);
            atlasIndex++;
        }
    }
}
function main() {
    const args=Deno.args
    if(args[0]==="extract"){
        extract_kspr(args[1],args[3])
    }
}

main();

// deno run -A common/programs/kspx/main.ts client\dist\assets\main.kspr dist
// deno run -A common/programs/kspx/main.ts extract client\dist\assets\normal.kspr -o client\dist\assets\out