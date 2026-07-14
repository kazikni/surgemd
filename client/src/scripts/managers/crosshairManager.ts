import { ColorM } from "common/engine/core.ts";

export interface Crosshair {
    color: string;
    size: number;
    code: string;
    stroke: number;
    stroke_color: string;
    cursor: string;
    dynamic: boolean;

    rotate?:boolean
    rotateSpeed?:number

    pulse?:boolean
    pulseSpeed?:number

    rainbow?: boolean,
    rainbowSpeed?: number,

    gen_callback?: (
        crosshair: Crosshair,
        spread: number,
        t?: number
    ) => string
}

function getCrosshairDims(def: Crosshair) {
    const base = 64;
    const size = Math.round((base * Number(def.size)) / 4) * 4;
    return { width: size, height: size };
}

function makeSVGDataURL(def: Crosshair,color = def.color,stroke_color = def.stroke_color): string {
    const { width, height } = getCrosshairDims(def)
    const stroke = def.stroke
    const svg = def.code
        .replace(/%FILL%/g, color)
        .replace(/%STROKE%/g, stroke_color)
        .replace(/%WIDTH%/g, `${stroke}`)
        .replace(/width="64"/g, `width="${width}"`)
        .replace(/height="64"/g, `height="${height}"`)
        .replace(/#/g, "%23");
    return `url('data:image/svg+xml;utf8,${svg.replace(/#/g, "%23")}')`;
}

function makeCursorCSS(def: Crosshair,fill = def.color,stroke = def.stroke_color): string {
    const { width, height } = getCrosshairDims(def);
    return `${makeSVGDataURL(def,fill,stroke)} ${width / 2} ${height / 2}, crosshair`;
}
export abstract class CrosshairBase {
    protected spread = 0
    protected dirty = true

    constructor(protected elem: HTMLElement) {}

    setSpread(v: number) {
        if (this.spread !== v) {
            this.spread = v
            this.dirty = true
        }
    }

    tick(_dt: number) {}

    protected abstract build(): string

    render() {
        if (!this.dirty) return
        this.elem.style.cursor = this.build()
        this.dirty = false
    }

    destroy() {}
}
export class StaticCrosshair extends CrosshairBase {
    private time = 0
    rainbow?:boolean

    constructor(elem: HTMLElement,private def: Crosshair){
        super(elem)
    }

    override tick(dt:number){
        if(!this.def.rainbow&&!this.rainbow){
            return
        }
        this.time += dt
        this.dirty = true
    }

    protected build():string{
        if(!this.def.rainbow&&!this.rainbow){
            return makeCursorCSS(this.def)
        }
        const speed = this.def.rainbowSpeed ?? 120
        const color = ColorM.hsv((this.time * speed) % 360,1,1)
        return makeCursorCSS(
            this.def,
            ColorM.rgba2hex(color),
            ColorM.rgba2hex(ColorM.mult_hsv(color,undefined,undefined,0.25))
        );
    }
}
export class DynamicCrosshairCursor extends CrosshairBase {
    constructor(elem: HTMLElement, private def: Crosshair) {
        super(elem)
    }

    protected build(): string {
        return this.def.gen_callback
            ? this.def.gen_callback(this.def, this.spread, 0)
            : makeCursorCSS(this.def)
    }
}
export class CrosshairManager {
    private current?: CrosshairBase

    constructor(private elem: HTMLElement) {}

    set(c: CrosshairBase) {
        this.current?.destroy()
        this.current = c
        this.current.render()
    }

    setSpread(v: number) {
        this.current?.setSpread(v)
    }

    tick(dt: number) {
        if (!this.current) return
        this.current.tick(dt)
        this.current.render()
    }

    clear(defaultCursor: string) {
        this.current?.destroy()
        this.current = undefined
        this.elem.style.cursor = defaultCursor
    }
}