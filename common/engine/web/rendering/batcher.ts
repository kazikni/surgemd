import { Matrix, matrix4 } from "../../core/math/matrix.ts"
import { Material, RenderBuffer, Renderer } from "./renderer.ts"
import { DynamicStream, Stream } from "../../core/net/stream.ts"

export type BatcherMaterialCommand={
    type:0
    material:Material
    stream:Stream
    vertex_count:number
    buffer?:RenderBuffer
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
    uploaded:boolean=false
    root:boolean=false

    buffers:Record<number,{stream:Stream,buffer:RenderBuffer}>={}

    constructor(){
    }
    ensure(material: Material):BatcherMaterialCommand{
        if(!this.current||!(this.current.type===0&&this.current.material===material)){
            const id=this.commands.length+1
            if(!this.buffers[id]){
                this.buffers[id]={
                    stream:new DynamicStream(),
                    buffer:material.renderer.create_buffer()
                }
            }
            this.buffers[id].stream.clear()
            this.current={
                type:0,
                material,
                params: {},
                stream: this.buffers[id].stream,
                buffer: this.buffers[id].buffer,
                vertex_count:0
            }
            this.commands.push(this.current)
        }
        this.locked=false
        this.uploaded=false
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
        this.uploaded=false
    }
    render(renderer:Renderer,matrix?: Matrix) {
        if(!matrix)matrix=matrix4.default.identity
        if(!this.uploaded)this.upload()
        for(const cmd of this.commands){
            let m=matrix
            if(cmd.type===0){
                const params={data:cmd.stream.data.subarray(0,cmd.stream.length),data_count:cmd.vertex_count,buffer:cmd.buffer,...cmd.params}
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

    upload(){
        for(const c of this.commands){
            if(c.type===0){
                if(c.buffer)c.buffer.upload_u8(c.stream.data.subarray(0,c.stream.length))
            }
        }
        this.uploaded=true
    }
    lock(){
        for(const c of this.commands){
            if(c.type===0){
                c.stream.lock()
                if(c.buffer){
                    c.buffer.upload_u8(c.stream.data.subarray(0,c.stream.length))
                    c.stream.clear()
                }
            }else if(c.type===1){
                c.batcher.lock()
            }
        }
        this.locked=true
        this.uploaded=true
    }
    clear() {
        this.commands.length = 0
        this.current = undefined
        for(const c in this.buffers){
            this.buffers[c].stream.clear()
        }
        this.uploaded=false
        this.locked=false
    }
    free(){
        this.current=undefined
        this.commands.length=0
        for(const c in this.buffers){
            this.buffers[c].buffer.free()
        }
        this.uploaded=false
        this.locked=false
    }
}