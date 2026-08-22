import { HideElement,ShowElement,UIModule } from "common/engine/web.ts"
import { Game } from "../others/game.ts"
import { PrivateUpdate } from "common/scripts/packets/update_packet.ts"
import { PingDef } from "common/scripts/definitions/loadout/ping.ts"
import { ColorM, v2, v2m, Vec2 } from "common/engine/core.ts";
import { GeneralUpdate, MapZone } from "common/scripts/packets/general_update.ts";
type MinimapPing = {
    id?:number

    pos:Vec2
    def:PingDef

    color:number

    duration:number
    time:number

    pulseTime:number
}
interface MapHumansInstance{
    pos:Vec2
}
interface MinimapIconDef{
    name:string
    value:string
    images:Record<number,HTMLImageElement>
    images_promise:Record<number,Promise<HTMLImageElement>>
}
export class MinimapModule extends UIModule<Game>{
    visible=true
    fullscreen=false

    scale:number=1
    zoom=0.85
    zoom_step=0.25

    zoom_min=0.1
    zoom_max=3

    followPlayer=true

    canvas!:HTMLCanvasElement
    ctx!:CanvasRenderingContext2D

    humans_ins = new Map<number, MapHumansInstance>()

    pings:MinimapPing[]=[]
    zones:MapZone[]=[]

    map_icons_name:Record<string,MinimapIconDef>={}
    map_icons:MinimapIconDef[]=[]

    override on_init(): void {
        this.canvas=document.body.querySelector("#ui-map") as HTMLCanvasElement
        this.ctx=this.canvas.getContext("2d")!
 
        this.load_icons()

        this.canvas.addEventListener("click",()=>{
            if(!this.fullscreen)this.toggle_fullscreen()
        })
    }
    async load_icons(){
        const base="/assets/img/menu/gui/map/"
        await this.load_map_icon("normal",base+"map_icon_normal.svg")
        await this.load_map_icon("other",base+"map_icon_other.svg")
        await this.load_map_icon("downed",base+"map_icon_downed.svg")
        await this.load_map_icon("dead",base+"map_icon_dead.svg")
        await this.load_map_icon("drone",base+"map_icon_drone.svg")

        await this.load_map_icon("ping_airdrop","/assets/img/menu/gui/map/ping_airdrop.svg")
        await this.load_map_icon("ping_alert","/assets/img/menu/gui/map/ping_alert.svg")
    }

    async load_map_icon(id:string,path:string){
        const icon:MinimapIconDef={
            name:id,
            value:(await (await fetch(path)).text()),
            images:{},
            images_promise:{}
        }
        this.map_icons.push(icon)
        this.map_icons_name[id]=icon
    }

    get_minimap_icon(id:string,color:number):HTMLImageElement|undefined{
        const icon=this.map_icons_name[id]
        if(!icon||icon.images_promise[color]!==undefined)return
        if(icon.images[color])return icon.images[color]

        icon.images_promise[color]=new Promise((resolve)=>{
            const fill=ColorM.number2hex(color)
            const stroke=ColorM.number2hex(ColorM.number_mul_hsv(color,-3,undefined,0.5))
            const image=new Image()
            image.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(icon.value.replaceAll("var(--image-fill)",fill).replaceAll("var(--image-stroke)",stroke))
            image.onload=()=>resolve(image)
        })
        icon.images_promise[color].then((v)=>{
            icon.images[color]=v
            delete icon.images_promise[color]
        })
    }

    tick(dt:number){
        this.tick_pings(dt)
    }
    render(){
        const minimap=this.game.minimap
        const max=v2(minimap.canvas.width,minimap.canvas.height)
        if(minimap.canvas.width<=0||minimap.canvas.height<=0)return
        const cw=this.canvas.clientWidth
        const ch=this.canvas.clientHeight
        if(cw<=0||ch<=0)return
        if(this.canvas.width!==cw ||this.canvas.height!==ch){
            this.canvas.width=cw
            this.canvas.height=ch
        }
        const ctx=this.ctx
        ctx.clearRect(0,0,cw,ch)

        let scale:number
        let cameraX:number
        let cameraY:number

        if(this.fullscreen){
            scale=Math.min(cw/max.x,ch/max.y)
            cameraX=(cw-max.x*scale)*0.5
            cameraY=(ch-max.y*scale)*0.5
            this.canvas.style.width=`${(45*Math.max(max.x/max.y,0))}vw`
            this.canvas.style.height="45vw"
        }else{
            const player=this.game.active_entity?.position
            if(!player)return
            const playerPos=this.worldToMap(player.x,player.y)
            scale=this.zoom
            cameraX=cw*0.5-playerPos.x*scale
            cameraY=ch*0.5-playerPos.y*scale
            this.canvas.style.width=""
            this.canvas.style.height=""
        }
        this.scale=scale

        ctx.save()
        ctx.translate(cameraX,cameraY)
        ctx.scale(scale,scale)

        ctx.drawImage(minimap.canvas,0,0)

        this.render_deadzone()
        this.render_zones()
        this.render_pings()
        this.render_humans()

        ctx.restore()
    }
    render_deadzone() {
        const dz = this.game.dead_zone
        if (!dz||!dz.enabled) return

        const ms = this.game.minimap.meter_size

        const x = dz.position.x * ms
        const y = dz.position.y * ms

        const destX = dz.dest_position.x * ms
        const destY = dz.dest_position.y * ms

        const radius = dz.radius * ms
        const destRadius = dz.dest_radius * ms

        const ctx = this.ctx

        ctx.save()
        ctx.beginPath()
        ctx.rect(-100000,-100000,200000,200000)
        ctx.arc(x,y,radius,0,Math.PI * 2,true)

        const color=ColorM.rgba2hex(dz.color)
        ctx.fillStyle=color
        ctx.fill("evenodd")

        ctx.restore()
        ctx.save()

        ctx.beginPath()
        ctx.arc(x,y,radius,0,Math.PI * 2)

        ctx.strokeStyle=color.substring(0,7)+"ff"
        ctx.lineWidth=5/this.scale
        ctx.stroke()

        ctx.restore()

        ctx.save()

        ctx.beginPath()
        ctx.arc(destX,destY,destRadius,0,Math.PI * 2)

        ctx.strokeStyle = "#ffffff88"
        ctx.lineWidth = 5 / this.scale
        ctx.stroke()

        ctx.restore()
        this.render_safe_line()
    }
    render_safe_line() {
        const player = this.game.active_entity?.position
        const dz = this.game.dead_zone
        if (!player||!dz) return

        const ms = this.game.minimap.meter_size

        const px = player.x*ms
        const py = player.y*ms

        const zx = dz.dest_position.x*ms
        const zy = dz.dest_position.y*ms

        const dx = zx-px
        const dy = zy-py
        const len = Math.sqrt(dx * dx + dy * dy)

        if (len < 5) return

        const angle = Math.atan2(dy, dx)
        const width = 5/this.scale

        this.ctx.save()
        this.ctx.translate(px, py)
        this.ctx.rotate(angle)
        this.ctx.fillStyle = this.game.get_theme_color("primary")
        this.ctx.fillRect(0, -width * 0.5,len,width)
        this.ctx.restore()
    }
    render_humans(){
        const alive=new Set<number>()
        for(const human of this.game.ui.map_humans){
            if(alive.has(human.id))continue
            alive.add(human.id)
            let hi=this.humans_ins.get(human.id)
            if(!hi){
                hi={
                    pos:v2.clone(human.position),
                }
                this.humans_ins.set(human.id,hi)
            }
            let size=0.6
            let icon="normal"
            let color=0
            const member=this.game.ui.group_members[human.id]
            if(member){
                color=member.color
                size=1
            }else if(human.id===this.game.active_entity_id){
                size=1
                color=0x11aa55
            }else{
                color=human.default_map_color
                icon="other"
            }
            if(human.downed){
                icon="downed"
            }
            if(human.dead){
                icon="dead"
            }
            v2m.lerp(hi.pos,human.position,this.game.global_interpolation)
            const pos=this.worldToMap(hi.pos.x,hi.pos.y)

            const image=this.get_minimap_icon(icon,color)
            if(!image)continue

            const visualSize=size/this.scale
            const width=image.width*visualSize
            const height=image.height*visualSize
            this.ctx.drawImage(image,pos.x-width*0.5,pos.y-height*0.5,width,height)
        }
        for(const [id] of this.humans_ins){
            if(!alive.has(id)){
                this.humans_ins.delete(id)
            }
        }
    }
    render_zones(){
        for(const z of this.zones){
            this.ctx.beginPath()
            const pos=this.worldToMap(z.position.x,z.position.y)
            this.ctx.arc(pos.x,pos.y,z.radius*this.game.minimap.meter_size,-Math.PI,Math.PI)

            const color=ColorM.number2hex(z.color)
            this.ctx.fillStyle=color+"99"
            this.ctx.strokeStyle=color
            this.ctx.lineWidth=3/this.scale
            this.ctx.fill()
            this.ctx.stroke()

            if(z.icon>0&&this.map_icons[z.icon-1]){
                const img=this.get_minimap_icon(this.map_icons[z.icon-1].name,z.color)
                if(!img)continue
                const width=img.width/this.scale
                const height=img.height/this.scale
                this.ctx.drawImage(img,pos.x-width*0.5,pos.y-height*0.5,width,height)
            }
        }
    }
    tick_pings(dt:number){
        for(let i=0;i<this.pings.length;i++){
            const ping=this.pings[i]
            if(ping.pulseTime<100){
                ping.pulseTime+=dt*15
            }
            if(ping.def.lifetime!==undefined){
                ping.time+=dt
                if(ping.time>=ping.duration){
                    this.pings.splice(i,1)
                    i--
                    continue
                }
            }
        }
    }
    render_pings(){
        for(let i=0;i<this.pings.length;i++){
            const ping=this.pings[i]
            const pos=this.worldToMap(ping.pos.x,ping.pos.y)
            const img=this.get_minimap_icon(ping.def.idString,ping.color)
            if(img){
                const size=50/this.scale
                this.ctx.drawImage(img,pos.x-size*0.5,pos.y-size*0.5,size,size)
            }
            if(ping.pulseTime<100){
                const pulseSize=(50*ping.pulseTime)
                const alpha=Math.max(Math.floor(255-255*(ping.pulseTime/100)),0)
                this.ctx.beginPath()
                this.ctx.arc(pos.x,pos.y,pulseSize*0.5,0,Math.PI*2)
                this.ctx.strokeStyle=ColorM.number2hex(ping.color)+alpha.toString(16).padStart(2, "0")
                this.ctx.lineWidth=7/this.scale
                this.ctx.stroke()
            }
        }
    }
    toggle_fullscreen(){
        this.fullscreen=!this.fullscreen
        this.canvas.classList.toggle("fullscreen",this.fullscreen)
    }

    zoom_in(){
        this.zoom=Math.min(this.zoom_max,this.zoom+this.zoom_step)
    }
    zoom_out(){
        this.zoom=Math.max(this.zoom_min,this.zoom-this.zoom_step)
    }

    worldToMap(x:number,y:number){
        return v2(x*this.game.minimap.meter_size,y*this.game.minimap.meter_size)
    }

    add_ping(position:Vec2,def:PingDef,color:number,id?:number){
        if(id!==undefined){
            for(let i=this.pings.length-1;i>=0;i--){
                if(this.pings[i].id===id){
                    this.pings.splice(i,1)
                }
            }
        }
        const ping:MinimapPing={
            id,
            pos:v2.clone(position),
            def,
            color,
            duration:def.lifetime??0,
            time:0,
            pulseTime:0
        }
        this.pings.push(ping)

        this.game.sounds.play(this.game.resources.get_sound(def.idString+"_audio"),{
            bus:"ui"
        })
    }
    override on_signal(signal:string,data:any):void{
        switch(signal){
            case "private":
                for(const p of (data as PrivateUpdate).pings){
                    this.add_ping(p.position,this.game.definitions.ping.getFromNumber(p.def),p.color,p.id)
                }
                break
            case "general_update":
                this.zones=(data as GeneralUpdate).map_zones
                break
            case "actiondown":
                switch(data.action){
                    case "toggle_hide_device":
                        this.visible=!this.visible
                        break
                    case "toggle_full_device":
                        this.toggle_fullscreen()
                        break
                    case "device_zoom_in":
                        this.zoom_in()
                        break
                    case "device_zoom_out":
                        this.zoom_out()
                        break
                }
                break
        }
    }
    override on_update(dt:number):void{
        this.tick(dt)
        if((this.visible||this.fullscreen)&&this.game.minimap.enabled&&this.game.minimap.config.minimap_enabled){
            ShowElement(this.canvas)
            this.render()
        }else{
            HideElement(this.canvas)
        }
    }
    override on_destroy():void{}
    override on_clear():void{
        this.pings.length=0
        this.zones.length=0
    }
}