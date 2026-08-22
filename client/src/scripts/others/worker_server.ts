import { BattleRoyale, LevelPlayer, OfflineGameServer } from "./offline.ts";
import { GameServerConfig } from "common/scripts/config/config.ts";
import { FetchFileManager, OfflineClientsManager, Path, WorkerSocket } from "common/engine/core.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
let server:OfflineGameServer
let level:LevelPlayer
let fs:FetchFileManager=new FetchFileManager()
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


async function load_level(path:string){
    fs.base=path
    level=new LevelPlayer(server,fs)
    await level.begin(path)
    self.postMessage({
        type:"server_created"
    })
}
self.onmessage = async(ev) => {
    const msg = ev.data
    switch(msg.type){
        case "begin":{
            server=new OfflineGameServer(
                msg.config as GameServerConfig,
                new OfflineClientsManager(PacketManager),
                fs
            );
            break
        }
        case "load_level":{
            load_level(msg.path)
            break
        }
        case "load_mode":{
            server.init(new BattleRoyale({
                map:{
                    def:"normal"
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
        case "next_level":{
            if(!level)break
            if(!(level.def.next_level as Record<string,string>)?.[msg.name]){
                self.postMessage({
                    type:"stop",
                })
                return
            }
            self.postMessage({
                type:"start_level",
                path:Path.join(level.path,(level.def.next_level as Record<string,string>)[msg.name]),
                start_with_intro:msg.start_with_intro
            })
            break
        }
    }
};
