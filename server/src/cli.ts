import { ClientsManager, CommandDef, ConsoleContext, FileManager, GameConsole, PacketsManager, parseJSONC, StaticStream } from "common/engine/core.ts";
import { KSPRImageFormat,kspr } from "common/engine/core/lang/kspr.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { Game } from "./game/others/game.ts";
import { ConfigType } from "common/scripts/config/config.ts";
import { GameServer } from "./game/others/server.ts";
import { ApiServer } from "./api/server.ts";
import { server_factory } from "common/engine/server/server.ts";

async function saveAtlasPNG(image: Uint8Array,width: number,height: number,format: KSPRImageFormat,output: string,canvas:any,ctx:any,fs:FileManager) {
    canvas.width=width
    canvas.height=height
    ctx.clearRect(0,0,canvas.width,canvas.height)
    switch (format) {
        case KSPRImageFormat.PNG:
        case KSPRImageFormat.JPEG: {
            await fs.write_fileb(output,image)
            return;
        }
        case KSPRImageFormat.RawRGBA: {
            const imgData = new ImageData(new Uint8ClampedArray(image),width,height)
            ctx.putImageData(imgData, 0, 0)
            await fs.write_fileb(output,new Uint8Array(canvas.toBuffer("image/png")))
            return
        }
    }
}
export async function extract_kspr(input:string,output:string,fs:FileManager,canvas:any,ctx:any){
    const buffer=await fs.read_fileb(input) as Uint8Array<ArrayBuffer>;
    const data=kspr.load(new StaticStream(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset + buffer.byteLength)))
    fs.make_dir(output)
    for(const i in data.audios){
        const out = `${output}/audios/audiosheet_${i}`;
        fs.make_dir(`${output}/audios/`)
        if(data.audios[i].audio)await fs.write_fileb(out+"."+data.audios[i].codec,data.audios[i].audio)
    }
    for(const [resName, res] of Object.entries(data.sheets)) {
        const resDir = `${output}/${resName}`
        fs.make_dir(resDir)
        let atlasIndex = 0

        for (const atlas of res.atlases) {
            const atlasName = `atlas_${atlasIndex}`
            const imagePath = `${resDir}/${atlasName}.png`
            const jsonPath = `${resDir}/${atlasName}.json`
            if(atlas.image)await saveAtlasPNG(atlas.image.data,atlas.image.width,atlas.image.height,atlas.image.format,imagePath,canvas,ctx,fs)
            await fs.write_file(
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

export type CMDCTX=ConsoleContext&{
    fs:FileManager
    create_canvas:any
    server:server_factory
    clients_factory:new(packet:PacketsManager)=>ClientsManager
}
export async function main(args:string[],default_worker_file:string,fs:FileManager,create_canvas:any,server:server_factory,clients_factory:new(packet:PacketsManager)=>ClientsManager) {
    const cmd:GameConsole<CMDCTX>=new GameConsole({})
    cmd.register({
        name:"api",
        flags:{},
        childrens:[
            {
                name:"start",
                flags:{
                    "config-file":{type:"string",default:"./config"}
                },
                flags_orden:["config-file"],
                async execute(ctx){
                    ctx.fs.make_dir("database/replays")

                    const txt = await ctx.fs.read_file(ctx.args["config-file"])
                    const config:ConfigType=parseJSONC(txt)
                    const api=new ApiServer(ctx.server,config.api)
                    api.run()
                }
            }
        ]
    })
    cmd.register({
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
                    const server = new ctx.server(ctx.args.port)
                    const clients = new ctx.clients_factory(PacketManager)
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
                        limiter:{
                            enabled:false,
                            maxConnections:5,
                            windowMs:1000,
                        }
                    }, clients,ctx.fs)
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
                name:"start",
                flags:{
                    "config-file":{type:"string",default:"./config"},
                    "worker-file":{type:"string",default:default_worker_file},
                },
                flags_orden:["config-file"],
                async execute(ctx){
                    const txt = await ctx.fs.read_file(ctx.args["config-file"])
                    const config:ConfigType=parseJSONC(txt)
                    const server=new GameServer(ctx.server,ctx.clients_factory,new ctx.server(config.game.host.port,config.game.host.ssl,config.game.host.cert,config.game.host.key),config.game,ctx.args["worker-file"],ctx.fs)
                    server.run()
                }
            },
            /*{
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
            }*/
        ]
    })
    cmd.register({
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
                    const canvas=ctx.create_canvas(200,200)
                    const cctx=canvas.getContext("2d")
                    await extract_kspr(ctx.args.input,ctx.args.output,ctx.fs,canvas,cctx)
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
                    const buffer=await ctx.fs.read_fileb(ctx.args.input) as Uint8Array<ArrayBuffer>
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
    })
    await cmd.run(args,{fs,create_canvas,server,clients_factory})
}