import { C_GameMap, c_gamemap, gamemap_events } from "common/scripts/game/gelo/map.ts";
import { Graphics2D, Grid2D } from "common/engine/web.ts";
import { ColorM, gel_events, GELComponent, Stream, v2, v2m } from "common/engine/core.ts";
import { Layers, zIndexes } from "common/scripts/others/constants.ts";
import { Floors, FloorType } from "common/scripts/others/terrain.ts";
import { GameGELO } from "../main/gel.ts";

export type CC_GameMap=GameGELO&C_GameMap&{
    grid_gfx:Grid2D
    terrain_gfx:Record<number,Graphics2D>

    draw_terrain():void
}

export const cc_gamemap:GELComponent<CC_GameMap>={
    id_string:"cc_gamemap",
    extensions:[c_gamemap],

    events:{
        [gel_events.bind]:function(){
            this.terrain_gfx={}

            this.grid_gfx=new Grid2D()
            this.grid_gfx.line_width=0.05
            this.grid_gfx.size=5
            this.grid_gfx.stroke=ColorM.rgba(0,0,0,25)
            this.grid_gfx.zIndex=zIndexes.Grid
            this.grid_gfx.layer=Layers.Normal
        },

        [gel_events.registry]:function(){
            this.scene.camera.add_object(this.grid_gfx)
        },

        [gel_events.unregistry]:function(){
            this.grid_gfx.destroy()

            for(const key in this.terrain_gfx){
                this.terrain_gfx[key].destroy()
            }

            this.terrain_gfx={}
        },

        [gel_events.tick]:function(_dt:number){
            const camera_position=this.scene.camera.position
            const camera_size=this.scene.camera.size

            const grid=this.grid_gfx
            const begin=v2(camera_size.x/2,camera_size.y/2)

            v2m.sub(begin,camera_position,begin)
            v2m.min2(begin,v2(grid.size,grid.size))
            v2m.dscale(begin,begin,grid.size)
            v2m.floor(begin)
            v2m.sub_component(begin,1,1)

            const end=v2(camera_size.x/grid.size+2,camera_size.y/grid.size+2)

            v2m.ceil(end)
            v2m.add(end,end,begin)
            v2m.max2(end,v2.dscale(this.size,grid.size))

            grid.begin=begin
            grid.end=end
        },

        [gamemap_events.generated]:function(){
            this.draw_terrain()
        },
    },

    methods:{
        draw_terrain(){
            const flb=this.biome.floors[FloorType.Void]

            this.scene.camera.renderer.set_background_color(
                ColorM.number(
                    flb!==undefined
                        ?flb
                        :Floors[FloorType.Void].default_color
                )
            )

            for(const key in this.terrain_gfx){
                this.terrain_gfx[key].destroy()
            }

            this.terrain_gfx={}

            for(const f of this.terrain.floors){
                if(!f.visible)continue

                if(!this.terrain_gfx[f.layer]){
                    const gfx=new Graphics2D()

                    gfx.initialize(this.scene.camera.ctx)
                    this.scene.camera.add_object(gfx)

                    this.terrain_gfx[f.layer]=gfx
                }

                const flb=this.biome.floors[f.type as FloorType]
                const ctx=this.terrain_gfx[f.layer].ctx

                ctx.begin_path()
                ctx.collider(f.hb)

                ctx.fill_color=ColorM.number(
                    f.tint??(
                        flb!==undefined
                            ?flb
                            :Floors[f.type as FloorType].default_color
                    )
                )

                ctx.fill()
            }
        },
    },
}
/**
 * Mapa vindo da rede: o servidor manda o terreno no StartPacket.
 */
export const ccn_gamemap:GELComponent<CC_GameMap>={
    id_string:"ccn_gamemap",
    extensions:[cc_gamemap],
    events:{
        [gel_events.net_decode]:function(stream:Stream){
            this.decode_map(stream)
        },
    },
}
