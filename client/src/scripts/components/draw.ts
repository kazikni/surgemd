import { ColorM, gel_events, GELComponent } from "common/engine/core.ts";
import { type SI_StaticBody } from "common/scripts/game/objects/static_body/static_body.ts";
import { GameObject } from "../main/gel.ts";

export const c_draw_collider:GELComponent<GameObject&SI_StaticBody>={
    id_string:"draw_collider", // Loot Network Client
    events:{
        [gel_events.bind]:function(){
            this.allow_render=true
        },
        [gel_events.render]:function(_dt:number){
            const ctx=this.scene.camera.ctx

            ctx.begin_path()
            ctx.collider(this.collider)
            ctx.fill_color=ColorM.hex("#f003")
            ctx.fill(this.scene.camera.viewport_camera_matrix)

            if(this.spawn_collider){
                ctx.begin_path()
                ctx.collider(this.spawn_collider)
                ctx.fill_color=ColorM.hex("#ff04")
                ctx.fill(this.scene.camera.viewport_camera_matrix)
            }
        }
    }
}