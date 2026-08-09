import { Color } from "../../core/math/color.ts";
import { Rect } from "../../core/math/geometry.ts";
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
        const tm=cam.ctx.transform_matrix
        cam.ctx.transform_matrix=cam.matrix[this.matrix_index]
        cam.ctx.draw_grid(this.begin.x,this.begin.y,this.end.x,this.end.y,this.size,this._position)
        cam.ctx.transform_matrix=tm
    }
    override get_rect():Rect{
        return this._rect
    }
}