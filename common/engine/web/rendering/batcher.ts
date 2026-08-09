import { Matrix, matrix4 } from "../../core/math/matrix.ts";
import { Model2D } from "../../core/definition/models.ts";
import { Vec2 } from "../../core/math/vec2.ts";
import { Material, Renderer, WebglRenderer } from "./renderer.ts";
import { DynamicStream, Stream } from "../../core/net/stream.ts";
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
export type BatcherMaterialCommand={
    type:0
    material:Material
    stream:Stream
    vertex_count:number
    params: Record<string, any>
    matrix?:Matrix
}
export type BatcherSubbatcherCommand={
    type:1
    matrix?:Matrix
    batcher:Batcher
}
export type BatcherCommand=BatcherMaterialCommand|BatcherSubbatcherCommand
export class Batcher {
    commands: BatcherCommand[] = []
    current?: BatcherCommand

    constructor(){
    }
    ensure(material: Material,matrix?:Matrix):BatcherMaterialCommand{
        if(!this.current||!(this.current.type===0&&this.current.material===material&&matrix4.is_equal(matrix))){
            this.current = {
                type:0,
                material,
                matrix,
                params: {},
                stream:new DynamicStream(),
                vertex_count:0
            }
            this.commands.push(this.current)
        }
        return this.current
    }
    draw_batcher(batcher:Batcher,matrix?:Matrix){
        this.current={
            type:1,
            batcher,
            matrix
        }
        this.commands.push(this.current)
    }
    render(renderer:Renderer,matrix?: Matrix) {
        for(const cmd of this.commands) {
            let m=cmd.matrix
            if(matrix&&m)m=matrix4.mul(m,matrix)
            else if(!m)m=matrix4.default.identity
            if(cmd.type===0){
                const params={data:cmd.stream.data.subarray(0,cmd.stream.length),data_count:cmd.vertex_count,...cmd.params}
                cmd.material.draw(cmd.material,m,params)
                renderer.draw_calls++
            }else{
                cmd.batcher.render(renderer,m)
            }
        }
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