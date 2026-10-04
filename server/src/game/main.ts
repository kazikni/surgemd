import { GameServer } from "./others/server.ts"
import { DenoClientsManager, DenoFileManager, DenoServer } from "common/engine/deno.ts";
import { ConfigType } from "common/scripts/config/config.ts";
import { parseJSONC } from "common/engine/core.ts";

if (import.meta.main) {
    const txt = Deno.readTextFileSync("../config.jsonc")
    const config:ConfigType=parseJSONC(txt)
    const server=new GameServer(DenoServer,DenoClientsManager,new DenoServer(config.game.host.port,config.game.host.ssl,config.game.host.cert,config.game.host.key),config.game,import.meta.filename?.endsWith(".ts")?"../deno/worker.ts":"../deno/worker.js",new DenoFileManager())
    server.run()
}