import { Rect } from "../math/geometry.ts";
import { HitboxType2D, type Hitbox2D } from "../math/hitbox.ts"
import { v2, Vec2 } from "../math/vec2.ts";
import { v3, Vec3 } from "../math/vec3.ts";

export interface Model2D{
    vertices:Float32Array
    tex_coords:Float32Array
}
export function ImageModel2D(scale: Vec2,angle: number,hotspot: Vec2,size: Vec2,meter_size: number,position: Vec2,rect: Rect,out: Float32Array) {
    const hw = (size.x / meter_size) * (scale.x * 0.5)
    const hh = (size.y / meter_size) * (scale.y * 0.5)

    const x1 = -hw * hotspot.x
    const y1 = -hh * hotspot.y
    const x2 = x1 + hw
    const y2 = y1 + hh

    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity

    let rx, ry

    rx = x1 * cos - y1 * sin + position.x
    ry = x1 * sin + y1 * cos + position.y
    out[0] = rx; out[1] = ry
    minX = rx; maxX = rx
    minY = ry; maxY = ry

    rx = x2 * cos - y1 * sin + position.x
    ry = x2 * sin + y1 * cos + position.y
    out[2] = rx; out[3] = ry
    if (rx < minX) minX = rx; else if (rx > maxX) maxX = rx
    if (ry < minY) minY = ry; else if (ry > maxY) maxY = ry

    rx = x1 * cos - y2 * sin + position.x
    ry = x1 * sin + y2 * cos + position.y
    out[4] = rx; out[5] = ry
    if (rx < minX) minX = rx; else if (rx > maxX) maxX = rx
    if (ry < minY) minY = ry; else if (ry > maxY) maxY = ry

    out[6] = out[4]
    out[7] = out[5]

    out[8] = out[2]
    out[9] = out[3]

    rx = x2 * cos - y2 * sin + position.x
    ry = x2 * sin + y2 * cos + position.y
    out[10] = rx; out[11] = ry
    if (rx < minX) minX = rx; else if (rx > maxX) maxX = rx
    if (ry < minY) minY = ry; else if (ry > maxY) maxY = ry

    rect.min.x = minX
    rect.min.y = minY
    rect.max.x = maxX
    rect.max.y = maxY
}
export function ImageModel3D(
    scale: Vec2,
    angle: { x: number; y: number; z: number }, // rotação em rad em 3 eixos
    hotspot: Vec2 = v2(0, 0),
    size: Vec2,
    meter_size: number = 100
): Float32Array {
    const sizeR = v2(
        (size.x / meter_size) * (scale.x / 2),
        (size.y / meter_size) * (scale.y / 2)
    );
    const x1 = -sizeR.x * hotspot.x;
    const y1 = -sizeR.y * hotspot.y;
    const x2 = sizeR.x + x1;
    const y2 = sizeR.y + y1;

    const verticesB = [
        { x: x1, y: y1, z: 0 },
        { x: x2, y: y1, z: 0 },
        { x: x1, y: y2, z: 0 },
        { x: x2, y: y2, z: 0 }
    ];

    const verticesR = verticesB.map(v => rotate3D(v, angle));

    return new Float32Array([
        verticesR[0].x, verticesR[0].y, verticesR[0].z,
        verticesR[1].x, verticesR[1].y, verticesR[1].z,
        verticesR[2].x, verticesR[2].y, verticesR[2].z,

        verticesR[2].x, verticesR[2].y, verticesR[2].z,
        verticesR[1].x, verticesR[1].y, verticesR[1].z,
        verticesR[3].x, verticesR[3].y, verticesR[3].z
    ]);
}
function rotate3D(v: { x: number; y: number; z: number }, angle: { x: number; y: number; z: number }) {
    let { x, y, z } = v;

    let cy = Math.cos(angle.x), sy = Math.sin(angle.x);
    let y1 = y * cy - z * sy;
    let z1 = y * sy + z * cy;

    y = y1; z = z1

    let cx = Math.cos(angle.y), sx = Math.sin(angle.y);
    let x1 = x * cx + z * sx;
    let z2 = -x * sx + z * cx;

    x = x1; z = z2;

    let cz = Math.cos(angle.z), sz = Math.sin(angle.z);
    let x2 = x * cz - y * sz;
    let y2 = x * sz + y * cz;

    return { x: x2, y: y2, z };
}
export const model2d={
    zero(){
        return {
            vertices:new Float32Array(),
            tex_coords:new Float32Array(),
        }
    },
    line(start: Vec2, end: Vec2, width: number): Model2D {
        const dx = end.x - start.x;
        const dy = end.y - start.y;

        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return {vertices:new Float32Array(0),tex_coords:new Float32Array([])};

        const angle = Math.atan2(dy, dx);
        const halfW = width / 2;

        const verticesBase = [
            { x: 0,    y:  halfW },
            { x: len,  y:  halfW },
            { x: 0,    y: -halfW },
            { x: len,  y: -halfW }
        ];

        const verticesRotated = verticesBase.map(v => v2.rotate_RadAngle(v,angle));

        const verticesTranslated = verticesRotated.map(v => ({
            x: v.x + start.x,
            y: v.y + start.y
        }));

        return {vertices:new Float32Array([
            verticesTranslated[0].x, verticesTranslated[0].y,
            verticesTranslated[1].x, verticesTranslated[1].y,
            verticesTranslated[2].x, verticesTranslated[2].y,

            verticesTranslated[2].x, verticesTranslated[2].y,
            verticesTranslated[1].x, verticesTranslated[1].y,
            verticesTranslated[3].x, verticesTranslated[3].y
        ]),tex_coords:new Float32Array()};
    },
    outlineCircle(
        radius: number,
        width: number,
        segments: number = 24,
        center: Vec2 = v2(0, 0)
    ): Model2D {
        const vertices: number[] = [];

        const angleStep = (Math.PI * 2) / segments;

        const outer: Vec2[] = [];
        const inner: Vec2[] = [];

        for (let i = 0; i < segments; i++) {
            const theta = i * angleStep;

            const cos = Math.cos(theta);
            const sin = Math.sin(theta);
            outer.push({
                x: center.x + cos * (radius + width),
                y: center.y + sin * (radius + width),
            });
            inner.push({
                x: center.x + cos * radius,
                y: center.y + sin * radius,
            });
        }

        for (let i = 0; i < segments; i++) {
            const iNext = (i + 1) % segments

            const i0 = inner[i]
            const i1 = inner[iNext]
            const o0 = outer[i]
            const o1 = outer[iNext]

            vertices.push(i0.x, i0.y, o0.x, o0.y, o1.x, o1.y)

            vertices.push(i0.x, i0.y, o1.x, o1.y, i1.x, i1.y)
        }

        return {
            vertices: new Float32Array(vertices),
            tex_coords: new Float32Array([]),
        };
    },

    circle(
        radius: number,
        segments: number = 24,
        center: Vec2 = v2(0, 0)
    ): Model2D {
        const vertices: number[] = [];
        const tex_coords: number[] = [];

        const angleStep = (Math.PI * 2) / segments;

        for (let i = 0; i < segments; i++) {
            const theta0 = i * angleStep;
            const theta1 = (i + 1) * angleStep;

            const x0 = center.x + Math.cos(theta0) * radius;
            const y0 = center.y + Math.sin(theta0) * radius;
            const x1 = center.x + Math.cos(theta1) * radius;
            const y1 = center.y + Math.sin(theta1) * radius;

            // triângulo do centro -> ponto0 -> ponto1
            vertices.push(
            center.x, center.y,
            x0, y0,
            x1, y1
            );
        }

        return {
            vertices: new Float32Array(vertices),
            tex_coords: new Float32Array(tex_coords),
        };
    },
    outline(model: Model2D, width: number): Model2D {
        const vertices: number[] = []

        const segments = model.vertices.length / 6
        const angleStep = (Math.PI * 2) / segments

        const outer: Vec2[] = []
        const inner: Vec2[] = []

        for (let i = 0; i < segments; i++) {
            const theta = i * angleStep

            const x = Math.cos(theta)
            const y = Math.sin(theta)

            outer.push({ x: (x * (width + 1)), y: (y * (width + 1)) })
            inner.push({ x: (x * (1 - width)), y: (y * (1 - width)) })
        }

        for (let i = 0; i < segments; i++) {
            const iNext = (i + 1) % segments

            const i0 = inner[i]
            const i1 = inner[iNext]
            const o0 = outer[i]
            const o1 = outer[iNext]

            vertices.push(i0.x, i0.y, o0.x, o0.y, o1.x, o1.y)

            vertices.push(i0.x, i0.y, o1.x, o1.y, i1.x, i1.y)
        }

        return {
            vertices: new Float32Array(vertices),
            tex_coords: new Float32Array([]),
        }
    },
    rect(
        pos_min: Vec2 = v2(0, 0),
        pos_max: Vec2 = v2(1, 1),
        tex_min: Vec2 = v2(0, 0),
        tex_max: Vec2 = v2(1, 1)
    ): Model2D {
        return {
            vertices: new Float32Array([
                pos_min.x, pos_max.y, // top-left
                pos_max.x, pos_max.y, // top-right
                pos_min.x, pos_min.y, // bottom-left

                pos_min.x, pos_min.y, // bottom-left
                pos_max.x, pos_max.y, // top-right
                pos_max.x, pos_min.y  // bottom-right
            ]),
            tex_coords: new Float32Array([
                tex_min.x, tex_max.y, // top-left
                tex_max.x, tex_max.y, // top-right
                tex_min.x, tex_min.y, // bottom-left

                tex_min.x, tex_min.y, // bottom-left
                tex_max.x, tex_max.y, // top-right
                tex_max.x, tex_min.y  // bottom-right
            ])
        }
    },
    regular_shape(
        sides: number,
        radius: number,          // agora é o RAIO MÍNIMO (inradius)
        center: Vec2 = v2(0, 0),
        rotation = 0
    ): Model2D {
        if (sides < 3) {
            return model2d.circle(radius, 32, center)
        }

        // converte raio mínimo → raio até os vértices
        const vertexRadius = radius / Math.cos(Math.PI / sides)

        const vertices: number[] = []
        const angleStep = (Math.PI * 2) / sides

        for (let i = 0; i < sides; i++) {
            const a0 = rotation + i * angleStep
            const a1 = rotation + (i + 1) * angleStep

            vertices.push(
                center.x, center.y,
                center.x + Math.cos(a0) * vertexRadius,
                center.y + Math.sin(a0) * vertexRadius,
                center.x + Math.cos(a1) * vertexRadius,
                center.y + Math.sin(a1) * vertexRadius,
            )
        }

        return {
            vertices: new Float32Array(vertices),
            tex_coords: new Float32Array(),
        }
    },
    hitbox(hb:Hitbox2D):Model2D{
        if(hb.type===HitboxType2D.rect){
            return this.rect(hb.min,hb.max)
        }else if(hb.type===HitboxType2D.circle){
            return this.circle(hb.radius,undefined,hb.position)
        }else if(hb.type===HitboxType2D.group){
            const vertices: number[] = []
            const tex: number[] = []

            for(const sub of hb.hitboxes){
                const model = this.hitbox(sub)

                for(let i=0;i<model.vertices.length;i++){
                    vertices.push(model.vertices[i])
                }

                if(model.tex_coords){
                    for(let i=0;i<model.tex_coords.length;i++){
                        tex.push(model.tex_coords[i])
                    }
                }
            }

            return {
                vertices: new Float32Array(vertices),
                tex_coords: new Float32Array(tex)
            }
        }
        return {
            tex_coords:new Float32Array([]),
            vertices:new Float32Array([])
        }
    },
    round_model(model: Model2D, radius: number): Model2D {
        const v = model.vertices
        if (v.length < 2) return model

        let cx = 0
        let cy = 0
        const count = v.length / 2

        for (let i = 0; i < v.length; i += 2) {
            cx += v[i]
            cy += v[i + 1]
        }

        cx /= count
        cy /= count

        const out = new Float32Array(v.length)

        for (let i = 0; i < v.length; i += 2) {
            const x = v[i]
            const y = v[i + 1]

            const dx = x - cx
            const dy = y - cy
            const len = Math.hypot(dx, dy)

            if (len > 0) {
                const nx = dx / len
                const ny = dy / len

                out[i]     = x + nx * radius
                out[i + 1] = y + ny * radius
            } else {
                out[i]     = x
                out[i + 1] = y
            }
        }

        return {
            vertices: out,
            tex_coords: model.tex_coords
        }
    },
    extract_edges(model: Model2D): [Vec2, Vec2][] {
        const edges = new Map<string, [Vec2, Vec2]>()
        const v = model.vertices

        for (let i = 0; i < v.length; i += 6) {
            const p0 = { x: v[i],     y: v[i + 1] }
            const p1 = { x: v[i + 2], y: v[i + 3] }
            const p2 = { x: v[i + 4], y: v[i + 5] }

            const tri: [Vec2, Vec2][] = [
                [p0, p1],
                [p1, p2],
                [p2, p0],
            ]

            for (const [a, b] of tri) {
                const k1 = `${a.x},${a.y}|${b.x},${b.y}`
                const k2 = `${b.x},${b.y}|${a.x},${a.y}`

                if (edges.has(k2)) {
                    edges.delete(k2)
                } else {
                    edges.set(k1, [a, b])
                }
            }
        }

        return [...edges.values()]
    },
    stroke_from_edges(edges: [Vec2, Vec2][],width: number,inner_value:number=0,outer_value:number=1): Model2D {
        const inner = width*inner_value
        const outer = width*outer_value

        const out: number[] = []
        edges.splice(0,1)
        edges.pop()
        for (const [a, b] of edges) {
            const dx = b.x - a.x
            const dy = b.y - a.y
            const len = Math.hypot(dx, dy)
            if (len === 0) continue

            const nx = -dy / len
            const ny = dx / len

            const p0 = { x: a.x + nx * outer, y: a.y + ny * outer }
            const p1 = { x: b.x + nx * outer, y: b.y + ny * outer }
            const p2 = { x: a.x - nx * inner, y: a.y - ny * inner }
            const p3 = { x: b.x - nx * inner, y: b.y - ny * inner }

            out.push(
                p0.x, p0.y, p1.x, p1.y, p2.x, p2.y,
                p2.x, p2.y, p1.x, p1.y, p3.x, p3.y
            )
        }

        return {
            vertices: new Float32Array(out),
            tex_coords: new Float32Array(),
        }
    },
    stroke_model(model: Model2D,width:number,inner?:number,outer?:number):Model2D{
        const edges = model2d.extract_edges(model)
        if (!edges.length)return this.zero()

        return model2d.stroke_from_edges(
            edges,
            width,
            inner,
            outer,
        )
    },
    triangulateConvex(polygon: Vec2[], texSize = 32): Model2D {
        if (!polygon || polygon.length < 3) return { vertices: new Float32Array(0), tex_coords: new Float32Array(0) }

        const EPS = 1e-6
        const pts = removeDupAndCollinear(polygon, EPS)
        if (pts.length < 3) return { vertices: new Float32Array(0), tex_coords: new Float32Array(0) }
        if (signedArea(pts) < 0) pts.reverse()

        const indices = earClipIndices(pts, EPS)
        const verts: number[] = []
        const tex: number[] = []

        for (let k = 0; k < indices.length; k++) {
            const v = pts[indices[k]]
            verts.push(v.x, v.y)
            tex.push(v.x / texSize, v.y / texSize)
        }

        return { vertices: new Float32Array(verts), tex_coords: new Float32Array(tex) }
    }
}

function signedArea(pts: Vec2[]): number {
  let a = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
    a += (pts[j].x * pts[i].y - pts[i].x * pts[j].y)
  return a * 0.5
}

function removeDupAndCollinear(src: Vec2[], eps = 1e-6): Vec2[] {
  if (src.length <= 3) return src.map(p => v2.clone(p))
  const tmp: Vec2[] = []
  for (let i = 0; i < src.length; i++) {
    const p = src[i]
    const prev = tmp.length ? tmp[tmp.length - 1] : null
    if (!prev || v2.distanceSquared(prev, p) > eps * eps) tmp.push(v2.clone(p))
  }
  if (tmp.length > 1 && v2.distanceSquared(tmp[0], tmp[tmp.length - 1]) <= eps * eps) tmp.pop()
  if (tmp.length <= 3) return tmp

  const out: Vec2[] = []
  for (let i = 0; i < tmp.length; i++) {
    const a = tmp[(i - 1 + tmp.length) % tmp.length]
    const b = tmp[i]
    const c = tmp[(i + 1) % tmp.length]
    const abx = b.x - a.x, aby = b.y - a.y
    const bcx = c.x - b.x, bcy = c.y - b.y
    const cross = Math.abs(abx * bcy - aby * bcx)
    if (cross > eps) out.push(b)
  }
  return out.length ? out : tmp
}

function earClipIndices(pts: Vec2[], EPS = 1e-6): number[] {
  const n = pts.length
  const V: number[] = []
  for (let i = 0; i < n; i++) V.push(i)
  const res: number[] = []

  const isCCW = (a: Vec2, b: Vec2, c: Vec2) => ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) > EPS
  const pointInTriangle = (p: Vec2, a: Vec2, b: Vec2, c: Vec2) => {
    const v0x = c.x - a.x, v0y = c.y - a.y
    const v1x = b.x - a.x, v1y = b.y - a.y
    const v2x = p.x - a.x, v2y = p.y - a.y
    const dot00 = v0x * v0x + v0y * v0y
    const dot01 = v0x * v1x + v0y * v1y
    const dot02 = v0x * v2x + v0y * v2y
    const dot11 = v1x * v1x + v1y * v1y
    const dot12 = v1x * v2x + v1y * v2y
    const denom = dot00 * dot11 - dot01 * dot01
    if (Math.abs(denom) < 1e-12) return false
    const u = (dot11 * dot02 - dot01 * dot12) / denom
    const v = (dot00 * dot12 - dot01 * dot02) / denom
    return u >= -1e-9 && v >= -1e-9 && (u + v) <= 1 + 1e-9
  }

  let guard = 0
  while (V.length > 3 && guard++ < 10000) {
    let ear = false
    for (let i = 0; i < V.length; i++) {
      const iPrev = V[(i - 1 + V.length) % V.length]
      const iCurr = V[i]
      const iNext = V[(i + 1) % V.length]
      const a = pts[iPrev], b = pts[iCurr], c = pts[iNext]
      if (!isCCW(a, b, c)) continue
      let inside = false
      for (const vi of V) {
        if (vi === iPrev || vi === iCurr || vi === iNext) continue
        if (pointInTriangle(pts[vi], a, b, c)) { inside = true; break }
      }
      if (inside) continue
      res.push(iPrev, iCurr, iNext)
      V.splice(i, 1)
      ear = true
      break
    }
    if (!ear) V.splice(1, 1)
  }
  if (V.length === 3) res.push(V[0], V[1], V[2])
  return res
}
export interface Face3{
    p1:Vec3
    p2:Vec3
    p3:Vec3
    normal?:{
        p1:Vec3
        p2:Vec3
        p3:Vec3
    }
    texture?:{
        p1:Vec3
        p2:Vec3
        p3:Vec3
    }
}
export interface Face4{
    p1:Vec3 // Left Top
    p2:Vec3 // Right Top
    p3:Vec3 // Right Bottom
    p4:Vec3 // Left Bottom
    normal?:{
        p1:Vec3 // Left Top
        p2:Vec3 // Right Top
        p3:Vec3 // Right Bottom
        p4:Vec3 // Left Bottom
    }
    texture?:{
        p1:Vec3 // Left Top
        p2:Vec3 // Right Top
        p3:Vec3 // Right Bottom
        p4:Vec3 // Left Bottom
    }
}
export interface FaceId{
    p1:number
    p2:number
    p3:number
    i:number
    normal?:{
        p1:number
        p2:number
        p3:number
        i:number
    }
    texture?:{
        p1:number
        p2:number
        p3:number
        i:number
    }
}
export class Model3D{
    _vertices: number[]
    _indices: number[]
    _normalsM:number[]
    _normals: number[]
    _texCoords:number[]
    _texCoordsM:number[]
    constructor(){
        this._vertices=[]
        this._indices=[]
        this._normals=[]
        this._normalsM=[]
        this._texCoords=[]
        this._texCoordsM=[]
    }
    addFace3(face:Face3):FaceId{
        const ret:FaceId={p1:-1,p2:-1,p3:-1,i:0}

        for(let i=0;i<this._vertices.length;i+=3){
            const v=v3.new(-this._vertices[i],this._vertices[i+1],this._vertices[i+2])
            if(v3.is(face.p1,v)){
                ret.p1=i
            }
            if(v3.is(face.p2,v)){
                ret.p2=i
            }
            if(v3.is(face.p3,v)){
                ret.p3=i
            }
        }

        ret.i=this._indices.length
        if(ret.p1===-1){
            this._indices.push(Math.floor(this._vertices.length/3))
            ret.p1=this._vertices.length
            this._vertices.push(-face.p1.x,face.p1.y,face.p1.z)
        }else{
            this._indices.push(Math.floor(ret.p1/3))
        }

        if(ret.p2===-1){
            this._indices.push(Math.floor(this._vertices.length/3))
            ret.p2=this._vertices.length
            this._vertices.push(-face.p2.x,face.p2.y,face.p2.z)
        }else{
            this._indices.push(Math.floor(ret.p2/3))
        }

        if(ret.p3===-1){
            this._indices.push(Math.floor(this._vertices.length/3))
            ret.p3=this._vertices.length
            this._vertices.push(-face.p3.x,face.p3.y,face.p3.z)
        }else{
            this._indices.push(Math.floor(ret.p3/3))
        }

        if(face.normal){
            ret.normal={
                p1:-1,
                p2:-1,
                p3:-1,
                i:this._normalsM.length
            }
            for(let i=0;i<this._normals.length;i+=3){
                const v=v3.new(this._normals[i],this._normals[i+1],this._normals[i+2])
                if(v3.is(face.normal.p1,v)){
                    ret.normal.p1=i
                }
                if(v3.is(face.normal.p2,v)){
                    ret.normal.p2=i
                }
                if(v3.is(face.normal.p3,v)){
                    ret.normal.p3=i
                }
            }

            if(ret.normal.p1===-1){
                this._normalsM.push(Math.floor(this._normals.length/3))
                ret.normal.p1=this._normals.length
                this._normals.push(face.normal.p1.x,face.normal.p1.y,face.normal.p1.z)
            }else{
                this._normalsM.push(Math.floor(ret.normal.p1/3))
            }
    
            if(ret.normal.p2===-1){
                this._normalsM.push(Math.floor(this._normals.length/3))
                ret.normal.p2=this._vertices.length
                this._normals.push(face.normal.p2.x,face.normal.p2.y,face.normal.p2.z)
            }else{
                this._normalsM.push(Math.floor(ret.normal.p2/3))
            }
    
            if(ret.normal.p3===-1){
                this._normalsM.push(Math.floor(this._normals.length/3))
                ret.normal.p3=this._normals.length
                this._normals.push(face.normal.p3.x,face.normal.p3.y,face.normal.p3.z)
            }else{
                this._normalsM.push(Math.floor(ret.normal.p3/3))
            }
        }
        if(face.texture){
            ret.texture={
                p1:-1,
                p2:-1,
                p3:-1,
                i:this._normalsM.length
            }
            for(let i=0;i<this._texCoords.length;i+=3){
                const v=v3.new(this._texCoords[i],this._texCoords[i+1],this._texCoords[i+2])
                if(v3.is(face.texture.p1,v)){
                    ret.texture.p1=i
                }
                if(v3.is(face.texture.p2,v)){
                    ret.texture.p2=i
                }
                if(v3.is(face.texture.p3,v)){
                    ret.texture.p3=i
                }
            }

            if(ret.texture.p1===-1){
                this._texCoordsM.push(Math.floor(this._texCoords.length/3))
                ret.texture.p1=this._normals.length
                this._texCoords.push(face.texture.p1.x,face.texture.p1.y,face.texture.p1.z)
            }else{
                this._texCoordsM.push(Math.floor(ret.texture.p1/3))
            }

            if(ret.texture.p2===-1){
                this._texCoordsM.push(Math.floor(this._texCoords.length/3))
                ret.texture.p2=this._normals.length
                this._texCoords.push(face.texture.p2.x,face.texture.p2.y,face.texture.p2.z)
            }else{
                this._texCoordsM.push(Math.floor(ret.texture.p2/3))
            }

            if(ret.texture.p3===-1){
                this._texCoordsM.push(Math.floor(this._texCoords.length/3))
                ret.texture.p3=this._normals.length
                this._texCoords.push(face.texture.p3.x,face.texture.p3.y,face.texture.p3.z)
            }else{
                this._texCoordsM.push(Math.floor(ret.texture.p3/3))
            }
        }
        return ret
    }
    addFace4(face:Face4):{0:FaceId,1:FaceId}{
        const f1=this.addFace3({
            p1:face.p1,
            p2:face.p2,
            p3:face.p3,
            normal:face.normal?{
                p1:face.normal.p1,
                p2:face.normal.p2,
                p3:face.normal.p3,
            }:undefined,
            texture:face.texture?{
                p1:face.texture.p1,
                p2:face.texture.p2,
                p3:face.texture.p3,
            }:undefined
        })
        const f2=this.addFace3({
            p1:face.p1,
            p2:face.p4,
            p3:face.p3,
            normal:face.normal?{
                p1:face.normal.p1,
                p2:face.normal.p4,
                p3:face.normal.p3,
            }:undefined,
            texture:face.texture?{
                p1:face.texture.p1,
                p2:face.texture.p4,
                p3:face.texture.p3,
            }:undefined
        })
        return {0:f1,1:f2}
    }
}
export const model3d=Object.freeze({
    cube(s:number=1){
        const ret=new Model3D()
        ret._vertices = [
            // Front face
            0, 0, s,
            -s, 0, s,
            -s, s, s,
            0, s, s,
    
            // Back face
            0, 0, 0,
            -s, 0, 0,
            -s, s, 0,
            0, s, 0,
        ]
        ret._normals.push(
            // Normals for the front face
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,

            // Normals for the back face
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,

            // Normals for the top face
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,

            // Normals for the bottom face
            0, -1, 0,
            0, -1, 0,
            0, -1, 0,
            0, -1, 0,
            0, -1, 0,
            0, -1, 0,

            // Normals for the right face
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0,

            // Normals for the left face
            1, 0, 0,
            1, 0, 0,
            1, 0, 0,
            1, 0, 0,
            1, 0, 0,
        )

        // Define the indices
        ret._indices = [
            // Front face
            0, 1, 2, 0, 2, 3,
            // Back face
            4, 5, 6, 4, 6, 7,
            // Top face
            3, 2, 6, 3, 6, 7,
            // Bottom face
            0, 1, 5, 0, 5, 4,
            // Right face
            1, 2, 6, 1, 6, 5,
            // Left face
            0, 3, 7, 0, 7, 4
        ]
        return ret
    },
    parseObj(objText: string):Model3D{
        const ret=new Model3D()
        const lines = objText.split('\n')
        for (let line of lines) {
            line = line.trim()
            if (line.startsWith('v ')) {
              const parts = line.split(/\s+/)
              const vertex = parts.slice(1).map(parseFloat)
              vertex[0]*=-1
              ret._vertices.push(...vertex)
            } else if (line.startsWith('vn ')) {
              const parts = line.split(/\s+/)
              const normal = parts.slice(1).map(parseFloat)
              ret._normals.push(...normal)
            } else if (line.startsWith('vt ')) {
              const parts = line.split(/\s+/)
              const textureCoord = parts.slice(1).map(parseFloat)
              ret._texCoords.push(...textureCoord)
            } else if (line.startsWith('f ')) {
              const parts = line.split(/\s+/).slice(1)
              const vertices:number[] = []
              const textures:number[] = []
              const normals:number[] = []
        
              for (const part of parts) {
                const [v, vt, vn] = part.split('/').map(str => parseInt(str) - 1)
                vertices.push(v)
                if (vt !== undefined) textures.push(vt)
                if (vn !== undefined) normals.push(vn)
              }
        
              ret._indices.push(...vertices)
              ret._normalsM.push(...normals)
              ret._texCoordsM.push(...textures)
            }
        }
        return ret
    },
})