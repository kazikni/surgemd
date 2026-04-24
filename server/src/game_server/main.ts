import { GameServer } from "./others/server.ts"
import { loadConfigDeno } from "../../configs/config.ts";
import { Server } from "common/engine/server.ts";
import { HostConfig } from "common/engine/core.ts";

function new_server_from_hc(hc:HostConfig):Server{
    return new Server(hc.port,hc.https,hc.cert,hc.key)
}

// Game Server
async function hostGame(){
    const Config=loadConfigDeno("../config.json")
    if(Config.game.host){
        const server=new GameServer(new_server_from_hc(Config.game.host),Config)
        server.run()
    }
}

if (import.meta.main) {
    await Deno.mkdir("database/replays",{
        recursive:true,
        mode:0o700
    })
    hostGame()
}