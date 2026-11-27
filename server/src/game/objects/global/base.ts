import { gel_events, GELComponent } from "common/engine/core.ts";
import { SimObject } from "../../main/base.ts";

export const si_global_object:GELComponent<SimObject>={
    events:{
        [gel_events.create](){
            this.scene.global_objects[this.id]=this
        },
        [gel_events.destroy](){
            if(this.scene.global_objects[this.id])delete this.scene.global_objects[this.id]
        }
    }
}