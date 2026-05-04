import { Angle, DegAngle, Orientation, PolarMovement, RadAngle } from "./geometry.ts"
import { random, SeededRandom } from "./random.ts"

export interface Vec2{
    x:number
    y:number
}

export class Vec2M implements Vec2{
    on_set:()=>void
    _x:number
    _y:number

    get x():number{return this._x}
    set x(val:number){
        if(this._x!=val){
            this._x=val
            this.on_set()
        }
    }
    get y():number{return this._y}
    set y(val:number){
        if(this._y!=val){
            this._y=val
            this.on_set()
        }
    }

    set(x:number,y:number){
        if(this._x!=x||this._y!=y){
            this._x=x
            this._y=y
            this.on_set()
        }
    }

    constructor(x:number,y:number,on_set:()=>void=()=>{}){
        this._x=x
        this._y=y
        this.on_set=on_set
    }
}
export const v2m=Object.freeze({
    single(out:Vec2,val:number){out.x=val;out.y=val;return out},
    zero(out:Vec2){out.x=0;out.y=0},

    add(out:Vec2,a:Vec2, b:Vec2){ out.x = a.x+b.x; out.y = a.y+b.y; },
    sub(out:Vec2,a:Vec2, b:Vec2){ out.x = a.x-b.x; out.y = a.y-b.y; },
    mul(out:Vec2,a:Vec2, b:Vec2){ out.x = a.x*b.x; out.y = a.y*b.y; },
    div(out:Vec2,a:Vec2, b:Vec2){ out.x = a.x/b.x; out.y = a.y/b.y; },
    scale(out:Vec2,a:Vec2, b:number){ out.x = a.x*b; out.y = a.y*b; },
    dscale(out:Vec2,a:Vec2, b:number){ out.x = a.x/b; out.y = a.y/b; },

    set(out:Vec2,x:number,y:number){out.x=x;out.y=y},
    add_component(out:Vec2,x:number,y:number){out.x+=x;out.y+=y},
    sub_component(out:Vec2,x:number,y:number){out.x-=x;out.y-=y},
    mul_component(out:Vec2,x:number,y:number){out.x*=x;out.y*=y},
    div_component(out:Vec2,x:number,y:number){out.x/=x;out.y/=y},

    scale_component(out:Vec2,x:number){out.x*=x;out.y*=x},

    min1(v:Vec2,min:number){v.x=Math.max(v.x,min);v.y=Math.max(v.y,min)},
    min2(x:Vec2,y:Vec2){x.x=Math.max(x.x,y.x);x.y=Math.max(x.y,y.y)},
    max1(v:Vec2,max:number){v.x=Math.min(v.x,max);v.y=Math.min(v.y,max)},
    max2(x:Vec2,y:Vec2){x.x=Math.min(x.x,y.x);x.y=Math.min(x.y,y.y)},

    clamp1(v:Vec2,min:number,max:number){v.x=Math.max(Math.min(v.x,max),min);v.y=Math.max(Math.min(v.y,max),min)},
    clamp2(v:Vec2,min:Vec2,max:Vec2){v.x=Math.max(Math.min(v.x,max.x),min.x);v.y=Math.max(Math.min(v.y,max.y),min.y)},
    normalizeSafe(v:Vec2,fallback?:Vec2) {
        const eps = 0.000001
        const len = v2.len(v)
        if(len>eps){
            v.x/=len
            v.y/=len
        }else{
            v.x=fallback?.x??1
            v.y=fallback?.x??0
        }
    },
    lerp(a: Vec2, b: Vec2,interpolation: number) {a.x+=(b.x-a.x)*interpolation;a.y+=(b.y-a.y)*interpolation},
    abs(a: Vec2){a.x=Math.abs(a.x);a.y=Math.abs(a.y)},
    floor(a: Vec2) {a.x=Math.floor(a.x);a.y=Math.floor(a.y)},
    ceil(a: Vec2) {a.x=Math.ceil(a.x);a.y=Math.ceil(a.y)},

    add_rotate_RadAngle(out:Vec2,a:Vec2,b:Vec2,angle:RadAngle){
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        out.x = a.x+(b.x * cos - b.y * sin)
        out.y = a.y+(b.x * sin + b.y * cos)
    },

    add_rotate_DegAngle(out:Vec2,a:Vec2,b:Vec2,angle:RadAngle){
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        out.x = a.x+(b.x * cos - b.y * sin)
        out.y = a.y+(b.x * sin + b.y * cos)
    },
    rotate_RadAngle(vec: Vec2, angle: RadAngle) {
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const x=vec.x
        const y=vec.y
        vec.x=x * cos - y * sin
        vec.y=x * sin + y * cos
    },
    rotate_DegAngle(vec:Vec2,angle:DegAngle) {
        angle=Angle.deg2rad(angle)
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const x=vec.x
        const y=vec.y
        vec.x=x * cos - y * sin
        vec.y=x * sin + y * cos
    },

    max_decimal(vec:Vec2,decimalPlaces:number){
        const factor = Math.pow(10, decimalPlaces)
        vec.x=Math.round(vec.x * factor) / factor
        vec.y=Math.round(vec.y * factor) / factor
    },
    neg(vec:Vec2){
        vec.x=-vec.x
        vec.y=-vec.y
    }
})

export const v2 = Object.assign((x: number, y: number): Vec2 => ({ x, y }),{
    null:{
        x:0,
        y:0
    } as Vec2,
    sides:[
        {
            x:1,
            y:1,
        },
        {
            x:-1,
            y:1,
        },
        {
            x:-1,
            y:-1,
        },
        {
            x:1,
            y:-1,
        }
    ]as Array<Vec2>,
    /**
     * Creates a new `Vec2`
     * @param x The horizontal (x-axis) coordinate
     * @param y The vertical (y-axis) coordinate
     * @returns A new `Vec2` With X and Y Cords
     */
    new(x:number, y:number): Vec2 {
        return {x, y}
    },
    zero:Object.assign(()=>{
        return {x:0,y:0} as Vec2
    },{x:0,y:0}),
    one:Object.assign(()=>{
        return {x:1,y:1} as Vec2
    },{x:1,y:1}),
    half_one:Object.assign(()=>{
        return {x:0.5,y:0.5} as Vec2
    },{x:0.5,y:0.5}),
    infinity:Object.assign(()=>{
        return {x:Infinity,y:Infinity} as Vec2
    },{x:Infinity,y:Infinity}),
    infinity_neg:Object.assign(()=>{
        return {x:-Infinity,y:-Infinity} as Vec2
    },{x:-Infinity,y:-Infinity}),
    sided(side:Orientation):Vec2{
        switch(side){
            case 0:
                return v2(1,1)
            case 1:
                return v2(-1,1)
            case 2:
                return v2(-1,-1)
            case 3:
                return v2(1,-1)
        }
    },
    orientation_random(side:Orientation,min:Vec2,max:Vec2,expansion:number,random:SeededRandom):Vec2{
        switch(side){
            case 0:
                return v2(max.x+expansion,random.float(min.y,max.y))
            case 1:
                return v2(random.float(min.x,max.x),max.y+expansion)
            case 2:
                return v2(min.x-expansion,random.float(min.y,max.y))
            case 3:
                return v2(random.float(min.x,max.x),min.y-expansion)
        }
    },
    /**
     * Return Random Vec2
     */
    random(min:number, max:number):Vec2 {
        return {x:random.float(min,max),y:random.float(min,max)}
    },
    random2(min:Vec2, max:Vec2):Vec2 {
        return {x:random.float(min.x,max.x),y:random.float(min.y,max.y)}
    },
    
    /**
     * Return Random Vec2
     */
    random_s(min:number, max:number,random:SeededRandom):Vec2 {
        return {x:random.float(min,max),y:random.float(min,max)}
    },
    random2_s(min:Vec2, max:Vec2,random:SeededRandom):Vec2 {
        return {x:random.float(min.x,max.x),y:random.float(min.y,max.y)}
    },
    /**
     * @param x `Vec_A`
     * @param y `Vec_B`
     * @returns A new `Vec2` With `x`+`y`
     */
    add(x:Vec2, y:Vec2):Vec2 {
        return this.new(x.x+y.x,x.y+y.y)
    },
    /**
     * @param x `Vec_A`
     * @param y `Vec_B`
     * @returns A new `Vec2` With `x`+`y`
     */
    add_with_orientation(x:Vec2, y:Vec2,side:Orientation):Vec2 {
        if (side === 0) return this.add(x, y);
        let xOffset: number, yOffset: number;
        switch (side) {
            case 1:
                xOffset = -y.y;
                yOffset = y.x;
                break;
            case 2:
                xOffset = -y.x;
                yOffset = -y.y;
                break;
            case 3:
                xOffset = y.y;
                yOffset = -y.x;
                break;
        }
        return this.add(x, v2(xOffset, yOffset));
    },
    /**
     * @param x `Vec_A`
     * @param y `Vec_B`
     * @returns A new `Vec2` With `x`-`y`
     */
    sub(x:Vec2, y:Vec2):Vec2 {
        return this.new(x.x-y.x,x.y-y.y)
    },
    /**
     * @param x `Vec_A`
     * @param y `Vec_B`
     * @returns A new `Vec2` With `x`*`y`
     */
    mult(x:Vec2, y:Vec2):Vec2 {
        return this.new(x.x*y.x,x.y*y.y)
    },
    /**
     * @param x `Vec_A`
     * @param y `Vec_B`
     * @returns A new `Vec2` With `x`/`y`
     */
    div(x:Vec2, y:Vec2):Vec2 {
        return this.new(x.x/y.x,x.y/y.y)
    },
    /**
     * @param x `Vec_A`
     * @param y `Vec_B`
     * @returns `boolean` of operation `x`>`y`
     */
    greater(x:Vec2, y:Vec2):boolean {
        return x.x>y.x&&x.y>y.y
    },
    /**
     * @param x `Vec_A`
     * @param y `Vec_B`
     * @returns `boolean` of operation `x`<`y`
     */
    less(x:Vec2, y:Vec2):boolean {
        return x.x<y.x&&x.y<y.y
    },
    /**
     * @param x `Vec_A`
     * @param y `Vec_B`
     * @returns `boolean` of operation `x`==`y`
     */
    is(x:Vec2, y:Vec2):boolean {
        return x.x==y.x&&x.y==y.y
    },
    /**
     * @param Vec2 `Vec2`
     * @param scale `Scale`
     * @returns A new `Vec2` With `Vec2`*`scale`
     */
    scale(Vec2:Vec2, scale:number):Vec2 {
        return this.new(Vec2.x*scale,Vec2.y*scale)
    },
    /**
     * @param Vec2 `Vec2`
     * @param dscale `DeScale`
     * @returns A new `Vec2` With `Vec2`/`dscale`
     */
    dscale(Vec2:Vec2, dscale:number):Vec2 {
        return this.new(Vec2.x/dscale,Vec2.y/dscale)
    },
    /**
     * 
     * @param Vec2 `Vec2`
     * @param min `Limit`
     * @returns A new `Vec2` With Limit down 
     */
    min1(Vec2:Vec2,min:number):Vec2{
        return this.new(Math.max(Vec2.x,min),Math.max(Vec2.y,min))
    },
    /**
     * 
     * @param x `Vec2`
     * @param y `Limit`
     * @returns A new `Vec2` With Limit down
     */
    min2(x:Vec2,y:Vec2):Vec2{
        return this.new(Math.max(x.x,y.x),Math.max(x.y,y.y))
    },
    /**
     * 
     * @param Vec2 `Vec2`
     * @param max `Limit`
     * @returns A new `Vec2` With Limit down 
     */
    max1(Vec2:Vec2,max:number):Vec2{
        return this.new(Math.min(Vec2.x,max),Math.min(Vec2.y,max))
    },
    /**
     * 
     * @param x `Vec2`
     * @param y `Limit`
     * @returns A new `Vec2` With Limit up
     */
    max2(x:Vec2,y:Vec2):Vec2{
        return this.new(Math.min(x.x,y.x),Math.min(x.y,y.y))
    },

    /**
     * 
     * @param Vec2 `Vec2`
     * @param min `Min Limit`
     * @param max `Max Limit`
     * @returns A new `Vec2` With Limit
     */
    clamp1(Vec2:Vec2,min:number,max:number):Vec2{
        return this.new(Math.max(Math.min(Vec2.x,max),min),Math.max(Math.min(Vec2.y,max),min))
    },
    /**
     * 
     * @param Vec2 `Vec2`
     * @param min `Min Limit`
     * @param max `Max Limit`
     * @returns A new `Vec2` With Limit
     */
    clamp2(Vec2:Vec2,min:Vec2,max:Vec2):Vec2{
        return this.new(Math.max(Math.min(Vec2.x,max.x),min.x),Math.max(Math.min(Vec2.y,max.y),min.y))
    },
    /**
     * 
     * @param vec The Vector
     * @param decimalPlaces `number of max decimals`
     * @returns max decimal `Vec2`
     */
    maxDecimal(vec:Vec2,decimalPlaces:number=3):Vec2{
        const factor = Math.pow(10, decimalPlaces)
        return this.new(Math.round(vec.x * factor) / factor,Math.round(vec.y * factor) / factor)
    },
    /**
     * 
     * @param vec `Vec2`
     * @returns Rounded`Vec2`
     */
    round(vec:Vec2):Vec2{
        return this.new(Math.round(vec.x),Math.round(vec.y))
    },
    /**
     * @param x `Vec_A`
     * @param y `Vec_B`
     * @returns A `RadAngle` of 2 Vec2s
     */
    lookTo(x:Vec2, y:Vec2):RadAngle {
        return Math.atan2(y.y-x.y,y.x-x.x)
    },
    /**
     * 
     * @param angle `Radians Angle`
     * @returns A new `Vec2` With angle pos
     */
    from_PolarMovement(move:PolarMovement):Vec2 {
        const ret=this.new(Math.cos(move.dir)*move.scale,Math.sin(move.dir)*move.scale)
        v2m.max_decimal(ret,3)
        return ret
    },
    /**
     * 
     * @param angle `Radians Angle`
     * @returns A new `Vec2` With angle pos
     */
    from_RadAngle(angle:RadAngle,scale:number=1):Vec2 {
        return this.new(Math.cos(angle)*scale,Math.sin(angle)*scale)
    },
    /**
     * 
     * @param angle `Degrese Angle`
     * @returns A new `Vec2` With angle pos
     */
    from_DegAngle(angle:DegAngle):Vec2 {
        const a=Angle.deg2rad(angle)
        return this.new(Math.cos(a),Math.sin(a))
    },
    /**
     * 
     * @param angle `Radians Angle`
     * @returns A new `Vec2` With angle pos
     */
    add_rotate_RadAngle(a:Vec2,b:Vec2,angle:RadAngle):Vec2 {
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        return this.new(a.x+(a.x*cos-b.y*sin),b.y+(b.x*sin+b.y*cos))
    },
    /**
     * 
     * @param angle `Deg Angle`
     * @returns A new `Vec2` With angle pos
     */
    add_rotate_DegAngle(a:Vec2,b:Vec2,angle:DegAngle):Vec2 {
        angle=Angle.deg2rad(angle)
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        return this.new(a.x+(b.x*cos-b.y*sin),b.y+(b.x*sin+b.y*cos))
    },
    /**
     * 
     * @param angle `Radians Angle`
     * @returns A new `Vec2` With angle pos
     */
    rotate_RadAngle(vec:Vec2,angle:RadAngle):Vec2 {
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        return this.new(vec.x * cos - vec.y * sin, vec.x * sin + vec.y * cos)
    },
    /**
     * 
     * @param angle `Degrese Angle`
     * @returns A new `Vec2` With angle pos
     */
    rotate_DegAngle(vec:Vec2,angle:DegAngle):Vec2 {
        angle=Angle.deg2rad(angle)
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        return this.new(vec.x * cos - vec.y * sin, vec.x * sin + vec.y * cos)
    },
    perp(vec: Vec2): Vec2 {
        return { x: -vec.y, y: vec.x }
    },
    perp_cw(vec: Vec2): Vec2 {
        return { x: vec.y, y: -vec.x }
    },
    /**
     * @param x `Vec_A`
     * @param y `Vec_B`
     * @returns A new `Vec2` With distance of `Vec_A` and `Vec_B`
     */
    distanceSquared(x:Vec2,y:Vec2):number{
        const dx=x.x-y.x
        const dy=x.y-y.y
        return dx*dx+dy*dy
    },
    /**
     * @param x `Vec_A`
     * @param y `Vec_B`
     * @returns A new `Vec2` With distance squared of `Vec_A` and `Vec_B`
     */
    distance(x:Vec2,y:Vec2):number{
        const dx=x.x-y.x
        const dy=x.y-y.y
        return Math.sqrt(dx*dx+dy*dy)
    },
    /**
     * @param Vec2 `Vec2`
     * @returns A new `Vec2` With squared of `Vec_A`
     */
    squared(Vec:Vec2):number{
        return Vec.x*Vec.x+Vec.y*Vec.y
    },
    dot(x: Vec2, y: Vec2): number {
        return x.x * y.x + x.y * y.y;
    },
    /**
     * @param Vec2 The `Vec2` used in length
     * @returns 
     */
    len(Vec2: Vec2): number {
        return Math.sqrt(this.squared(Vec2))
    },
    
    /**
     * 
     * @param Vec2 `Vec2`
     * @returns A new Absolute `Vec2`
     */
    absolute(Vec2:Vec2):Vec2{
        return this.new(Math.abs(Vec2.x),Math.abs(Vec2.y))
    },
    /**
     * 
     * @param Vec2 `Vec3`
     * @returns A new Interger `Vec3`
     */
    floor(Vec2:Vec2):Vec2{
        return this.new(Math.floor(Vec2.x),Math.floor(Vec2.y))
    },
    /**
     * 
     * @param Vec2 `Vec3`
     * @returns A new Ceil `Vec3`
     */
    ceil(Vec2:Vec2):Vec2{
        return this.new(Math.ceil(Vec2.x),Math.ceil(Vec2.y))
    },
    neg(vec:Vec2):Vec2{
        return this.new(-vec.x,-vec.y)
    },
    /**
     * 
     * @param current The current `Vec2` Position
     * @param end The Final `Vec2` Position
     * @param interpolation 
     * @returns 
     */
    lerp(current: Vec2, end: Vec2,interpolation: number): Vec2 {
        return this.add(this.scale(current,1-interpolation), this.scale(end,interpolation))
    },
    /**
     * @param Vec2 The `Vec2` to normalize
     * @param fallback A `Vec2` to clone and return in case the normalization operation fails
     * @returns A `Vec2` whose length is 1 and is parallel to the original Vec2
     */
    normalizeSafe(Vec2:Vec2,fallback?:Vec2):Vec2 {
        const eps = 0.000001
        const len = this.len(Vec2)
        fallback??=this.new(1,0)
        return len > eps
            ? {
                x:Vec2.x/len,
                y:Vec2.y/len
            }:this.clone(fallback)
    },
    /**
     * @param Vec2 The `Vec2` to normalize
     * @returns A `Vec2` whose length is 1 and is parallel to the original Vec2
     */
    normalize(Vec2:Vec2): Vec2 {
        const eps = 0.000001
        const len = this.len(Vec2)
        return eps
            ? {
                x:Vec2.x/len,
                y:Vec2.y/len
            }: this.clone(Vec2)
    },
    /**
     * 
     * @param Vec2 The `Vec2` To Duplication
     * @returns The Duplicated Vec2
     */
    clone(Vec2:Vec2):Vec2{
        return this.new(Vec2.x,Vec2.y)
    },
    is_vec2(val:any):boolean{
        return typeof val==="object"&&val.x!==undefined&&val.y!==undefined
    },
    /**
     * 
     * @param Vec2 The `Vec2` To hash
     * @returns Hashed Vec2
     */
    hash(v: Vec2): number {
        const x = v.x | 0
        const y = v.y | 0
        return (x << 16) ^ y
    },
    toString(Vec2:Vec2):string{
        return `{${Vec2.x},${Vec2.y}}`
    },
})