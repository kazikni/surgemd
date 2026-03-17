import { cloneDeep } from "../math/utils.ts";

export type TileDefBase={

}
export type Tileset<TileType extends number|string,TileDef extends TileDefBase>={
    tiles:Record<TileType,TileDef>
}
export class BasicTilemap2<TileType extends number|string,TileDef extends TileDefBase,Tile=number>{
    tileset:Tileset<TileType,TileDef>

    map:Tile[][]=[]
    constructor(tileset:Tileset<TileType,TileDef>){
        this.tileset=tileset
    }
    set_map(map:Tile[][]){
        this.map=map
    }
    get_tile(x:number,y:number):Tile{
        return this.map[y][x]
    }
    set_tile(x:number,y:number,tile:Tile){
        this.map[y][x]=tile
    }
    set(tile:Tile,width:number,height:number){
        this.map=[]
        for(let y=0;y<height;y++){
            const arr=[]
            for(let x=0;x<width;x++){
                arr.push(cloneDeep(tile))
            }
            this.map.push(arr)
        }
    }

        fill_rect(x1:number,y1:number,x2:number,y2:number,tile:Tile){
            const minX = Math.min(x1,x2)
            const maxX = Math.max(x1,x2)
            const minY = Math.min(y1,y2)
            const maxY = Math.max(y1,y2)

            for(let y=minY; y<=maxY; y++){
                for(let x=minX; x<=maxX; x++){
                    this.set_tile(x,y,cloneDeep(tile))
                }
            }
        }
    draw(x:number,y:number,map:BasicTilemap2<TileType,TileDef>){

    }
}
export class LayerTilemap<TileType extends number | string,TileDef extends TileDefBase,Tile = number>{
    tileset: Tileset<TileType, TileDef>

    map: Tile[][][] = []

    placeholder: Tile

    width = 0
    height = 0
    depth = 0

    constructor(tileset: Tileset<TileType, TileDef>,placeholder: Tile){
        this.tileset = tileset
        this.placeholder = placeholder
    }
    set_size(width: number, height: number, depth: number){
        this.width = width
        this.height = height
        this.depth = depth

        this.map = []

        for(let z=0; z<depth; z++){
            const layer: Tile[][] = []
            for(let y=0; y<height; y++){
                const row: Tile[] = []
                for(let x=0; x<width; x++){
                    row.push(cloneDeep(this.placeholder))
                }
                layer.push(row)
            }
            this.map.push(layer)
        }
    }
    get_tile(x:number,y:number,z:number):Tile{
        const layer = this.map[z]
        if(!layer) return this.placeholder
        const row = layer[y]
        if(!row) return this.placeholder
        return row[x] ?? this.placeholder
    }
    set_tile(x:number,y:number,z:number,tile:Tile){
        if(!this.map[z]) return
        if(!this.map[z][y]) return
        this.map[z][y][x] = tile
    }
    fill_rect(x1:number,y1:number,x2:number,y2:number,z:number,tile:Tile){
        if(!this.map[z]) return

        const minX = Math.min(x1,x2)
        const maxX = Math.max(x1,x2)
        const minY = Math.min(y1,y2)
        const maxY = Math.max(y1,y2)

        for(let y=minY; y<=maxY; y++){
            for(let x=minX; x<=maxX; x++){
                this.set_tile(x,y,z,cloneDeep(tile))
            }
        }
    }
    draw(ox:number, oy:number, oz:number,other: LayerTilemap<TileType,TileDef,Tile>){
        for(let z=0; z<other.depth; z++){
            for(let y=0; y<other.height; y++){
                for(let x=0; x<other.width; x++){
                    const tile = other.get_tile(x,y,z)
                    if(tile !== other.placeholder){
                        this.set_tile(
                            ox + x,
                            oy + y,
                            oz + z,
                            cloneDeep(tile)
                        )
                    }
                }
            }
        }
    }
}

type TileCommand<Tile> =
    | ["layer", number]
    | ["fill", number, number, number, number, Tile]
    | ["rect", number, number, number, number, Tile]
    | ["tile", number, number, Tile]
    | ["draw", number, number, number, LayerTilemap<any,any,Tile>]

export function exec_tile_cmd<Tile>(tilemap: LayerTilemap<any,any,Tile>,commands: TileCommand<Tile>[]){
    let currentLayer = 0

    for(const cmd of commands){
        switch(cmd[0]){
            case "layer":
                currentLayer = cmd[1]
                break
            case "fill":
                tilemap.fill_rect(
                    cmd[1],cmd[2],cmd[3],cmd[4],
                    currentLayer,
                    cmd[5]
                )
                break
            case "rect":{
                const [_,x1,y1,x2,y2,tile] = cmd
                for(let x=x1;x<=x2;x++){
                    tilemap.set_tile(x,y1,currentLayer,tile)
                    tilemap.set_tile(x,y2,currentLayer,tile)
                }
                for(let y=y1;y<=y2;y++){
                    tilemap.set_tile(x1,y,currentLayer,tile)
                    tilemap.set_tile(x2,y,currentLayer,tile)
                }
                break
            }
            case "tile":
                tilemap.set_tile(cmd[1],cmd[2],currentLayer,cmd[3])
                break
            case "draw":
                tilemap.draw(cmd[1],cmd[2],cmd[3],cmd[4])
                break
        }
    }
}