import { ColorM,HideElement,ShowElement,UIModule,v2,v2m,Vec2 } from "common/engine/client.ts"
import { Game } from "../others/game.ts"
import { MapHumanData, PrivateUpdate } from "common/scripts/packets/update_packet.ts"
import { PingDef } from "common/scripts/definitions/loadout/ping.ts"
type MinimapPing = {
    id:number

    pos:Vec2
    def:PingDef

    color:string

    duration:number
    time:number

    pulseTime:number

    el?:HTMLDivElement
    pulse?:HTMLDivElement
}
interface MapHumansInstance{
    e:HTMLDivElement
    pos:Vec2
    old_tint:number
    old_icon:string
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

    container!:HTMLDivElement
    viewport!:HTMLDivElement

    tilesLayer!:HTMLDivElement
    pingsLayer!:HTMLDivElement

    deadzoneEl!:HTMLDivElement
    deadzoneDestEl!:HTMLDivElement
    deadzoneLineEl!:HTMLDivElement

    humansLayer!:HTMLDivElement
    humans_ins = new Map<number, MapHumansInstance>()

    humans:MapHumanData[]=[]

    mapWidth=0
    mapHeight=0

    pings:MinimapPing[]=[]

    map_icons:Record<string,string>={}

    override on_init(): void {
        this.container=document.querySelector("#ui-map") as HTMLDivElement
        this.viewport=this.container.querySelector(".map-viewport") as HTMLDivElement
        this.tilesLayer=this.container.querySelector(".map-tiles") as HTMLDivElement
        this.pingsLayer=this.container.querySelector(".map-pings") as HTMLDivElement
        this.humansLayer=this.container.querySelector(".map-humans") as HTMLDivElement
        this.deadzoneEl=this.container.querySelector(".map-deadzone") as HTMLDivElement
        this.deadzoneDestEl=this.container.querySelector(".map-deadzone-dest") as HTMLDivElement
        this.deadzoneLineEl=this.container.querySelector(".map-deadzone-safe-line") as HTMLDivElement

        this.load_map_icon("normal","/img/menu/gui/map/map_icon_normal.svg")
        this.load_map_icon("downed","/img/menu/gui/map/map_icon_downed.svg")
    }

    async load_map_icon(id:string,path:string){
        this.map_icons[id]=await (await fetch(path)).text()
    }

    build_tiles(){
        const minimap=this.game.minimap
        this.tilesLayer.innerHTML=""
        let maxW=0
        let maxH=0
        for(const tile of minimap.tiles.values()){
            const img=document.createElement("img")
            img.className="map-tile"
            img.draggable=false
            img.src=tile.image.src
            const px=tile.position.x*minimap.tile_size_px
            const py=tile.position.y*minimap.tile_size_px
            img.style.left=px+"px"
            img.style.top=py+"px"
            this.tilesLayer.appendChild(img)
            maxW=Math.max(maxW,px+tile.image.width)
            maxH=Math.max(maxH,py+tile.image.height)
        }
        this.mapWidth=maxW
        this.mapHeight=maxH
        this.viewport.style.width=maxW+"px"
        this.viewport.style.height=maxH+"px"
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
        this.container.classList.toggle("fullscreen",this.fullscreen)
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

    centerOnPlayer(){
        const p=this.game.active_entity?.position
        if(!p)return

        const pos=this.worldToMap(p.x,p.y)

        const cw=this.container.clientWidth
        const ch=this.container.clientHeight

        const ox=(cw*0.5)-(pos.x*this.zoom)
        const oy=(ch*0.5)-(pos.y*this.zoom)

        this.scale=this.zoom
        this.viewport.style.transform=`translate(${ox}px,${oy}px) scale(${this.zoom})`
    }
    fitEntireMap(){
        const cw=this.container.clientWidth
        const ch=this.container.clientHeight
        const zoom=Math.min(
            cw/this.mapWidth,
            ch/this.mapHeight
        )
        const ox=(cw-this.mapWidth*zoom)*0.5
        const oy=(ch-this.mapHeight*zoom)*0.5
        this.scale=zoom
        this.viewport.style.transform=`translate(${ox}px,${oy}px) scale(${zoom})`
    }
    updateTransform(){
        if(this.fullscreen){
            this.fitEntireMap()
        }else{
            this.centerOnPlayer()
        }
    }
    async add_ping(position:Vec2,def:PingDef,color:string,id?:number){
        const ping:MinimapPing={
            id:id??Math.random(),
            pos:v2.clone(position),
            def,
            color,
            duration:def.lifetime??-1,
            time:0,
            pulseTime:0
        }
        const el=document.createElement("div")
        el.className="map-ping"
        el.innerHTML=`
            <div class="map-ping-pulse"></div>
            <div class="map-ping-icon">${await(await fetch(`/img/menu/gui/pings/${def.idString}.svg`)).text()}</div>
        `
        ping.el=el
        ping.pulse=el.querySelector(".map-ping-pulse") as HTMLDivElement
        this.pingsLayer.appendChild(el)
        this.pings.push(ping)
        this.updatePingVisual(ping)
    }
    updatePingVisual(p:MinimapPing){
        if(!p.el)return
        const pos=this.worldToMap(p.pos.x,p.pos.y)
        p.el.style.setProperty("--ping-color",p.color)
        p.el.style.setProperty("--px",`${pos.x}px`)
        p.el.style.setProperty("--py",`${pos.y}px`)
        p.el.style.scale=`${(1/this.scale)*100}%`
        if(p.pulse){
            const size=(7*p.pulseTime)+"px"
            p.pulse.style.width=size
            p.pulse.style.height=size
            p.pulse.style.opacity=Math.max(100-p.pulseTime,0)+"%"
        }
    }
    updatePings(dt:number){
        for(let i=this.pings.length-1;i>=0;i--){
            const p=this.pings[i]
            if(p.pulseTime<100){
                p.pulseTime+=dt*15
            }
            if(p.duration>=0){
                p.time+=dt
                if(p.time>=p.duration){
                    p.el?.remove()
                    this.pings.splice(i,1)
                    continue
                }
            }
            this.updatePingVisual(p)
        }
    }
    updateHumans(){
        const alive = new Set<number>()
        for(const human of this.humans){
            alive.add(human.id)
            let hi = this.humans_ins.get(human.id)
            if(!hi){
                const el = document.createElement("div")
                el.className = "map-human"
                this.humansLayer.appendChild(el)
                hi={
                    e:el,
                    pos:human.position,
                    old_tint:-1,
                    old_icon:""
                }
                this.humans_ins.set(human.id, hi)
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
                color=0x2233aa
            }
            if(human.downed){
                icon="downed"
            }
            if(icon!==hi.old_icon&&this.map_icons[icon]){
                hi.e.innerHTML=this.map_icons[icon]
            }
            if(color!==hi.old_tint){
                hi.old_tint=color
                hi.e.style.setProperty("--icon-fill",ColorM.number2hex(color))
                hi.e.style.setProperty("--icon-stroke",ColorM.number2hex(ColorM.number_mul_hsv(color,-3,undefined,0.5)))
            }

            v2m.lerp(hi.pos,human.position,this.game.global_interpolation)
            const pos = this.worldToMap(hi.pos.x,hi.pos.y)
            hi.e.style.left = pos.x + "px"
            hi.e.style.top = pos.y + "px"
            hi.e.style.transform=`translate(-50%, -50%) scale(${size/this.scale})`
        }
        for(const [id,h] of this.humans_ins){
            if(!alive.has(id)){
                h.e.remove()
                this.humans_ins.delete(id)
            }
        }
    }
    updateDeadzone(){
        const dz=this.game.dead_zone
        if(!dz){
            this.deadzoneEl.style.display="none"
            this.deadzoneDestEl.style.display="none"
            this.deadzoneLineEl.style.display="none"
            return
        }

        const ms=this.game.minimap.meter_size
        const pos=v2(dz.position.x*ms,dz.position.y*ms)
        const dest=v2(dz.dest_position.x*ms,dz.dest_position.y*ms)
        const r=dz.radius*ms
        const dr=dz.dest_radius*ms
        this.deadzoneEl.style.display=""
        this.deadzoneDestEl.style.display=""
        this.deadzoneEl.style.setProperty("--dx",`${pos.x}px`)
        this.deadzoneEl.style.setProperty("--dy",`${pos.y}px`)
        this.deadzoneEl.style.setProperty("--dr",`${r*2}px`)
        this.deadzoneEl.style.setProperty("--deadzone-color",ColorM.rgba2hex(dz.color))
        this.deadzoneDestEl.style.setProperty("--dx",`${dest.x}px`)
        this.deadzoneDestEl.style.setProperty("--dy",`${dest.y}px`)
        this.deadzoneDestEl.style.setProperty("--dr",`${dr*2}px`)
        this.updateSafeLine()
    }
    updateSafeLine(){
        const player=this.game.active_entity?.position
        const dz=this.game.dead_zone
        if(!player||!dz){
            this.deadzoneLineEl.style.display="none"
            return
        }
        const ms=this.game.minimap.meter_size
        const px=player.x*ms
        const py=player.y*ms
        const zx=dz.dest_position.x*ms
        const zy=dz.dest_position.y*ms
        const dx=zx-px
        const dy=zy-py
        const len=Math.sqrt(dx*dx+dy*dy)
        if(len<5){
            this.deadzoneLineEl.style.display="none"
            return
        }
        const ang=Math.atan2(dy,dx)*180/Math.PI
        this.deadzoneLineEl.style.display="block"
        this.deadzoneLineEl.style.left=`${px}px`
        this.deadzoneLineEl.style.top=`${py}px`
        this.deadzoneLineEl.style.width=`${len}px`
        this.deadzoneLineEl.style.transform=`translateY(-50%) rotate(${ang}deg)`
        this.deadzoneLineEl.style.height=((1/this.scale)*5)+"px"
    }
    override on_signal(signal:string,data:any):void{
        switch(signal){
            case "private":
                for(const p of (data as PrivateUpdate).pings){
                    this.add_ping(p.position,this.game.definitions.ping.getFromNumber(p.def),ColorM.number2hex(p.color),p.id)
                }
                this.humans=(data as PrivateUpdate).map_humans
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
            case "minimap":{
                this.build_tiles()
            }
        }
    }
    override on_update(dt:number):void{
        if(this.enabled||this.fullscreen){
            ShowElement(this.container)
            this.updateTransform()
            this.updateDeadzone()
            this.updatePings(dt)
            this.updateHumans()
        }else{
            HideElement(this.container)
        }
    }
    override on_destroy():void{}
    override on_clear():void{
        this.pingsLayer.innerHTML=""
        this.pings.length=0
        this.humans.length=0
    }
}