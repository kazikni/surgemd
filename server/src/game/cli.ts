import { GameServer } from "./others/server.ts"
import { loadConfigDeno } from "../../configs/config.ts"
import {
    HostConfig,
} from "common/engine/core.ts"

import {
    ClientsManager,
    DenoFileManager,
    Server
} from "common/engine/server.ts"

import { Game } from "./others/game.ts"
import { PacketManager } from "common/scripts/packets/packet_manager.ts"
import { ConfigType,ZeroConfig } from "common/scripts/config/config.ts";
import { SMDModManager } from "./others/mod_manager.ts";

type MainCommand = "start" | "status" | "help"
type StartTarget = "game" | "server"

function newServerFromHC(hc: HostConfig): Server {
    return new Server(hc.port, hc.https, hc.cert, hc.key)
}

function parseArgs(args: string[]) {
    const flags: Record<string, string | boolean> = {}
    const positional: string[] = []

    for (let i = 0; i < args.length; i++) {
        const a = args[i]

        if (a.startsWith("--")) {
            const key = a.slice(2)
            const next = args[i + 1]

            if (!next || next.startsWith("--")) {
                flags[key] = true
            } else {
                flags[key] = next
                i++
            }
        } else {
            positional.push(a)
        }
    }

    return {
        cmd: positional[0] as MainCommand,
        target: positional[1] as StartTarget | undefined,
        flags
    }
}

function banner() {
    console.log("Surgemd CLI")
    console.log("────────────────────────────")
}

async function startServer(flags: Record<string, string | boolean>) {
    const configPath = (flags.config as string) ?? "../config.json"
    const config = loadConfigDeno(configPath)

    if (!config.game.host) {
        console.error("Host configuration not found in config file")
        return
    }

    const hc = { ...config.game.host }

    if (flags.port) hc.port = Number(flags.port)
    if (flags.https) hc.https = true

    const server = new GameServer(newServerFromHC(hc), config)

    console.log("Starting official server")
    console.log("Port:", hc.port)
    console.log("HTTPS:", hc.https ? "enabled" : "disabled")
    console.log("────────────────────────────")

    await server.run()
}

async function startGame(flags: Record<string, string | boolean>) {
    const port = Number(flags.port ?? 8080)
    const mode = (flags.mode as string) ?? "normal"
    const mode_settings = flags["mode-settings"]?JSON.parse(flags["mode-settings"] as string):{}

    const server = new Server(port)
    const clients = new ClientsManager(PacketManager)

    server.route("/api/ws", clients.handler())

    let config:ConfigType
    try{
        const configPath = (flags.config as string) ?? "../config.json"
        config = loadConfigDeno(configPath)
    }catch{
        config=ZeroConfig()
    }
    const game = new Game(
        config,
        clients,
        0
    )

    clients.onconnection = game.handle_connection.bind(game)

    const mods:SMDModManager = new SMDModManager(new DenoFileManager())
    mods.stateFile=flags["mods-state"] as string??mods.stateFile
    await mods.loadManifests()
    await mods.initialize(game)
    game.mods=mods

    game.auto_init({mode,mode_settings})

    game.mainloop()
    server.run()

    console.log("Starting sandbox game host")
    console.log("Port:", port)
    console.log("Mode:", mode)
    console.log("Settings:", mode)
    console.log("Mods:", mods.getLoadOrder().length)
    console.log("────────────────────────────")
}

function showHelp() {
    banner()
    console.log("Usage:")
    console.log("deno run cli.ts start <game|server> [options]")
    console.log("")
    console.log("Commands:")
    console.log("  start game      Start sandbox host (single game + mods)")
    console.log("  start server    Start official server mode")
    console.log("  status          Show server status info")
    console.log("  help            Show this help")
    console.log("")
    console.log("Options:")
    console.log("  --config PATH      Config file path")
    console.log("  --port NUMBER      Override port")
    console.log("  --mode NAME        Game mode (sandbox)")
    console.log("  --mode-settings JSON    Mode Settings (sandbox)")
}

async function main() {
    const { cmd, target, flags } = parseArgs([...Deno.args])

    switch (cmd) {
        case "start":
            banner()

            if (target === "server") {
                await startServer(flags)
                return
            }

            if (target === "game") {
                await startGame(flags)
                return
            }

            console.error("Missing target. Use: start game | start server")
            return

        case "status":
            banner()
            console.log("Server runs in foreground.")
            console.log("If this process is active, server is running.")
            return

        case "help":
        default:
            showHelp()
            return
    }
}

if (import.meta.main) {
    main()
}