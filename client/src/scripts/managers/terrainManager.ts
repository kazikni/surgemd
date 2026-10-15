import { Floors, FloorType, TerrainManager } from "common/scripts/others/terrain.ts";
import { MapConfig } from "common/scripts/packets/map_message.ts";
import { type Game } from "../others/game.ts";
import { Graphics2D, Grid2D, Material, WebglRenderer } from "common/engine/web.ts";
import { Layers, zIndexes } from "common/scripts/others/constants.ts";
import { ColorM, v2, v2m, Vec2 } from "common/engine/core.ts";
export class TerrainM extends TerrainManager{
    map!:MapConfig
    game:Game

    last_layer?:number

    terrain_gfx=new Graphics2D()

    cosmic!:Material
    constructor(game:Game){
        super()
        this.game=game
    }
    append(){
        this.terrain_gfx.initialize(this.game.scene_2d.camera.ctx)

        this.game.scene_2d.camera.add_object(this.terrain_gfx)

        this.terrain_gfx.zIndex=zIndexes.Terrain

        this.cosmic=(this.game.renderer as WebglRenderer).factorys2D.cosmic_batch.create({
            speed:2,
            seed:1,
            scale:5,
            drift_x:-0.1,
            drift_y:0.12,

            nebula_scale:1.5,
            nebula_strength:0.32,
            nebula_detail:7,
            nebula_warp:1.4,

            color1:{r:3,g:5,b:22,a:255},
            color2:{r:12,g:14,b:55,a:255},
            color3:{r:18,g:8,b:58,a:255},
            color4:{r:5,g:30,b:58,a:255},

            stars:[
                {
                    quantity:0.22,
                    scale:170,
                    size:0.012,
                    brightness:0.55,
                    move_scale:0.35,
                    color:{r:150,g:175,b:220,a:255}
                },
                {
                    quantity:0.12,
                    scale:90,
                    size:0.018,
                    brightness:0.65,
                    move_scale:0.55,
                    color:{r:170,g:180,b:240,a:255}
                },
                {
                    quantity:0.045,
                    scale:48,
                    size:0.028,
                    brightness:0.85,
                    move_scale:0.8,
                    color:{r:130,g:170,b:255,a:255}
                },
                {
                    quantity:0.012,
                    scale:25,
                    size:0.045,
                    brightness:1.5,
                    move_scale:1.1,
                    color:{r:90,g:220,b:255,a:255}
                },
                {
                    quantity:0.003,
                    scale:15,
                    size:0.075,
                    brightness:4,
                    move_scale:1.5,
                    color:{r:100,g:230,b:255,a:255}
                },
                {
                    quantity:0.001,
                    scale:9,
                    size:0.1,
                    brightness:5,
                    move_scale:1.8,
                    color:{r:170,g:100,b:255,a:255}
                }
            ]
        })
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
            this.colors=mp.terrain.colors
            for(const f of mp.terrain.floors){
                this.add_floor(f)
            }
            resolve()
        })
    }
    tick(){
        this.draw(this.terrain_gfx,this.game.scene_2d.camera.layer)
    }
    draw(graphic:Graphics2D,layer:number=Layers.Normal){
        if(this.last_layer!==layer){
            if(layer>=Layers.Top)layer=Layers.Normal
            this.last_layer=layer
            graphic.layer=layer
            graphic.ctx.clear()
            for(const f of this.floors){
                if(layer<f.layer||!f.visible)continue
                const flb=this.game.minimap.biome.floors[f.type as FloorType]
                graphic.ctx.begin_path()
                graphic.ctx.hitbox(f.hb)
                graphic.ctx.fill_color=ColorM.number(f.tint??((flb!==undefined)?flb:Floors[f.type as FloorType].default_color))
                graphic.ctx.fill()
            }

            if(layer>=Layers.Normal){
                graphic.ctx.line_width=0.05
                graphic.ctx.stroke_color=ColorM.rgba(0,0,0,25)
                graphic.ctx.begin_path()
                graphic.ctx.grid(0,0,this.map?.size?.x,this.map?.size?.y,5)
                graphic.ctx.stroke()
            }

            /*graphic.ctx.save()
            graphic.ctx.fill_color=ColorM.hex("#050010")
            graphic.ctx.material=this.cosmic
            graphic.ctx.begin_path()
            graphic.ctx.rect(v2(45,45),v2(55,55))
            graphic.ctx.fill()
            graphic.ctx.restore()*/

            graphic.ctx.lock()
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