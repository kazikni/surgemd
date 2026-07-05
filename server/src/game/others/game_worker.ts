import { GameConfig, GameServerConfig } from "common/scripts/config/config.ts"
import { Game, GameData } from "./game.ts"
import { PacketManager } from "common/scripts/packets/packet_manager.ts"
import { ConnectionLimiter, SelfGameWorker } from "common/engine/server/worker.ts"
import { WorkerMessageBase } from "common/engine/server.ts"
import { random } from "common/engine/core.ts"
export type WorkerMessage=WorkerMessageBase<GameConfig,GameData,GameServerConfig>&({

})
class App extends SelfGameWorker<Game,GameData,GameConfig,GameServerConfig>{
    constructor(){
        super(PacketManager)
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
    protected override createGame(config?: GameConfig): Game {
        const game=new Game(this.config,this.clients_manager)
        game.string_id=random.code(20)
        game.auto_init(config!)
        return game
    }
}

const app=new App()