import { Numeric } from "./utils.ts"

export type RGBAT={r: number, g: number, b: number, a?: number}
export type Vec4={
    x: number
    y: number
    z: number
    w: number
}
export interface Color {
    r: number; // Red
    g: number; // Green
    b: number; // Blue
    a: number; // Alpha
}
export interface STint{
    color:number
    alpha:number
}
export const ColorM={
    /**
     * Create The Color RGBA, limit=`(0 To 255)`
     * @param r Red
     * @param g Green
     * @param b Blue
     * @param a Alpha
     * @returns A New Color
     */
    rgba(r: number, g: number, b: number, a: number = 255): Color {
        return {
            r: Numeric.clamp(Math.round(r),0,255),
            g: Numeric.clamp(Math.round(g),0,255),
            b: Numeric.clamp(Math.round(b),0,255),
            a: Numeric.clamp(Math.round(a),0,255),
        }
    },
    hex(hex: string): Color {
        hex = hex.replace("#", "").replace("0x","")

        if (![3,4,6,8].includes(hex.length))
            throw new Error("Invalid hex color")

        let r:number = 0
        let g:number = 0
        let b:number = 0
        let a:number = 255

        if (hex.length === 3 || hex.length === 4) {
            r = parseInt(hex[0] + hex[0],16)
            g = parseInt(hex[1] + hex[1],16)
            b = parseInt(hex[2] + hex[2],16)

            if (hex.length === 4)
                a = parseInt(hex[3] + hex[3],16)

        } else if (hex.length === 6 || hex.length === 8) {
            r = parseInt(hex.slice(0,2),16)
            g = parseInt(hex.slice(2,4),16)
            b = parseInt(hex.slice(4,6),16)

            if (hex.length === 8)
                a = parseInt(hex.slice(6,8),16)
        }

        return {
            r: r,
            g: g,
            b: b,
            a: a
        }
    },
    number(color:number):Color{
        color = Numeric.clamp(color,0,0xffffff)|0
        const r = (color >> 16) & 0xFF
        const g = (color >> 8) & 0xFF
        const b = color & 0xFF
        return { r:r, g:g, b:b, a: 255 }
    },
    hsv(h: number, s: number, v: number, a: number = 255): Color {
        h = ((h % 360) + 360) % 360
        s = Numeric.clamp(s, 0, 1)
        v = Numeric.clamp(v, 0, 1)

        const c = v * s
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
        const m = v - c

        let r = 0, g = 0, b = 0

        if (h < 60)      { r = c; g = x; b = 0 }
        else if (h < 120){ r = x; g = c; b = 0 }
        else if (h < 180){ r = 0; g = c; b = x }
        else if (h < 240){ r = 0; g = x; b = c }
        else if (h < 300){ r = x; g = 0; b = c }
        else             { r = c; g = 0; b = x }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255),
            a: Math.round(a)
        }
    },
    rgba2hex(color: Color): string {
        const r = Numeric.clamp(Math.round(color.r), 0, 255)
        const g = Numeric.clamp(Math.round(color.g), 0, 255)
        const b = Numeric.clamp(Math.round(color.b), 0, 255)
        const a = Numeric.clamp(Math.round(color.a), 0, 255)

        const red   = r.toString(16).padStart(2, "0")
        const green = g.toString(16).padStart(2, "0")
        const blue  = b.toString(16).padStart(2, "0")
        const alpha = a.toString(16).padStart(2, "0")

        if (a === 255) {
            return `#${red}${green}${blue}`
        }

        return `#${red}${green}${blue}${alpha}`
    },
    rgb2hsv(color: Color): { h: number; s: number; v: number; a: number } {
        const r = color.r / 255
        const g = color.g / 255
        const b = color.b / 255

        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const d = max - min

        let h = 0
        if (d !== 0) {
            if (max === r) h = ((g - b) / d) % 6
            else if (max === g) h = (b - r) / d + 2
            else h = (r - g) / d + 4

            h *= 60
            if (h < 0) h += 360
        }

        const s = max === 0 ? 0 : d / max
        const v = max

        return { h, s, v, a: color.a }
    },
    number2hex(color:number):string{
        return `#${color.toString(16).padStart(6, '0')}`
    },
    hex2number(color: string): number {
        return parseInt(color.replace(/^#/, ''), 16)
    },
    mult(dst:Color,x:Color,y:Color){
        dst.r=Math.floor(x.r*(y.r/255))
        dst.g=Math.floor(x.g*(y.g/255))
        dst.b=Math.floor(x.b*(y.b/255))
        dst.a=Math.floor(x.a*(y.a/255))
    },
    mult_rgba(x:Color,r:number,g:number,b:number,a:number){
        return {
            r:x.r*r,
            g:x.g*g,
            b:x.b*b,
            a:x.a*a,
        }
    },
    mult_hsv(
        color: Color,
        hMul: number = 1,
        sMul: number = 1,
        vMul: number = 1,
        aMul: number = 1
    ): Color {
        const hsv = this.rgb2hsv(color)
        return this.hsv(
            hsv.h * hMul,
            hsv.s * sMul,
            hsv.v * vMul,
            hsv.a * aMul
        )
    },
    number_mul_hsv(
        color:number,
        hAdd:number=0,
        sMul:number=1,
        vMul:number=1
    ):number{
        const hsv = this.rgb2hsv(this.number(color))

        const c = this.hsv(
            (hsv.h + hAdd + 360) % 360,
            Numeric.clamp(hsv.s * sMul,0,1),
            Numeric.clamp(hsv.v * vMul,0,1)
        )

        return (
            (Math.round(c.r) << 16) |
            (Math.round(c.g) << 8) |
            Math.round(c.b)
        )
    },

    set1(dst:Color,val:Color){
        dst.r=Math.floor(val.r)
        dst.g=Math.floor(val.g)
        dst.b=Math.floor(val.b)
        dst.a=Math.floor(val.a)
    },
    default:{
        black:{
            r:0,
            g:0,
            b:0,
            a:255
        },
        white:{
            r:255,
            g:255,
            b:255,
            a:255
        },
        transparent:{
            r:255,
            g:255,
            b:255,
            a:0,
        },
        red:{
            r:255,
            g:0,
            b:0,
            a:255
        },
        green:{
            r:0,
            g:255,
            b:0,
            a:255
        },
        blue:{
            r:0,
            g:0,
            b:255,
            a:255
        },
        yellow:{
            r:255,
            g:255,
            b:0,
            a:255
        }
    },
    lerp(a:Color, b: Color,i:number): Color {
        return {
            r: Math.round(Numeric.lerp(a.r,b.r,i)),
            g: Math.round(Numeric.lerp(a.g,b.g,i)),
            b: Math.round(Numeric.lerp(a.b,b.b,i)),
            a: Math.round(Numeric.lerp(a.a,b.a,i)),
        }
    },
    clone(a:Color): Color {
        return { r: a.r,g: a.g,b: a.b,a: a.a};
    },
}
export class Vec4M{
    on_set:()=>void
    _x:number=0
    _y:number=0
    _z:number=0
    _w:number=1

    get r():number{return this._x}
    set r(val:number){this._x=val;this.on_set()}
    get g():number{return this._y}
    set g(val:number){this._y=val;this.on_set()}
    get b():number{return this._z}
    set b(val:number){this._z=val;this.on_set()}
    get a():number{return this._w}
    set a(val:number){this._w=val;this.on_set()}

    get x():number{return this._x}
    set x(val:number){this._x=val;this.on_set()}
    get y():number{return this._y}
    set y(val:number){this._y=val;this.on_set()}
    get z():number{return this._z}
    set z(val:number){this._z=val;this.on_set()}
    get w():number{return this._w}
    set w(val:number){this._w=val;this.on_set()}
    set(x:number,y:number,z:number,w:number){
        this._x=x
        this._y=y
        this._z=z
        this._w=w
        this.on_set()
    }

    constructor(x:number,y:number,z:number,w:number,on_set:()=>void=()=>{}){
        this._x=x
        this._y=y
        this._z=z
        this._w=w
        this.on_set=on_set
    }
}