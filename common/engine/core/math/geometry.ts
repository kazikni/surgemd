import { random } from "./random.ts"
import { Numeric } from "./utils.ts";
import { v2, v2m, Vec2 } from "./vec2.ts";

export type Orientation=0|1|2|3
export type RadAngle=number
export type DegAngle=number
export const π = 3.141592
export const π2 = 3.141592*2
export const τ = 1.570796

const prime1 = BigInt("2654435761")
const prime2 = BigInt("2246822519")

export enum RotationMode{
    null,
    limited,
    full
}
export interface PolarMovement{
    dir:number
    scale:number
}
export const Angle=Object.freeze({
    deg2rad(angle:DegAngle):RadAngle{
        return angle* Math.PI / 180
    },
    rad2deg(angle:RadAngle):DegAngle {
        return angle * 180 / Math.PI
    },
    normalize(a: RadAngle): number {
        return Numeric.abs_module(a - π, τ) - π
    },
    loop_rad(a:RadAngle){
        a = (a + π) % π2
        if (a < 0) a += π2
        return a - π
    },
    side_rad(side:Orientation){
        switch(side){
            case 0:
                return 0
            case 1:
                return τ
            case 2:
                return π
            case 3:
                return -τ
        }
    },
    side_deg(side:Orientation){
        switch(side){
            case 0:
                return 0
            case 1:
                return 90
            case 2:
                return 180
            case 3:
                return -90
        }
    },
    random_rotation_modded(mode:RotationMode):RadAngle{
        switch(mode){
            case RotationMode.null:
                return 0
            case RotationMode.limited:
                return random.choose([rotationFull.left,rotationFull.right,rotationFull.bottom,rotationFull.top])
            case RotationMode.full:
                return random.float(-3.141592,3.141592)
        }
    },
    delta_rad(a:number,b:number):number{
        let delta = a - b;
        while (delta > Math.PI) {
            delta -= 2 * Math.PI;
        }
        while (delta < -Math.PI) {
            delta += 2 * Math.PI;
        }
        return delta;
    },

    add_orientation(a:Orientation,b:Orientation):Orientation{
        return Numeric.loop(a+b,0,3) as Orientation
    }
})
export const rotationFull={
    right:0,
    left:Angle.deg2rad(-180),
    bottom:Angle.deg2rad(90),
    top:Angle.deg2rad(-90),
}
export function SmoothShape2D(polygon: Vec2[], subdivisions: number = 8): Vec2[] {
    if (polygon.length < 3) return polygon;

    const result: Vec2[] = [];
    const n = polygon.length;

    const points = [...polygon, polygon[0], polygon[1], polygon[2]];

    for (let i = 0; i < n; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const p2 = points[i + 2];
        const p3 = points[i + 3];

        for (let t = 0; t < subdivisions; t++) {
            const tt = t / subdivisions;
            const tt2 = tt * tt;
            const tt3 = tt2 * tt;

            const x = 0.5 * (
                (2 * p1.x) +
                (-p0.x + p2.x) * tt +
                (2*p0.x - 5*p1.x + 4*p2.x - p3.x) * tt2 +
                (-p0.x + 3*p1.x - 3*p2.x + p3.x) * tt3
            );

            const y = 0.5 * (
                (2 * p1.y) +
                (-p0.y + p2.y) * tt +
                (2*p0.y - 5*p1.y + 4*p2.y - p3.y) * tt2 +
                (-p0.y + 3*p1.y - 3*p2.y + p3.y) * tt3
            );

            result.push(v2(x, y));
        }
    }

    return result;
}

export type OverlapCollision2D={
    dir:Vec2
    pen:number
}
export const Collision=Object.freeze({
    circle_with_circle(circle_1_radius:number,circle_2_radius:number,circle_1_position:Vec2,circle_2_position:Vec2){
        return v2.distance(circle_1_position,circle_2_position)<circle_1_radius+circle_2_radius
    },
    rect_with_rect(rect_1_min:Vec2,rect_2_min:Vec2,rect_1_max:Vec2,rect_2_max:Vec2){
        return v2.greater(rect_1_max,rect_2_min)&&v2.less(rect_1_min,rect_2_max)
    },
    circle_with_rect(circle_position: Vec2, circle_radius: number, rect_min: Vec2, rect_max: Vec2): boolean {
        const closest = v2.clamp2(circle_position, rect_min, rect_max);
        const distSq = v2.distanceSquared(circle_position, closest);
        return distSq <= (circle_radius * circle_radius);
    },
    circle_with_rect_ov(circle_pos: Vec2, radius: number, rect_min: Vec2, rect_max: Vec2) {
        const closest = v2.clamp2(circle_pos, rect_min, rect_max);

        const diff = v2.sub(circle_pos, closest);
        const distSq = v2.squared(diff);
        const radiusSq = radius * radius;

        if (distSq <= radiusSq) {
            const dist = Math.sqrt(distSq) || 0.000001;
            const penetration = radius - dist;

            const normal = v2.scale(diff, -(1 / dist));

            return {
                dir: normal,
                pen: penetration
            };
        }
        if (circle_pos.x >= rect_min.x && circle_pos.x <= rect_max.x &&
            circle_pos.y >= rect_min.y && circle_pos.y <= rect_max.y) {

            const left = circle_pos.x - rect_min.x;
            const right = rect_max.x - circle_pos.x;
            const top = circle_pos.y - rect_min.y;
            const bottom = rect_max.y - circle_pos.y;

            const minDist = Math.min(left, right, top, bottom);

            if (minDist === left) return { dir: v2(1, 0), pen: radius - left };
            if (minDist === right) return { dir: v2(-1, 0), pen: radius - right };
            if (minDist === top) return { dir: v2(0, 1), pen: radius - top };
            return { dir: v2(0, -1), pen: radius - bottom };
        }

        return undefined;
    },
    distToSegmentSq(p: Vec2, a: Vec2, b: Vec2) {
        const ab = v2.sub(b, a);
        const c = v2.dot(v2.sub(p, a), ab) / v2.dot(ab, ab);
        const d = v2.add(a, v2.scale(ab, Math.max(0, Math.min(1, c))));
        const e = v2.sub(d, p);
        return v2.dot(e, e);
    },

    distToPolygonSq(p: Vec2, poly: Vec2[]) {
        let closestDistSq = Number.MAX_VALUE;
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = (i === poly.length - 1) ? poly[0] : poly[i + 1];
            const distSq = Collision.distToSegmentSq(p, a, b);
            if (distSq < closestDistSq) {
                closestDistSq = distSq;
            }
        }
        return closestDistSq;
    },

    distToPolygon(p: Vec2, poly: Vec2[]) {
        return Math.sqrt(Collision.distToPolygonSq(p, poly));
    },

    rayIntersectsLine(origin: Vec2, direction: Vec2, a: Vec2, b: Vec2): number | null {
        const ab = v2.sub(b, a);
        const perp = v2(ab.y, -ab.x);
        const perpDotDir = v2.dot(direction, perp);

        if (Math.abs(perpDotDir) <= 1e-7) return null; // paralelo

        const d = v2.sub(a, origin);
        const distAlongRay = v2.dot(perp, d) / perpDotDir;
        const distAlongLine = v2.dot(v2(direction.y, -direction.x), d) / perpDotDir;

        return distAlongRay >= 0 && distAlongLine >= 0 && distAlongLine <= 1
            ? distAlongRay
            : null;
    },

    rayIntersectsPolygon(origin: Vec2, direction: Vec2, poly: Vec2[]): number | null {
        let t = Number.MAX_VALUE;
        let hit = false;

        for (let i = 0, len = poly.length, j = len - 1; i < len; j = i++) {
            const dist = Collision.rayIntersectsLine(origin, direction, poly[j], poly[i]);
            if (dist !== null && dist < t) {
                hit = true;
                t = dist;
            }
        }
        return hit ? t : null;
    },
    pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
        let inside = false
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y
            const xj = poly[j].x, yj = poly[j].y
            const intersect =
                ((yi > p.y) !== (yj > p.y)) &&
                (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi)
            if (intersect) inside = !inside
        }
        return inside
    },
    polygon_with_point(poly: Vec2[], point: Vec2) {
        return Collision.pointInPolygon(point, poly);
    },

    polygon_with_circle(poly: Vec2[], circlePos: Vec2, radius: number) {
        if (Collision.pointInPolygon(circlePos, poly)) return true;

        for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = (i === poly.length - 1) ? poly[0] : poly[i + 1];
            if (Collision.distToSegmentSq(circlePos, a, b) <= radius * radius) {
                return true;
            }
        }
        return false;
    },

    polygon_with_polygon(polyA: Vec2[], polyB: Vec2[]) {
        for (const p of polyA) if (Collision.pointInPolygon(p, polyB)) return true;
        for (const p of polyB) if (Collision.pointInPolygon(p, polyA)) return true;

        for (let i = 0; i < polyA.length; i++) {
            const a1 = polyA[i];
            const a2 = polyA[(i + 1) % polyA.length];
            for (let j = 0; j < polyB.length; j++) {
                const b1 = polyB[j];
                const b2 = polyB[(j + 1) % polyB.length];
                if (Collision.segment_intersection(a1, a2, b1, b2)) return true;
            }
        }
        return false;
    },

    segment_intersect(p1: Vec2, p2: Vec2, q1: Vec2, q2: Vec2) {
        function ccw(a: Vec2, b: Vec2, c: Vec2) {
            return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
        }
        return ccw(p1, q1, q2) !== ccw(p2, q1, q2) &&
            ccw(p1, p2, q1) !== ccw(p1, p2, q2);
    },
    segment_intersection(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): { point: Vec2 } | null {
        const r = v2.sub(a2, a1)
        const s = v2.sub(b2, b1)

        const denom = r.x * s.y - r.y * s.x
        if (Math.abs(denom) < 0.00001) return null

        const u = ((b1.x - a1.x) * r.y - (b1.y - a1.y) * r.x) / denom
        const t = ((b1.x - a1.x) * s.y - (b1.y - a1.y) * s.x) / denom

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                point: v2(
                    a1.x + t * r.x,
                    a1.y + t * r.y
                )
            }
        }

        return null
    }
})
export interface Rect{
    min:Vec2
    max:Vec2
}
function rect_new(min:Vec2,max:Vec2):Rect{
    return {min,max}
}
export const rect=Object.assign(rect_new,Object.freeze({
    new(min:Vec2,max:Vec2){
        return {min,max}
    },
    centered(pos:Vec2,size:Vec2){
        return {min:pos,max:v2.add(pos,size)}
    },
    create(x:number,y:number,width:number,height:number){
        const pos=v2(x,y)
        const size=v2(width,height)
        v2m.add(size,size,pos)
        return {
            min:pos,
            max:size
        }
    }
}))