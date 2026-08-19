import { GameConfig, GameServerConfig } from "common/scripts/config/config.ts"
import { Game, GameData } from "./game.ts"
import { PacketManager } from "common/scripts/packets/packet_manager.ts"
import { ConnectionLimiter, SelfGameWorker } from "common/engine/deno/worker.ts"
import { DenoFileManager, WorkerMessageBase } from "common/engine/deno.ts"
import { FileManager, random } from "common/engine/core.ts"
export type WorkerMessage=WorkerMessageBase<GameConfig,GameData,GameServerConfig>&({

})
class App extends SelfGameWorker<Game,GameData,GameConfig,GameServerConfig>{
    fs:FileManager
    constructor(){
        super(PacketManager)
        this.fs=new DenoFileManager()
    }
    protected override onBegin(): void {
        this.limiter = new ConnectionLimiter({
            enabled: true,
            windowMs: 60_000,
            maxConnections: 5,
        })
        if(this.limiter.config.enabled){
            this.limiter.start()
        }
        this.server!.route("/api/ws",this.clients_manager.handler())
    }
    protected override async create_game(config?: GameConfig): Promise<Game> {
        const game=new Game(this.config,this.clients_manager,this.fs)
        game.signals.on("stop",()=>{
            this.free_worker()
        })
        game.string_id=random.code(20)
        await game.auto_init(config!)
        return game
    }
}

const app=new App()