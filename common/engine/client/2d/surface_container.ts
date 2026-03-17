import { model2d } from "../../core/definition/models.ts";
import { type WebglRenderer } from "../rendering/renderer.ts";
import { Surface2D } from "../rendering/surface.ts";
import { CamA, Container2DObject } from "./base.ts";

export class SurfaceContainer2D extends Container2DObject{
    object_type="surface"

    surface:Surface2D

    constructor(surface:Surface2D){
        super()
        this.surface=surface
    }

    draw(cam:CamA){

        this.draw_super()

        const model=model2d.rect(
            {x:this._real_position.x,y:this._real_position.y},
            {
                x:this._real_position.x+this.surface.width,
                y:this._real_position.y+this.surface.height
            }
        )

        const mat=(cam.renderer as WebglRenderer).factorys2D.texture.create({
            texture:this.surface.texture,
            tint:this._real_tint
        })

        cam.ctx.draw_model2d(mat,model,{})
    }
}