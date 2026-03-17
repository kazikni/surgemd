import { random, SeededRandom } from "./random.ts"

export interface Vec3{
    x:number
    y:number
    z:number
}
export const v3 = Object.assign((x:number, y:number,z:number)=>{
    return {x, y, z} as Vec3
},Object.freeze({
    /**
     * Creates a new `Vec3`
     * @param x The horizontal (x-axis) coordinate
     * @param y The vertical (y-axis) coordinate
     * @param z The depth (z-axis) coordinate
     * @returns A new `Vec3` With X and Y Cords
     */
    new(x:number, y:number,z:number): Vec3 {
        return {x, y, z}
    },
    single(x:number):Vec3{
        return {x:x,y:x,z:x}
    },
    zero:Object.assign(()=>{
        return {x:0,y:0,z:0} as Vec3
    },{x:0,y:0,z:0}),
    one:Object.assign(()=>{
        return {x:1,y:1,z:1} as Vec3
    },{x:1,y:1,z:1}),
    /**
     * Return Random Vec3
     */
    random(min:number, max:number):Vec3 {
        return {x:random.float(min,max),y:random.float(min,max),z:random.float(min,max)}
    },
    random3(min:Vec3, max:Vec3):Vec3 {
        return {x:random.float(min.x,max.x),y:random.float(min.y,max.y),z:random.float(min.z,max.z)}
    },
    /**
     * Return Random Vec3
     */
    random_s(min:number, max:number,random:SeededRandom):Vec3 {
        return {x:random.float(min,max),y:random.float(min,max),z:random.float(min,max)}
    },
    random3_s(min:Vec3, max:Vec3,random:SeededRandom):Vec3 {
        return {x:random.float(min.x,max.x),y:random.float(min.y,max.y),z:random.float(min.z,max.z)}
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns A new `Vec3` With `x`+`y`
     */
    add(x:Vec3, y:Vec3):Vec3 {
        return this.new(x.x+y.x,x.y+y.y,x.z+y.z)
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns A new `Vec3` With `x`-`y`
     */
    sub(x:Vec3, y:Vec3):Vec3 {
        return this.new(x.x-y.x,x.y-y.y,x.z-y.z)
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns A new `Vec3` With `x`*`y`
     */
    mult(x:Vec3, y:Vec3):Vec3 {
        return this.new(x.x*y.x,x.y*y.y,x.z*y.z)
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns A new `Vec3` With `x`/`y`
     */
    div(x:Vec3, y:Vec3):Vec3 {
        return this.new(x.x/y.x,x.y/y.y,x.z/y.z)
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns `boolean` of operation `x`>`y`
     */
    greater(x:Vec3, y:Vec3):boolean {
        return x.x>y.x&&x.y>y.y&&x.z>y.z
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns `boolean` of operation `x`<`y`
     */
    less(x:Vec3, y:Vec3):boolean {
        return x.x<y.x&&x.y<y.y&&x.z<y.z
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns `boolean` of operation `x`==`y`
     */
    is(x:Vec3, y:Vec3):boolean {
        return x.x==y.x&&x.y==y.y&&x.z==y.z
    },
    /**
     * @param v `Vec3`
     * @param scale `Scale`
     * @returns A new `Vec3` With `v`*`scale`
     */
    scale(v:Vec3, scale:number):Vec3 {
        return this.new(v.x*scale,v.y*scale,v.z*scale)
    },
    /**
     * @param v `Vec3`
     * @param dscale `DeScale`
     * @returns A new `Vec3` With `v`/`dscale`
     */
    dscale(v:Vec3, dscale:number):Vec3 {
        return this.new(v.x/dscale,v.y/dscale,v.z/dscale)
    },
    /**
     * 
     * @param v `Vec3`
     * @param min `Limit`
     * @returns A new `Vec3` With Limit down 
     */
    min1(v:Vec3,min:number):Vec3{
        return this.new(Math.max(v.x,min),Math.max(v.y,min),Math.max(v.z,min))
    },
    /**
     * 
     * @param v `Vec3`
     * @param min `Limit`
     * @returns A new `Vec3` With Limit down 
     */
    min3(v:Vec3,min:Vec3):Vec3{
        return this.new(Math.max(v.x,min.x),Math.max(v.y,min.y),Math.max(v.z,min.z))
    },
    /**
     * 
     * @param v `Vec3`
     * @param max `Limit`
     * @returns A new `Vec3` With Limit down 
     */
    max1(v:Vec3,max:number):Vec3{
        return this.new(Math.min(v.x,max),Math.min(v.y,max),Math.min(v.z,max))
    },
    /**
     * 
     * @param v `Vec3`
     * @param max `Limit`
     * @returns A new `Vec3` With Limit down 
     */
    max3(v:Vec3,max:Vec3):Vec3{
        return this.new(Math.min(v.x,max.x),Math.min(v.y,max.y),Math.min(v.z,max.z))
    },
    /**
     * 
     * @param v `Vec3`
     * @param min `Min Limit`
     * @param max `Max Limit`
     * @returns A new `Vec3` With Limit
     */
    clamp1(v:Vec3,min:number,max:number):Vec3{
        return this.new(Math.max(Math.min(v.x,max),min),Math.max(Math.min(v.y,max),min),Math.max(Math.min(v.z,max),min))
    },
    /**
     * 
     * @param v `Vec3`
     * @param min `Min Limit`
     * @param max `Max Limit`
     * @returns A new `Vec3` With Limit
     */
    clamp3(v:Vec3,min:Vec3,max:Vec3):Vec3{
        return this.new(Math.max(Math.min(v.x,max.x),min.x),Math.max(Math.min(v.y,max.y),min.y),Math.max(Math.min(v.z,max.z),min.y))
    },
    /**
     * 
     * @param vec The Vector
     * @param decimalPlaces `number of max decimals`
     * @returns max decimal `Vec3`
     */
    maxDecimal(vec:Vec3,decimalPlaces:number=3):Vec3{
        const factor = Math.pow(10, decimalPlaces)
        return this.new(Math.round(vec.x * factor) / factor,Math.round(vec.y * factor) / factor,Math.round(vec.z * factor) / factor)
    },
    /**
     * 
     * @param vec `Vec3`
     * @returns Rounded`Vec3`
     */
    round(vec:Vec3):Vec3{
        return this.new(Math.round(vec.x),Math.round(vec.y),Math.round(vec.z))
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns A new `Vec3` With distance of `Vec3a` and `Vec3b`
     */
    distanceSquared(x:Vec3,y:Vec3):number{
        const dx=x.x-y.x
        const dy=x.y-y.y
        const dz=x.z-y.z
        return dx*dx+dy*dy+dz*dz
    },
    /**
     * @param x `Vec3a`
     * @param y `Vec3b`
     * @returns A new `Vec3` With distance squared of `Vec3a` and `Vec3b`
     */
    distance(x:Vec3,y:Vec3):number{
        const dx=x.x-y.x
        const dy=x.y-y.y
        const dz=x.z-y.z
        return Math.sqrt(dx*dx+dy*dy+dz*dz)
    },
    /**
     * @param Vec `Vec3`
     * @returns A new `Vec3` With squared of `Vec`
     */
    squared(Vec:Vec3):number{
        return Vec.x*Vec.x+Vec.y*Vec.y+Vec.z*Vec.z
    },
    dot(x: Vec3, y: Vec3): number {
        return x.x * y.x + x.y * y.y + x.z * y.z;
    },
    /**
     * @param v The `Vec3` used in lenght
     * @returns 
     */
    len(v: Vec3): number {
        return Math.sqrt(this.squared(v))
    },
    
    /**
     * 
     * @param v `Vec3`
     * @returns A new Absolute `Vec3`
     */
    absolute(v:Vec3):Vec3{
        return this.new(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))
    },
    /**
     * 
     * @param v `Vec3`
     * @returns A new Interger `Vec3`
     */
    floor(v:Vec3):Vec3{
        return this.new(Math.floor(v.x),Math.floor(v.y),Math.floor(v.z))
    },
    /**
     * 
     * @param v `Vec3`
     * @returns A new Ceil `Vec3`
     */
    ceil(v:Vec3):Vec3{
        return this.new(Math.ceil(v.x),Math.ceil(v.y),Math.ceil(v.z))
    },
    neg(vec:Vec3):Vec3{
        return this.new(-vec.x,-vec.y,-vec.z)
    },
    /**
     * 
     * @param current The current `Vec3` Position
     * @param end The Final `Vec3` Position
     * @param interpolation 
     * @returns 
     */
    lerp(current: Vec3, end: Vec3,interpolation: number): Vec3 {
        return this.add(this.scale(current,1-interpolation), this.scale(end,interpolation))
    },
    /**
     * @param v The `Vec3` to normalize
     * @param fallback A `Vec3` to clone and return in case the normalization operation fails
     * @returns A `Vec3` whose length is 1 and is parallel to the original v
     */
    normalizeSafe(v:Vec3,fallback?:Vec3):Vec3 {
        const eps = 0.000001
        const len = this.len(v)
        fallback??=this.new(1,0,0)
        return len > eps
            ? {
                x:v.x/len,
                y:v.y/len,
                z:v.z/len,
            }:this.clone(fallback)
    },
    /**
     * @param v The `Vec3` to normalize
     * @returns A `Vec3` whose length is 1 and is parallel to the original v
     */
    normalize(v:Vec3): Vec3 {
        const eps = 0.000001
        const len = this.len(v)
        return eps
            ? {
                x:v.x/len,
                y:v.y/len,
                z:v.z/len,
            }: this.clone(v)
    },
    /**
     * 
     * @param v The `Vec3` To Duplication
     * @returns The cloned Vec3
     */
    clone(v:Vec3):Vec3{
        return this.new(v.x,v.y,v.z)
    },
    toString(v:Vec3):string{
        return `{${v.x},${v.y},${v.z}}`
    },
}))