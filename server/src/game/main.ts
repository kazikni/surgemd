import { GameServer } from "./others/server.ts"
import { Server } from "common/engine/server.ts";
import { ConfigType } from "common/scripts/config/config.ts";

if (import.meta.main) {
    const txt = Deno.readTextFileSync("../config.json")
    const config:ConfigType=JSON.parse(txt)
    const server=new GameServer(new Server(config.game.host.port,config.game.host.ssl,config.game.host.cert,config.game.host.key),config.game)
    server.run()
}