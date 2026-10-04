import { ClientsManager } from "../core/net/client.ts";
import { AbstractServerGame } from "../core/net/server_base.ts";
import { type ConnectionLimiter, Server, server_factory, WorkerMsg } from "./server.ts";

export abstract class SelfGameWorker<
    Game extends AbstractServerGame<any>,
    GameData,
    GameConfig,
    MainConfig
> {
    protected game?: Game
    protected server?: Server
    protected config!: MainConfig
    protected id = 0
    clients_manager:ClientsManager
    protected limiter?: ConnectionLimiter

    server_factory:server_factory

    constructor(server_factory:server_factory,clients:ClientsManager){
        this.clients_manager=clients
        this.server_factory=server_factory
        self.addEventListener("message", e => this.onMessage(e))
    }

    protected async onMessage(e: MessageEvent) {
        const msg = e.data

        switch (msg.type) {
            case WorkerMsg.Begin:{
                this.id = msg.id
                this.config = msg.config
                this.server = new this.server_factory(msg.port,msg.ssl,msg.certFile,msg.keyFile)
                this.onBegin()
                setTimeout(this.run.bind(this),300)
                break
            }
            case WorkerMsg.NewGame:
                this.restartGame(msg.config)
                break
            case WorkerMsg.Stop:
                this.stopGame()
                break
            case WorkerMsg.ResetWorker:{
                await this.server?.stop?.()
                self.postMessage({type:WorkerMsg.Stop})
                break
            }
        }
    }
    protected async free_worker(){
        this.clients_manager.clear()
        this.clients_manager.onconnection=undefined
        this.game = undefined
        self.postMessage({
            type: WorkerMsg.ResetWorker,
        })
    }
    protected async restartGame(config?: GameConfig) {
        if (this.game) {
            this.stopGame()
        }
        this.game = await this.create_game(config)
        this.clients_manager.onconnection=this.game.handle_connection.bind(this.game)
        this.clients_manager.canConnect = this.canConnect.bind(this)

        this.game!.signals.on("update_data", (d:GameData) => this.sendData(d))
        this.game!.mainloop()
        this.game.id=this.id
    }

    protected sendData(data: GameData) {
        self.postMessage({
            type: WorkerMsg.SetData,
            data,
        })
    }

    protected stopGame() {
        this.sendData({
            running:false
        } as GameData)
        this.game?.stop()
        this.clients_manager.clear()
        this.game = undefined
    }
    run(){
        this.server?.run()
        this.sendData({
            running:false
        } as GameData)
        self.postMessage({type:WorkerMsg.Heartbeat})
        setInterval(() => {
            self.postMessage({type:WorkerMsg.Heartbeat})
        }, 20000)
    }
    canConnect(ip:string){
        if (this.limiter) {
            return this.limiter.allow(ip)
        }
        return true
    }
    protected abstract onBegin(): void
    protected abstract create_game(config?: GameConfig): Promise<Game>
}
