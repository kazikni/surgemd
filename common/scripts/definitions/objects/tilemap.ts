import { ColorM, Definition, Rect, RectTD, tdm, TDObject, TDType, tilemap_layer, TilemapLayer, v2 } from "../../../engine/core.ts";
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

        7:{frame:"tile_tile_1",scale:v2(2,2)}, // v2(0.963,0.963) v2(0.925,0.925)
        8:{frame:"tile_tile_1",scale:v2(2,2),tint:ColorM.number(0xb27d3e)},
        9:{frame:"tile_tile_1",scale:v2(2,2),tint:ColorM.number(0x585a5c)},
        10:{frame:"tile_tile_1",scale:v2(2,2)},
        11:{frame:"tile_tile_1",scale:v2(2,2)},
        12:{frame:"tile_tile_1",scale:v2(2,2)},
    }
}
export function TilemapV_Default_Init():TilemapVDef[]{
    return [
        /*{
            idString:"storehouse_floor",
            layer:tilemap_layer.generate_simple([
                {tile:9,position:v2(-10.175,-4.625)},{tile:9,position:v2(-9.25,-4.625)},{tile:9,position:v2(-8.3250,-4.625)},{tile:9,position:v2(-7.4,-4.625)},{tile:9,position:v2(-6.4750,-4.625)},{tile:9,position:v2(-5.550,-4.625)},{tile:9,position:v2(-4.625,-4.625)},{tile:9,position:v2(-3.7,-4.625)},{tile:9,position:v2(-2.7750,-4.625)},{tile:9,position:v2(-1.85,-4.625)},{tile:9,position:v2(-0.925,-4.625)},{tile:9,position:v2(0,-4.625)},{tile:9,position:v2(0.925,-4.625)},{tile:9,position:v2(1.85,-4.625)},{tile:9,position:v2(2.7750,-4.625)},{tile:9,position:v2(3.7,-4.625)},{tile:9,position:v2(4.625,-4.625)},{tile:9,position:v2(5.550,-4.625)},{tile:9,position:v2(6.4750,-4.625)},{tile:9,position:v2(7.4,-4.625)},{tile:9,position:v2(8.3250,-4.625)},{tile:9,position:v2(9.25,-4.625)},{tile:9,position:v2(10.175,-4.625)},
                {tile:9,position:v2(-10.175,-3.7)},{tile:9,position:v2(-9.25,-3.7)},{tile:9,position:v2(-8.3250,-3.7)},{tile:9,position:v2(-7.4,-3.7)},{tile:9,position:v2(-6.4750,-3.7)},{tile:9,position:v2(-5.550,-3.7)},{tile:9,position:v2(-4.625,-3.7)},{tile:9,position:v2(-3.7,-3.7)},{tile:9,position:v2(-2.7750,-3.7)},{tile:9,position:v2(-1.85,-3.7)},{tile:9,position:v2(-0.925,-3.7)},{tile:9,position:v2(0,-3.7)},{tile:9,position:v2(0.925,-3.7)},{tile:9,position:v2(1.85,-3.7)},{tile:9,position:v2(2.7750,-3.7)},{tile:9,position:v2(3.7,-3.7)},{tile:9,position:v2(4.625,-3.7)},{tile:9,position:v2(5.550,-3.7)},{tile:9,position:v2(6.4750,-3.7)},{tile:9,position:v2(7.4,-3.7)},{tile:9,position:v2(8.3250,-3.7)},{tile:9,position:v2(9.25,-3.7)},{tile:9,position:v2(10.175,-3.7)},
                {tile:9,position:v2(-10.175,-2.7750)},{tile:9,position:v2(-9.25,-2.7750)},{tile:9,position:v2(-8.3250,-2.7750)},{tile:9,position:v2(-7.4,-2.7750)},{tile:9,position:v2(-6.4750,-2.7750)},{tile:9,position:v2(-5.550,-2.7750)},{tile:9,position:v2(-4.625,-2.7750)},{tile:9,position:v2(-3.7,-2.7750)},{tile:9,position:v2(-2.7750,-2.7750)},{tile:9,position:v2(-1.85,-2.7750)},{tile:9,position:v2(-0.925,-2.7750)},{tile:9,position:v2(0,-2.7750)},{tile:9,position:v2(0.925,-2.7750)},{tile:9,position:v2(1.85,-2.7750)},{tile:9,position:v2(2.7750,-2.7750)},{tile:9,position:v2(3.7,-2.7750)},{tile:9,position:v2(4.625,-2.7750)},{tile:9,position:v2(5.550,-2.7750)},{tile:9,position:v2(6.4750,-2.7750)},{tile:9,position:v2(7.4,-2.7750)},{tile:9,position:v2(8.3250,-2.7750)},{tile:9,position:v2(9.25,-2.7750)},{tile:9,position:v2(10.175,-2.7750)},
                {tile:9,position:v2(-10.175,-2.7750)},{tile:9,position:v2(-9.25,-2.7750)},{tile:9,position:v2(-8.3250,-2.7750)},{tile:9,position:v2(-7.4,-2.7750)},{tile:9,position:v2(-6.4750,-2.7750)},{tile:9,position:v2(-5.550,-2.7750)},{tile:9,position:v2(-4.625,-2.7750)},{tile:9,position:v2(-3.7,-2.7750)},{tile:9,position:v2(-2.7750,-2.7750)},{tile:9,position:v2(-1.85,-2.7750)},{tile:9,position:v2(-0.925,-2.7750)},{tile:9,position:v2(0,-2.7750)},{tile:9,position:v2(0.925,-2.7750)},{tile:9,position:v2(1.85,-2.7750)},{tile:9,position:v2(2.7750,-2.7750)},{tile:9,position:v2(3.7,-2.7750)},{tile:9,position:v2(4.625,-2.7750)},{tile:9,position:v2(5.550,-2.7750)},{tile:9,position:v2(6.4750,-2.7750)},{tile:9,position:v2(7.4,-2.7750)},{tile:9,position:v2(8.3250,-2.7750)},{tile:9,position:v2(9.25,-2.7750)},{tile:9,position:v2(10.175,-2.7750)},
                {tile:9,position:v2(-10.175,-1.85)},{tile:9,position:v2(-9.25,-1.85)},{tile:9,position:v2(-8.3250,-1.85)},{tile:9,position:v2(-7.4,-1.85)},{tile:9,position:v2(-6.4750,-1.85)},{tile:9,position:v2(-5.550,-1.85)},{tile:9,position:v2(-4.625,-1.85)},{tile:9,position:v2(-3.7,-1.85)},{tile:9,position:v2(-2.7750,-1.85)},{tile:9,position:v2(-1.85,-1.85)},{tile:9,position:v2(-0.925,-1.85)},{tile:9,position:v2(0,-1.85)},{tile:9,position:v2(0.925,-1.85)},{tile:9,position:v2(1.85,-1.85)},{tile:9,position:v2(2.7750,-1.85)},{tile:9,position:v2(3.7,-1.85)},{tile:9,position:v2(4.625,-1.85)},{tile:9,position:v2(5.550,-1.85)},{tile:9,position:v2(6.4750,-1.85)},{tile:9,position:v2(7.4,-1.85)},{tile:9,position:v2(8.3250,-1.85)},{tile:9,position:v2(9.25,-1.85)},{tile:9,position:v2(10.175,-1.85)},
                {tile:9,position:v2(-10.175,-0.925)},{tile:9,position:v2(-9.25,-0.925)},{tile:9,position:v2(-8.3250,-0.925)},{tile:9,position:v2(-7.4,-0.925)},{tile:9,position:v2(-6.4750,-0.925)},{tile:9,position:v2(-5.550,-0.925)},{tile:9,position:v2(-4.625,-0.925)},{tile:9,position:v2(-3.7,-0.925)},{tile:9,position:v2(-2.7750,-0.925)},{tile:9,position:v2(-1.85,-0.925)},{tile:9,position:v2(-0.925,-0.925)},{tile:9,position:v2(0,-0.925)},{tile:9,position:v2(0.925,-0.925)},{tile:9,position:v2(1.85,-0.925)},{tile:9,position:v2(2.7750,-0.925)},{tile:9,position:v2(3.7,-0.925)},{tile:9,position:v2(4.625,-0.925)},{tile:9,position:v2(5.550,-0.925)},{tile:9,position:v2(6.4750,-0.925)},{tile:9,position:v2(7.4,-0.925)},{tile:9,position:v2(8.3250,-0.925)},{tile:9,position:v2(9.25,-0.925)},{tile:9,position:v2(10.175,-0.925)},
                {tile:9,position:v2(-10.175,0)},{tile:9,position:v2(-9.25,0)},{tile:9,position:v2(-8.3250,0)},{tile:9,position:v2(-7.4,0)},{tile:9,position:v2(-6.4750,0)},{tile:9,position:v2(-5.550,0)},{tile:9,position:v2(-4.625,0)},{tile:9,position:v2(-3.7,0)},{tile:9,position:v2(-2.7750,0)},{tile:9,position:v2(-1.85,0)},{tile:9,position:v2(-0.925,0)},{tile:9,position:v2(0,0)},{tile:9,position:v2(0.925,0)},{tile:9,position:v2(1.85,0)},{tile:9,position:v2(2.7750,0)},{tile:9,position:v2(3.7,0)},{tile:9,position:v2(4.625,0)},{tile:9,position:v2(5.550,0)},{tile:9,position:v2(6.4750,0)},{tile:9,position:v2(7.4,0)},{tile:9,position:v2(8.3250,0)},{tile:9,position:v2(9.25,0)},{tile:9,position:v2(10.175,0)},
                {tile:9,position:v2(-10.175,0.925)},{tile:9,position:v2(-9.25,0.925)},{tile:9,position:v2(-8.3250,0.925)},{tile:9,position:v2(-7.4,0.925)},{tile:9,position:v2(-6.4750,0.925)},{tile:9,position:v2(-5.550,0.925)},{tile:9,position:v2(-4.625,0.925)},{tile:9,position:v2(-3.7,0.925)},{tile:9,position:v2(-2.7750,0.925)},{tile:9,position:v2(-1.85,0.925)},{tile:9,position:v2(-0.925,0.925)},{tile:9,position:v2(0,0.925)},{tile:9,position:v2(0.925,0.925)},{tile:9,position:v2(1.85,0.925)},{tile:9,position:v2(2.7750,0.925)},{tile:9,position:v2(3.7,0.925)},{tile:9,position:v2(4.625,0.925)},{tile:9,position:v2(5.550,0.925)},{tile:9,position:v2(6.4750,0.925)},{tile:9,position:v2(7.4,0.925)},{tile:9,position:v2(8.3250,0.925)},{tile:9,position:v2(9.25,0.925)},{tile:9,position:v2(10.175,0.925)},
                {tile:9,position:v2(-10.175,1.85)},{tile:9,position:v2(-9.25,1.85)},{tile:9,position:v2(-8.3250,1.85)},{tile:9,position:v2(-7.4,1.85)},{tile:9,position:v2(-6.4750,1.85)},{tile:9,position:v2(-5.550,1.85)},{tile:9,position:v2(-4.625,1.85)},{tile:9,position:v2(-3.7,1.85)},{tile:9,position:v2(-2.7750,1.85)},{tile:9,position:v2(-1.85,1.85)},{tile:9,position:v2(-0.925,1.85)},{tile:9,position:v2(0,1.85)},{tile:9,position:v2(0.925,1.85)},{tile:9,position:v2(1.85,1.85)},{tile:9,position:v2(2.7750,1.85)},{tile:9,position:v2(3.7,1.85)},{tile:9,position:v2(4.625,1.85)},{tile:9,position:v2(5.550,1.85)},{tile:9,position:v2(6.4750,1.85)},{tile:9,position:v2(7.4,1.85)},{tile:9,position:v2(8.3250,1.85)},{tile:9,position:v2(9.25,1.85)},{tile:9,position:v2(10.175,1.85)},
                {tile:9,position:v2(-10.175,2.7750)},{tile:9,position:v2(-9.25,2.7750)},{tile:9,position:v2(-8.3250,2.7750)},{tile:9,position:v2(-7.4,2.7750)},{tile:9,position:v2(-6.4750,2.7750)},{tile:9,position:v2(-5.550,2.7750)},{tile:9,position:v2(-4.625,2.7750)},{tile:9,position:v2(-3.7,2.7750)},{tile:9,position:v2(-2.7750,2.7750)},{tile:9,position:v2(-1.85,2.7750)},{tile:9,position:v2(-0.925,2.7750)},{tile:9,position:v2(0,2.7750)},{tile:9,position:v2(0.925,2.7750)},{tile:9,position:v2(1.85,2.7750)},{tile:9,position:v2(2.7750,2.7750)},{tile:9,position:v2(3.7,2.7750)},{tile:9,position:v2(4.625,2.7750)},{tile:9,position:v2(5.550,2.7750)},{tile:9,position:v2(6.4750,2.7750)},{tile:9,position:v2(7.4,2.7750)},{tile:9,position:v2(8.3250,2.7750)},{tile:9,position:v2(9.25,2.7750)},{tile:9,position:v2(10.175,2.7750)},
                {tile:9,position:v2(-10.175,3.7)},{tile:9,position:v2(-9.25,3.7)},{tile:9,position:v2(-8.3250,3.7)},{tile:9,position:v2(-7.4,3.7)},{tile:9,position:v2(-6.4750,3.7)},{tile:9,position:v2(-5.550,3.7)},{tile:9,position:v2(-4.625,3.7)},{tile:9,position:v2(-3.7,3.7)},{tile:9,position:v2(-2.7750,3.7)},{tile:9,position:v2(-1.85,3.7)},{tile:9,position:v2(-0.925,3.7)},{tile:9,position:v2(0,3.7)},{tile:9,position:v2(0.925,3.7)},{tile:9,position:v2(1.85,3.7)},{tile:9,position:v2(2.7750,3.7)},{tile:9,position:v2(3.7,3.7)},{tile:9,position:v2(4.625,3.7)},{tile:9,position:v2(5.550,3.7)},{tile:9,position:v2(6.4750,3.7)},{tile:9,position:v2(7.4,3.7)},{tile:9,position:v2(8.3250,3.7)},{tile:9,position:v2(9.25,3.7)},{tile:9,position:v2(10.175,3.7)},
            ]),
            rect:{min:v2(-12,-4.95),max:v2(12,4.95)},
            tileset:1
        }*/
    ]
}