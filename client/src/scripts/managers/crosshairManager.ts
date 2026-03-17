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

function makeSVGDataURL(def: Crosshair): string {
    const { width, height } = getCrosshairDims(def);
    const color = def.color
    const stroke = def.stroke;

    const svg = def.code
        .replace(/fill="white"/g, `fill="${color}"`)
        .replace(/stroke-width=".5"/g, `stroke-width="${stroke}"`)
        .replace(/stroke="black"/g, `stroke="${def.stroke_color}"`)
        .replace(/width="64"/g, `width="${width}"`)
        .replace(/height="64"/g, `height="${height}"`)
        .replace(/#/g, "%23");

    return `url('data:image/svg+xml;utf8,${svg.replace(/#/g, "%23")}')`;
}

function makeCursorCSS(def: Crosshair): string {
    const { width, height } = getCrosshairDims(def);
    return `${makeSVGDataURL(def)} ${width / 2} ${height / 2}, crosshair`;
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
    constructor(elem: HTMLElement, private def: Crosshair) {
        super(elem)
        this.dirty = true
    }

    protected build(): string {
        return makeCursorCSS(this.def)
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