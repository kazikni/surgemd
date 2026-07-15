import { Model2D } from "../../core/definition/models.ts";
import { Color, ColorM } from "../../core/math/color.ts";
import { Matrix, matrix4 } from "../../core/math/matrix.ts";
import { CamA, Container2DObject } from "./base.ts";

export class Shape2D extends Container2DObject {
    override object_type = "shape"

    color:Color=ColorM.default.white
    model?: Model2D
    matrix?: Matrix

    override draw(cam: CamA): void {
        this.draw_super()
        if (!this.model) {
            return
        }
        const ctx = cam.ctx
        ctx.save()
        ctx.fill_color = this.color
        if (this.matrix) {
            ctx.transform_matrix = matrix4.mult(ctx.transform_matrix,this.matrix)
        }
        ctx.fill_model(this.model,this._real_position,this._real_scale,this._real_rotation)
        ctx.restore()
    }
}