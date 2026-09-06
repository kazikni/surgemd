import { ClientGameObject2D, ClientGameScene2D } from "common/engine/web.ts";
import { type Game } from "./game.ts";
import { type Human } from "../objects/human.ts";
import { Stream } from "common/engine/core.ts";
import { PingWorld } from "../objects/ping_world.ts";
import { BaseGameMap } from "common/scripts/objects/scene.ts";

export abstract class GameObject extends ClientGameObject2D{
    declare game:Game
    declare scene:ClientScene2D
    can_interact(human:Human):boolean{return false}
    on_interact(human:Human):void{}
    get_interact_hint(human:Human): string{return ""}
    auto_interact(human:Human):boolean{return false}
}

export class ClientScene2D extends ClientGameScene2D<GameObject>{
    declare game:Game

    objects_process_queue:Stream[]=[]
    pings:Record<number,PingWorld>={}

    constructor(game:Game){
        super(game)
    }
    override clear(): void {
        super.clear()
        this.objects_process_queue.length=0
        this.game.clock.clear()
    }
    override update(dt:number, net_update?: boolean, destroy_queue?: boolean){
        super.update(dt,net_update,destroy_queue)
        if(this.objects_process_queue.length){
            for(const s of this.objects_process_queue){
                this.objects.proccess_net(s,true)
            }
            this.objects_process_queue.length=0
        }
    }
}