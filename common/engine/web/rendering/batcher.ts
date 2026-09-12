import { Matrix, matrix4 } from "../../core/math/matrix.ts"
import { Material, Renderer } from "./renderer.ts"
import { DynamicStream, Stream } from "../../core/net/stream.ts"

export type BatcherMaterialCommand={
    type:0
    material:Material
    stream:Stream
    vertex_count:number
    params: Record<string, any>
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
    locked:boolean=false

    constructor(){
    }
    ensure(material: Material):BatcherMaterialCommand{
        if(!this.current||!(this.current.type===0&&this.current.material===material)){
            this.current={
                type:0,
                material,
                params: {},
                stream:new DynamicStream(),
                vertex_count:0
            }
            this.commands.push(this.current)
        }
        this.locked=false
        return this.current
    }
    draw_batcher(batcher:Batcher,matrix?:Matrix){
        this.current={
            type:1,
            batcher,
            matrix
        }
        this.commands.push(this.current)
        this.locked=false
    }
    render(renderer:Renderer,matrix?: Matrix) {
        if(!matrix)matrix=matrix4.default.identity
        for(const cmd of this.commands){
            let m=matrix
            if(cmd.type===0){
                const params={data:cmd.stream.data.subarray(0,cmd.stream.length),data_count:cmd.vertex_count,...cmd.params}
                cmd.material.draw(cmd.material,m,params)
                renderer.draw_calls++
            }else{
                if(cmd.matrix)m=matrix4.mul(m,cmd.matrix)
                cmd.batcher.render(renderer,m)
            }
        }
    }
    clone(){
        const batcher=new Batcher()
        batcher.commands.push(...this.commands)
        if(this.current){
            if(this.current.type===0){
                batcher.current={
                    type:0,
                    material:this.current.material,
                    params:this.current.params,
                    stream:this.current.stream.clone(),
                    vertex_count:this.current.vertex_count
                }
            }else{
                batcher.current={...this.current}
            }
        }
        return batcher
    }
    lock(){
        for(const c of this.commands){
            if(c.type===0)c.stream.lock()
        }
        this.locked=true
        /*let i=0
        for(const c of this.commands){
            if(c.type===0)i+=c.stream.data.byteLength
        }
        console.log(i)*/
    }
    clear() {
        this.commands.length = 0
        this.current = undefined
    }
}