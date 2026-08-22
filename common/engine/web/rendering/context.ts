import { Model2D, model2d } from "../../core/definition/models.ts"
import { Color, ColorM } from "../../core/math/color.ts"
import { v2, Vec2 } from "../../core/math/vec2.ts"
import { Batcher, BatcherCommand, BatcherMaterialCommand } from "./batcher.ts"
import { type Texture, type Material, type Renderer, type WebglRenderer, type GLTexture } from "./renderer.ts"
import { Frame } from "../resources/resources.ts"
import { Matrix, matrix4 } from "../../core/math/matrix.ts";
import { Hitbox2D, HitboxType2D } from "../../core/math/hitbox.ts";
import { Stream } from "../../core/net/stream.ts";

export type VertexAddCallback=(cmd:BatcherMaterialCommand,vertex:number)=>void
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

    current_material?:Material
    on_vertex?:VertexAddCallback
}
export abstract class Context2D{
    protected state: ContextState
    protected stack: ContextState[] = []

    protected path: Vec2[][]=[]

    default_material?:Material
    base_matrix?:Matrix

    get material():Material|undefined{
        return this.state.current_material
    }
    set material(val:Material|undefined){
        this.state.current_material=val
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

            current_material:s.current_material,
            on_vertex:s.on_vertex
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
        this.state.transform_matrix = matrix4.mul(
            this.state.transform_matrix,
            matrix4.translation_2d({ x, y })
        )
    }
    rotate(rad: number) {
        this.state.transform_matrix = matrix4.mul(
            this.state.transform_matrix,
            matrix4.zRotation(rad)
        )
    }
    scale(x: number, y: number) {
        this.state.transform_matrix = matrix4.mul(
            this.state.transform_matrix,
            matrix4.scale_3d({ x, y, z: 1 })
        )
    }
    reset_transform() {
        this.state.transform_matrix = matrix4.identity()
    }

    grid(begin_x: number,begin_y: number,end_x: number,end_y: number,grid_size: number,offset:Vec2=v2.zero):void {
        const gx0 = Math.min(begin_x, end_x)+offset.x
        const gx1 = Math.max(begin_x, end_x)+offset.x
        const gy0 = Math.min(begin_y, end_y)+offset.y
        const gy1 = Math.max(begin_y, end_y)+offset.y
        for (let x = gx0; x <= gx1; x++) {
            const wx = x * grid_size
            this.move_to(wx, gy0 * grid_size)
            this.line_to(wx, gy1 * grid_size)
        }
        for (let y = gy0; y <= gy1; y++) {
            const wy = y * grid_size
            this.move_to(gx0 * grid_size, wy)
            this.line_to(gx1 * grid_size, wy)
        }
    }

    begin_path(){
        this.path.length=0
    }
    end_path(){
    }

    move_to(x: number, y: number) {
        this.path.push([{x,y}])
    }
    line_to(x: number, y: number) {
        if(this.path.length===0)this.path.push([])
        this.path[this.path.length-1].push({x,y})
    }

    rect(min: Vec2, max: Vec2) {
        this.move_to(min.x, min.y)
        this.line_to(max.x, min.y)
        this.line_to(max.x, max.y)
        this.line_to(min.x, max.y)
    }
    /*round_rect(x: number,y: number,w: number,h: number,r: number,segments = 8) {
        r = Math.min(r, w / 2, h / 2)
        this.move_to(x + r, y)
        this.line_to(x + w - r, y)
        this.arc(x + w - r, y + r, r, -Math.PI / 2, 0, segments)
        this.line_to(x + w, y + h - r)
        this.arc(x + w - r, y + h - r, r, 0, Math.PI / 2, segments)
        this.line_to(x + r, y + h)
        this.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI, segments)
        this.line_to(x, y + r)
        this.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5, segments)
    }*/
    circle(center: Vec2, radius: number, segments = 32) {
        if (segments < 3) segments = 3
        const path: Vec2[] = []
        const step = Math.PI * 2 / segments
        for (let i = 0; i < segments; i++) {
            const a = i * step
            path.push({
                x: center.x + Math.cos(a) * radius,
                y: center.y + Math.sin(a) * radius
            })
        }
        this.path.push(path)
    }
    arc(cx: number,cy: number,radius: number,start: number,end: number,segments = 32){
        if(segments<1)segments=1
        const step = (end - start) / segments
        for (let i = 0; i <= segments; i++) {
            const a = start + step * i
            this.line_to(cx + Math.cos(a) * radius,cy + Math.sin(a) * radius)
        }
    }

    hitbox(hb: Hitbox2D, segments = 32) {
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
                    this.hitbox(child, segments)
                }
                break
            case HitboxType2D.polygon: {
                if(hb.points.length===0)return
                this.move_to(hb.points[0].x,hb.points[0].y)
                for (let i = 1; i < hb.points.length; i++) {
                    const p = hb.points[i]
                    this.line_to(p.x,p.y)
                }
                return
            }
        }
    }

    /*subdivide(iterations = 1) {
        const closed=this.path.length>2&&v2.distance(this.path[0], this.path[this.path.length - 1])<0.0001
        let pts=closed?this.path.slice(0, -1):[...this.path]
        for (let k = 0; k < iterations; k++) {
            const out: Vec2[] = []
            const last = closed ? pts.length:pts.length-1
            if(!closed)out.push(v2.clone(pts[0]))

            for (let i = 0; i < last; i++) {
                const a = pts[i];
                const b = pts[(i + 1) % pts.length]
                out.push({
                    x: a.x * 0.75 + b.x * 0.25,
                    y: a.y * 0.75 + b.y * 0.25
                })
                out.push({
                    x: a.x * 0.25 + b.x * 0.75,
                    y: a.y * 0.25 + b.y * 0.75
                })
            }
            if(!closed)out.push(v2.clone(pts[pts.length - 1]));
            pts = out
        }
        if(closed)pts.push(v2.clone(pts[0]))
        this.path = pts
    }*/
    /*round(strength = 0.5, iterations = 1) {
        const closed =
            this.path.length > 2 &&
            v2.distance(this.path[0], this.path[this.path.length - 1]) < 0.0001;

        let pts = closed
            ? this.path.slice(0, -1)
            : [...this.path];

        for (let k = 0; k < iterations; k++) {
            const out = pts.map((v)=>v2.clone(v));

            const begin = closed ? 0 : 1;
            const end = closed ? pts.length : pts.length - 1;

            for (let i = begin; i < end; i++) {

                const prev = pts[(i - 1 + pts.length) % pts.length];
                const next = pts[(i + 1) % pts.length];

                const avg = {
                    x: (prev.x + next.x) * 0.5,
                    y: (prev.y + next.y) * 0.5
                };

                out[i] = {
                    x: pts[i].x * (1 - strength) + avg.x * strength,
                    y: pts[i].y * (1 - strength) + avg.y * strength
                };
            }

            pts = out;
        }

        if (closed)
            pts.push(v2.clone(pts[0]));

        this.path = pts;
    }*/

    fill(matrix:Matrix=matrix4.default.identity):void{
        if(!this.state.current_material)return
        const color=this.apply_color(this.state.fill_color as Color)
        for(const p of this.path){
            this.draw_model(model2d.triangulateConvex(p,undefined,this.state.transform_matrix),color,matrix,this.state.current_material,this.state.on_vertex)
        }
    }
    fill_model(model:Model2D,matrix:Matrix=matrix4.default.identity):void{
        if(this.state.current_material)this.draw_model(model,this.apply_color(this.state.fill_color as Color),matrix,this.state.current_material,this.state.on_vertex)
    }
    stroke(matrix:Matrix=matrix4.default.identity,on_vertex?:VertexAddCallback){
        if(!this.state.current_material)return
        const color=this.apply_color(this.state.stroke_color as Color)
        for(const path of this.path){
            for (let i = 0;i<path.length-1;i++) {
                const a=path[i]
                const b=path[i+1]
                const line=model2d.line(a,b,this.state.line_width)
                const vertexCount = line.vertices.length / 2
                if (vertexCount < 2) return
                this.draw_model(line,color,matrix,this.state.current_material,on_vertex)
            }
        }
    }

    abstract draw_model(model:Model2D,color:Color,matrix:Matrix,material:Material,on_vertex?:VertexAddCallback):void
    abstract draw_frame2d(frame:Frame|undefined,model:Float32Array,tint?: Color,matrix?:Matrix):void
    abstract draw_batcher(batcher:Batcher,matrix?:Matrix):void

    abstract sub_context():Context2D
    abstract render(renderer:Renderer):void
    abstract clear():void

    abstract bind_texture(texture:Texture):void
    abstract finish_texture(matrix?:Matrix):void
    abstract create_texture(width:number,height:number,smooth?:boolean):Texture|undefined
}
export class BatcherContext2D extends Context2D{
    batcher: Batcher

    constructor() {
        super()
        this.batcher=new Batcher()
    }
    draw_model(model:Model2D,color:Color,matrix:Matrix,material:Material,on_vertex?:VertexAddCallback){
        const vertexCount = model.vertices.length / 2
        if (vertexCount < 2) return
        const cmd = this.batcher.ensure(material)
        for(let i=0;i<vertexCount;i++){
            const x=model.vertices[i*2]
            const y=model.vertices[i*2+1]
            cmd.stream.write_float32(matrix[0]*x+matrix[4]*y+matrix[12])
            cmd.stream.write_float32(matrix[1]*x+matrix[5]*y+matrix[13])
            cmd.stream.write_uint8(color.r) // 29
            cmd.stream.write_uint8(color.g) // 30
            cmd.stream.write_uint8(color.b) // 31
            cmd.stream.write_uint8(color.a) // 32
            on_vertex?.(cmd,i)
            cmd.vertex_count++
        }
    }
    draw_frame2d(frame:Frame|undefined,model:Float32Array,tint: Color=ColorM.default.white,matrix:Matrix=matrix4.default.identity, on_vertex?:VertexAddCallback) {
        if(!frame||!frame.texture?.material||tint.a<=0)return
        const vertexCount = model.length / 2
        if (vertexCount < 2) return
        const cmd = this.batcher.ensure(frame.texture.material)
        for(let i=0;i<vertexCount;i++){
            const x=model[i*2]
            const y=model[i*2+1]
            cmd.stream.write_float32(matrix[0]*x+matrix[4]*y+matrix[12])
            cmd.stream.write_float32(matrix[1]*x+matrix[5]*y+matrix[13])
            Stream.write_uv(cmd.stream,frame.texcoords[i*2],frame.texcoords[i*2+1])
            cmd.stream.write_uint8(tint.r)
            cmd.stream.write_uint8(tint.g)
            cmd.stream.write_uint8(tint.b)
            cmd.stream.write_uint8(tint.a)
            on_vertex?.(cmd,i)
            cmd.vertex_count++
        }
        return cmd
    }

    override draw_batcher(batcher: Batcher,matrix?:Matrix): void {
        this.batcher.draw_batcher(batcher,matrix)
    }

    render(_renderer:Renderer){
    }
    clear(){
        this.batcher.clear()
    }
    override sub_context(): BatcherContext2D {
        const ctx=new BatcherContext2D()
    
        ctx.default_material=this.default_material
        ctx.state.current_material=ctx.default_material
        
        return ctx
    }

    override bind_texture(texture:Texture):void{
        return
    }
    override finish_texture(matrix?:Matrix):void{
        return
    }
    override create_texture(width:number,height:number,smooth?:boolean):Texture|undefined{
        return
    }
}
export class GLContext2D extends BatcherContext2D{
    renderer:WebglRenderer

    commands:BatcherCommand[]=[]
    constructor(renderer:WebglRenderer) {
        super()
        this.renderer=renderer

        this.default_material=(renderer as WebglRenderer).factorys2D.simple_batch.create({})
        this.state.current_material=this.default_material
    }
    override render(renderer: WebglRenderer): void {
        super.render(renderer)
        this.batcher.render(renderer,this.base_matrix)
    }

    override bind_texture(texture:GLTexture):void{
        this.commands=this.batcher.commands
        this.batcher.commands=[]
        this.renderer.bind_texture(texture)
    }
    override finish_texture(matrix?:Matrix):void{
        this.batcher.render(this.renderer,matrix??this.base_matrix)
        this.batcher.clear()
        this.batcher.commands=this.commands
    }
    override create_texture(width:number,height:number,smooth?:boolean):GLTexture|undefined{
        return this.renderer.create_texture(width,height,smooth)
    }
}