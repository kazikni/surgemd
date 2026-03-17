import { Model2D, model2d } from "../../core/definition/models.ts"
import { Color } from "../../core/math/color.ts"
import { cloneDeep } from "../../core/math/utils.ts"
import { Vec2 } from "../../core/math/vec2.ts"
import { Batcher } from "./batcher.ts"
import { Material, WebglRenderer } from "./renderer.ts"
import { Frame } from "../resources/resources.ts"
import { v2 } from "../mod.ts"
import { Matrix, matrix4 } from "../../core/definition/matrix.ts";

export type ContextGradient = {
    type: "linear" | "radial"
    from?: Vec2
    to?: Vec2
    stops: { offset: number; color: Color }[]
}
export type ContextState = {
    fill_style: Color
    stroke_style: Color
    global_tint: Color
    transform_matrix: Matrix

    line_width: number
    line_inner: number
    line_outer: number
}
export abstract class Context2D{
    protected state: ContextState
    protected stack: ContextState[] = []
    protected path: Vec2[] = []
    static default_state():ContextState{
        return {
            fill_style:{r:0,g:0,b:0,a:1},
            stroke_style:{r:0,g:0,b:0,a:1},
            global_tint:{r:1,g:1,b:1,a:1},
            transform_matrix:matrix4.identity(),

            line_width:0.05,
            line_inner:0,
            line_outer:1,
        }
    }
    canvas:HTMLCanvasElement
    base_matrix:Matrix=matrix4.identity()
    constructor(canvas:HTMLCanvasElement){
        this.state = Context2D.default_state()
        this.canvas=canvas
    }
    save() {
        this.stack.push(cloneDeep(this.state))
    }
    restore() {
        if (this.stack.length) {
            this.state = this.stack.pop()!
        }
    }

    get fill_style():Color{
        return this.state.fill_style
    }
    set fill_style(c: Color) {
        this.state.fill_style = c
    }

    get stroke_style():Color{
        return this.state.stroke_style
    }
    set stroke_style(c: Color) {
        this.state.stroke_style = c
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
            r: c.r*this.state.global_tint.r,
            g: c.g*this.state.global_tint.g,
            b: c.b*this.state.global_tint.b,
            a: c.a*this.state.global_tint.a
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
    abstract draw_grid(begin_x: number,begin_y: number,end_x: number,end_y: number,grid_size: number):void

    begin_path() {
        this.path.length = 0
    }
    move_to(x: number, y: number) {
        this.path.push({ x, y })
    }
    line_to(x: number, y: number) {
        this.path.push({ x, y })
    }
    arc(
        cx: number,
        cy: number,
        radius: number,
        start: number,
        end: number,
        segments = 32
    ) {
        const step = (end - start) / segments
        for (let i = 0; i <= segments; i++) {
            const a = start + step * i
            const x = cx + Math.cos(a) * radius
            const y = cy + Math.sin(a) * radius
            this.path.push({ x, y })
        }
    }
    abstract fill():void
    abstract fill_model(model: Model2D,position:Vec2,scale:Vec2,rotation:number):void;

    abstract stroke():void;
    abstract stroke_model(model:Model2D,position:Vec2,scale:Vec2,rotation:number):void;

    abstract draw_frame2d(frame:Frame|undefined,model:Float32Array,tint?: Color, attr?: Record<string, number[]>):void
    abstract draw_model2d(material: Material,model: Model2D,attr: Record<string, { value: Float32Array | number[] }>):void

    abstract render():void
}
export class GLContext2D extends Context2D{
    batcher: Batcher
    
    materials: Material[]=[]
    protected current_material:number=0

    renderer:WebglRenderer

    constructor(renderer:WebglRenderer) {
        super(renderer.canvas)
        this.renderer=renderer

        this.batcher=new Batcher(renderer)
        this.materials.push(renderer.factorys2D.ctx_simple_batch.create({}))
        this.materials.push(renderer.factorys2D.simple_batch.create({}))
    }
    fill_rect(x: number, y: number, w: number, h: number) {
        const model = model2d.rect(
            { x, y },
            { x: x + w, y: y + h }
        )

        const c = this.apply_color(this.state.fill_style)

        this.batcher.draw_model2d(
            this.materials[this.current_material],
            model,
            v2.null,
            v2.null,
            0,
            {
                color: { value: [c.r, c.g, c.b, c.a] }
            },
        )
    }
    stroke_rect(x: number, y: number, w: number, h: number) {
        const lw = this.state.line_width

        this.fill_rect(x, y, w, lw)
        this.fill_rect(x, y + h - lw, w, lw)
        this.fill_rect(x, y, lw, h)
        this.fill_rect(x + w - lw, y, lw, h)
    }
    fill() {
        if (this.path.length < 3) return

        const model = model2d.triangulateConvex(this.path)
        const c = this.apply_color(this.state.fill_style as Color)

        this.batcher.draw_model2d(
            this.materials[this.current_material],
            model,
            v2.null,
            v2.null,
            0,
            {
                color: { value: [c.r, c.g, c.b, c.a] }
            }
        )
    }
    stroke() {
        if (this.path.length < 2) return

        const c = this.apply_color(this.state.stroke_style as Color)

        for (let i = 0; i < this.path.length - 1; i++) {
            const a = this.path[i]
            const b = this.path[i + 1]

            const line = model2d.line(a, b, this.state.line_width)

            this.batcher.draw_model2d(
                this.materials[this.current_material],
                line,
                v2.null,
                v2.null,
                0,
                {
                    color: { value: [c.r, c.g, c.b, c.a] }
                }
            )
        }
    }
    draw_frame2d(frame:Frame|undefined,model:Float32Array,tint?: Color, attr?: Record<string, number[]>): void {
        this.batcher.draw_frame2d(frame,model,tint,attr)
    }
    draw_model2d(material: Material,model: Model2D,attr: Record<string, { value: Float32Array | number[] }>){
        this.batcher.draw_model2d(material,model,v2.null,v2.null,0,attr)
    }
    fill_model(model: Model2D,position:Vec2,scale:Vec2,rotation:number){
        const c = this.apply_color(this.state.fill_style as Color)
        this.batcher.draw_model2d(this.materials[1],model,position,scale,rotation,{
            color: { value: [c.r, c.g, c.b, c.a] }
        })
    }
    stroke_model(model: Model2D, position: Vec2, scale: Vec2, rotation:number): void {
        const c = this.apply_color(this.state.stroke_style)

        this.batcher.draw_model2d(
            this.materials[1],
            model2d.stroke_model(model,this.state.line_width,this.state.line_inner,this.state.line_outer),
            position,
            scale,
            rotation,
            {
                color: { value: [c.r, c.g, c.b, c.a] }
            }
        )
    }
    round_rect(
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
        segments = 8
    ) {
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
    draw_grid(begin_x: number,begin_y: number,end_x: number,end_y: number,grid_size: number) {
        const gx0 = Math.min(begin_x, end_x)
        const gx1 = Math.max(begin_x, end_x)
        const gy0 = Math.min(begin_y, end_y)
        const gy1 = Math.max(begin_y, end_y)

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

    render(){
        this.batcher.render(matrix4.mult(this.base_matrix,this.state.transform_matrix))
    }
}