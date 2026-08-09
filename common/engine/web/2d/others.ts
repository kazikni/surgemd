import { Model2D } from "../../core/definition/models.ts";
import { Color, ColorM } from "../../core/math/color.ts";
import { Rect } from "../../core/math/geometry.ts";
import { Matrix, matrix4 } from "../../core/math/matrix.ts";
import { v2, v2m, Vec2, Vec2M } from "../../core/math/vec2.ts";
import { Container2DObject, CamA } from "./base.ts"
export class Grid2D extends Container2DObject{
    override object_type: string="grid";
    
    _size:number=5
    get size(){
        return this._size
    }
    set size(size:number){
        if(this._size===size)return
        this._size=size
        this.dirty_reals=true
    }

    line_width:number=0.05

    fill?:Color
    stroke?:Color
    matrix_index:number=0

    _rect:Rect={min:v2.zero(),max:v2.zero}

    _begin:Vec2M=new Vec2M(0,0,this._bid)
    get begin():Vec2{
        return this._begin as Vec2
    }
    set begin(val:Vec2){
        this._begin.set(val.x,val.y)
        this.dirty_reals=true
    }

    _end:Vec2M=new Vec2M(0,0,this._bid)
    get end():Vec2{
        return this._end as Vec2
    }
    set end(val:Vec2){
        this._end.set(val.x,val.y)
        this.dirty_reals=true
    }

    override update_real(): void {
        super.update_real()
        const min=v2.scale(this._begin,this._size)
        const max=v2.scale(this._end,this._size)
        v2m.add(min,min,this._position)
        v2m.add(max,max,this._position)
        this._rect={
            min:min,
            max:max
        }
    }
    draw(cam:CamA){
        this.draw_super()
        cam.ctx.line_width=this.line_width
        if(this.fill)cam.ctx.stroke_color=this.fill
        if(this.stroke)cam.ctx.stroke_color=this.stroke

        cam.ctx.begin_path()
        cam.ctx.grid(this.begin.x,this.begin.y,this.end.x,this.end.y,this.size,this._position)
        cam.ctx.stroke(cam.matrix[this.matrix_index])
        cam.ctx.end_path()
    }
    override get_rect():Rect{
        return this._rect
    }
}
export class Shape2D extends Container2DObject {
    override object_type = "shape"

    color:Color=ColorM.default.white
    model?:Model2D

    _temp_matrix: Matrix=matrix4.identity()
    matrix_index:number=0

    override update_real(): void {
        super.update_real()
        matrix4.m.transform_2d(this._temp_matrix,this._real_position,this._real_scale,this._real_rotation)
        if(this._real_matrix)matrix4.m.mul(this._temp_matrix,this._temp_matrix,this._real_matrix)
    }

    override draw(cam: CamA): void {
        this.draw_super()
        if (!this.model) {
            return
        }

        cam.ctx.fill_color = this.color
        cam.ctx.fill_model(this.model,matrix4.mul(cam.matrix[this.matrix_index],this._temp_matrix))
    }
}