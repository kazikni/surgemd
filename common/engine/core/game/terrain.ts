import { hash } from "../math/hash.ts";
import { Hitbox2D } from "../math/hitbox.ts";
import { v2, v2m, Vec2 } from "../math/vec2.ts";

export interface FloorBase{
    type: number
    layer: number
    hb: Hitbox2D
}
export class BasicTerrainManager<Floor extends FloorBase> {
    floors: Floor[] = [];
    grid = new Map<bigint,Floor[]>();

    constructor(){
        
    }
    add_floor(floor:Floor) {
        this.floors.push(floor);

        const rect = floor.hb.to_rect()
        this.cell_pos(rect.min)
        this.cell_pos(rect.max)

        for (let y = rect.min.y; y <= rect.max.y; y++) {
            for (let x = rect.min.x; x <= rect.max.x; x++) {
                const h=hash.hash_3d_big(x,y,floor.layer)
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
            if (floor.hb.point_inside(position)) {
                return floor
            }
        }
        return undefined
    }
    get_floor_type(position:Vec2,layer:number,place_holder:number):number{
        const pos=v2.clone(position)
        this.cell_pos(pos)
        const floorsInCell = this.grid.get(hash.hash_3d_big(pos.x,pos.y,layer))??[]
        for (let i = floorsInCell.length - 1; i >= 0; i--) {
            const floor = floorsInCell[i];
            if (floor.hb.point_inside(position)) {
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