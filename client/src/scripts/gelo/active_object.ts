import { DynamicGELComponent, gel_events, Numeric, v2 } from "common/engine/core.ts";
import { type GameObject } from "../main/gel.ts";

export class ActiveObject extends DynamicGELComponent<GameObject>{
    zoom_speed:number=0.2
    scope_zoom:number=0.8

    constructor(){
        super()
        this.make_event(gel_events.bind,"on_bind")
        this.make_event(gel_events.tick,"on_tick")
    }
    on_bind(obj:GameObject){
        obj.scene.camera.zoom=4
    }
    on_tick(obj:GameObject,dt:number){
        obj.scene.camera.zoom=Numeric.lerp(obj.scene.camera.zoom,this.scope_zoom,1/(1+dt*1300))
        obj.scene.camera.position=v2.clone(obj.position)
    }
}