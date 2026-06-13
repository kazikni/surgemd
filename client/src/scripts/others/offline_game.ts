import { ConfigType, ZeroConfig } from "common/scripts/config/config.ts";
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
    run(ping_emulation:number=0,config?:ConfigType){
        if(this.running||this.worker)this.stop()
        this.running=true
        this.worker=new Worker(new URL("./worker_server.ts", import.meta.url), {
            type: "module",
        })
        this.worker.onmessage=(ev)=>this.handle_messages(ev.data)
        this.worker.postMessage({
            type: "begin",
            config:config??ZeroConfig(),
            ping:ping_emulation,
        })
    }
    start(){
        this.worker!.postMessage({type:"start"})
    }
    init(){
        this.worker!.postMessage({type:"init"})
    }
    connect(){
        this.worker!.postMessage({type:"connect"})
        this.game.set_socket(new WorkerSocket(this.worker!))
        this.game.offline=true
    }
    reset_level(){
        if(!this.worker)return
        this.worker.postMessage({
            type: "reset_level",
        });
    }
    begin_level(path:string){
        this.run()
        this.worker!.postMessage({type:"load_level",level:path})
    }

    handle_messages(msg:any){
        switch(msg.type){
            case "server_created":
                this.connect()
                break
        }
    }
}