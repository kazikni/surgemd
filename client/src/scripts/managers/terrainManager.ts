import { Floors, FloorType, TerrainManager } from "common/scripts/others/terrain.ts";
import { MapConfig } from "common/scripts/packets/map_message.ts";
import { type Game } from "../others/game.ts";
import { Graphics2D, Grid2D } from "common/engine/web.ts";
import { Layers, zIndexes } from "common/scripts/others/constants.ts";
import { ColorM, v2, v2m, Vec2 } from "common/engine/core.ts";
export class TerrainM extends TerrainManager{
    map!:MapConfig
    game:Game

    last_layer?:number

    terrain_gfx=new Graphics2D()
    grid_gfx=new Grid2D()
    constructor(game:Game){
        super()
        this.game=game
    }
    append(){
        this.terrain_gfx.initialize(this.game.cam2d.ctx)

        this.grid_gfx.size=0.05
        this.grid_gfx.size=5
        this.grid_gfx.stroke=ColorM.rgba(0,0,0,25)

        this.game.cam2d.add_object(this.terrain_gfx)
        this.game.cam2d.add_object(this.grid_gfx)

        this.terrain_gfx.zIndex=zIndexes.Terrain
        this.grid_gfx.zIndex=zIndexes.Grid
    }
    update_grid(grid:Grid2D,camera_position:Vec2,camera_size:Vec2){
        grid.layer=this.terrain_gfx.layer
        this.game.dead_zone.sprite.layer=grid.layer
        this.game.ui_gfx.layer=grid.layer
        this.game.hitboxes_gfx.layer=grid.layer
        if(this.game.cam2d.layer<Layers.Normal){
            this.grid_gfx.visible=false
            return
        }
        this.grid_gfx.visible=true

        const begin=v2(camera_size.x/2,camera_size.y/2)
        v2m.sub(begin,camera_position,begin)
        v2m.dscale(begin,begin,grid.size)
        v2m.floor(begin)
        v2m.sub_component(begin,1,1)

        const end=v2(camera_size.x/grid.size+2,camera_size.y/grid.size+2)
        v2m.ceil(end)
        v2m.add(end,end,begin)
        grid.begin=begin
        grid.end=end
    }
    override clear(): void {
        super.clear()
        this.last_layer=undefined
    }
    process_map(mp:MapConfig):Promise<void>{
        return new Promise<void>((resolve, _reject) => {
            this.clear()
            this.game.minimap.biome=mp.biome
            this.map=mp
            for(const f of mp.terrain){
                this.add_floor(f)
            }
            resolve()
        })
    }
    tick(){
        this.update_grid(this.grid_gfx,this.game.cam2d.position,this.game.cam2d.size)
        this.draw(this.terrain_gfx,this.game.cam2d.layer)
    }
    draw(graphic:Graphics2D,layer:number=Layers.Normal){
        if(this.last_layer!==layer){
            this.last_layer=layer
            graphic.layer=layer
            graphic.ctx.clear()
            for(const f of this.floors){
                if(layer<f.layer)continue
                const flb=this.game.minimap.biome.floors[f.type as FloorType]
                graphic.ctx.begin_path()
                graphic.ctx.hitbox(f.hb)
                graphic.ctx.end_path()
                graphic.ctx.fill_color=ColorM.number(f.tint??((flb!==undefined)?flb:Floors[f.type as FloorType].default_color))
                graphic.ctx.fill()
            }
            /*if(Debug.hitbox){
                for(const f of this.floors){
                    graphic.fill_color(ColorM.hex("#ff0"))
                    if(f.hb.type===HitboxType2D.polygon)
                    for(const p of (f.hb as PolygonHitbox2D).points){
                        graphic.drawModel(model2d.circle(0.1,8,p))
                    }
                }
            }*/
        }
    }
}