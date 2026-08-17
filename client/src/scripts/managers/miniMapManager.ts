import { type Game } from "../others/game.ts"
import { Floor, Floors,FloorType } from "common/scripts/others/terrain.ts"
import { MapConfig, MapObjectObstacle, MapRegion } from "common/scripts/packets/map_message.ts"
import { GetObstacleBaseFrame } from "../objects/obstacle.ts"
import { zIndexes } from "common/scripts/others/constants.ts";
import { MapBiomeDef } from "common/scripts/definitions/maps/base.ts";
import { ColorM, Hitbox2D, HitboxType2D, v2, v2m, Vec2 } from "common/engine/core.ts";
export interface MinimapTile {
    position:Vec2
    image:HTMLImageElement
    loaded:boolean
}

export class MinimapManager {
    game:Game
    config!:MapConfig
    meter_size=10 // 1 Meter In World = 10 Pixels
    canvas=document.createElement("canvas")
    ctx:CanvasRenderingContext2D
    map_size:Vec2
    biome!:MapBiomeDef
    enabled:boolean=false

    constructor(game:Game){
        this.game=game
        this.ctx=this.canvas.getContext("2d")!
        this.map_size=v2.zero()
    }
    init(config:MapConfig){
        this.enabled=config.minimap_enabled
        this.config=config

        if(this.config.minimap_enabled){
            const map_px_w=config.size.x*this.meter_size
            const map_px_h=config.size.y*this.meter_size

            this.canvas.width=map_px_w
            this.canvas.height=map_px_h

            this.map_size=config.size

            const sorted=[...this.config.objects].sort((a,b)=>{
                const ad=this.game.definitions.obstacles.getFromNumber(a.def)
                const bd=this.game.definitions.obstacles.getFromNumber(b.def)
                return ((ad.zIndex?.base ?? zIndexes.Obstacles1)-(bd.zIndex?.base ?? zIndexes.Obstacles1))
            })

            this.render(this.config.terrain,sorted,this.config.regions)
        }
        this.game.ui_manager.signal("minimap",{})
    }

    render(terrain:Floor[],objects:MapObjectObstacle[],regions:MapRegion[],cam_pos:Vec2=v2.zero()){
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height)

        this.ctx.fillStyle=ColorM.number2hex(Floors[FloorType.Void].default_color)
        this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height)

        for(const floor of terrain){
            const color=ColorM.number2hex(floor.tint??this.biome?.floors[floor.type as FloorType]??Floors[floor.type as FloorType].default_color)
            this.draw_hitbox(color,floor.hb,cam_pos)
        }
        this.draw_grid(cam_pos)
        for(const obj of objects){
            this.draw_object(obj,cam_pos)
        }
        for(const r of regions){
            this.draw_region(r,cam_pos)
        }
    }
    draw_region(region:MapRegion,cam_position:Vec2){
        const pos=v2.scale(region.position,this.meter_size)
        pos.x-=cam_position.x
        pos.y-=cam_position.y
        if(pos.x<-200||pos.y<-50||pos.x>this.canvas.width+200||pos.y>this.canvas.height+50)return
        const ctx=this.ctx
        ctx.save()
        ctx.textAlign="center"
        ctx.textBaseline="middle"
        ctx.font="bold 80px Arial"
        ctx.lineWidth=8
        ctx.strokeStyle="rgba(0,0,0,0.7)"
        ctx.strokeText(region.name,pos.x,pos.y)
        ctx.fillStyle="rgba(255,255,255,0.8)"
        ctx.fillText(region.name,pos.x,pos.y)
        ctx.restore()
    }
    draw_grid(cam_position:Vec2){
        const ctx=this.ctx

        const step=this.game.grid.size*this.meter_size

        ctx.save()
        ctx.strokeStyle=ColorM.rgba2hex(this.game.grid.stroke!)
        ctx.lineWidth=this.game.grid.line_width*this.meter_size
        ctx.beginPath()

        const start_x=(-(cam_position.x*this.meter_size))%step
        const start_y=(-(cam_position.y*this.meter_size))%step

        for(let x=start_x;x<=this.canvas.width;x+=step){
            ctx.moveTo(x,0)
            ctx.lineTo(x,this.canvas.width)
        }
        for(let y=start_y;y<=this.canvas.height;y+=step){
            ctx.moveTo(0,y)
            ctx.lineTo(this.canvas.height,y)
        }

        ctx.stroke()
        ctx.restore()
    }
    draw_hitbox(color:string,hb:Hitbox2D,cam_position:Vec2){
        const ctx=this.ctx
        switch(hb.type){
            case HitboxType2D.circle:{
                ctx.fillStyle=color
                const c=v2.scale(hb.position,this.meter_size)
                ctx.beginPath()
                ctx.arc(c.x,c.y,hb.radius/this.meter_size,0,Math.PI*2)
                ctx.fill()
                break
            }
            case HitboxType2D.rect:{
                ctx.fillStyle=color
                const min=v2.scale(hb.min,this.meter_size)
                const max=v2.scale(hb.max,this.meter_size)
                ctx.fillRect(min.x-cam_position.x,min.y-cam_position.y,max.x-min.x,max.y-min.y)
                break
            }
            case HitboxType2D.polygon:{
                if(hb.points.length<=0)return
                ctx.fillStyle=color
                ctx.beginPath()
                const first=v2.scale(hb.points[0],this.meter_size)
                ctx.moveTo(first.x-cam_position.x,first.y-cam_position.y)
                for(let i=1;i<hb.points.length;i++){
                    const p=v2.scale(hb.points[i],this.meter_size)
                    ctx.lineTo(p.x-cam_position.x,p.y-cam_position.y)
                }
                ctx.closePath()
                ctx.fill()

                break
            }
            case HitboxType2D.group:{
                for(const sub of hb.hitboxes){
                    this.draw_hitbox(color,sub,cam_position)
                }
                break
            }
        }
    }
    draw_object(obj:MapObjectObstacle,cam_position:Vec2){
        const def=this.game.definitions.obstacles.getFromNumber(obj.def)
        const frame_name=GetObstacleBaseFrame(def,obj.variation,obj.skin)
        const frame=this.game.resources.get_frame(frame_name)
        if(!frame?.image)return

        const sx=frame.frame_rect?.min.x ?? 0
        const sy=frame.frame_rect?.min.y ?? 0

        const sw=(frame.frame_rect?.max.x ?? frame.image.width)-sx
        const sh=(frame.frame_rect?.max.y ?? frame.image.height)-sy

        const base_scale=(def.assets?.frame?.transform?.scale ?? 2)*obj.scale*this.meter_size
        const w=(sw/(this.game.cam2d.meter_size*2))*base_scale
        const h=(sh/(this.game.cam2d.meter_size*2))*base_scale

        const pos=v2.scale(obj.position,this.meter_size)
        v2m.sub(pos,pos,cam_position)

        this.ctx.save()

        this.ctx.translate(pos.x,pos.y)
        this.ctx.rotate(obj.rotation ?? 0)

        this.ctx.drawImage(frame.image,sx,sy,sw,sh,-w/2,-h/2,w,h)

        this.ctx.restore()
    }
}