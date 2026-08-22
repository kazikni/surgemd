import { CamA, Container2DObject } from "./base.ts";
import { v2 } from "../../core/math/vec2.ts";
import { Rect } from "../../core/math/geometry.ts";
import { Matrix, matrix4 } from "../../core/math/matrix.ts";
import { BatcherContext2D, Context2D } from "../rendering/context.ts";
export class Graphics2D extends Container2DObject {
    object_type = "graphics"
    override full: boolean=true
    _main_matrix:Matrix=matrix4.identity()
    ctx!:BatcherContext2D

    matrix_index:number=0
    constructor(){
        super()
    }

    initialize(ctx:Context2D){
        this.ctx=ctx.sub_context() as BatcherContext2D
    }

    override update_real(): void {
        super.update_real()
        matrix4.m.transform_2d(this._main_matrix,this._real_position,this._real_scale,this._real_rotation)
        if(this._real_matrix)matrix4.m.mul(this._main_matrix,this._main_matrix,this._real_matrix)
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