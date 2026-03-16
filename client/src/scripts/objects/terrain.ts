import { Floors, TerrainManager } from "common/scripts/others/terrain.ts";
import { MapConfig } from "common/scripts/packets/map_packet.ts";
import { type Game } from "../others/game.ts";
import { Debug } from "../others/config.ts";
import { BiomeDef } from "common/scripts/definitions/maps/base.ts";
import { ColorM, Graphics2D, HitboxType2D, model2d, PolygonHitbox2D } from "common/engine/client.ts";
export class TerrainM extends TerrainManager{
    map!:MapConfig
    game:Game
    constructor(game:Game){
        super()
        this.game=game
    }
    process_map(mp:MapConfig):Promise<void>{
        return new Promise<void>((resolve, _reject) => {
            this.map=mp
            for(const f of mp.terrain){
                this.add_floor(f.type,f.hb,f.layer,f.smooth)
            }
            this.biome=mp.biome
            resolve()
        })
    }
    biome?:BiomeDef

    draw(graphic:Graphics2D,scale:number){  
        for(const f of this.floors){
            const flb=this.biome?.floors[f.type]
            graphic.beginPath()
            graphic.set_hitbox(f.hb)
            //if(f.smooth)graphic.smooth_shape()
            graphic.repeat_size=3
            graphic.endPath()
            const col=
            (flb?.color!==undefined)?
            flb?.color:
            Floors[f.type].default_color
            graphic.fill_color(ColorM.number(col))
            graphic.fill()
        }

        if(Debug.hitbox){
            for(const f of this.floors){
                graphic.fill_color(ColorM.hex("#ff0"))
                if(f.hb.type===HitboxType2D.polygon)
                for(const p of (f.hb as PolygonHitbox2D).points){
                    graphic.drawModel(model2d.circle(0.1,8,p))
                }
            }
        }
        graphic.fill_color(ColorM.hex("#0005"))
        graphic.beginPath()
    }
}