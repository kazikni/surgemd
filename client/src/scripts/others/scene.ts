import { ClientGameScene2D } from "common/engine/web.ts";
import { type GameObject } from "./gameObject.ts";
import { Stream } from "common/engine/core.ts";

export class Scene2D extends ClientGameScene2D<GameObject>{
    objects_process_queue:Stream[]=[]
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