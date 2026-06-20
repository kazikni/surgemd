import { BattleRoyale, LevelPlayer, OfflineGameServer } from "./offline.ts";
import { ConfigType } from "common/scripts/config/config.ts";
import { FetchFileManager, OfflineClientsManager, WorkerSocket } from "common/engine/core.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { Maps } from "common/scripts/definitions/maps/base.ts";
let server:OfflineGameServer
let level:LevelPlayer
function logError(e: unknown): never {
    if (e instanceof Error) {
        throw e
    }
    throw new Error(String(e))
}

self.onerror = (ev: string|Event) => {
    logError(ev)
}
self.onunhandledrejection = (ev) => {
    logError(ev.reason)
}

self.onmessage = async(ev) => {
    const msg = ev.data;
    switch(msg.type){
        case "begin":{
            server=new OfflineGameServer(
                msg.config as ConfigType,
                new OfflineClientsManager(PacketManager),
                0,
            );
            break
        }
        case "load_level":{
            const path="/"+msg.path
            const fs=new FetchFileManager()
            fs.base=path+"/"
            level=new LevelPlayer(server,fs)
            await level.begin(path)
            self.postMessage({
                type:"server_created"
            })
            break
        }
        case "load_mode":{
            server.init(new BattleRoyale({
                map:{
                    def:Maps["normal"]
                },
                players:{
                    limit:100,
                }
            }))
            if(!server.running)server.mainloop()
            self.postMessage({
                type:"server_created"
            })
            break
        }
        case "init":{
            level.init(msg.start_with_intro)
            break
        }
        case "start_game":{
            level.start()
            break
        }
        case "stop":{
            server.stop()
            break
        }
        case "reset_level":{
            level.reset()
            break
        }
        case "connect":{
            const ws=new WorkerSocket(self as unknown as Worker)
            server.clients.fake_connect_other_s(ws)
            break
        }
    }
};
