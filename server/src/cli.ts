import { createCanvas } from "npm:@napi-rs/canvas";
import { CommandDef, DynamicStream, GameConsole, StaticStream } from "common/engine/core.ts";
import { KSPRImageFormat,kspr } from "common/engine/core/lang/kspr.ts";
import { ClientsManager, DenoFileManager, Server } from "common/engine/deno.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { Game } from "./game/others/game.ts";
import { MapTD } from "common/scripts/definitions/maps/base.ts";

function ensureDir(path: string) {
    try {
        Deno.mkdirSync(path, { recursive: true });
    } catch {}
}
async function saveAtlasPNG(image: Uint8Array,width: number,height: number,format: KSPRImageFormat,output: string,canvas:any,ctx:any) {
    canvas.width=width
    canvas.height=height
    ctx.clearRect(0,0,canvas.width,canvas.height)
    switch (format) {
        case KSPRImageFormat.PNG:
        case KSPRImageFormat.JPEG: {
            await Deno.writeFile(output, image);
            return;
        }
        case KSPRImageFormat.RawRGBA: {
            const imgData = new ImageData(new Uint8ClampedArray(image),width,height)
            ctx.putImageData(imgData, 0, 0)
            await Deno.writeFile(output,new Uint8Array(canvas.toBuffer("image/png")))
            return
        }
    }
}
export async function extract_kspr(input:string,output:string){
    const buffer=await Deno.readFile(input);
    const data=kspr.load(new StaticStream(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset + buffer.byteLength)))
    ensureDir(output)
    for(const i in data.audios){
        const out = `${output}/audios/audiosheet_${i}`;
        ensureDir(`${output}/audios/`)
        if(data.audios[i].audio)await Deno.writeFile(out+"."+data.audios[i].codec,data.audios[i].audio)
    }
        const canvas = createCanvas(200,200)
        const ctx = canvas.getContext("2d")
    for(const [resName, res] of Object.entries(data.sheets)) {
        const resDir = `${output}/${resName}`
        ensureDir(resDir)
        let atlasIndex = 0

        for (const atlas of res.atlases) {
            const atlasName = `atlas_${atlasIndex}`
            const imagePath = `${resDir}/${atlasName}.png`
            const jsonPath = `${resDir}/${atlasName}.json`
            await saveAtlasPNG(atlas.image,atlas.width,atlas.height,atlas.format,imagePath,canvas,ctx)
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
export const game_command:CommandDef={
    name:"game",
    flags:{},
    childrens:[
        {
            name:"host",
            flags:{
                "port":{
                    type:"number",
                    default:8000
                },
                "mode":{
                    type:"string",
                    default:"normal"
                },
                "mode-settings":{
                    type:"json"
                },
                "group-size":{
                    type:"int"
                },

                "tps":{
                    type:"number",
                    default:100,
                },
                "ntps":{
                    type:"number",
                    default:32,
                },
                "debug-menu":{
                    type:"boolean",
                    default:true
                }
            },
            async execute(ctx){
                const server = new Server(ctx.args.port)
                const clients = new ClientsManager(PacketManager)
                server.route("/api/ws", clients.handler())
                const game = new Game({
                    host:{
                        port:ctx.args.port,
                    },
                    debug:{
                        debug_menu:ctx.args["debug-menu"]
                    },
                    max_games:1,
                    use_workers:false,
                    tps:ctx.args.tps,
                    ntps:ctx.args.ntps,
                }, clients,new DenoFileManager())
                await game.auto_init({
                    mode:ctx.args.mode,
                    settings:ctx.args["mode-settings"],
                    group_size:ctx.args["group-size"]
                })

                clients.onconnection = game.handle_connection.bind(game)
                game.mainloop()
                server.run()
            }
        },
        {
            name:"map",
            childrens:[
                {
                    name:"compile",
                    flags:{
                        "input":{
                            type:"string"
                        },
                        "output":{
                            type:"string",
                            default:"output.map"
                        }
                    },
                    flags_orden:["input"],
                    async execute(ctx){
                        const module = await import(`file://${Deno.realPathSync(ctx.args.input)}`);
                        const stream=new DynamicStream()
                        if(module.map.generation.callback)module.map.generation.callback=undefined
                        stream.write_string_sized(".MAP",4)
                        .write_uint16(0)
                        .write_td(module.map,MapTD)
                        //.write_any(module.map)
                        await Deno.writeFile(ctx.args.output,stream.data.slice(0,stream.length))
                    }
                }
            ]
        }
    ]
}
export const kspr_command: CommandDef = {
    name: "kspr",
    flags: {},
    childrens: [
        {
            name: "extract",
            flags: {
                input: {
                    type: "string"
                },
                output: {
                    type: "string",
                    default: "./out"
                }
            },
            flags_orden: ["input"],
            async execute(ctx) {
                await extract_kspr(ctx.args.input,ctx.args.output)
            }
        },
        {
            name: "info",
            flags: {
                input: {
                    type: "string"
                }
            },
            flags_orden: [
                "input"
            ],
            async execute(ctx) {
                const buffer=await Deno.readFile(ctx.args.input)
                const data=kspr.load(new StaticStream(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset + buffer.byteLength)))
                ctx.console.log("Resolutions:")
                for (const [name, res] of Object.entries(data.sheets)){
                    ctx.console.log(`- ${name}`)
                    ctx.console.log(`  Scale: ${res.scale}`)
                    ctx.console.log(`  Atlases: ${res.atlases.length}`)
                }
            }
        }
    ]
}
async function main(args:string[]) {
    const cmd=new GameConsole({})
    cmd.register(game_command)
    cmd.register(kspr_command)
    await cmd.run(args)
}
if (import.meta.main) {
    await main(Deno.args)
}

//deno run -A ./server/src/cli.ts kspr extract client/dist/assets/kspr/main.kspr
//deno run -A ./server/src/cli.ts game map compile common/scripts/definitions/maps/tundra.ts
//deno run -A ./server/src/cli.ts audio compile client/public/assets/sounds/game/main