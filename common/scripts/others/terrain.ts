import { Collision, hash, Hitbox2D, Orientation, polygon2, PolygonHitbox2D, RectHitbox2D, SeededRandom, v2, v2m, Vec2 } from "../../engine/core.ts";

export enum FloorType {
    Void = 0,
    Grass,
    Snow,
    Sand,
    Water,
    Ice,

    Metal
}
export enum FloorKind{
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
}
export interface RiversDef { weight: number; rivers: RiverDef[] }[]

export const Floors: Record<FloorType, FloorDef> = {
    [FloorType.Void]: {
        default_color: 0x0d131a,
        floor_kind:FloorKind.Solid,
        footstep_sounds:[]
    },
    [FloorType.Grass]: {
        default_color: 0x4d9635,
        floor_kind:FloorKind.Solid,
        footstep_sounds:["footstep_grass_1","footstep_grass_2"]
    },
    [FloorType.Snow]: {
        default_color: 0xb3c0c7,floor_kind:FloorKind.Solid,
        footstep_sounds:["footstep_snow_1","footstep_snow_2"],
        footstep_decal:true,
    },
    [FloorType.Sand]: {
        default_color: 0xb59924,floor_kind:FloorKind.Solid,
        footstep_sounds:["footstep_sand_1","footstep_sand_2"]
    },
    [FloorType.Water]: {
        default_color: 0x2466a2,
        speed_mult: 0.6,
        floor_kind:FloorKind.Liquid,
        footstep_sounds:["footstep_water_1","footstep_water_2"]
    },
    [FloorType.Ice]: {
        default_color: 0x4681a3,
        acceleration:0.1,
        floor_kind:FloorKind.Ice,
        footstep_sounds:["footstep_ice_1","footstep_ice_2"]
    },
    [FloorType.Metal]: {
        default_color: 0xb3c0c7,floor_kind:FloorKind.Solid,
        footstep_sounds:["footstep_metal_1","footstep_metal_2"]
    },
};

export interface Floor {
    type: FloorType;
    layer:number;
    smooth: boolean;
    jagged: boolean;
    visible:boolean
    hb: Hitbox2D;
    final_hb:Hitbox2D;
}

export type RiverPoint = {
    position: Vec2;
    width: number;
};
export interface RiverDef{
    width:number
    width_variation?:number
}

export class TerrainManager {
    floors: Floor[] = [];
    grid = new Map<bigint,Floor[]>();

    add_floor(type: FloorType, hb: Hitbox2D, layer = 0, smooth = true,jagged:boolean=false,visible:boolean=true,final_hb?:Hitbox2D) {
        const floor: Floor = { type, hb, smooth,jagged,final_hb:final_hb??hb,visible,layer };
        this.floors.push(floor);

        const rect = hb.to_rect()
        this.cell_pos(rect.min)
        this.cell_pos(rect.max)

        for (let y = rect.min.y; y <= rect.max.y; y++) {
            for (let x = rect.min.x; x <= rect.max.x; x++) {
                const h=hash.hash_3d_big(x,y,layer)
                if(!this.grid.has(h)){
                    this.grid.set(h,[])
                }
                this.grid.get(h)!.push(floor);
            }
        }
    }

    get_floor(position: Vec2, layer: number): Floor | undefined {
        const pos=v2.clone(position)
        this.cell_pos(pos)
        const floorsInCell = this.grid.get(hash.hash_3d_big(pos.x,pos.y,layer))??[]
        for (let i = floorsInCell.length - 1; i >= 0; i--) {
            const floor = floorsInCell[i];
            if (floor.final_hb.point_inside(position)) {
                return floor
            }
        }
        return undefined
    }

    get_floor_type(position:Vec2,layer:number,place_holder:FloorType):FloorType{
        const pos=v2.clone(position)
        this.cell_pos(pos)
        const floorsInCell = this.grid.get(hash.hash_3d_big(pos.x,pos.y,layer))??[]
        for (let i = floorsInCell.length - 1; i >= 0; i--) {
            const floor = floorsInCell[i];
            if (floor.final_hb.point_inside(position)) {
                return floor.type
            }
        }
        return place_holder
    }
    cell_pos(p: Vec2) {
        v2m.dscale(p,p,10)
        v2m.floor(p)
    }
}

export const rivers={
    init(points:RiverPoint[]):River{
        const hb=new PolygonHitbox2D(polygon2.from_point_line(points))
        const river:River={
            points:points,
            collisions:{main:hb},
        }
        return river
    },
    generate(hitbox: RectHitbox2D,rivers: RiversDef[],random: SeededRandom,hb_expand: number = 0): River[] {
        const ret: River[] = [];
        const defs = random.weight2(rivers);
        for (const r of defs.rivers) {
            let attempts = 0
            while (attempts++ < 10) {
                const s_orientation = random.float(0, 1) <= 0.5 ? 0 : 2;
                const e_orientation =
                    s_orientation === 0
                        ? random.choose([2, 1, 3])
                        : random.choose([0, 1, 3]);

                const point1 = v2.orientation_random(s_orientation, hitbox.min, hitbox.max, hb_expand, random);
                const point2 = v2.orientation_random(e_orientation as Orientation, hitbox.min, hitbox.max, hb_expand, random);
                if (v2.distance(point1, point2) < 50) continue

                const path = this.generate_path(point1, point2, random)
                if (path.length < 5) continue

                const smooth = this.smooth_path(path)
                let final = this.apply_width(smooth, r, random)
                //final = this.process_river_interactions(final, ret)
                ret.push(this.init(final))
                break
            }
        }

        return ret;
    },
    generate_path(start: Vec2,end: Vec2,random: SeededRandom,passes = 6,strength = 0.25): Vec2[] {
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
                const normal = v2.normalizeSafe(
                    v2.add(
                        v2(-dir.y, dir.x),
                        v2.scale(globalNormal, 0.5)
                    ),
                    globalNormal
                )

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
    },
    smooth_path(points: Vec2[], steps = 2): Vec2[] {
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
    },
    apply_width(points: Vec2[],def: RiverDef,random: SeededRandom): RiverPoint[] {
        const out: RiverPoint[] = []
        for (let i = 0; i < points.length; i++) {
            let width = def.width
            if (def.width_variation) {
                width += random.float(0, def.width_variation)
            }
            out.push({
                position: points[i],
                width
            })
        }

        return out
    },
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
            width: base[ai].width
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
export interface River{
    collisions:Record<string, PolygonHitbox2D>
    points:RiverPoint[]
}