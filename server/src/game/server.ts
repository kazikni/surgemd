import { ClientsManager, deepEqual, FileManager, PacketsManager, random } from "common/engine/core.ts";
import { AbstractGameContainer, AbstractGameServer, AbstractSelfGameContainer, ConnectionLimiter, Server, server_factory, WorkerMessageBase } from "common/engine/server/server.ts";
import { GameConfig, GameServerConfig } from "common/scripts/config/config.ts";
import { make_packet_manager } from "common/scripts/net/packet_manager.ts";
import { Game, GameData } from "./game.ts";

export type WorkerMessage=WorkerMessageBase<GameConfig,GameData,GameServerConfig>
export type GameContainer=AbstractGameContainer<GameData,GameConfig,GameServerConfig,WorkerMessage>

/**
 * Conexao com o servidor da API (matchmaking).
 * O servidor de jogo faz login como uma regiao e responde os pedidos "find_game".
 */
export class ApiConnection{
    socket?:WebSocket
    logged:boolean=false
    constructor(public game_server:GameServer,public config:GameServerConfig){}
    connect(attempts=20){
        if(attempts<=0)return
        this.logged=false
        const ws=new WebSocket(this.config.authentication!.server)
        ws.onopen=()=>{
            console.log("[API] Connected")
            ws.send(JSON.stringify({
                type:"login",
                authentication:this.config.authentication!,
                region:{
                    name:this.config.region!.name,
                    ip:this.config.region!.ip,
                    port:this.config.region!.port===undefined?this.config.host.port:this.config.region!.port,
                    ssl:this.config.region!.ssl===undefined?this.config.host.ssl:this.config.region!.ssl
                }
            }))
        }
        ws.onmessage=(e)=>{
            this.handle_message(e.data)
        }
        ws.onclose=()=>{
            console.log("[API] Disconnected")
            setTimeout(()=>{
                this.connect(this.logged?undefined:attempts-1)
            },5000)
            if(this.socket===ws)this.socket=undefined
        }
        ws.onerror=(e)=>{
            console.log(e)
            ws.close()
        }
        this.socket=ws
    }
    async handle_message(data:string){
        const msg=JSON.parse(data)
        switch(msg.type){
            case "find_game":{
                const game=await this.game_server.get_game(msg.config)
                this.send({
                    type:"find_game_response",
                    response_id:msg.request_id,
                    success:game?true:false,
                    address:game?.get_address()
                })
                break
            }
            case "logged":{
                this.logged=true
                console.log("[API] Logged")
                break
            }
        }
    }
    send(data:unknown){
        if(!this.socket||this.socket.readyState!==WebSocket.OPEN)return
        this.socket.send(JSON.stringify(data))
    }
}

/**
 * Servidor de jogos: tem varios containers (max_games), cada um roda um Game.
 * Cada container fica em /api/ws/<id>.
 */
export class GameServer extends AbstractGameServer<GameData,GameConfig,GameServerConfig,WorkerMessage>{
    api_conn?:ApiConnection
    clients_factory:new(packets:PacketsManager)=>ClientsManager

    constructor(factory:server_factory,clients_factory:new(packets:PacketsManager)=>ClientsManager,server:Server,config:GameServerConfig,fs:FileManager){
        super(factory,server,config,fs)
        this.clients_factory=clients_factory
        if(config.use_workers){
            console.warn("[GAME-SERVER] use_workers ainda nao foi refeito na nova arquitetura. Usando containers locais.")
        }
        if(config.authentication&&config.region){
            this.api_conn=new ApiConnection(this,config)
            this.api_conn.connect()
        }
        for(let i=0;i<config.max_games;i++){
            this.add_container(new SelfGameContainer(this))
        }
        this.limiter=new ConnectionLimiter(config.limiter)
        if(this.limiter.config.enabled)this.limiter.start()
    }

    /** Acha um jogo compativel que ainda aceita players, ou cria um novo */
    async get_game(config?:GameConfig):Promise<GameContainer|undefined>{
        for(const g of this.games.values()){
            if(
                g.data&&g.data.running&&g.data.can_join&&
                (!g.config||(g.config.mode===config?.mode&&g.config.group_size===config.group_size&&deepEqual(g.config.settings,config.settings)))
            ){
                return g
            }
        }
        return await this.make_game(config)
    }
    async make_game(config?:GameConfig):Promise<GameContainer|undefined>{
        for(const g of this.games.values()){
            if(!g.running||g.data?.running)continue
            if(!config||!config.mode){
                config={mode:"normal",settings:{}}
            }
            await g.new_game(config)
            return g
        }
        return undefined
    }
}

export class SelfGameContainer extends AbstractSelfGameContainer<Game,GameData,GameConfig,GameServerConfig,WorkerMessage>{
    constructor(server:GameServer){
        super(new server.clients_factory(make_packet_manager()))
    }
    override async make_game(config:GameConfig):Promise<Game>{
        const game=new Game(this.server.config,this.clients_manager)
        game.id=this.id
        await game.init(config)
        console.log(`[GAME-${this.id}] New game: ${config.mode} (${random.code(6)})`)
        return game
    }
    override on_message(_msg:WorkerMessage):void{}
    override async begin():Promise<void>{
        this.server.server.route("/api/ws/"+this.id,this.clients_manager.handler())
        await Promise.resolve()
    }
    get_address():string{
        const config=this.server.config
        const ssl=config.region?.ssl===undefined?config.host.ssl:config.region.ssl
        return `ws${ssl?"s":""}://${config.region?.ip??"localhost"}:${this.server.server.port}/api/ws/${this.id}`
    }
}
