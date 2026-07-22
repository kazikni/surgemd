import { GameServer } from "./others/server.ts"
import { Server } from "common/engine/server.ts";
import { ConfigType } from "common/scripts/config/config.ts";
import { parseJSONC, tdm } from "common/engine/core.ts";

if (import.meta.main) {
    const txt = Deno.readTextFileSync("../config.jsonc")
    const config:ConfigType=parseJSONC(txt)
    const server=new GameServer(new Server(config.game.host.port,config.game.host.ssl,config.game.host.cert,config.game.host.key),config.game)
    server.run()
}