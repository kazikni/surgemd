import { Floors, FloorType, TerrainManager } from "common/scripts/others/terrain.ts";
import { MapConfig } from "common/scripts/packets/map_packet.ts";
import { type Game } from "../others/game.ts";
import { Graphics2D } from "common/engine/client.ts";
import { Layers } from "common/scripts/others/constants.ts";
import { ColorM } from "common/engine/core.ts";
export class TerrainM extends TerrainManager{
    map!:MapConfig
    game:Game

    last_layer?:number
    constructor(game:Game){
        super()
        this.game=game
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
    draw(graphic:Graphics2D,layer:number=Layers.Normal){
        if(this.last_layer!==layer){
            this.last_layer=layer
            graphic.layer=layer
            graphic.ctx.clear()
            for(const f of this.floors){
                if(layer<f.layer)continue
                const flb=this.game.minimap.biome.floors[f.type as FloorType]
                graphic.ctx.hitbox(f.hb)
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