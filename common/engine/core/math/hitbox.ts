import { Collision,OverlapCollision2D, Rect } from "./geometry.ts"

import { random } from "./random.ts";
import { NetStream } from "../net/stream.ts";
import { Numeric } from "./utils.ts";
import { v2, v2m, Vec2 } from "./vec2.ts";

export enum HitboxType2D{
    null=0,
    circle,
    rect,
    group,
    polygon
}
export type IntersectionRes = {
    readonly point: Vec2
    readonly dir: Vec2
} | null|undefined;

export type JsonNullHitbox2D={
    type:HitboxType2D.null
}
export type JsonCircleHitbox2D={
    type:HitboxType2D.circle
    radius:number
    position:Vec2
}
export type JsonRectHitbox2D={
    type:HitboxType2D.rect
    min:Vec2
    max:Vec2
}
export type JsonGroupHitbox2D={
    type:HitboxType2D.group
    hitboxes:JsonHitbox2D[]
}
export type JsonPolygonHitbox2D={
    type:HitboxType2D.polygon
    center:Vec2
    points:Vec2[]
}
export interface Hitbox2DMapping {
    [HitboxType2D.null]:NullHitbox2D
    [HitboxType2D.circle]:CircleHitbox2D
    [HitboxType2D.rect]:RectHitbox2D
    [HitboxType2D.group]:HitboxGroup2D
    [HitboxType2D.polygon]:PolygonHitbox2D
}
export interface JsonHitbox2DMapping {
    [HitboxType2D.null]:JsonNullHitbox2D
    [HitboxType2D.circle]:JsonCircleHitbox2D
    [HitboxType2D.rect]:JsonRectHitbox2D
    [HitboxType2D.group]:JsonGroupHitbox2D
    [HitboxType2D.polygon]:JsonPolygonHitbox2D
}
export type Hitbox2D = Hitbox2DMapping[HitboxType2D]
export type JsonHitbox2D = JsonHitbox2DMapping[HitboxType2D]
export abstract class BaseHitbox2D{
    abstract type: HitboxType2D

    abstract colliding_with(other: Hitbox2D):boolean
    abstract colliding_with_line(a:Vec2,b:Vec2):boolean
    abstract overlap_collision(other:Hitbox2D):OverlapCollision2D|undefined
    overlap_collisions(other: Hitbox2D): OverlapCollision2D[] {
        if(other.type===HitboxType2D.group){
            const ret:OverlapCollision2D[]=[]
            for(const hb of other.hitboxes){
                const col=this.overlap_collision(hb)
                if(col)ret.push(col)
            }
            return ret
        }else{
            const col=this.overlap_collision(other)
            return col?[col]:[]
        }
    }
    abstract overlap_line(a:Vec2,b:Vec2):IntersectionRes
    abstract point_inside(point:Vec2):boolean

    abstract center():Vec2
    abstract scale(scale:number):void
    abstract randomPoint():Vec2
    abstract to_rect():Rect
    abstract transform(position?:Vec2,scale?:number,position_angle?:number,side?:number):Hitbox2D
    abstract clone():Hitbox2D
    abstract readonly position:Vec2
    abstract translate(position:Vec2,angle?:number):void
    abstract clamp(position:Vec2,min:Vec2,max:Vec2):Vec2 // returns clamped position
    abstract encode(stream:NetStream):void
    abstract to_json():JsonHitbox2D

    constructor(){
    }
    is_null():boolean{
        return false
    }
}
export class NullHitbox2D extends BaseHitbox2D{
    position:Vec2
    constructor(position:Vec2){
        super()
        this.position=v2.clone(position)
    }
    override readonly type = HitboxType2D.null
    override colliding_with(_other:Hitbox2D):boolean{
        return false
    }
    override point_inside(_point:Vec2):boolean{
        return false
    }
    override overlap_collision(_other: Hitbox2D): OverlapCollision2D|undefined {
        return undefined
    }
    override colliding_with_line(_a:Vec2,_b:Vec2):boolean{
        return false
    }
    override overlap_line(_a:Vec2,_b:Vec2): IntersectionRes {
        return undefined
    }
    override center(): Vec2 {
        return this.position
    }
    override randomPoint(): Vec2 {
      return this.position
    }
    override to_rect():Rect{
        const pos=v2.clone(this.position)
        return {
            min:pos,
            max:pos
        }
    }
    override scale(_scale: number): void {}
    override is_null():boolean{
        return true
    }
    override transform(position:Vec2=v2(0,0),_scale:number=1,_position_angle?:number,_side?:number):Hitbox2D{
        return new NullHitbox2D(position?v2.add(this.position,position):this.position)
    }
    override translate(position: Vec2,_position_angle?:number): void {
        v2m.add(this.position,this.position,position)
    }
    override clone():Hitbox2D{
        return new NullHitbox2D(this.position)
    }
    override clamp(position:Vec2,min:Vec2,max:Vec2){
        return v2.clamp2(position,min,max)
    }
    override encode(stream:NetStream){
        stream.writePos2(this.position)
    }
    override to_json():JsonNullHitbox2D{
        return {
            type:HitboxType2D.null,
        }
    }
    static decode(stream:NetStream):NullHitbox2D{
        return new NullHitbox2D(stream.readPos2())
    }
}
export class CircleHitbox2D extends BaseHitbox2D{
    override readonly type = HitboxType2D.circle
    radius:number
    position:Vec2
    constructor(position:Vec2,radius:number){
        super()
        this.position=v2.clone(position)
        this.radius=radius
    }
    override colliding_with(other: Hitbox2D): boolean {
        switch(other.type){
            case HitboxType2D.circle:
                return v2.distance(this.position,other.position)<this.radius+other.radius
            case HitboxType2D.rect:
                return Collision.circle_with_rect(this.position,this.radius,other.min,other.max)
            case HitboxType2D.group:
                return other.hitboxes.some(hitbox => hitbox.colliding_with(this));
        }
        return false
    }
    override overlap_collision(other: Hitbox2D): OverlapCollision2D|undefined {
        switch(other.type){
            case HitboxType2D.circle:{
                const r = this.radius + other.radius
                const toP1 = v2.sub(other.position, this.position)
                const distSqr = v2.squared(toP1)

                v2m.normalizeSafe(toP1)

                return distSqr < r * r?{
                        dir: toP1,
                        pen: r - Math.sqrt(distSqr)
                    }:undefined
            }case HitboxType2D.rect:{
                return Collision.circle_with_rect_ov(this.position, this.radius, other.min, other.max)
            }case HitboxType2D.group:{
                let col:OverlapCollision2D|undefined
                for(const hb of other.hitboxes){
                    col=hb.overlap_collision(this)
                    if(col)return col
                }
            }
        }
        return
    }
    override point_inside(point: Vec2): boolean {
      return v2.distance(this.position,point)<this.radius
    }
    override colliding_with_line(a: Vec2, b: Vec2): boolean {
        const ab = v2.sub(b, a)
        const abLenSq = v2.dot(ab, ab)
        if (abLenSq < 0.000001) return false

        const t = v2.dot(
            v2.sub(this.position, a),
            ab
        ) / abLenSq

        const clampedT = Math.max(0, Math.min(1, t))

        const closest = {
            x: a.x + ab.x * clampedT,
            y: a.y + ab.y * clampedT
        }

        const distSq = v2.distanceSquared(closest, this.position)
        return distSq <= this.radius * this.radius
    }
    override overlap_line(a_p:Vec2,b_p:Vec2): IntersectionRes {
        let d = v2.sub(b_p, a_p)
        const len = Math.max(v2.len(d), 0.000001)
        d = v2.normalizeSafe(d)

        const m = v2.sub(a_p, this.position)
        const b = v2.dot(m, d)
        const c = v2.dot(m, m) - this.radius * this.radius

        if (c > 0 && b > 0) return null

        const discSq = b * b - c
        if (discSq < 0) return null

        const disc = Math.sqrt(discSq)
        const t = -b < disc
            ? disc - b
            : -b - disc;

        if (t <= len) {
            const point = v2.add(a_p, v2.scale(d, t))
            const ov=v2.sub(point,this.position)
            v2m.normalizeSafe(ov)
            return {
                point,
                dir: ov
            };
        }

        return null;
    }
    override center(): Vec2 {
        return this.position
    }
    override scale(scale: number): void {
        this.radius*=scale
    }
    override randomPoint(): Vec2 {
        const angle = random.float(0,Math.PI*2)
        const length = random.float(0,this.radius)
        return v2(this.position.x+(Math.cos(angle)*length),this.position.y+(Math.sin(angle)*length))
    }
    override to_rect():Rect{
        const size=v2(this.radius,this.radius)
        return {
            min:v2.sub(this.position,size),
            max:v2.add(this.position,size)
        }
    }
    override transform(position?:Vec2,scale?:number,position_angle?:number,_side?:number):CircleHitbox2D{
        const ret=this.clone() as CircleHitbox2D
        if(scale){
            ret.radius*=scale
        }
        if(position){
            if(position_angle)v2m.add_rotate_RadAngle(ret.position,this.position,position,position_angle)
            else v2m.add(ret.position,this.position,position)
        }
        return ret
    }
    override translate(position: Vec2,position_angle?:number): void {
        if(position_angle)v2m.add_rotate_RadAngle(this.position,this.position,position,position_angle)
        else v2m.add(this.position,this.position,position)
    }
    override clone():CircleHitbox2D{
        return new CircleHitbox2D(v2.clone(this.position),this.radius)
    }
    override clamp(position: Vec2, min: Vec2, max: Vec2): Vec2 {
        const r = v2(this.radius, this.radius)
        return v2.clamp2(
            position,
            v2.add(min, r),
            v2.sub(max, r)
        )
    }
    override encode(stream:NetStream){
        stream.writePos2(this.position)
        stream.writeFloat(this.radius,0,500,2)
    }
    override to_json():JsonCircleHitbox2D{
        return {
            type:HitboxType2D.circle,
            position:this.position,
            radius:this.radius
        }
    }
    static decode(stream:NetStream):CircleHitbox2D{
        return new CircleHitbox2D(stream.readPos2(),stream.readFloat(0,500,2))
    }
}

export class RectHitbox2D extends BaseHitbox2D{
    override readonly type = HitboxType2D.rect
    min:Vec2
    max:Vec2
    constructor(min:Vec2,max:Vec2){
        super()
        this.min=v2.clone(min)
        this.max=v2.clone(max)
    }
    static positioned(position:Vec2,size:Vec2):RectHitbox2D{
        return new RectHitbox2D(position,v2.add(position,size))
    }
    static centered(position:Vec2,size:Vec2):RectHitbox2D{
        v2m.dscale(size,size,2)
        return new RectHitbox2D(v2.sub(position,size),v2.add(position,size))
    }
    static wall_enabled(min:Vec2,max:Vec2,walls:{
        left:boolean
        right:boolean
        top:boolean
        bottom:boolean
    },walls_size:number):HitboxGroup2D{
        const ret=new HitboxGroup2D()
        if(walls.left){
            ret.hitboxes.push(new RectHitbox2D(v2(min.x,min.y),v2(min.x+walls_size,max.y)))
        }
        if(walls.right){
            ret.hitboxes.push(new RectHitbox2D(v2(max.x-walls_size,min.y),v2(max.x,max.y)))
        }
        if(walls.top){
            ret.hitboxes.push(new RectHitbox2D(v2(min.x,min.y),v2(max.x,min.y+walls_size)))
        }
        if(walls.bottom){
            ret.hitboxes.push(new RectHitbox2D(v2(min.x,max.y-walls_size),v2(max.x,max.y)))
        }
        return ret
    }
    get position():Vec2{
        return this.min
    }
    override colliding_with(other: Hitbox2D): boolean {
        if(other){
            switch(other.type){
                case HitboxType2D.rect:
                    return (this.max.x>other.min.x&&this.min.x<other.max.x) && (this.max.y>other.min.y&&this.min.y<other.max.y)
                case HitboxType2D.circle:
                    return Collision.circle_with_rect(other.position,other.radius,this.min,this.max)
                case HitboxType2D.group:
                    return other.hitboxes.some(hitbox => hitbox.colliding_with(this));
            }
        }
        return false
    }
    override overlap_collision(other: Hitbox2D):OverlapCollision2D|undefined{
        if(other){
            switch(other.type){
                case HitboxType2D.rect:{
                    const asize=v2.sub(this.min,this.max)
                    const bsize=v2.sub(other.min,other.max)
                    const ss=v2.add(asize,bsize)
                    v2m.dscale(ss,ss,2)
                    const dist=v2.sub(this.min,other.min)
                    const absdist=v2.absolute(dist)
                    if(v2.less(absdist,ss)){
                        v2m.sub(ss,ss,absdist)
                        const ov=v2.normalizeSafe(ss)
                        const ov2=ov
                        if(ov.x<ov.y){
                            ov2.x=dist.x>0?-ov2.x:ov2.x
                        }else{
                            ov2.y=dist.y>0?-ov2.y:ov2.y
                        }
                        return
                    }
                    break
                }case HitboxType2D.circle: {
                    return Collision.circle_with_rect_ov(other.position,other.radius,this.min,this.max)
                }case HitboxType2D.group:{
                    let col:OverlapCollision2D|undefined
                    for(const hb of other.hitboxes){
                        col=hb.overlap_collision(this)
                        if(col)return col
                    }
                }
            }
        }
        return
    }
    override point_inside(point: Vec2): boolean {
        return (point.x>=this.max.x&&point.x<=this.min.x)&&(point.y>=this.max.y&&point.y<=this.min.y)
    }
    override colliding_with_line(a: Vec2, b: Vec2): boolean {
        let tmin = 0
        let tmax = Number.MAX_VALUE

        const eps = 1e-5
        let d = v2.sub(b, a)
        const dist = v2.len(d)
        d = v2.normalizeSafe(d)

        let absDx = Math.abs(d.x)
        let absDy = Math.abs(d.y)

        if (absDx < eps) {
            d.x = eps * 2
            absDx = d.x
        }

        if (absDy < eps) {
            d.y = eps * 2
            absDy = d.y
        }

        if (absDx > eps) {
            const tx1 = (this.min.x - a.x) / d.x
            const tx2 = (this.max.x - a.x) / d.x

            tmin = Numeric.max(tmin, Numeric.min(tx1, tx2))
            tmax = Numeric.min(tmax, Numeric.max(tx1, tx2))

            if (tmax > 0 && tmin < dist) return false
        }

        if (absDy > eps) {
            const ty1 = (this.min.y - a.y) / d.y
            const ty2 = (this.max.y - a.y) / d.y

            tmin = Numeric.max(tmin, Numeric.min(ty1, ty2))
            tmax = Numeric.min(tmax, Numeric.max(ty1, ty2))

            if (tmax > 0 && tmin < dist) return false
        }

        return tmax >= 0 && tmin <= dist
    }
    override overlap_line(a: Vec2, b: Vec2): IntersectionRes | null {
        let tmin = 0
        let tmax = Number.MAX_VALUE

        const eps = 1e-5
        const r = a

        let d = v2.sub(b, a)
        const dist = v2.len(d)

        d = v2.normalizeSafe(d)

        let absDx = Math.abs(d.x)
        let absDy = Math.abs(d.y)

        if (absDx < eps) {
            d.x = eps * 2;
            absDx = Math.abs(d.x)
        }

        if (absDy < eps) {
            d.y = eps * 2
            absDy = Math.abs(d.y)
        }

        if (absDx > eps) {
            const tx1 = (this.min.x - r.x) / d.x
            const tx2 = (this.max.x - r.x) / d.x

            const t1 = Math.min(tx1, tx2)
            const t2 = Math.max(tx1, tx2)

            tmin = Math.max(tmin, t1)
            tmax = Math.min(tmax, t2)

            if (tmin > tmax) return null
        }

        if (absDy > eps) {
            const ty1 = (this.min.y - r.y) / d.y
            const ty2 = (this.max.y - r.y) / d.y

            const t1 = Math.min(ty1, ty2)
            const t2 = Math.max(ty1, ty2)

            tmin = Math.max(tmin, t1)
            tmax = Math.min(tmax, t2)

            if (tmin > tmax) return null
        }

        if (tmin > dist) return null

        const p = v2.add(a, v2.scale(d, tmin))

        const center = v2.add(this.min, v2.scale(v2.sub(this.max, this.min), 0.5))
        const rel = v2.sub(p, center)
        const half = v2.scale(v2.sub(this.max, this.min), 0.5)

        const nx = rel.x / Math.abs(half.x)
        const ny = rel.y / Math.abs(half.y)

        let normal = v2(Math.trunc(nx * 1.001), Math.trunc(ny * 1.001))

        if (normal.x === 0 && normal.y === 0) {
            if (Math.abs(nx) > Math.abs(ny)) {
                normal = v2(Math.sign(nx), 0)
            } else {
                normal = v2(0, Math.sign(ny))
            }
        }

        return {
            point: p,
            dir: v2.normalizeSafe(normal, v2(1, 0))
        };
    }
    override center(): Vec2 {
        return v2.add(this.min,v2.dscale(v2.sub(this.min,this.max),2))
    }
    override scale(scale: number): void {
        const centerX = (this.min.x + this.max.x) / 2
        const centerY = (this.min.y + this.max.y) / 2
        v2m.set(this.min,(this.min.x - centerX) * scale + centerX, (this.min.y - centerY) * scale + centerY)
        v2m.set(this.max,(this.max.x - centerX) * scale + centerX, (this.max.y - centerY) * scale + centerY)
    }
    override randomPoint(): Vec2 {
        return v2.random2(this.min,this.max)
    }
    override to_rect():Rect{
        return {
            min:v2.clone(this.min),
            max:v2.clone(this.max)
        }
    }
    override transform(position: Vec2 = v2(0, 0),scale: number=1,position_angle?:number,side?:number): RectHitbox2D {
        const min = v2.scale(this.min, scale)
        const max = v2.scale(this.max, scale)

        if (side) {
            const minX = min.x, minY = min.y
            const maxX = max.x, maxY = max.y

            switch (side & 3) {
                case 1: // 90°
                    v2m.set(min, -maxY, minX)
                    v2m.set(max, -minY, maxX)
                    break

                case 2: // 180°
                    v2m.set(min, -maxX, -maxY)
                    v2m.set(max, -minX, -minY)
                    break

                case 3: // -90°
                    v2m.set(min, minY, -maxX)
                    v2m.set(max, maxY, -minX)
                    break
            }

            const minx = Math.min(min.x, max.x)
            const miny = Math.min(min.y, max.y)
            const maxx = Math.max(min.x, max.x)
            const maxy = Math.max(min.y, max.y)

            v2m.set(min, minx, miny)
            v2m.set(max, maxx, maxy)
        }

        if(position_angle){
            v2m.add_rotate_RadAngle(min,position,min,position_angle)
            v2m.add_rotate_RadAngle(max,position,max,position_angle)
        }else{
            v2m.add(min,position,min)
            v2m.add(max,position,max)
        }

        return new RectHitbox2D(min, max);
    }
    override translate(position: Vec2): void {
        v2m.add(this.min,this.min,position)
        v2m.add(this.max,this.max,position)
    }
    override clone():RectHitbox2D{
        return new RectHitbox2D(this.min,this.max)
    }
    override to_json():JsonRectHitbox2D{
        return {
            type:HitboxType2D.rect,
            min:this.min,
            max:this.max
        }
    }
    override encode(stream:NetStream){
        stream.writePos2(this.min)
        stream.writePos2(this.max)
    }
    static decode(stream:NetStream):RectHitbox2D{
        return new RectHitbox2D(stream.readPos2(),stream.readPos2())
    }
    override clamp(position: Vec2, min: Vec2, max: Vec2): Vec2 {
        const size = v2.sub(this.max, this.min);
        return v2.clamp2(
            position,
            min,
            v2.sub(max, size)
        );
    }
    override is_null(): boolean {
      return false
    }
}
export class HitboxGroup2D extends BaseHitbox2D{
    hitboxes: Hitbox2D[];
    get position(){
        return this.center()
    }
    constructor(...hitboxes: Hitbox2D[]) {
        super();
        this.hitboxes = hitboxes;
    }
    override readonly type = HitboxType2D.group
    override colliding_with(that: Hitbox2D): boolean {
        return this.hitboxes.some(hitbox => hitbox.colliding_with(that));
    }
    override point_inside(point:Vec2):boolean{
        for (const hitbox of this.hitboxes) {
            if(hitbox.point_inside(point)) return true;
        }
        return false;
    }
    override overlap_collision(other: Hitbox2D): OverlapCollision2D|undefined {
        let col:OverlapCollision2D|undefined
        for(const hb of this.hitboxes){
            col=hb.overlap_collision(other)
            if(col)return col
        }
        return
    }
    override overlap_collisions(other: Hitbox2D): OverlapCollision2D[] {
        const ret:OverlapCollision2D[]=[]
        for(const hb of this.hitboxes){
            const col=hb.overlap_collision(other)
            if(col)ret.push(col)
        }
        return ret
    }
    override colliding_with_line(a:Vec2,b:Vec2):boolean{
        return this.hitboxes.some(hitbox => hitbox.colliding_with_line(a,b));
    }
    override overlap_line(a:Vec2,b:Vec2): IntersectionRes {
        for(const hb of this.hitboxes){
            const col=hb.overlap_line(a,b)
            if(col)return col
        }
        return null
    }

    override center(): Vec2 {
        return this.to_rect().min;
    }
    override randomPoint(): Vec2 {
        return this.hitboxes[random.int(0,this.hitboxes.length)].randomPoint()
    }
    override to_rect():Rect{
        const min = v2(Number.MAX_VALUE, Number.MAX_VALUE);
        const max = v2(0, 0)
        for (const hitbox of this.hitboxes) {
            const toRect = hitbox.to_rect()
            min.x = Math.min(min.x, toRect.min.x)
            min.y = Math.min(min.y, toRect.min.y)
            max.x = Math.max(max.x, toRect.max.x)
            max.y = Math.max(max.y, toRect.max.y)
        }
        return {
            min:min,
            max:max
        }
    }
    override scale(scale: number): void {
        for(const hitbox of this.hitboxes){
            hitbox.scale(scale);
        }
    }
    override is_null():boolean{
        return false
    }
    override transform(position: Vec2 = v2(0,0),scale: number = 1,position_angle?: number,side: number = 0): HitboxGroup2D {
        const out: Hitbox2D[] = new Array(this.hitboxes.length)

        for (let i = 0; i < this.hitboxes.length; i++) {
            out[i] = this.hitboxes[i].transform(
                position,
                scale,
                position_angle,
                side
            )
        }

        return new HitboxGroup2D(...out)
    }
    override translate(position: Vec2,position_angle?:number): void {
        for(const hb of this.hitboxes){
            hb.translate(position,position_angle)
        }
    }
    override clone(deep:boolean=true): HitboxGroup2D {
        return new HitboxGroup2D(...(deep?this.hitboxes.map(hitbox => hitbox.clone(true)):this.hitboxes));
    }
    override clamp(position: Vec2, min: Vec2, max: Vec2): Vec2 {
        const rect = this.to_rect();
        const size = v2.sub(rect.max, rect.min);
        return v2.clamp2(
            position,
            min,
            v2.sub(max, size)
        );
    }
    override encode(stream:NetStream){
        stream.writePos2(this.position)
    }
    static decode(stream:NetStream):NullHitbox2D{
        return new NullHitbox2D(stream.readPos2())
    }
    override to_json():JsonGroupHitbox2D{
        return {
            type:HitboxType2D.group,
            hitboxes:this.hitboxes.map((v)=>v.to_json()),
        }
    }
}
export class PolygonHitbox2D extends BaseHitbox2D {
    override readonly type = HitboxType2D.polygon;
    points: Vec2[];
    position: Vec2;

    constructor(points: Vec2[], center: Vec2 = v2(0, 0)) {
        super();
        this.points = points.map(p => v2.clone(p));
        this.position = v2.clone(center);
    }

    override colliding_with(other: Hitbox2D): boolean {
        switch (other.type) {
            case HitboxType2D.rect: {
                if (this.points.some(p => 
                    p.x >= other.min.x && p.x <= other.max.x &&
                    p.y >= other.min.y && p.y <= other.max.y
                )) return true;

                const rectPoints = [
                    other.min,
                    v2(other.max.x, other.min.y),
                    other.max,
                    v2(other.min.x, other.max.y)
                ];
                if (rectPoints.some(p => this.point_inside(p))) return true;

                const polyEdges = this.getEdges();
                const rectEdges = [
                    [rectPoints[0], rectPoints[1]],
                    [rectPoints[1], rectPoints[2]],
                    [rectPoints[2], rectPoints[3]],
                    [rectPoints[3], rectPoints[0]]
                ];
                for (const [a1, a2] of polyEdges) {
                    for (const [b1, b2] of rectEdges) {
                        /*if (Collision.line_intersects_line(a1, a2, b1, b2)) {
                            return true;
                        }*/
                    }
                }
                return false;
            }
            case HitboxType2D.circle: {
                if (this.points.some(p => v2.distance(p, other.position) <= other.radius))
                    return true;
                if (this.point_inside(other.position)) return true;

                for (const [a, b] of this.getEdges()) {
                    /*if (Collision.circle_with_line(other.position, other.radius, a, b))
                        return true;*/
                }
                return false;
            }
            case HitboxType2D.polygon: {
                // Teste ponto-ponto
                if (this.points.some(p => other.point_inside(p))) return true;
                if (other.points.some(p => this.point_inside(p))) return true;

                // Teste aresta-aresta
                for (const [a1, a2] of this.getEdges()) {
                    for (const [b1, b2] of other.getEdges()) {
                        /*if (Collision.line_intersects_line(a1, a2, b1, b2)) return true;*/
                    }
                }
                return false;
            }
        }
        return false;
    }

    override overlap_collision(_other: Hitbox2D): OverlapCollision2D|undefined {
        return
    }

    override point_inside(point: Vec2): boolean {
        const { x, y } = point;
        let inside = false;
        const count = this.points.length;
        for (let i = 0, j = count - 1; i < count; j = i++) {
            const { x: xi, y: yi } = this.points[i]
            const { x: xj, y: yj } = this.points[j]

            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }

        return inside;
    }


    override colliding_with_line(a: Vec2, b: Vec2): boolean {
        for (const [p1, p2] of this.getEdges()) {
            //if (Collision.line_colliding_with_line(a, b, p1, p2)) return true;
        }
        return false;
    }
    override overlap_line(_a:Vec2,_b:Vec2): IntersectionRes {
        return undefined
    }

    override center(): Vec2 {
        return this.position;
    }

    override scale(scale: number): void {
        for (let i = 0; i < this.points.length; i++) {
            const offset = v2.sub(this.points[i], this.position);
            this.points[i] = v2.add(this.position, v2.scale(offset, scale));
        }
    }

    override randomPoint(): Vec2 {
        const rect = this.to_rect();
        let p: Vec2;
        do {
            p = v2.random2(rect.min,rect.max)
        } while (!this.point_inside(p))
        return p;
    }

    override to_rect(): Rect {
        const min = v2(Number.MAX_VALUE, Number.MAX_VALUE);
        const max = v2(-Number.MAX_VALUE, -Number.MAX_VALUE);
        for (const p of this.points) {
            min.x = Math.min(min.x, p.x)
            min.y = Math.min(min.y, p.y)
            max.x = Math.max(max.x, p.x)
            max.y = Math.max(max.y, p.y)
        }
        return {
            min:min,
            max:max
        }
    }

    override transform(position: Vec2 = v2(0,0), scale = 1,position_angle?:number): PolygonHitbox2D {
        const transformed = this.points.map(p => 
            position_angle?v2.add_rotate_RadAngle(position, v2.scale(p, scale), position_angle):v2.add(position,v2.scale(p,scale))
        );
        const newCenter = position_angle?v2.add_rotate_RadAngle(position, v2.scale(this.position, scale), position_angle):v2.add(position,v2.scale(this.position, scale))
        return new PolygonHitbox2D(transformed, newCenter);
    }

    override translate(position: Vec2, position_angle?:number): void {
        const offset = v2(1,0);
        const dx = position.x * offset.x;
        const dy = position.y * offset.y;
        for (let i = 0; i < this.points.length; i++) {
            this.points[i] = v2.add(this.points[i], v2(dx, dy));
        }
        this.position = v2.add(this.position, v2(dx, dy));
    }

    override clone(): PolygonHitbox2D {
        return new PolygonHitbox2D(this.points, this.position);
    }
    override clamp(position: Vec2, min: Vec2, max: Vec2): Vec2 {
        const rect = this.to_rect();
        const size = v2.sub(rect.max, rect.min);
        return v2.clamp2(
            position,
            min,
            v2.sub(max, size)
        );
    }
    override encode(stream: NetStream): void {
        stream.writeUint24(this.points.length)
        for (const p of this.points) {
            stream.writePos2(p)
        }
        stream.writePos2(this.position)
    }

    static decode(stream: NetStream): PolygonHitbox2D {
        const len = stream.readUint24();
        const pts: Vec2[] = [];
        for (let i = 0; i < len; i++) {
            pts.push(stream.readPos2())
        }
        const center = stream.readPos2()
        return new PolygonHitbox2D(pts, center);
    }
    override to_json():JsonPolygonHitbox2D{
        return {
            type:HitboxType2D.polygon,
            points:this.points,
            center:this.position
        }
    }

    private getEdges(): [Vec2, Vec2][] {
        const edges: [Vec2, Vec2][] = [];
        for (let i = 0; i < this.points.length; i++) {
            edges.push([this.points[i], this.points[(i + 1) % this.points.length]]);
        }
        return edges;
    }
}

export function hitbox_from_json(hitbox:JsonHitbox2D):Hitbox2D{
    switch(hitbox.type){
        case HitboxType2D.null:
            return new NullHitbox2D(v2.zero)
        case HitboxType2D.circle:
            return new CircleHitbox2D(hitbox.position,hitbox.radius)
        case HitboxType2D.rect:
            return new RectHitbox2D(hitbox.min,hitbox.max)
        case HitboxType2D.group:
            return new HitboxGroup2D(...hitbox.hitboxes.map((v)=>hitbox_from_json(v)))
        case HitboxType2D.polygon:
            return new PolygonHitbox2D(hitbox.points,hitbox.center)
    }
}