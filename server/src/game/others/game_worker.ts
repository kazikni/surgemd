import { GameConfig, GameServerConfig } from "common/scripts/config/config.ts"
import { Game, GameData } from "./game.ts"
import { WorkerMessageBase } from "common/engine/deno.ts"
import { ClientsManager, FileManager, PacketsManager, random } from "common/engine/core.ts"
import { ConnectionLimiter, SelfGameWorker } from "common/engine/server/mod.ts"
import { server_factory } from "common/engine/server/server.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
export type WorkerMessage=WorkerMessageBase<GameConfig,GameData,GameServerConfig>&({

})
export class App extends SelfGameWorker<Game,GameData,GameConfig,GameServerConfig>{
    fs:FileManager
    constructor(factory:server_factory,clients_factory:new(packet:PacketsManager)=>ClientsManager,fs:FileManager){
        super(factory,new clients_factory(PacketManager))
        this.fs=fs
    }
    protected override onBegin(): void {
        this.limiter = new ConnectionLimiter(this.config.limiter)
        if(this.limiter.config.enabled){
            this.limiter.start()
        }
        this.server!.route("/api/ws",this.clients_manager.handler())
    }
    protected override async create_game(config?: GameConfig): Promise<Game> {
        const game=new Game(this.config,this.clients_manager,this.fs)
        game.signals.on("stop",()=>{
            //this.free_worker()
        })
        game.string_id=random.code(20)
        await game.auto_init(config!)
        return game
    }
}