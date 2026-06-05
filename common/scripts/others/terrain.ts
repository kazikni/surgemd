import { Collision, polygon2, Polygon2D, PolygonHitbox2D, SeededRandom, v2, v2m, Vec2 } from "../../engine/core.ts"
import { BasicTerrainManager, FloorBase } from "../../engine/core/game/terrain.ts"
import { TerrainLayerDef, TerrainShapeDef } from "../definitions/maps/base.ts"

export enum FloorType {
    Void = 0,
    Grass,
    Snow,
    Sand,
    Water,
    Ice,

    Metal
}
export enum FloorKind {
    Void=0,
    Solid,
    Liquid,
    Ice
}
export interface FloorDef {
    default_color: number
    speed_mult?: number
    acceleration?:number
    floor_kind:FloorKind
    footstep_sounds?:string[]
    footstep_decal?:boolean
    skin_apply?:string

    traction:number
    rolling_resistance:number
}

export const Floors: Record<FloorType, FloorDef> = {
    [FloorType.Void]: {
        default_color: 0x0d131a,
        floor_kind:FloorKind.Solid,
        footstep_sounds:[],
        traction: 1,
        rolling_resistance:0,
    },
    [FloorType.Grass]: {
        default_color: 0x4d9635,
        floor_kind:FloorKind.Solid,
        footstep_sounds:["footstep_grass_1","footstep_grass_2"],
        traction: 1,
        rolling_resistance:0,
    },
    [FloorType.Snow]: {
        default_color: 0xbec8cf,floor_kind:FloorKind.Solid,
        footstep_sounds:["footstep_snow_1","footstep_snow_2"],
        footstep_decal:true,
        skin_apply:"snow",
        traction: 0.8,
        rolling_resistance:-0.2,
    },
    [FloorType.Sand]: {
        default_color: 0xb59924,floor_kind:FloorKind.Solid,
        footstep_sounds:["footstep_sand_1","footstep_sand_2"],
        traction: 0.9,
        rolling_resistance:0,
    },
    [FloorType.Water]: {
        default_color: 0x2466a2,
        speed_mult: 0.7,
        floor_kind:FloorKind.Liquid,
        footstep_sounds:["footstep_water_1","footstep_water_2"],
        traction: 1,
        rolling_resistance:0,
    },
    [FloorType.Ice]: {
        default_color: 0x4681a3,
        acceleration:0.05,
        floor_kind:FloorKind.Ice,
        footstep_sounds:["footstep_ice_1","footstep_ice_2"],
        traction: 0.3,
        rolling_resistance:-0.4,
    },
    [FloorType.Metal]: {
        default_color: 0xb3c0c7,floor_kind:FloorKind.Solid,
        footstep_sounds:["footstep_metal_1","footstep_metal_2"],
        traction: 1,
        rolling_resistance:0,
    },
};
export interface Floor extends FloorBase {
    smooth: boolean
    visible:boolean
    tint?:number
}

export interface RiversDef { weight: number; rivers: RiverDef[] }[]
export type RiverPoint = {
    position: Vec2
    width: number
    push_force: number
    direction: Vec2
};
export interface RiverLayerDef {
    margin?:number
    scale?:number
    floor:number
    push:boolean
    floor_tint?:number
    layer?:number
}
export interface RiverDef{
    width:number
    width_variation?:number
    push_force?:number
    min_distance?:number
    layers?:RiverLayerDef[]
}
export interface TerrainShapeResult{
    base:Polygon2D
    floors:{
        def:TerrainLayerDef
        polygon:Polygon2D
        hitbox:PolygonHitbox2D
    }[]
}
export class TerrainManager extends BasicTerrainManager<Floor>{
    
}
export function generate_terrain_shape(shape:TerrainShapeDef,terrain:TerrainManager,random:SeededRandom,layer:number=0,position:Vec2=v2(0,0)):Polygon2D{
    const center=shape.position??position
    const base = polygon2.island_silhouette(center,shape.radius,shape.points ?? 6,shape.variation ?? 50,shape.passes ?? 3,shape.variation_decay ?? 0.6,random)
    let poly = polygon2.clone(base)
    for(const floor of shape.floors.sort((a,b)=>a.padding-b.padding)){
        poly = polygon2.offset_polygon(base,floor.padding)
        poly = polygon2.distort_polygon(poly,floor.variation,floor.spacing,0.9,random)
        const hb=new PolygonHitbox2D(poly)
        terrain.add_floor({
            type:floor.type,
            hb:hb,
            smooth:true,
            visible:true,
            layer:floor.layer??layer,
            tint:floor.tint,
        })
    }
    return base
}
export const rivers={
    find_intersection(a: RiverPoint[],b: RiverPoint[]): { ai: number, bi: number, point: Vec2 } | null {
        for (let i = 1; i < a.length; i++) {
            const a1 = a[i - 1].position
            const a2 = a[i].position

            for (let j = 1; j < b.length; j++) {
                const b1 = b[j - 1].position
                const b2 = b[j].position

                const hit = Collision.segment_intersection(a1, a2, b1, b2)
                if (hit) {
                    return { ai: i, bi: j, point: hit.point }
                }
            }
        }
        return null
    },
    merge_rivers(base: RiverPoint[],other: RiverPoint[]): RiverPoint[] {
        const hit = this.find_intersection(base, other)
        if (!hit) return base
        const { ai, point } = hit
        const newPoints = base.slice(0, ai)
        newPoints.push({
            position: point,
            width: base[ai].width,
            direction:base[ai].direction,
            push_force:base[ai].push_force
        })

        return newPoints
    },
    apply_river_repulsion(points: RiverPoint[],others: River[],strength = 8) {
        for (const p of points) {
            for (const r of others) {
                for (const op of r.points) {
                    const d = v2.sub(p.position, op.position)
                    const dist = v2.len(d)
                    if (dist < (p.width + op.width)) {
                        const push = (1 - dist / (p.width + op.width)) * strength

                        const dir = v2.normalizeSafe(d, v2(1, 0))
                        v2m.add(p.position, p.position, v2.scale(dir, push))
                    }
                }
            }
        }
    },
    apply_river_width_interaction(points: RiverPoint[],others: River[]) {
        for (const p of points) {
            let extra = 0
            for (const r of others) {
                for (const op of r.points) {
                    const dist = v2.distance(p.position, op.position)
                    if (dist < 100) {
                        extra += (1 - dist / 100) * op.width * 0.5
                    }
                }
            }
            p.width += extra
        }
    },
    process_river_interactions(newRiver: RiverPoint[],existing: River[]): RiverPoint[] {
        for (const r of existing) {
            newRiver = this.merge_rivers(newRiver, r.points)
        }
        this.apply_river_repulsion(newRiver, existing)
        this.apply_river_width_interaction(newRiver, existing)

        return newRiver
    }
}
export interface RiverLayer{
    hb:PolygonHitbox2D
    floor:number

    push:boolean
    floor_tint?:number
    layer?:number
}
export class River{
    base:PolygonHitbox2D
    layers:RiverLayer[]=[]
    points:RiverPoint[]=[]

    static default_layers:RiverLayerDef[]=[
        /*{
            floor:FloorType.Sand,
            push:true,
            scale:1
        },*/
        {
            floor:FloorType.Water,
            push:true,
            scale:0.8
        },
    ]
    constructor(points:RiverPoint[],def:RiverDef){
        this.base=new PolygonHitbox2D(polygon2.from_point_line(points))
        for(const layer of def.layers??River.default_layers){
            this.layers.push({
                hb:River.create_layer(points,layer.margin,layer.scale),
                floor:layer.floor,
                floor_tint:layer.floor_tint,
                push:layer.push,
                layer:layer.layer
            })
        }
        this.points=points
    }
    get_point_inside(position:Vec2):RiverLayer|undefined{
        for(let l=this.layers.length-1;l>=0;l--){
            if(this.layers[l].hb.point_inside(position)){
                return this.layers[l]
            }
        }
    }
    get_position(t: number): Vec2 {
        t = Math.max(0, Math.min(1, t))
        const max = this.points.length - 1
        const idx = t * max
        const i0 = Math.floor(idx)
        const i1 = Math.min(i0 + 1, max)
        const frac = idx - i0
        return v2.lerp(this.points[i0].position,this.points[i1].position,frac)
    }
    get_closest_point(pos: Vec2): RiverPoint | undefined {
        let closest: RiverPoint | undefined
        let closestDist = Infinity
        for(const p of this.points){
            const dist = v2.distanceSquared(pos, p.position)
            if(dist < closestDist){
                closestDist = dist
                closest = p
            }
        }
        return closest
    }

    // Create
    static generate(point1:Vec2,point2:Vec2,def:RiverDef,random:SeededRandom):River|undefined{
        if(v2.distance(point1, point2)<(def.min_distance??80)){
            return
        }
        let path = this.generate_path(point1,point2,random)
        if(path.length < 5){
            return
        }

        path = this.smooth_path(path)
        let final = this.apply_width(path,def,random)
        final = this.apply_flow(final)
        return new River(final,def)
    }
    static create_layer(points:RiverPoint[],margin:number=0,scale:number=1){
        const expanded:RiverPoint[]=[]
        for(const p of points){
            expanded.push({...p,width:p.width*scale+margin})
        }
        return new PolygonHitbox2D(polygon2.from_point_line(expanded))
    }
    static generate_rivers(hitbox: Polygon2D,rivers: RiversDef[],random: SeededRandom): River[] {
        const ret: River[] = []
        const defs = random.weight2(rivers)
        const center = polygon2.center(hitbox)
        for(const def of defs.rivers){
            let attempts = 0
            while(attempts++<25){
                const startIndex=random.int(0, hitbox.length - 1)
                const minOffset=Math.floor(hitbox.length * 0.3)

                const maxOffset=Math.floor(hitbox.length * 0.7)
                const offset=random.int(minOffset, maxOffset)
                const endIndex=(startIndex + offset) % hitbox.length

                let point1 = hitbox[startIndex]
                let point2 = hitbox[endIndex]

                point1 = this.extend_point(point1,center,def.width * 1.7)
                point2 = this.extend_point(point2,center,def.width * 1.7)

                const river=River.generate(point1,point2,def,random)
                if(!river){
                    continue
                }
                ret.push(river)
                break
            }
        }
        return ret
    }
    // Utils
    static extend_point(point: Vec2,center: Vec2,amount: number): Vec2 {
        const dir = v2.normalizeSafe(v2.sub(point, center),v2(1,0))
        return v2.add(point,v2.scale(dir, amount))
    }
    static generate_path(start: Vec2,end: Vec2,random: SeededRandom,passes = 6,strength = 0.25): Vec2[] {
        let points: Vec2[] = [start, end]
        const globalDir = v2.normalizeSafe(v2.sub(end, start), v2(1, 0))
        const globalNormal = v2(-globalDir.y, globalDir.x)
        for (let p = 0; p < passes; p++) {
            const next: Vec2[] = []
            for (let i = 0; i < points.length - 1; i++) {
                const a = points[i]
                const b = points[i + 1]

                next.push(a)

                const mid = v2.scale(v2.add(a, b), 0.5)

                const dir = v2.normalizeSafe(v2.sub(b, a), globalDir)
                const normal = v2.normalizeSafe(v2.add(v2(-dir.y, dir.x),v2.scale(globalNormal, 0.5)),globalNormal)

                const dist = v2.distance(a, b)
                const falloff = Math.min(1, dist * 0.1)

                const offset = random.float(-1, 1) * dist * strength * falloff
                next.push(v2.add(mid, v2.scale(normal, offset)))
            }
            next.push(points[points.length - 1])
            points = next
            strength *= 0.55
        }
        return points
    }
    static smooth_path(points: Vec2[], steps = 2): Vec2[] {
        const out: Vec2[] = []
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(i-1,0)]
            const p1 = points[i]
            const p2 = points[i+1]
            const p3 = points[Math.min(i+2, points.length-1)]
            for (let t = 0; t < 1; t += 1/steps) {
                const tt = t*t
                const ttt = tt*t
                const q = v2(
                    0.5 * ((2*p1.x) + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*tt + (-p0.x+3*p1.x-3*p2.x+p3.x)*ttt),
                    0.5 * ((2*p1.y) + (-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*tt + (-p0.y+3*p1.y-3*p2.y+p3.y)*ttt)
                )
                out.push(q)
            }
        }
        out.push(points[points.length-1])
        return out
    }
    static apply_width(points: Vec2[],def: RiverDef,random: SeededRandom): RiverPoint[] {
        const out: RiverPoint[] = []
        for (let i = 0; i < points.length; i++) {
            let width = def.width
            if (def.width_variation) {
                width += random.float(0, def.width_variation)
            }
            out.push({
                position: points[i],
                width,
                direction:v2.zero(),
                push_force:def.push_force??5
            })
        }

        return out
    }
    static apply_flow(points: RiverPoint[]) {
        for(let i = 0; i < points.length; i++){
            const prev = points[Math.max(0, i - 1)].position
            const next = points[Math.min(points.length - 1, i + 1)].position
            points[i].direction = v2.normalizeSafe(v2.sub(next, prev),v2(1,0))
        }
        return points
    }
}