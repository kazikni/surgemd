import { Hitbox2D, rect, Rect, RectHitbox2D, v2, v2m, Vec2 } from "../../engine/core.ts";
import { kxml, type XMLNode } from "../../engine/core/lang/xml.ts";
import { FloorType } from "../../scripts/others/terrain.ts";

export interface BBWallsDef{
    width:number
    swidth?:number
    attr?:Record<string,string>
    walls:Vec2[][]
}
export interface BBDef{
    size:Vec2
    patterns:Record<string,{size:Vec2,children:XMLNode[],extra_attrs?:Record<string,string>}>
    scale?:number // Default = 2
    floors:{
        type?:FloorType
        rect:Rect
        pattern?:{
            id:string
            rect?:Rect
        }
        node?:XMLNode
    }[]
    walls?:(BBWallsDef)[]
}
export interface BBContext{
    scale:number
    meter_size:number
    center:Vec2
    size:Vec2
    hotspot:Vec2
}
export interface BuildingOutput{
    svg:{
        floor:XMLNode
        ceiling:XMLNode
    }
    json:{}
    ctx:BBContext
}

export function MakeBuildingWallsHitbox(walls: BBWallsDef,ctx: BBContext): Hitbox2D[] {
    const ret: Hitbox2D[] = []
    const scale=1/ctx.scale/ctx.meter_size

    const width=(walls.width+(walls.swidth??0))*scale
    const halfWidth=width/2

    for (const poly of walls.walls) {
        for (let i = 0; i < poly.length - 1; i++) {
            const a=v2.sub(poly[i],ctx.center)
            const b=v2.sub(poly[i+1],ctx.center)

            v2m.scale(a,a,scale)
            v2m.scale(b,b,scale)

            const delta = v2.sub(b,a)
            const len = v2.len(delta)

            if (len <= 0.0001)continue

            const dir = v2.scale(delta, 1 / len)

            const normal = v2(-dir.y * halfWidth,dir.x * halfWidth)

            const p1 = v2.add(a, normal)
            const p2 = v2.sub(a, normal)
            const p3 = v2.add(b, normal)
            const p4 = v2.sub(b, normal)

            const min = v2(Math.min(p1.x, p2.x, p3.x, p4.x),Math.min(p1.y, p2.y, p3.y, p4.y))
            const max = v2(Math.max(p1.x, p2.x, p3.x, p4.x), Math.max(p1.y, p2.y, p3.y, p4.y))
            ret.push(new RectHitbox2D(min, max));
        }
    }
    return ret
}
export function MakeBuilding(def:BBDef,scale:number=2,meter_size=100,hotspot:Vec2=v2.half_one):BuildingOutput{
    const ctx:BBContext={
        hotspot,
        meter_size,
        scale,
        center:v2.mult(def.size,hotspot),
        size:def.size
    }
    if(def.scale!==undefined)ctx.scale*=def.scale

    const main_rect=rect.new(v2.zero,def.size)
    const floor_svg=kxml.svg.create.main(main_rect)
    const ceiling_svg=kxml.svg.create.main(main_rect)
    for(const p of Object.keys(def.patterns)){
        kxml.append.childs(floor_svg,kxml.svg.create.pattern(p,def.patterns[p].size,def.patterns[p].children,def.patterns[p].extra_attrs))
    }
    for(const floor of def.floors){
        if(floor.pattern){
            const re=kxml.svg.create.rect(floor.rect)
            kxml.append.attrs(re,kxml.svg.fill.pattern(floor.pattern.id,floor.pattern.rect))
            kxml.append.childs(floor_svg,re)
        }
        if(floor.node){
            kxml.append.childs(floor_svg,floor.node)
        }
    }
    if(def.walls){
        for(const wd of def.walls){
            for(const wall of wd.walls){
                const re=kxml.svg.create.walls(wall,wd.width)
                if(wd.attr)kxml.append.attrs(re,wd.attr)
                kxml.append.childs(floor_svg,re)
            }
        }
    }
    return {
        svg:{
            floor:floor_svg,
            ceiling:ceiling_svg
        },
        json:{},
        ctx:ctx
    }
}