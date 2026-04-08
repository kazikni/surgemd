import { rect, Rect, v2, Vec2 } from "../../engine/core.ts";
import { kxml, type XMLNode } from "../../engine/core/lang/xml.ts";
import { FloorType } from "../../scripts/others/terrain.ts";

export interface BuildingDef{
    size:Vec2
    patterns:Record<string,{size:Vec2,children:XMLNode[],extra_attrs?:Record<string,string>}>
    floors:{
        type?:FloorType
        rect:Rect
        pattern?:{
            id:string
            rect?:Rect
        }
        node?:XMLNode
    }[]
    walls?:({
        width:number
        attr?:Record<string,string>
        walls:Vec2[][]
    })[]
}

export interface BuildingOutput{
    svg:{
        floor:XMLNode
        ceiling:XMLNode
    }
    json:{}
}
export function MakeBuilding(def:BuildingDef):BuildingOutput{
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
        json:{}
    }
}