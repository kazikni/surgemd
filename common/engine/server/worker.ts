import { PacketsManager } from "../core/net/packets.ts";
import { AbstractServerGame } from "../core/net/server_base.ts";
import { WorkerMsg } from "./abstract_server.ts";
import { Server } from "./server.ts";
import { ClientsManager } from "./websockets.ts";
export interface ConnectionLimitConfig {
    enabled: boolean

    windowMs: number
    maxConnections: number
    burst?: number
    onLimit?: "reject" | "close-oldest"
}
export class ConnectionLimiter {
    private map = new Map<string, {
        count: number
        resetAt: number
    }>()

    constructor(public config: ConnectionLimitConfig) {}

    allow(ip: string): boolean {
        if (!this.config.enabled) return true

        const now = Date.now()
        let entry = this.map.get(ip)

        if (!entry || now >= entry.resetAt) {
            entry = {
                count: 0,
                resetAt: now + this.config.windowMs
            }
            this.map.set(ip, entry)
        }

        const limit = this.config.burst
            ? this.config.maxConnections + this.config.burst
            : this.config.maxConnections

        if (entry.count >= limit) {
            return false
        }

        entry.count++
        return true
    }

    clear(ip: string) {
        this.map.delete(ip)
    }

    start(intervalMs = 60_000) {
        setInterval(() => {
            const now = Date.now()
            for (const [ip, entry] of this.map) {
                if (now >= entry.resetAt) {
                    this.map.delete(ip)
                }
            }
        }, intervalMs)
    }
}
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
    packet_manager:PacketsManager
    clients_manager:ClientsManager
    protected limiter?: ConnectionLimiter

    constructor(packet_manager:PacketsManager) {
        this.packet_manager=packet_manager
        self.addEventListener("message", e => this.onMessage(e))
        this.clients_manager=new ClientsManager(packet_manager)
    }

    protected onMessage(e: MessageEvent) {
        const msg = e.data

        switch (msg.type) {
        case WorkerMsg.Begin:{
            this.id = msg.id
            this.config = msg.config
            this.server = new Server(msg.port,msg.https,msg.certFile,msg.keyFile)
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
        }
    }
    protected restartGame(config?: GameConfig) {
        if (this.game) {
            this.stopGame()
        }
        this.game = this.createGame(config)
        this.clients_manager.onconnection=this.game.handle_connection.bind(this.game)
        this.clients_manager.canConnect = this.canConnect.bind(this)

        this.game!.signals.on("update_data", (d:GameData) => this.sendData(d))
        this.game!.mainloop()
    }

    protected sendData(data: GameData) {
        self.postMessage({
            type: WorkerMsg.SetData,
            data,
        })
    }

    protected stopGame() {
        this.game?.stop()
        this.clients_manager.clear()
        this.game = undefined

        this.sendData({
            running:false
        } as GameData)
    }
    run(){
        this.server?.run()
        this.sendData({
            running:false
        } as GameData)
    }
    canConnect(ip:string){
        if (this.limiter) {
            return this.limiter.allow(ip)
        }
        return true
    }
    protected abstract onBegin(): void
    protected abstract createGame(config?: GameConfig): Game
}
