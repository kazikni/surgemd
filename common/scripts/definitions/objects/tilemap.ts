import { ColorM, Definition, Rect, RectTD, tdm, TDObject, TDType, TilemapLayer, v2 } from "../../../engine/core.ts";
import { TilesetDef } from "../../../engine/web.ts";
import { GameObjectDefTD } from "../utils.ts";

export type TilemapVDef={
    layer:TilemapLayer
    rect:Rect
    tileset:number
}&Definition

export const TilemapVTD: TDObject={
    type:TDType.object,
    content:[
        ...GameObjectDefTD,
        { name: "layer", content: tdm.any },
        { name: "rect", content: RectTD },
        { name: "tileset", content: tdm.uint8 },
    ]
}
export const Tilesets:Record<number,TilesetDef>={
    1:{
        1:{frame:"tile_bricks_1",scale:v2(2,2)},
        2:{frame:"tile_bricks_1",scale:v2(2,2),tint:ColorM.number(0xb27d3e)},
        3:{frame:"tile_bricks_1",scale:v2(2,2),tint:ColorM.number(0x585a5c)},
        4:{frame:"tile_bricks_1",scale:v2(2,2)},
        5:{frame:"tile_bricks_1",scale:v2(2,2)},
        6:{frame:"tile_bricks_1",scale:v2(2,2)},

        7:{frame:"tile_tile_1",scale:v2(2,2)},
        8:{frame:"tile_tile_1",scale:v2(2,2),tint:ColorM.number(0xb27d3e)},
        9:{frame:"tile_tile_1",scale:v2(2,2),tint:ColorM.number(0x585a5c)},
        10:{frame:"tile_tile_1",scale:v2(2,2)},
        11:{frame:"tile_tile_1",scale:v2(2,2)},
        12:{frame:"tile_tile_1",scale:v2(2,2)},
    }
}
export function TilemapV_Default_Init():TilemapVDef[]{
    return [

    ]
}