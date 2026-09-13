import { CamA, Container2DObject } from "./base.ts";
import { v2, Vec2 } from "../../core/math/vec2.ts";
import { Rect } from "../../core/math/geometry.ts";
import { Matrix, matrix4 } from "../../core/math/matrix.ts";
import { BatcherContext2D, Context2D } from "../rendering/context.ts";
import { type Frame, type ResourcesManager } from "../resources/resources.ts";
import { Color } from "../../core/math/color.ts";
import { ImageModel2D } from "../../core/definition/models.ts";
import { TilemapLayer } from "../../core/definition/definitions.ts";
export type Tileset=Record<number,{
    frame:Frame
    model:Float32Array
    tint?:Color
}>
export type TilesetDef=Record<number,{
    frame:string
    rotation?:number
    scale?:Vec2
    tint?:Color
}>
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

    
    set_sprites(map:TilemapLayer,tileset:Tileset){
        this.ctx.clear()
        for(const t of map){
            const tile=tileset[t.tile]
            if(tile)this.ctx.draw_frame2d(tile.frame,tile.model,tile.tint,t.matrix)
        }
        this.ctx.lock()
    }
    static make_tileset(def:TilesetDef,meter_size:number,resources:ResourcesManager):Tileset{
        const ret:Tileset={}
        const rect={min:v2.zero(),max:v2.zero()}
        for(const t in def){
            const frame=resources.get_frame(def[t].frame)
            const model=new Float32Array(2*3*2)
            ret[t]={
                frame,
                model,
                tint:def[t].tint
            }
            ImageModel2D(def[t].scale??v2.one,def[t].rotation??0,v2.zero,frame.frame_size,meter_size,v2.zero,rect,model)
        }
        return ret
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