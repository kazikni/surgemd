import { HideElement,ShowElement,UIModule } from "common/engine/web.ts"
import { Game } from "../others/game.ts"
import { PrivateUpdate } from "common/scripts/packets/update_packet.ts"
import { PingDef } from "common/scripts/definitions/loadout/ping.ts"
import { ColorM, v2, v2m, Vec2 } from "common/engine/core.ts";
type MinimapPing = {
    id?:number

    pos:Vec2
    def:PingDef

    color:string

    duration:number
    time:number

    pulseTime:number

    image?:HTMLImageElement
    image_promise?:Promise<void>
}
interface MapHumansInstance{
    pos:Vec2
    old_tint:number
    old_icon:string
    image?:HTMLImageElement
    image_promise?:Promise<void>
}
export class MinimapModule extends UIModule<Game>{
    enabled=true
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

    mapWidth=0
    mapHeight=0

    pings:MinimapPing[]=[]

    map_icons:Record<string,string>={}

    override on_init(): void {
        this.canvas=document.body.querySelector("#ui-map") as HTMLCanvasElement
        this.ctx=this.canvas.getContext("2d")!

        this.load_map_icon("normal","/assets/img/menu/gui/map/map_icon_normal.svg")
        this.load_map_icon("downed","/assets/img/menu/gui/map/map_icon_downed.svg")
        this.load_map_icon("dead","/assets/img/menu/gui/map/map_icon_dead.svg")

        this.load_map_icon("ping_airdrop","/assets/img/menu/gui/map/ping_airdrop.svg")
        this.load_map_icon("ping_alert","/assets/img/menu/gui/map/ping_alert.svg")

        this.canvas.addEventListener("click",()=>{
            if(!this.fullscreen)this.toggle_fullscreen()
        })
    }

    async load_map_icon(id:string,path:string){
        this.map_icons[id]=(await (await fetch(path)).text())
    }

    render(dt:number){
        const minimap=this.game.minimap
        let maxW=0
        let maxH=0
        for(const tile of minimap.tiles.values()){
            const px=tile.position.x*minimap.tile_size_px
            const py=tile.position.y*minimap.tile_size_px
            maxW=Math.max(maxW,px+tile.image.width)
            maxH=Math.max(maxH,py+tile.image.height)
        }
        this.mapWidth=maxW
        this.mapHeight=maxH
        if(maxW<=0||maxH<=0)return
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
            scale=Math.min(cw/maxW,ch/maxH)
            cameraX=(cw-maxW*scale)*0.5
            cameraY=(ch-maxH*scale)*0.5
        }else{
            const player=this.game.active_entity?.position
            if(!player)return
            const playerPos=this.worldToMap(player.x,player.y)
            scale=this.zoom
            cameraX=cw*0.5-playerPos.x*scale
            cameraY=ch*0.5-playerPos.y*scale
        }
        this.scale=scale

        ctx.save()
        ctx.translate(cameraX,cameraY)
        ctx.scale(scale,scale)

        for(const tile of minimap.tiles.values()){
            if(!tile.loaded)continue
            const px=tile.position.x*minimap.tile_size_px
            const py=tile.position.y*minimap.tile_size_px
            ctx.drawImage(tile.image,px,py)
        }

        this.render_deadzone()
        this.render_safe_line()
        this.render_pings(dt)
        this.render_humans()

        ctx.restore()
    }
    render_deadzone() {
        const dz = this.game.dead_zone
        if (!dz) return

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

        ctx.fillStyle = ColorM.rgba2hex(dz.color)
        ctx.fill("evenodd")

        ctx.restore()
        ctx.save()

        ctx.beginPath()
        ctx.arc(
            x,
            y,
            radius,
            0,
            Math.PI * 2
        )

        ctx.strokeStyle = ColorM.rgba2hex(dz.color)
        ctx.lineWidth = 5 / this.scale
        ctx.stroke()

        ctx.restore()

        ctx.save()

        ctx.beginPath()
        ctx.arc(
            destX,
            destY,
            destRadius,
            0,
            Math.PI * 2
        )

        ctx.strokeStyle = "#ffffff88"
        ctx.lineWidth = 5 / this.scale
        ctx.stroke()

        ctx.restore()
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
            alive.add(human.id)
            let hi=this.humans_ins.get(human.id)
            if(!hi){
                hi={
                    pos:v2.clone(human.position),
                    old_tint:-1,
                    old_icon:"",
                    image:undefined
                }
                this.humans_ins.set(human.id,hi)
            }
            let size=0.5
            let icon="normal"
            let color=0
            const member=this.game.ui.group_members[human.id]
            if(member){
                color=member.color
                size=1
            }else if(human.id===this.game.active_entity_id){
                size=1
                color=0x11aa55
            }
            if(human.downed){
                icon="downed"
            }
            if(human.dead){
                icon="dead"
            }
            v2m.lerp(hi.pos,human.position,this.game.global_interpolation)
            const pos=this.worldToMap(hi.pos.x,hi.pos.y)

            const iconChanged=icon!==hi.old_icon||color!==hi.old_tint
            if(iconChanged||(!hi.image&&!hi.image_promise)){
                hi.old_icon=icon
                hi.old_tint=color
                hi.image_promise=this.load_human_icon(human.id,icon,color)
                hi.image_promise.then(()=>{
                    if(!this.humans_ins.has(human.id))return
                    hi.image_promise=undefined
                })
            }

            const image=(hi as any).image as HTMLImageElement|undefined
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
    render_pings(dt:number){
        for(let i=0;i<this.pings.length;i++){
            const ping=this.pings[i]
            if(!ping.image)ping.image_promise=this.load_ping_icon(ping.def.idString,ping.color).then(image=>{
                if(!this.pings.includes(ping))return
                ping.image=image
                ping.image_promise=undefined
            })
            const pos=this.worldToMap(ping.pos.x,ping.pos.y)
            if(ping.image){
                const size=50/this.scale
                this.ctx.drawImage(ping.image,pos.x-size*0.5,pos.y-size*0.5,size,size)
            }
            if(ping.pulseTime<100){
                const pulseSize=(7*ping.pulseTime)/this.scale
                const alpha=Math.max(Math.floor(255-255*(ping.pulseTime/100)),0)

                this.ctx.beginPath()
                this.ctx.arc(pos.x,pos.y,pulseSize*0.5,0,Math.PI*2)
                this.ctx.strokeStyle=ping.color+alpha.toString(16)
                this.ctx.lineWidth=4/this.scale
                this.ctx.stroke()
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
    async load_human_icon(id:number,icon:string,color:number):Promise<void>{
        const fill=ColorM.number2hex(color)
        const stroke=ColorM.number2hex(ColorM.number_mul_hsv(color,-3,undefined,0.5))

        const svg=this.map_icons[icon]
        if(!svg)return

        const image=new Image()
        image.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg.replaceAll("var(--image-fill)",fill).replaceAll("var(--image-stroke)",stroke))

        try{
            await image.decode()
        }catch{
            return
        }
        
        if(!this.humans_ins.has(id))return
        const hi=this.humans_ins.get(id)!
        if(hi?.old_icon!==icon||hi.old_tint!==color)return
        hi.image=image
    }
    enable(){
        this.enabled=true
    }
    disable(){
        this.enabled=false
    }
    toggle(){
        this.enabled=!this.enabled
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

    add_ping(position:Vec2,def:PingDef,color:string,id?:number){
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
    async load_ping_icon(icon:string,color:string):Promise<HTMLImageElement|undefined>{
        const svg=this.map_icons[icon]
        if(!svg)return

        const image=new Image()
        image.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg.replaceAll("var(--image-color)",color))

        try{
            await image.decode()
        }catch{
            return
        }

        return image
    }
    override on_signal(signal:string,data:any):void{
        switch(signal){
            case "private":
                for(const p of (data as PrivateUpdate).pings){
                    this.add_ping(p.position,this.game.definitions.ping.getFromNumber(p.def),ColorM.number2hex(p.color),p.id)
                }
                break
            case "actiondown":
                switch(data.action){
                    case "toggle_hide_device":
                        this.toggle()
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
        if(!this.enabled&&!this.fullscreen){
            HideElement(this.canvas)
            return
        }
        ShowElement(this.canvas)
        this.render(dt)
    }
    override on_destroy():void{}
    override on_clear():void{
        this.pings.length=0
    }
}