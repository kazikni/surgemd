import { Hitbox2D, Numeric, Orientation, PolygonHitbox2D, RectHitbox2D, SeededRandom, v2, v2m, Vec2 } from "../../engine/core.ts";

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
        footstep_sounds:["footstep_snow_1","footstep_snow_2"]
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
    smooth: boolean;
    jagged:boolean;
    hb: Hitbox2D;
    final_hb:Hitbox2D;
    layer: number;
}

export type RiverPoint = {
    position: Vec2;
    width: number;
    branch?:RiverPoint[];
};
export interface RiverDef{
    width:number
    width_variation?:number
    sub_river_chance?:number
    sub_river_width:number
}

export class TerrainManager {
    floors: Floor[] = [];
    grid = new Map<number,Map<number, Map<number, { floors: Floor[] }>>>();

    add_floor(type: FloorType, hb: Hitbox2D, layer = 0, smooth = true,jagged:boolean=false,final_hb?:Hitbox2D) {
        const floor: Floor = { type, hb, smooth, layer,jagged,final_hb:final_hb??hb };
        this.floors.push(floor);

        const rect = hb.to_rect()
        this.cell_pos(rect.min)
        this.cell_pos(rect.max)

        if (!this.grid.has(layer))this.grid.set(layer, new Map())
        for (let y = rect.min.y; y <= rect.max.y; y++) {
            if (!this.grid.get(layer)!.has(y)) this.grid.get(layer)!.set(y, new Map());

            for (let x = rect.min.x; x <= rect.max.x; x++) {
                if (!this.grid.get(layer)!.get(y)!.has(x))this.grid.get(layer)!.get(y)!.set(x, { floors: [] });
                this.grid.get(layer)!.get(y)!.get(x)!.floors.push(floor);
            }
        }
    }

    get_floor(position: Vec2, layer: number): Floor | undefined {
        const pos=v2.clone(position)
        this.cell_pos(pos)
        const floorsInCell = this.grid.get(layer)?.get(pos.y)?.get(pos.x)?.floors ?? [];

        for (let i = floorsInCell.length - 1; i >= 0; i--) {
            const floor = floorsInCell[i];
            if (floor.layer === layer && floor.hb.pointInside(position)) {
                return floor
            }
        }
        return undefined
    }

    get_floor_type(position:Vec2,layer:number,place_holder:FloorType):FloorType{
        const pos=v2.clone(position)
        this.cell_pos(pos)
        const floorsInCell = this.grid.get(layer)?.get(pos.y)?.get(pos.x)?.floors ?? [];
        for (let i = floorsInCell.length - 1; i >= 0; i--) {
            const floor = floorsInCell[i];
            if (floor.hb.pointInside(position)) {
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
export function init_river(points:RiverPoint[],defs: RiverHitboxDef[]):River{
    const hb=generate_river_hitboxes(points,defs)
    const river={
        points:points,
        collisions:hb
    }
    return river
}
export function generate_rivers(
    hitbox: RectHitbox2D,
    rivers: RiversDef[],
    divisions: number,
    random: SeededRandom,
    hb_expand: number = 0,
    hitboxes:RiverHitboxDef[]
): River[] {
    const ret: River[] = [];

    const defs = random.weight(rivers.map(g => g.weight));

    for (const r of rivers[defs].rivers) {
        const s_orientation = random.float(0, 1) <= 0.5 ? 0 : 2;
        const e_orientation =
            s_orientation === 0
                ? random.choose([2, 1, 3])
                : random.choose([0, 1, 3]);

        const point1 = v2.orientation_random(s_orientation, hitbox.min, hitbox.max, hb_expand, random);
        const point2 = v2.orientation_random(e_orientation as Orientation, hitbox.min, hitbox.max, hb_expand, random);

        if (!hitbox.colliding_with_line(point1, point2)) continue;

        ret.push(init_river(create_river_points(point1, point2, r,random,divisions,hitbox,hb_expand,0),hitboxes))
    }

    return ret;
}
export function create_river_points(
    start: Vec2,
    end: Vec2,
    def: RiverDef,
    random: SeededRandom,
    divisions: number,
    hitbox: RectHitbox2D,
    hb_expand: number,
    depth: number = 0
): RiverPoint[] {
    const points: RiverPoint[] = [];

    for (let i = 0; i <= divisions; i++) {
        const t = i / divisions;
        const pos = v2.lerp(start, end, t);

        let w = def.width;
        if (def.width_variation) {
            w = random.float(def.width, def.width*(1+def.width_variation))
        }

        points.push({ position: pos, width: w, branch: [] });
    }

    if (def.sub_river_chance && random.float(0, 1) < def.sub_river_chance && depth < 1) {
        const idx = Numeric.clamp(random.int(1, points.length - 2), 0, points.length - 1);
        const branchStart = points[idx].position;

        const branchEnd = v2.orientation_random(
            random.choose([0, 1, 2, 3]),
            hitbox.min,
            hitbox.max,
            hb_expand,
            random
        );

        if (hitbox.colliding_with_line(branchStart, branchEnd)) {
            points[idx].branch = create_river_points(
                branchStart,
                branchEnd,
                {
                    width: def.sub_river_width,
                    width_variation: def.width_variation ? def.width_variation * 0.5 : undefined,
                    sub_river_chance: def.sub_river_chance! * 0.5,
                    sub_river_width: def.sub_river_width * 0.7
                },
                random,
                divisions,
                hitbox,
                hb_expand,
                depth + 1
            );
        }
    }

    return points;
}

export interface River{
    collisions:Record<string, PolygonHitbox2D>
    points:RiverPoint[]
}

export interface RiverHitboxDef {
    name: string;
    padding: number;
}

function squaredDist(a: Vec2, b: Vec2) {
    return v2.distanceSquared(a, b);
}

function polygonArea(points: Vec2[]) {
    let a = 0;
    for (let i = 0, n = points.length; i < n; i++) {
      const p = points[i];
      const q = points[(i + 1) % n];
      a += p.x * q.y - q.x * p.y;
    }
    return a * 0.5;
}

function removeDuplicateAndCollinear(points: Vec2[], eps = 1e-5): Vec2[] {
    if (points.length <= 3) return points.slice();

    // remove consecutivos iguais (ou quase)
    const tmp: Vec2[] = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const prev = tmp.length ? tmp[tmp.length - 1] : null;
      if (!prev || squaredDist(prev, p) > eps * eps) tmp.push(p);
    }

    // remove colineares A-B-C (|cross| pequeno)
    const out: Vec2[] = [];
    for (let i = 0; i < tmp.length; i++) {
      const a = tmp[(i - 1 + tmp.length) % tmp.length];
      const b = tmp[i];
      const c = tmp[(i + 1) % tmp.length];

      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const bcx = c.x - b.x;
      const bcy = c.y - b.y;

      const cross = Math.abs(abx * bcy - aby * bcx);
      if (cross > eps) out.push(b);
    }

    return out.length ? out : tmp;
}

function closestPairIndices(A: Vec2[], B: Vec2[]) {
    let best = { ai: 0, bj: 0, d: Number.MAX_VALUE };
    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < B.length; j++) {
        const d = squaredDist(A[i], B[j]);
        if (d < best.d) {
          best = { ai: i, bj: j, d };
        }
      }
    }
    return best;
}

function stitchPolygons(A: Vec2[], B: Vec2[]) {
    if (!A.length) return B.slice();
    if (!B.length) return A.slice();

    const areaA = polygonArea(A);
    const areaB = polygonArea(B);
    if (areaA === 0 || areaB === 0) {
      return [...A, ...B];
    }
    if (areaA * areaB < 0) B = B.slice().reverse();

    const { ai, bj } = closestPairIndices(A, B);
    const result: Vec2[] = [];
    for (let k = 0; k < A.length; k++) result.push(A[(ai + k) % A.length]);
    for (let k = 0; k < B.length; k++) result.push(B[(bj + k) % B.length]);

    return removeDuplicateAndCollinear(result);
}

export function generate_river_hitboxes(
    rootPoints: RiverPoint[],
    defs: RiverHitboxDef[]
): Record<string, PolygonHitbox2D> {
    const segments: RiverPoint[][] = [];
    function collectSegments(segment: RiverPoint[]) {
      segments.push(segment);
      for (const p of segment) {
        if (p.branch && p.branch.length) {
          collectSegments(p.branch);
        }
      }
    }
    collectSegments(rootPoints);

    const polysByDef: Record<string, Vec2[][]> = {};
    for (const def of defs) polysByDef[def.name] = [];

    for (const seg of segments) {
      const top: Vec2[] = [];
      const bottom: Vec2[] = [];

      for (let i = 0; i < seg.length; i++) {
        const cur = seg[i].position;
        const prev = seg[Math.max(i - 1, 0)].position;
        const next = seg[Math.min(i + 1, seg.length - 1)].position;

        const tangent = v2.normalizeSafe(v2.sub(next, prev), v2(1, 0));
        const normal = v2(-tangent.y, tangent.x);

        for (const def of defs) {
          const pad = def.padding ?? 0;
          const half = seg[i].width * 0.5 + pad;
          const topPt = v2.add(cur, v2.scale(normal, half));
          const bottomPt = v2.sub(cur, v2.scale(normal, half));

          const listIndex = defs.indexOf(def);
          if (!polysByDef[def.name][listIndex]) {
            // 
          }

          top.push(topPt);
          bottom.push(bottomPt);
        }
      }
      for (const def of defs) {
        const topD: Vec2[] = [];
        const bottomD: Vec2[] = [];
        for (let i = 0; i < seg.length; i++) {
          const cur = seg[i].position;
          const prev = seg[Math.max(i - 1, 0)].position;
          const next = seg[Math.min(i + 1, seg.length - 1)].position;

          const tangent = v2.normalizeSafe(v2.sub(next, prev), v2(1, 0));
          const normal = v2(-tangent.y, tangent.x);

          const half = seg[i].width * 0.5 + (def.padding ?? 0);
          topD.push(v2.add(cur, v2.scale(normal, half)));
          bottomD.push(v2.sub(cur, v2.scale(normal, half)));
        }
        const poly = [...topD, ...bottomD.reverse()];
        polysByDef[def.name].push(removeDuplicateAndCollinear(poly));
      }
    }

    const result: Record<string, PolygonHitbox2D> = {};
    for (const def of defs) {
      const list = polysByDef[def.name];
      if (!list || list.length === 0) {
        result[def.name] = new PolygonHitbox2D([]);
        continue;
      }

      let merged = list[0].slice();
      for (let i = 1; i < list.length; i++) {
        const other = list[i];
        merged = stitchPolygons(merged, other);
      }

      const cleaned = removeDuplicateAndCollinear(merged);
      result[def.name] = new PolygonHitbox2D(cleaned);
    }

    return result;
}