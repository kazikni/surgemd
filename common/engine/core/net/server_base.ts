import { ID } from "../math/utils.ts";
import { BaseGameObject2D, AbstractGame } from "../game/game.ts";
import { Client, OfflineClientsManager } from "./client.ts";

//Definitions
export interface HostConfig {
    port: number
    name?: string
    https?: boolean
    cert?: string
    key?: string
    ca?: string
}

export abstract class AbstractServerGame<DefaultGameObject2D extends BaseGameObject2D=BaseGameObject2D> extends AbstractGame<DefaultGameObject2D>{
    public clients:OfflineClientsManager
    public allowJoin:boolean
    public id:ID=1
    ticks:number=0
    ntps:number=30
    constructor(tps:number,id:ID,clients:OfflineClientsManager,objects:Array<new()=>DefaultGameObject2D>){
        super(tps,objects)
        this.id=id
        this.allowJoin=true
        this.clients=clients

        setTimeout(this.fpsShow.bind(this),1000)
    }
    fpsShow(){
        if(!this.running)return
        console.log(`TPS:${this.ticks}/${this.tps}`)
        this.ticks=0
        setTimeout(this.fpsShow.bind(this),1000)
    }
    override on_stop(): void {
        super.on_stop()
        for(const c of this.clients.clients.values()){
            c.disconnect()
        }

        //clearInterval(this.net_update_interval)
        //this.net_update_interval=undefined
    }
    private net_tick_delay:number=0
    net_full_tick:number=0
    override update(dt: number, new_list: boolean=false, destroy_queue: boolean=false): void {
        super.update(dt,new_list,destroy_queue)
        this.ticks++

        this.net_tick_delay+=dt
        if(this.net_tick_delay>=1/this.ntps){
            this.net_full_tick-=this.net_tick_delay

            this.net_update(this.net_full_tick<=0)

            if(this.net_full_tick<=0)this.net_full_tick=this.ntps*10

            this.net_full_tick=0
            this.net_tick_delay=0
        }
    }
    handle_connection(client:Client,username:string):void{

    }
    net_update_interval?:number
    net_update(full:boolean){
        this.scene_2d.objects.apply_destroy_queue()
        this.scene_2d.objects.update_to_net()
    }
    override mainloop(rqf?: boolean,auto_mainloop?:boolean): void {
        super.mainloop(rqf,auto_mainloop)
        this.clients.onconnection=this.handle_connection.bind(this)
        if(this.net_update_interval)this.net_update_interval=setInterval(()=>this.net_update(false),this.ntps)
    }
    update_delay:number=3
}
