import { Matrix } from "../../core/math/matrix.ts";
import { Model2D } from "../../core/definition/models.ts";
import { Color } from "../../core/math/color.ts";
import { Vec2 } from "../../core/math/vec2.ts";
import { Frame } from "../resources/resources.ts";
import { Material, Renderer, WebglRenderer } from "./renderer.ts";

export abstract class SingleMatBatchingBase{
    mat: Material
    renderer: Renderer
    arrays: Record<string, number[]> = {}
    constructor(renderer: Renderer, mat: Material) {
        this.renderer = renderer
        this.mat = mat
    }
    push_array(name: string, data: Float32Array|number[], vertexCount: number) {
        if (!this.arrays[name]) this.arrays[name] = []
        const out = this.arrays[name]
    
        if (vertexCount <= 0) {
            throw new Error("push_array called without vertex context")
        }
    
        const components = data.length

        if (components >= vertexCount * 2) {
            for (let i = 0; i < data.length; i++) {
                out.push(data[i])
            }
            return
        }
    
        for (let v = 0; v < vertexCount; v++) {
            for (let i = 0; i < data.length; i++) {
                out.push(data[i])
            }
        }
    }
    
    
    clear() {
        for(const k of Object.keys(this.arrays)){
            this.arrays[k].length=0
        }
    }
}
export abstract class SingleMatBatching2D extends SingleMatBatchingBase{
    draw_model2d(model: Model2D,position: Vec2,scale: Vec2,rotation:number,attr:Record<string,{value:Float32Array|number[]}>) {
        const vertexCount = model.vertices.length / 2
        if(vertexCount<2)return
        this.push_array("vertices",model.vertices,vertexCount)
        this.push_array("tex_coord",model.tex_coords,vertexCount)
        this.push_array("position",[position.x,position.y],vertexCount)
        this.push_array("scale",[scale.x,scale.y],vertexCount)
        this.push_array("rotation", [rotation], vertexCount)
        for(const k of Object.keys(attr)){
            this.push_array(k,attr[k].value,vertexCount)
        }
    }
    render(matrix: Matrix) {
        if (!this.arrays) return

        const gpuArrays: Record<string, Float32Array> = {}
        for (const k in this.arrays) {
            gpuArrays[k] = new Float32Array(this.arrays[k])
        }
        
        this.mat.draw(this.mat, matrix, gpuArrays)

        this.clear()
    }
}
export interface BatcherDraw{
    material:Material
    arrays:Record<string,number[]>
    matrix?:Matrix
}

export class Batcher {
    renderer: Renderer
    commands: BatcherDraw[] = []
    current?: BatcherDraw
    gpuArrays: Record<string, Float32Array> = {}

    constructor(renderer: Renderer) {
        this.renderer = renderer
    }
    private ensure(material: Material,matrix:Matrix|undefined) {
        if (!this.current || this.current.material !== material) {
            this.current = {
                material,
                arrays: {},
                matrix:matrix
            }
            this.commands.push(this.current)
        }
        return this.current
    }
    push_array(cmd: BatcherDraw, name: string, data: Float32Array | number[], vertexCount: number) {
        if (!cmd.arrays[name]) cmd.arrays[name] = []
        const out = cmd.arrays[name]
        if (data.length >= vertexCount * 2) {
            out.push(...data)
            return
        }
        for (let v = 0; v < vertexCount; v++) {
            out.push(...data)
        }
    }
    draw_model2d(
        material: Material,
        model: Model2D,
        position: Vec2,
        scale: Vec2,
        rotation:number=0,
        attr: Record<string, { value: Float32Array | number[] }>,
        matrix?:Matrix
    ) {
        const vertexCount = model.vertices.length / 2
        if (vertexCount < 2) return

        const cmd = this.ensure(material,matrix)

        this.push_array(cmd, "vertices", model.vertices, vertexCount)
        this.push_array(cmd, "tex_coord", model.tex_coords, vertexCount)
        this.push_array(cmd, "position", [position.x, position.y], vertexCount)
        this.push_array(cmd, "scale", [scale.x, scale.y], vertexCount)
        this.push_array(cmd, "rotation", [rotation], vertexCount)

        for (const k in attr) {
            this.push_array(cmd, k, attr[k].value, vertexCount)
        }
    }
    draw_frame2d(
        frame:Frame|undefined,
        model:Float32Array,
        tint:Color={r:1,g:1,b:1,a:1},
        attr:Record<string,number[]>={},
        matrix?:Matrix
    ){
        const vertexCount = model.length / 2
        if (vertexCount < 2||!frame||!frame.batch_mat) return
        const cmd = this.ensure(frame.batch_mat,matrix)

        this.push_array(cmd, "vertices", model, vertexCount)
        this.push_array(cmd, "tex_coord", frame.texcoords, vertexCount)
        this.push_array(cmd, "tint", [tint.r,tint.g,tint.b,tint.a], vertexCount)
        for (const k in attr) {
            this.push_array(cmd, k, attr[k], vertexCount)
        }
    }

    render(matrix: Matrix) {
        for (const cmd of this.commands) {
            for (const k in cmd.arrays) {
                if(!this.gpuArrays[k]||this.gpuArrays[k].length!==cmd.arrays[k].length){
                    this.gpuArrays[k] = new Float32Array(cmd.arrays[k].length)
                }
                this.gpuArrays[k].set(cmd.arrays[k])
            }

            cmd.material.draw(cmd.material, matrix, this.gpuArrays)
        }
        this.clear()
        /*for (const cmd of this.commands) {
            const gpuArrays: Record<string, Float32Array> = {}
            for (const k in cmd.arrays) {
                gpuArrays[k] = new Float32Array(cmd.arrays[k])
            }

            cmd.material.draw(cmd.material, matrix, gpuArrays)
        }
        this.clear()*/
    }

    clear() {
        this.commands.length = 0
        this.current = undefined
    }
}
export class SingleMatBatching2DGL extends SingleMatBatching2D{
    declare renderer:WebglRenderer
    declare mat:Material
    constructor(renderer:WebglRenderer,mat:Material){
        super(renderer,mat)
        this.mat=mat
    }
}