import { BattleRoyale, LevelPlayer, OfflineGameServer } from "./offline.ts";
import { GameServerConfig } from "common/scripts/config/config.ts";
import { FetchFileManager, OfflineClientsManager, WorkerSocket } from "common/engine/core.ts";
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
    level=new LevelPlayer((e)=>self.postMessage(e),fs)
    await level.begin(server,path)
    self.postMessage({
        type:"server_created"
    })
}
async function manage_message(msg:any):Promise<void>{
    switch(msg.type){
        case "begin":{
            if(server)server.stop()
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
        case "online_message_resolve":{
            if(level)level.online_messsage_resolve?.(msg?.ret)
        }
    }
}
self.onmessage = async(ev) => {
    const msg = ev.data
    manage_message(msg)
};
