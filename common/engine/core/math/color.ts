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
        return { r: r / 255, g: g / 255, b: b / 255, a: a / 255 };
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
            r: r / 255,
            g: g / 255,
            b: b / 255,
            a: a / 255
        }
    },
    number(color:number):Color{
        color=Math.min(0xffffff,color)
        const r = (color >> 16) & 0xFF
        const g = (color >> 8) & 0xFF
        const b = color & 0xFF
        return { r:r/255, g:g/255, b:b/255, a: 1 }
    },
    hsv(h: number, s: number, v: number, a: number = 1): Color {
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
            r: r + m,
            g: g + m,
            b: b + m,
            a
        }
    },
    rgba2hex(color: Color): string {
        const r = Numeric.clamp(Math.round(color.r * 255), 0, 255)
        const g = Numeric.clamp(Math.round(color.g * 255), 0, 255)
        const b = Numeric.clamp(Math.round(color.b * 255), 0, 255)
        const a = Numeric.clamp(Math.round(color.a * 255), 0, 255)

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
        const r = color.r
        const g = color.g
        const b = color.b

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
        dst.r=x.r*y.r
        dst.g=x.g*y.g
        dst.b=x.b*y.b
        dst.a=x.a*y.a
    },
    mul_hsv(
        color: Color,
        hMul: number = 1,
        sMul: number = 1,
        vMul: number = 1,
        aMul: number = 1
    ): Color {
        const hsv = this.rgb2hsv(color)

        return this.hsv(
            hsv.h * hMul,
            Numeric.clamp(hsv.s * sMul, 0, 1),
            Numeric.clamp(hsv.v * vMul, 0, 1),
            Numeric.clamp(hsv.a * aMul, 0, 1)
        )
    },

    set1(dst:Color,val:Color){
        dst.r=val.r
        dst.g=val.g
        dst.b=val.b
        dst.a=val.a
    },
    default:{
        black:{
            r:0,
            g:0,
            b:0,
            a:1
        },
        white:{
            r:1,
            g:1,
            b:1,
            a:1
        },
        transparent:{
            r:0,
            g:0,
            b:0,
            a:0,
        },
        red:{
            r:1,
            g:0,
            b:0,
            a:1
        },
        green:{
            r:0,
            g:1,
            b:0,
            a:1
        },
        blue:{
            r:0,
            g:0,
            b:1,
            a:1
        },
        yellow:{
            r:1,
            g:1,
            b:0,
            a:1
        }
    },
    lerp(a:Color, b: Color,i:number): Color {
        return { r: Numeric.lerp(a.r,b.r,i), g: Numeric.lerp(a.g,b.g,i), b: Numeric.lerp(a.b,b.b,i), a: Numeric.lerp(a.a,b.a,i) };
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