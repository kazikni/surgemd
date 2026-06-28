import { Model2D, model2d } from "../../core/definition/models.ts"
import { Color, ColorM } from "../../core/math/color.ts"
import { v2, Vec2 } from "../../core/math/vec2.ts"
import { Batcher, BatcherMaterialCommand } from "./batcher.ts"
import { type Material, type Renderer, type WebglRenderer } from "./renderer.ts"
import { Frame } from "../resources/resources.ts"
import { Matrix, matrix4 } from "../../core/math/matrix.ts";
import { Hitbox2D, HitboxType2D } from "../../core/math/hitbox.ts";
import { Stream } from "../../core/net/stream.ts";

export type ContextGradient = {
    type: "linear" | "radial"
    from?: Vec2
    to?: Vec2
    stops: { offset: number; color: Color }[]
}
export type ContextState = {
    fill_color: Color
    stroke_color: Color
    global_tint: Color
    transform_matrix: Matrix

    line_width: number
    line_inner: number
    line_outer: number

    current_advanced_material?:Material
    current_material?:Material
}
export abstract class Context2D{
    protected state: ContextState
    protected stack: ContextState[] = []
    protected path: Vec2[] = []

    default_advanced_material?:Material
    default_material?:Material
    base_matrix:Matrix=matrix4.identity()

    get material():Material|undefined{
        return this.state.current_material
    }
    set material(val:Material|undefined){
        this.state.current_material=val
    }
    
    get advanced_material():Material|undefined{
        return this.state.current_advanced_material
    }
    set advanced_material(val:Material|undefined){
        this.state.current_advanced_material=val
    }

    static default_state(ctx?:Context2D):ContextState{
        return {
            fill_color:{r:0,g:0,b:0,a:255},
            stroke_color:{r:0,g:0,b:0,a:255},
            global_tint:{r:255,g:255,b:255,a:255},
            transform_matrix:matrix4.identity(),

            line_width:0.05,
            line_inner:0,
            line_outer:1,

            current_advanced_material:ctx?.default_advanced_material,
            current_material:ctx?.default_material,
        }
    }
    constructor(){
        this.state = Context2D.default_state()
    }
    save() {
        const s = this.state
        this.stack.push({
            fill_color: { ...s.fill_color },
            stroke_color: { ...s.stroke_color },
            global_tint: { ...s.global_tint },
            transform_matrix: matrix4.clone(s.transform_matrix),

            line_width: s.line_width,
            line_inner: s.line_inner,
            line_outer: s.line_outer,

            current_advanced_material:s.current_advanced_material,
            current_material:s.current_material,
        })
    }
    restore() {
        if (this.stack.length) {
            this.state = this.stack.pop()!
        }
    }

    get fill_color():Color{
        return this.state.fill_color
    }
    set fill_color(c: Color) {
        this.state.fill_color = c
    }

    get stroke_color():Color{
        return this.state.stroke_color
    }
    set stroke_color(c: Color) {
        this.state.stroke_color = c
    }

    get line_width():number{
        return this.state.line_width
    }
    set line_width(w: number) {
        this.state.line_width = w
    }
    get line_outer():number{
        return this.state.line_outer
    }
    set line_outer(w: number) {
        this.state.line_outer = w
    }
    get line_inner():number{
        return this.state.line_inner
    }
    set line_inner(w: number) {
        this.state.line_inner = w
    }

    get transform_matrix():Matrix{
        return this.state.transform_matrix
    }
    set transform_matrix(m:Matrix){
        this.state.transform_matrix=m
    }

    get global_tint():Color{
        return this.state.global_tint
    }
    set global_tint(t:Color){
        this.state.global_tint=t
    }

    protected apply_color(c: Color): Color {
        return {
            r: c.r*(this.state.global_tint.r/255),
            g: c.g*(this.state.global_tint.g/255),
            b: c.b*(this.state.global_tint.b/255),
            a: c.a*(this.state.global_tint.a/255)
        }
    }

    translate(x: number, y: number) {
        this.state.transform_matrix = matrix4.mult(
            this.state.transform_matrix,
            matrix4.translation_2d({ x, y })
        )
    }
    rotate(rad: number) {
        this.state.transform_matrix = matrix4.mult(
            this.state.transform_matrix,
            matrix4.zRotation(rad)
        )
    }
    scale(x: number, y: number) {
        this.state.transform_matrix = matrix4.mult(
            this.state.transform_matrix,
            matrix4.scale_3d({ x, y, z: 1 })
        )
    }
    reset_transform() {
        this.state.transform_matrix = matrix4.identity()
    }

    abstract fill_rect(x: number, y: number, w: number, h: number):void
    abstract stroke_rect(x: number, y: number, w: number, h: number):void
    abstract round_rect(x: number,y: number,w: number,h: number,r: number,segments?:number):void
    draw_grid(begin_x: number,begin_y: number,end_x: number,end_y: number,grid_size: number,offset:Vec2=v2.zero):void {
        const gx0 = Math.min(begin_x, end_x)+offset.x
        const gx1 = Math.max(begin_x, end_x)+offset.y
        const gy0 = Math.min(begin_y, end_y)+offset.x
        const gy1 = Math.max(begin_y, end_y)+offset.y

        for (let x = gx0; x <= gx1; x++) {
            const wx = x * grid_size
            this.begin_path()
            this.move_to(wx, gy0 * grid_size)
            this.line_to(wx, gy1 * grid_size)
            this.stroke()
        }
        for (let y = gy0; y <= gy1; y++) {
            const wy = y * grid_size
            this.begin_path()
            this.move_to(gx0 * grid_size, wy)
            this.line_to(gx1 * grid_size, wy)
            this.stroke()
        }
    }

    begin_path() {
        this.path.length = 0
    }
    move_to(x: number, y: number) {
        this.path.push({ x, y })
    }
    line_to(x: number, y: number) {
        this.path.push({ x, y })
    }

    rect(min: Vec2, max: Vec2) {
        this.begin_path()

        this.move_to(min.x, min.y)
        this.line_to(max.x, min.y)
        this.line_to(max.x, max.y)
        this.line_to(min.x, max.y)
        this.line_to(min.x, min.y)
    }
    circle(center: Vec2, radius: number, segments = 32) {
        this.begin_path()
        this.arc(center.x, center.y, radius, 0, Math.PI * 2, segments)
        if (this.path.length) {
            this.line_to(this.path[0].x, this.path[0].y)
        }
    }
    arc(cx: number,cy: number,radius: number,start: number,end: number,segments = 32) {
        const step = (end - start) / segments
        for (let i = 0; i <= segments; i++) {
            const a = start + step * i
            const x = cx + Math.cos(a) * radius
            const y = cy + Math.sin(a) * radius
            this.path.push({ x, y })
        }
    }

    set_hitbox(hb: Hitbox2D, segments = 32) {
        this.begin_path()
        switch (hb.type) {
            case HitboxType2D.null:
                break
            case HitboxType2D.circle:
                this.circle(hb.position,hb.radius,segments)
                break
            case HitboxType2D.rect:
                this.rect(hb.min, hb.max)
                break
            case HitboxType2D.group:
                for (const child of hb.hitboxes) {
                    this.set_hitbox(child, segments)
                }
                break
            case HitboxType2D.polygon:
                if (hb.points.length === 0) return
                this.move_to(hb.points[0].x, hb.points[0].y)
                for (let i = 1; i < hb.points.length; i++) {
                    this.line_to(hb.points[i].x, hb.points[i].y)
                }
                this.line_to(hb.points[0].x, hb.points[0].y)
                break
        }
    }

    abstract fill():void
    abstract fill_model(model: Model2D,position:Vec2,scale:Vec2,rotation:number):void

    abstract stroke():void
    abstract stroke_model(model:Model2D,position:Vec2,scale:Vec2,rotation:number):void

    abstract draw_frame2d(frame:Frame|undefined,model:Float32Array,tint?: Color):void
    abstract draw_batcher(batcher:Batcher,matrix?:Matrix):void

    abstract sub_context():Context2D
    abstract render(renderer:Renderer):void
    abstract clear():void
}
export class BatcherContext2D extends Context2D{
    batcher: Batcher

    constructor() {
        super()
        this.batcher=new Batcher()
    }
    fill_rect(x: number, y: number, w: number, h: number) {
        const model = model2d.rect(
            { x, y },
            { x: x + w, y: y + h }
        )

        const c = this.apply_color(this.state.fill_color)

        /*this.batcher.draw_model2d(
            this.materials[this.current_material],
            model,
            v2.null,
            v2.null,
            0,
            {
                color: { value: [c.r, c.g, c.b, c.a] }
            },
        )*/
    }
    stroke_rect(x: number, y: number, w: number, h: number) {
        const lw = this.state.line_width

        this.fill_rect(x, y, w, lw)
        this.fill_rect(x, y + h - lw, w, lw)
        this.fill_rect(x, y, lw, h)
        this.fill_rect(x + w - lw, y, lw, h)
    }
    fill() {
        if (this.path.length < 3||!this.state.current_material) return

        const model = model2d.triangulateConvex(this.path)
        const c = this.apply_color(this.state.fill_color as Color)

        const vertexCount = model.vertices.length / 2
        if (vertexCount < 2) return
        const cmd = this.batcher.ensure(this.state.current_material)

        for(let i=0;i<vertexCount;i++){
            cmd.stream.write_float32(model.vertices[i*2]) // 4
            cmd.stream.write_float32(model.vertices[i*2+1]) // 8
            cmd.stream.write_uint8(c.r) // 29
            cmd.stream.write_uint8(c.g) // 30
            cmd.stream.write_uint8(c.b) // 31
            cmd.stream.write_uint8(c.a) // 32
            cmd.vertex_count++
        }
    }
    stroke() {
        if (this.path.length < 2||!this.state.current_material) return
        const c = this.apply_color(this.state.stroke_color as Color)
        const cmd = this.batcher.ensure(this.state.current_material)
        for (let i = 0; i < this.path.length - 1; i++) {
            const a = this.path[i]
            const b = this.path[i + 1]
            const line = model2d.line(a, b, this.state.line_width)
            const vertexCount = line.vertices.length / 2
            if (vertexCount < 2) return
            for(let i=0;i<vertexCount;i++){
                cmd.stream.write_float32(line.vertices[i*2]) // 4
                cmd.stream.write_float32(line.vertices[i*2+1]) // 8
                cmd.stream.write_uint8(c.r) // 29
                cmd.stream.write_uint8(c.g) // 30
                cmd.stream.write_uint8(c.b) // 31
                cmd.stream.write_uint8(c.a) // 32
                cmd.vertex_count++
            }
        }
    }
    draw_frame2d(frame:Frame|undefined,model:Float32Array,tint: Color=ColorM.default.white, on_vertex_add?:(cmd:BatcherMaterialCommand,vertex:number)=>void) {
        if(!frame||!frame.texture?.material||tint.a<=0)return
        const vertexCount = model.length / 2
        if (vertexCount < 2) return
        const cmd = this.batcher.ensure(frame.texture.material,this.transform_matrix)
        for(let i=0;i<vertexCount;i++){
            cmd.stream.write_float32(model[i*2])
            cmd.stream.write_float32(model[i*2+1])
            Stream.write_uv(cmd.stream,frame.texcoords[i*2],frame.texcoords[i*2+1])
            cmd.stream.write_uint8(tint.r)
            cmd.stream.write_uint8(tint.g)
            cmd.stream.write_uint8(tint.b)
            cmd.stream.write_uint8(tint.a)
            on_vertex_add?.(cmd,i)
            cmd.vertex_count++
        }
        return cmd
    }

    fill_model(model: Model2D,position:Vec2,scale:Vec2,rotation:number){
        if(!this.advanced_material)return
        const c = this.apply_color(this.state.fill_color as Color)

        const vertexCount = model.vertices.length / 2
        if (vertexCount < 2) return
        const cmd = this.batcher.ensure(this.advanced_material)

        for(let i=0;i<vertexCount;i++){
            cmd.stream.write_float32(model.vertices[i*2]) // 4
            cmd.stream.write_float32(model.vertices[i*2+1]) // 8
            cmd.stream.write_float32(position.x) // 12
            cmd.stream.write_float32(position.y) // 16
            cmd.stream.write_float32(scale.x) // 20
            cmd.stream.write_float32(scale.y) // 24
            cmd.stream.write_float32(rotation) // 28
            cmd.stream.write_uint8(c.r) // 29
            cmd.stream.write_uint8(c.g) // 30
            cmd.stream.write_uint8(c.b) // 31
            cmd.stream.write_uint8(c.a) // 32
            cmd.vertex_count++
        }
    }
    stroke_model(model: Model2D, position: Vec2, scale: Vec2, rotation:number): void {
        const c = this.apply_color(this.state.stroke_color)

        /*this.batcher.draw_model2d(
            this.materials[1],
            model2d.stroke_model(model,this.state.line_width,this.state.line_inner,this.state.line_outer),
            position,
            scale,
            rotation,
            {
                color: { value: [c.r, c.g, c.b, c.a] }
            }
        )*/
    }
    override draw_batcher(batcher: Batcher, matrix?: Matrix): void {
        this.batcher.draw_batcher(batcher,matrix)
    }
    round_rect(x: number,y: number,w: number,h: number,r: number,segments = 8) {
        r = Math.min(r, w / 2, h / 2)

        this.begin_path()

        this.move_to(x + r, y)
        this.line_to(x + w - r, y)
        this.arc(x + w - r, y + r, r, -Math.PI / 2, 0, segments)

        this.line_to(x + w, y + h - r)
        this.arc(x + w - r, y + h - r, r, 0, Math.PI / 2, segments)

        this.line_to(x + r, y + h)
        this.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI, segments)

        this.line_to(x, y + r)
        this.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5, segments)
    }

    render(_renderer:Renderer){
    }
    clear(){
        this.batcher.clear()
    }
    override sub_context(): BatcherContext2D {
        const ctx=new BatcherContext2D()

        ctx.default_advanced_material=this.default_advanced_material
        ctx.state.current_advanced_material=ctx.default_advanced_material
    
        ctx.default_material=this.default_material
        ctx.state.current_material=ctx.default_material
        
        return ctx
    }
}
export class GLContext2D extends BatcherContext2D{
    renderer:WebglRenderer
    constructor(renderer:WebglRenderer) {
        super()
        this.renderer=renderer

        this.default_advanced_material=(renderer as WebglRenderer).factorys2D.simple_batch.create({})
        this.state.current_advanced_material=this.default_advanced_material

        this.default_material=(renderer as WebglRenderer).factorys2D.ctx_simple_batch.create({})
        this.state.current_material=this.default_material
    }
    override render(renderer: WebglRenderer): void {
        super.render(renderer)
        this.batcher.render(renderer,this.base_matrix)
    }
}