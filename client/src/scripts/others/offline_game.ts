import { ConfigType, ZeroConfig } from "common/scripts/config/config.ts";
import { LevelDefinition } from "common/scripts/config/level_definition.ts";
import { type Game } from "./game.ts";
import { WorkerSocket } from "common/engine/core.ts";

export class LocalGameServer{
    running:boolean=false
    worker?:Worker
    game!:Game
    constructor(game:Game){
        this.game=game
    }
    stop(){
        if(this.running&&this.worker){
            this.running=false
            this.worker.terminate()
            this.worker=undefined
        }
    }
    start(ping_emulation:number=0,config?:ConfigType){
        if(this.running||this.worker)this.stop()
        this.running=true
        this.worker=new Worker(new URL("./worker_server.ts", import.meta.url), {
            type: "module",
        })
        this.worker.postMessage({
            type: "begin",
            config:config??ZeroConfig(),
            ping:ping_emulation,
        });
    }
    restart_level(){
        if(!this.worker)return
        this.worker.postMessage({
            type: "restart_level",
        });
    }
    play_campaign_level(level:LevelDefinition){
        if(this.running||this.worker)this.stop()
        this.start()
        this.worker!.postMessage({type:"init_level",level:level})
        this.worker!.postMessage({type:"start"})

        this.game.set_socket(new WorkerSocket(this.worker!))
        this.game.level=level
        this.game.offline=true

        this.worker!.postMessage({type:"connect"})    
    }
}