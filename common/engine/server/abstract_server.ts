import { FileManager } from "../core.ts";
import { DenoFileManager } from "./file.ts";
import { Server } from "./server.ts"

export type WorkerMessageBase<GameConfig, GameData, MainConfig> =
    | {
        type: 0 // Begin

        id: number
        port: number
        https?: boolean
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
    data!: GameData
    worker!: Worker
    abstract worker_path: URL

    server!:AbstractGameServer<GameData,GameConfig,MainConfig,WorkerMessage>
    port:number

    constructor(){
        this.port=8001
    }
    get_address(ip:string="localhost"):string{
        return `${ip}:${this.port}`
    }
    begin() {
        this.worker = new Worker(this.worker_path.href, { type: "module" })
        this.worker.postMessage({
            type: 0,

            id: this.id,
            port:this.port,
            https:this.server.server.https,
            certFile:this.server.server.certFile,
            keyFile:this.server.server.keyFile,

            config:this.server.config
        })

        this.worker.onmessage=(e)=>{
            const msg = e.data as WorkerMessage

            switch (msg.type) {
            case WorkerMsg.SetData:
                this.data=msg.data
                break
            }

            this.on_message(msg)
        }
    }
    on_message(msg:WorkerMessage){
        
    }
    new_game(config:GameConfig){
        this.worker.postMessage({
            type: 1,
            config:config
        })
    }
    stop() {
        this.worker.postMessage({ type: 3 })
    }
}