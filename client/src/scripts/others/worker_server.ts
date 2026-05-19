import { BattleRoyaleSolo, LevelPlayer, OfflineGameServer } from "./offline.ts";
import { ConfigType } from "common/scripts/config/config.ts";
import { OfflineClientsManager, WorkerSocket } from "common/engine/core.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { Maps } from "common/scripts/definitions/maps/base.ts";
let server:OfflineGameServer
let level:LevelPlayer
function logError(e: any){
    if (e instanceof Error) {
        console.error(e.stack)
    } else {
        console.error(e)
    }
}

self.onerror = (ev: ErrorEvent) => logError(ev.error ?? ev.message)
self.onunhandledrejection = (ev) => logError(ev.reason)

self.onmessage = (ev) => {
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
        case "init_level":{
            level=new LevelPlayer(server)
            level.begin(msg.level)
            if(!server.running)server.mainloop()
            break
        }
        case "init_mode":{
            server.init(new BattleRoyaleSolo({
                map:{
                    def:Maps["normal"]
                },
                players:{
                    limit:100,
                }
            }))
            if(!server.running)server.mainloop()
            break
        }
        case "start":{
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
