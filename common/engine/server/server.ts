import { ConnectionLimitConfig } from "../core/definition/definitions.ts";
import { FileManager } from "../core/definition/file.ts";
import { ClientsManager } from "../core/net/client.ts";
import { AbstractServerGame, HandlerFunc, HandlerFuncAsync } from "../core/net/server_base.ts";
export type server_factory=(new(port:number,ssl?:boolean,certFile?:string,keyFile?:string)=>Server)
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
export interface Server{
    port:number
    ssl:boolean
    certFile?:string
    keyFile?:string
    route(path:string,handler:HandlerFunc|HandlerFuncAsync):void
    stop():void|Promise<void>
    run():void|Promise<void>
}
export type WorkerMessageBase<GameConfig, GameData, MainConfig>={
    type:0 // Begin

    id: number
    port: number
    ssl?: boolean
    certFile?: string
    keyFile?: string

    config:MainConfig
}|{
    type:1 // New Game
    config?: GameConfig
}|{
    type:2 // Set Data
    data: GameData
}|{
    type:3 // Stop
}|{
    type:4 // Reset Worker
}|{
    type:5 // Heartbeat
}
export enum WorkerMsg {
    Begin=0,
    NewGame=1,
    SetData=2,
    Stop=3,
    ResetWorker=4,
    Heartbeat=5
}
export interface GameDataBase{
    running:boolean
}
export abstract class AbstractGameServer<
    GameData extends GameDataBase=GameDataBase,
    GameConfig={},
    MainConfig={},
    WorkerMessage extends WorkerMessageBase<GameConfig,GameData,MainConfig>=WorkerMessageBase<GameConfig,GameData,MainConfig>
>{
    server:Server
    games=new Map<number,AbstractGameContainer<GameData,GameConfig,MainConfig,WorkerMessage>>()
    config:MainConfig
    file:FileManager
    factory:server_factory
    limiter?:ConnectionLimiter

    constructor(factory:server_factory,server:Server,config:MainConfig,file:FileManager){
        this.factory=factory
        this.server=server
        this.config=config
        this.file=file
    }

    async add_container(game:AbstractGameContainer<GameData,GameConfig,MainConfig,WorkerMessage>,id?:number){
        const gameId=id??this.games.size
        if(this.games.has(gameId))return this.games.get(gameId)
        game.id=gameId
        game.server=this
        this.games.set(gameId,game)
        await game.begin()
        return game
    }

    run(){
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
    running:boolean=false

    server!:AbstractGameServer<GameData,GameConfig,MainConfig,WorkerMessage>

    constructor(){
    }
    abstract on_message(msg:WorkerMessage):void
    abstract begin():Promise<void>
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
    constructor(clients:ClientsManager){
        super()
        this.clients_manager=clients
        this.running=true
    }
    abstract make_game(config:GameConfig):Promise<Game>
    override async new_game(config: GameConfig): Promise<void> {
        this.config=config
        if(this.game)this.game.stop()
        this.game=await this.make_game(config)
        this.clients_manager.onconnection=this.game.handle_connection.bind(this.game)
        this.clients_manager.canConnect=this.server.limiter?.allow?.bind(this.server.limiter)
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

    last_heartbeat:number=0
    resetting=false
    constructor(){
        super()
        this.port=8001
    }

    get_address(ip:string="localhost"):string{
        return `${ip}:${this.port}`
    }
    async begin() {
        await this.reset_worker()
        setInterval(()=>{
            if(this.running&&!this.resetting&&performance.now()-this.last_heartbeat>=40000)this.reset_worker()
        },10000)
    }
    
    async new_game(config:GameConfig){
        this.worker.postMessage({
            type: 1,
            config:config
        })
        this.config=config
    }
    stop(){
        this.worker.postMessage({ type: WorkerMsg.Stop })
        this.config=undefined
    }
    terminate():Promise<void>{
        const old=this.worker
        old.onerror=null
        return new Promise<void>((resolve) => {
            old.onmessage=e=>{
                if(e.data.type===WorkerMsg.Stop){
                    try{old.terminate()}catch{}
                    resolve(undefined)
                }
            }
            old.postMessage({type:WorkerMsg.ResetWorker})
        })
    }

    _handle_msg(e:MessageEvent){
        const msg=e.data as WorkerMessage
        switch (msg.type) {
            case WorkerMsg.SetData:
                this.data = msg.data
                break
            case WorkerMsg.ResetWorker:
                this.reset_worker()
                break
            case WorkerMsg.Heartbeat:
                this.last_heartbeat=performance.now()
                this.running=true
                this.resetting=false
        }
        this.on_message(msg)
    }
    async reset_worker(){
        if(this.resetting)return
        this.resetting=true

        this.config=undefined
        this.running=false

        const old=this.worker
        if(old)await this.terminate()

        console.log(`[GAME-CONTAINER-${this.id}] Starting worker`)

        const worker=new Worker(this.worker_path.href,{type:"module"})
        this.worker=worker
        worker.onerror=e=>{
            e.preventDefault()
            if(this.worker!==worker)return
            console.error(`[GAME-CONTAINER-${this.id}] Worker crashed`)
            this.resetting=false
            this.reset_worker()
        }
        worker.onmessage=this._handle_msg.bind(this)

        worker.postMessage({
            type:WorkerMsg.Begin,
            id:this.id,
            port:this.port,
            ssl:this.server.server.ssl,
            certFile:this.server.server.certFile,
            keyFile:this.server.server.keyFile,
            config:this.server.config
        })
    }
}