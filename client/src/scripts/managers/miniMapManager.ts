import { type Game } from "../others/game.ts";
import { MapConfig } from "common/scripts/packets/map_packet.ts";
import { ColorM, Hitbox2D, HitboxType2D, v2, Vec2} from "common/engine/client.ts";
import { Floors, FloorType } from "common/scripts/others/terrain.ts";
import { GetObstacleBaseFrame } from "../objects/obstacle.ts";
import { zIndexes } from "common/scripts/others/constants.ts";

export class MinimapManager{
    game:Game

    canvas:HTMLCanvasElement=document.createElement("canvas")
    ctx:CanvasRenderingContext2D
    constructor(game:Game){
        this.game=game
        this.ctx=this.canvas.getContext("2d")!
    }
    image: HTMLImageElement=new Image()
    ms=0.05
    position:Vec2=v2(0,0)

    private drawHitbox(color:string,hb: Hitbox2D) {
        switch (hb.type) {
            case HitboxType2D.circle: {
                this.ctx.fillStyle=color
                const c = v2.dscale(hb.position,this.ms)
                const r = hb.radius * this.ms

                this.ctx.beginPath()
                this.ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
                this.ctx.fill()
                break
            }
            case HitboxType2D.rect: {
                this.ctx.fillStyle=color
                const min = v2.dscale(hb.min,this.ms)
                const max = v2.dscale(hb.max,this.ms)

                const w = max.x - min.x
                const h = max.y - min.y

                this.ctx.fillRect(min.x, min.y, w, h)
                break
            }
            case HitboxType2D.polygon: {
                if (hb.points.length === 0) break
                this.ctx.fillStyle=color

                this.ctx.beginPath()

                const first = v2.dscale(hb.points[0],this.ms)
                this.ctx.moveTo(first.x, first.y)

                for (let i = 1; i < hb.points.length; i++) {
                    const p = v2.dscale(hb.points[i],this.ms)
                    this.ctx.lineTo(p.x, p.y)
                }

                this.ctx.closePath()
                this.ctx.fill()
                break
            }
            case HitboxType2D.group: {
                this.ctx.fillStyle=color
                for (const sub of hb.hitboxes) {
                    this.drawHitbox(color,sub)
                }
                break
            }
        }
    }
    private drawGrid(gridSizeMeters: number, lineWidth: number = 1) {
        const ctx = this.ctx

        const canvasW = this.config.size.x/this.ms
        const canvasH = this.config.size.y/this.ms
        const step = gridSizeMeters/this.ms

        ctx.save()
        ctx.strokeStyle = "rgba(0,0,0,0.15)"
        ctx.lineWidth = lineWidth/this.ms
        ctx.beginPath()

        for (let x = 0; x <= canvasW; x += step) {
            ctx.moveTo(x, 0)
            ctx.lineTo(x, canvasH)
        }

        for (let y = 0; y <= canvasH; y += step) {
            ctx.moveTo(0, y)
            ctx.lineTo(canvasW, y)
        }

        ctx.stroke()
        ctx.restore()
    }
    draw(): Promise<string> {
        return new Promise<string>((resolve) => {    
            this.canvas.width  = this.config.size.x / this.ms
            this.canvas.height = this.config.size.y / this.ms

            this.ctx.clearRect(0, 0, this.canvas.width,this.canvas.height)

            this.ctx.fillStyle = ColorM.number2hex(Floors[FloorType.Void].default_color)
            this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height)

            for (const floor of this.config.terrain) {
                const hb  = floor.final_hb
                const hex = ColorM.number2hex(this.game.terrain.biome?.floors[floor.type]?.color??Floors[floor.type].default_color)
                this.drawHitbox(hex, hb)
            }
            this.drawGrid(5,0.06)
            const sorted = [...this.config.objects].sort((a,b)=>{
                const ad=this.game.definitions.obstacles.getFromNumber(a.def)
                const bd=this.game.definitions.obstacles.getFromNumber(b.def)
                return (ad.zIndex?.base ?? zIndexes.Obstacles1) - (bd.zIndex?.base ?? zIndexes.Obstacles1)
            })
            for (const obj of sorted) {
                const def = this.game.definitions.obstacles.getFromNumber(obj.def)
                const frameName = GetObstacleBaseFrame(def, obj.variation,obj.skin)
                const frame = this.game.resources.get_sprite(frameName)
                if (!frame?.source) continue

                const sx = frame.frame_rect?.x1 ?? 0
                const sy = frame.frame_rect?.y1 ?? 0
                const sw = (frame.frame_rect?.x2 ?? frame.source.width) - sx
                const sh = (frame.frame_rect?.y2 ?? frame.source.height) - sy

                const fw = frame.frame_size?.x ?? sw
                const fh = frame.frame_size?.y ?? sh

                const frame_scale=(def.assets?.frame?.transform?.scale??2)

                const w = (fw*obj.scale*frame_scale)/this.ms/200
                const h = (fh*obj.scale*frame_scale)/this.ms/200

                const pos = v2.dscale(obj.position,this.ms)

                this.ctx.save()
                this.ctx.translate(pos.x, pos.y)
                this.ctx.rotate(obj.rotation ?? 0)

                this.ctx.drawImage(
                    frame.source,
                    sx, sy, sw, sh,
                    -w/2, -h/2,
                    w, h
                )

                this.ctx.restore()
            }
            resolve(this.canvas.toDataURL("image/png"))
        })
    }
    config!:MapConfig
    async init(map:MapConfig){
        this.config=map
        this.image.src=await this.draw()
    }
}