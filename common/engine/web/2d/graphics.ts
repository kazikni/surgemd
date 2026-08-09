import { CamA, Container2DObject } from "./base.ts";
import { v2 } from "../../core/math/vec2.ts";
import { Rect } from "../../core/math/geometry.ts";
import { Matrix, matrix4 } from "../../core/math/matrix.ts";
import { BatcherContext2D, Context2D } from "../rendering/context.ts";
export class Graphics2D extends Container2DObject {
    object_type = "graphics"
    override full: boolean=true
    _main_matrix:Matrix=matrix4.identity()
    matrix_index:number=0
    ctx!:BatcherContext2D
    constructor(){
        super()
    }

    initialize(ctx:Context2D){
        this.ctx=ctx.sub_context() as BatcherContext2D
    }

    override update_real(): void {
        super.update_real()

        let m = matrix4.identity()
        m = matrix4.mul(m, matrix4.translation_2d(v2(this._real_position.x,this._real_position.y)))
        m = matrix4.mul(m, matrix4.scale_2d(this._real_scale))
        this._main_matrix=m
    }

    override get_rect(): Rect {
        return {min:v2.infinity_neg,max:v2.infinity}
    }
    draw(cam:CamA){
        this.draw_super()
        if(!this.ctx)return
        cam.ctx.draw_batcher(this.ctx.batcher,matrix4.mul(cam.matrix[this.matrix_index],this._main_matrix))
    }
}