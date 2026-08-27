import { ID } from "../math/utils.ts";
import { BaseGameObject2D, AbstractGame, Scene2DInstance } from "../game/game.ts";
import { Client, OfflineClientsManager } from "./client.ts";

//Definitions
export interface HostConfig {
    port: number
    name?: string
    ssl?: boolean
    cert?: string
    key?: string
}

export abstract class AbstractServerGame<DefaultGameObject2D extends BaseGameObject2D=BaseGameObject2D> extends AbstractGame<DefaultGameObject2D>{
    public clients:OfflineClientsManager
    public allowJoin:boolean
    public id:ID=1
    ticks:number=0
    ntps:number=30
    constructor(tps:number,clients:OfflineClientsManager,objects:Array<new()=>DefaultGameObject2D>,scene_2d?:Scene2DInstance<DefaultGameObject2D>){
        super(tps,objects,scene_2d)
        this.allowJoin=true
        this.clients=clients
    }
    override on_stop(): void {
        super.on_stop()
    }
    private net_tick_delay:number=0
    override update(dt: number, new_list: boolean=false, destroy_queue: boolean=false): void {
        super.update(dt,new_list,destroy_queue)
        this.ticks++

        this.net_tick_delay+=dt
        if(this.net_tick_delay>=1/this.ntps){
            this.net_update(false)
            this.net_tick_delay-=1/this.ntps
        }
    }
    handle_connection(client:Client,username:string):void{

    }
    net_update(full:boolean){
        this.scene_2d.objects.apply_destroy_queue()
        this.scene_2d.objects.update_to_net()
    }
    override stop(): void {
        super.stop()
        for(const c of this.clients.clients.values()){
            c.disconnect()
        }
    }
    override mainloop(rqf?: boolean,auto_mainloop?:boolean): void {
        super.mainloop(rqf,auto_mainloop)
        this.clients.onconnection=this.handle_connection.bind(this)
    }
    update_delay:number=3
}
