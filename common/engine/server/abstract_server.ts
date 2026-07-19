import { FileManager } from "../core/definition/file.ts";
import { PacketsManager } from "../core/net/packets.ts";
import { AbstractServerGame } from "../core/net/server_base.ts";
import { DenoFileManager } from "./file.ts";
import { Server } from "./server.ts"
import { ClientsManager } from "./websockets.ts";

export type WorkerMessageBase<GameConfig, GameData, MainConfig> =
    | {
        type: 0 // Begin

        id: number
        port: number
        ssl?: boolean
        certFile?: string
        keyFile?: string

        config:MainConfig
    }
    | {
        type: 1 // New Game
        config?: GameConfig
    }
    | {
        type: 2 // Set Data
        data: GameData
    }
    | {
        type: 3 // Stop
    }
export enum WorkerMsg {
    Begin = 0,
    NewGame = 1,
    SetData = 2,
    Stop = 3,
}
export interface GameDataBase{
    running:boolean
}

export abstract class AbstractGameServer<
    GameData extends GameDataBase = GameDataBase,
    GameConfig = {},
    MainConfig = {},
    WorkerMessage extends WorkerMessageBase<GameConfig,GameData,MainConfig>=WorkerMessageBase<GameConfig,GameData,MainConfig>
> {
    server: Server

    games = new Map<number, AbstractGameContainer<GameData, GameConfig,MainConfig,WorkerMessage>>()

    config:MainConfig
    file:FileManager

    constructor(server: Server,config:MainConfig,file:FileManager=new DenoFileManager()) {
        this.server = server
        this.config=config
        this.file=file
    }

    add_container(game:AbstractGameContainer<GameData, GameConfig,MainConfig,WorkerMessage>,id?: number) {
        const gameId = id ?? this.games.size

        if (this.games.has(gameId)) {
            return this.games.get(gameId)
        }

        game.id=gameId
        game.server=this

        this.games.set(gameId, game)

        game?.begin()

        return game
    }
    run() {
        this.server.run()
    }
}
export abstract class AbstractGameContainer<
    GameData extends GameDataBase,
    GameConfig,
    MainConfig,
    WorkerMessage extends WorkerMessageBase<GameConfig,GameData,MainConfig>
> {
    id = 0
    data?: GameData
    config?:GameConfig

    server!:AbstractGameServer<GameData,GameConfig,MainConfig,WorkerMessage>

    constructor(){
    }
    abstract on_message(msg:WorkerMessage):void
    abstract begin():void
    abstract new_game(config:GameConfig):Promise<void>
    abstract stop():void
    abstract get_address():string
}
export abstract class AbstractSelfGameContainer<
    Game extends AbstractServerGame<any>,
    GameData extends GameDataBase,
    GameConfig,
    MainConfig,
    WorkerMessage extends WorkerMessageBase<GameConfig,GameData,MainConfig>
> extends AbstractGameContainer<GameData,GameConfig,MainConfig,WorkerMessage>{
    game?:Game
    clients_manager:ClientsManager
    constructor(packet_manager:PacketsManager){
        super()
        this.clients_manager=new ClientsManager(packet_manager)
    }
    abstract make_game(config:GameConfig):Promise<Game>
    override async new_game(config: GameConfig): Promise<void> {
        this.config=config
        if(this.game)this.game.stop()
        this.game=await this.make_game(config)
        this.clients_manager.onconnection=this.game.handle_connection.bind(this.game)
        this.game!.signals.on("update_data", (d:GameData) => this.data=d)
        this.game.id=this.id
        this.game.mainloop()
    }
    override stop(): void {
        if(this.game)this.game.stop()
        this.game=undefined
        this.config=undefined
        this.clients_manager.clear()
    }
}
export abstract class AbstractWorkerGameContainer<
    GameData extends GameDataBase,
    GameConfig,
    MainConfig,
    WorkerMessage extends WorkerMessageBase<GameConfig,GameData,MainConfig>
> extends AbstractGameContainer<GameData,GameConfig,MainConfig,WorkerMessage>{
    worker!: Worker
    abstract worker_path: URL
    port:number
    constructor(){
        super()
        this.port=8001
    }

    get_address(ip:string="localhost"):string{
        return `${ip}:${this.port}`
    }
    begin() {
        this.reset_worker()
    }
    
    async new_game(config:GameConfig){
        this.worker.postMessage({
            type: 1,
            config:config
        })
        this.config=config
    }
    stop() {
        this.worker.postMessage({ type: 3 })
        this.config=undefined
    }
    protected reset_worker() {
        this.config=undefined
        if (this.worker) {
            this.worker.onerror = null
            this.worker.onmessage = null
            try {
                this.worker.terminate()
            } catch {}
        }

        console.log(`[GAME ${this.id}] Starting worker`)

        const worker=new Worker(this.worker_path.href, {
            type: "module"
        })
        this.worker = worker
        this.worker.postMessage({
            type: WorkerMsg.Begin,
            id: this.id,
            port: this.port,
            ssl: this.server.server.ssl,
            certFile: this.server.server.certFile,
            keyFile: this.server.server.keyFile,
            config: this.server.config
        })
        this.worker.onerror = (e) => {
            e.preventDefault()
            console.error(`[GAME ${this.id}] Worker crashed`)
            if (this.worker === worker) {
                this.reset_worker()
            }
        }
        this.worker.onmessage = (e) => {
            const msg = e.data as WorkerMessage
            switch (msg.type) {
                case WorkerMsg.SetData:
                    this.data = msg.data
                    break
            }
            this.on_message(msg)
        }
    }
}