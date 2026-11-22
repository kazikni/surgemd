import { Graphics2D, Grid2D } from "common/engine/web.ts";
import { ColorM, gel_events, GELComponent, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { gelo_instance_type, Layers, zIndexes } from "common/scripts/others/constants.ts";
import { Floors, FloorType, type MapBiomeDef, type MapRegion, TerrainManager } from "common/scripts/others/terrain.ts";
import { GameGELO } from "../main/gel.ts";

export type CC_GameMap=GameGELO&{
    terrain:TerrainManager
    seed:number
    size:Vec2
    biome:MapBiomeDef
    regions:MapRegion[]

    default_layer:number
    default_floor:FloorType

    grid_gfx:Grid2D
    terrain_gfx:Record<number,Graphics2D>

    draw_terrain():void
}

export const cc_gamemap:GELComponent<CC_GameMap>={
    id_string:"cc_gamemap",

    events:{
        [gel_events.bind]:function(){
            this.instance_type=gelo_instance_type.map
            this.terrain=new TerrainManager()
            this.seed=0
            this.size=v2.zero()
            this.regions=[]
            this.default_layer=Layers.Normal
            this.default_floor=FloorType.Void
            this.biome={floors:{},particles:[],musics:[],textures:[]}

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

        [gel_events.net_decode](stream:Stream){
            this.seed=stream.read_uint32()
            this.size=stream.read_pos2()
            this.default_floor=stream.read_uint8()
            this.default_layer=stream.read_int8()
            this.biome=stream.read_any(2,2)
            this.regions=stream.read_any(2,2)??[]
            this.terrain.clear()
            stream.read_array(()=>{
                const type=stream.read_uint8()
                const layer=stream.read_int8()
                const [smooth,visible,has_tint]=stream.read_boolean_group()
                const tint=has_tint?stream.read_uint32():undefined
                const hb=stream.read_collider()
                this.terrain.add_floor({type,layer,smooth,visible,tint,hb})
            },3)
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