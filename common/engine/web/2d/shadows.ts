import { Color, ColorM } from "../../core/math/color.ts";
import { Matrix, matrix4 } from "../../core/math/matrix.ts";
import { type Container2DObject,RenderizableObject2D } from "./base.ts";

export class Shadow2D extends RenderizableObject2D{
    destroyed:boolean
    target:Container2DObject
}
export class ShadowManager2D{
    shadows:Shadow2D[]=[]
    matrix:Matrix=matrix4.identity()
    color:Color=ColorM.rgba(0,0,0,68)
    add_shadow(target:Container2DObject){

    }
    tick(){
        
    }
}