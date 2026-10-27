import { PingDef } from "common/scripts/definitions/loadout/pings.ts";
import { GameApp } from "../managers/deviceManager.ts";
import { ColorM, v2, Vec2 } from "common/engine/web.ts";
import { PrivateUpdate } from "common/scripts/packets/update_packet.ts";
type MapPing={
    id:number

    def:PingDef
    pos:Vec2

    time:number
    duration:number

    color:string

    el?:HTMLDivElement
    icon_el?:HTMLImageElement

    pulseTime:number
}
export class MapApp extends GameApp {
    mapViewport!:HTMLDivElement
    mapInner!:HTMLDivElement
    mapTiles!:HTMLDivElement

    deadzoneEl!:HTMLDivElement
    deadzoneDestEl!:HTMLDivElement
    deadzoneLineEl!:HTMLDivElement

    pingsLayer!:HTMLDivElement

    dragging=false
    lastMouse=v2(0,0)

    zoom=1
    zoom_input!:HTMLInputElement

    followPlayer=true
    offset=v2(0,0)

    pings:MapPing[]=[]

    constructor(){
        super({
            name:"Map",
            icon:"/assets/img/menu/gui/tab/icons/map.svg"
        })
    }

    on_init(){
        this.element.className="map-app"

        this.element.innerHTML=`
<div class="map-root">
    <div class="map-sidebar">
        <h2>Map Tools</h2>
        <div class="map-section">
            <label>Zoom</label>
            <input type="range" min="0.1" max="4" step="0.1" value="3" id="map-zoom">
        </div>
        <div class="map-section">
            <label class="checkbox">
                <input type="checkbox" id="map-follow-player" checked/>
                Follow Player
            </label>
        </div>
        <div class="map-section">
            <button class="btn-blue" id="map-center-player">Center Now</button>
        </div>
    </div>
    <div class="map-viewport">
        <div class="map-inner">
            <div class="map-tiles"></div>
            <div class="map-deadzone"></div>
            <div class="map-deadzone-dest"></div>
            <div class="map-deadzone-safe-line"></div>
            <div class="map-pings"></div>
            <div class="map-players"></div>
        </div>
    </div>
</div>`

        this.mapViewport=this.element.querySelector(".map-viewport") as HTMLDivElement
        this.mapInner=this.element.querySelector(".map-inner") as HTMLDivElement
        this.mapTiles=this.element.querySelector(".map-tiles") as HTMLDivElement

        const followChk=this.element.querySelector("#map-follow-player") as HTMLInputElement

        followChk.onchange=()=>{
            this.followPlayer=followChk.checked
        }

        this.zoom_input=this.element.querySelector("#map-zoom") as HTMLInputElement
        this.zoom_input.oninput=()=>{
            this.zoom=parseFloat(this.zoom_input.value)
            this.updateTransform()
        }

        let dragButton=-1

        this.mapViewport.onmousedown=(e)=>{
            dragButton=e.button
            if(e.button===0||e.button===2){
                this.dragging=true
                this.lastMouse=v2(e.clientX,e.clientY)
                this.followPlayer=false
                followChk.checked=false
            }
        }

        self.addEventListener("mouseup",()=>{
            this.dragging=false
            dragButton=-1
        })

        self.addEventListener("mousemove",(e)=>{
            if(!this.dragging)return
            if(dragButton!==0&&dragButton!==2)return

            const dx=e.clientX-this.lastMouse.x
            const dy=e.clientY-this.lastMouse.y

            this.offset.x+=dx
            this.offset.y+=dy

            this.lastMouse=v2(e.clientX,e.clientY)
            this.updateTransform()

            this.followPlayer=false
            followChk.checked=false
        })

        this.mapViewport.onwheel=(e)=>{
            e.preventDefault()
            const rect=this.mapViewport.getBoundingClientRect()
            const mx=e.clientX-rect.left
            const my=e.clientY-rect.top
            const before=v2((mx-this.offset.x)/this.zoom,(my-this.offset.y)/this.zoom)
            const delta=-e.deltaY*0.001
            const mapW=this.mapInner.clientWidth
            const mapH=this.mapInner.clientHeight
            const minZoom=Math.min(this.mapViewport.clientWidth/mapW,this.mapViewport.clientHeight/mapH)
            const maxZoom=4
            this.zoom=Math.min(maxZoom,Math.max(minZoom,this.zoom+delta))
            const after=v2(before.x*this.zoom+this.offset.x,before.y*this.zoom+this.offset.y)
            this.offset.x+=mx-after.x
            this.offset.y+=my-after.y
            this.updateTransform()
        }
        this.updateTransform()

        this.deadzoneEl=this.element.querySelector(".map-deadzone") as HTMLDivElement
        this.deadzoneDestEl=this.element.querySelector(".map-deadzone-dest") as HTMLDivElement
        this.deadzoneLineEl=this.element.querySelector(".map-deadzone-safe-line") as HTMLDivElement

        this.pingsLayer=this.element.querySelector(".map-pings") as HTMLDivElement
    }
    add_ping(position:Vec2,def:PingDef, color:string,id?:number){
        const ping:MapPing={
            id:id??Math.random(),
            def:def,
            pos:v2.clone(position),
            time:0,
            duration: def.lifetime ?? -1,
            color,
            pulseTime:0,
        }
        this.pings.push(ping)

        const el=document.createElement("div")
        el.className="map-ping"
        el.id="ping-"+ping.id
        el.innerHTML=`
<div class="map-ping-pulse"></div>
<img class="map-ping-icon" src="/assets/img/menu/gui/pings/${def.idString}.svg" draggable="false">`

        ping.el=el
        ping.icon_el=ping.el.querySelector(".map-ping-icon") as HTMLImageElement

        this.pingsLayer.appendChild(el)
        this.updatePingVisual(ping)
        this.device.game.sounds.play(this.device.game.resources.get_sound(def.idString+"_audio"))
    }
    updatePingVisual(p:MapPing){
        if(!p.el)return
        
        const m=this.worldToMap(p.pos.x,p.pos.y)

        p.el.style.setProperty("--ping-color",p.color)
        p.el.style.setProperty("--px",`${m.x}px`)
        p.el.style.setProperty("--py",`${m.y}px`)
    }
    updatePings(dt:number){
        for(let i=this.pings.length-1;i>=0;i--){
            const p=this.pings[i]
            if(p.duration>=0){
                p.time+=dt
                if(p.time>=p.duration){
                    p.el?.remove()
                    this.pings.splice(i,1)
                    continue
                }
            }

            p.pulseTime+=dt
            const pulse=p.pulseTime/(p.def.pulse?.duration??5)
            const pulseEl=p.el!.querySelector(".map-ping-pulse") as HTMLDivElement

            if(p.el){
                p.el.style.setProperty("--scale",`${1/this.zoom}`);
            }
            if(pulseEl){
                if(pulse>=1){
                    if(p.def.pulse?.infinity){
                        p.pulseTime=0
                    }else{
                        pulseEl.style.display="none"
                    }
                }

                const size=500*(p.def.pulse?.scale??1)

                pulseEl.style.width=(size*pulse)+"px"
                pulseEl.style.height=(size*pulse)+"px"

                pulseEl.style.opacity=(1-pulse).toString()
            }

            this.updatePingVisual(p)
        }
    }
    remove_ping(id:number){
        const i=this.pings.findIndex(p=>p.id===id)
        if(i<0)return

        this.pings[i].el?.remove()
        this.pings.splice(i,1)
    }
    clampOffset(){
        const vw=this.mapViewport.clientWidth
        const vh=this.mapViewport.clientHeight

        const mapW=this.mapInner.clientWidth*this.zoom
        const mapH=this.mapInner.clientHeight*this.zoom

        const minX=vw-mapW
        const minY=vh-mapH

        this.offset.x=Math.max(minX,Math.min(0,this.offset.x))
        this.offset.y=Math.max(minY,Math.min(0,this.offset.y))
    }
    updateTransform(){
        this.clampOffset()
        this.mapInner.style.transformOrigin="0 0"
        this.mapInner.style.transform=`translate(${this.offset.x}px,${this.offset.y}px) scale(${this.zoom})`
    }
    worldToMap(x:number,y:number){
        const ms=this.device.game.minimap.meter_size
        return {
            x:x*ms,
            y:y*ms
        }
    }
    centerOnPlayer(){
        const p=this.device.game.active_entity?.position
        if(!p) return

        const m=this.worldToMap(p.x,p.y)

        this.offset.x=-m.x*this.zoom+this.mapViewport.clientWidth/2
        this.offset.y=-m.y*this.zoom+this.mapViewport.clientHeight/2

        this.updateTransform()
    }
    updateDeadzone(){
        const dz=this.device.game.dead_zone
        if(!dz||dz.radius<=0){
            this.deadzoneEl.style.display="none"
            this.deadzoneDestEl.style.display="none"
            this.deadzoneLineEl.style.display="none"
            return
        }

        this.deadzoneEl.style.display="block"
        this.deadzoneDestEl.style.display="block"
        this.deadzoneLineEl.style.display="block"

        const ms=this.device.game.minimap.meter_size
        const pos=v2(dz.position.x*ms,dz.position.y*ms)

        const dest=v2(dz.dest_position.x*ms,dz.dest_position.y*ms)

        const r=dz.radius*ms
        const dr=dz.dest_radius*ms

        this.deadzoneEl.style.setProperty("--dx",`${pos.x}px`)
        this.deadzoneEl.style.setProperty("--dy", `${pos.y}px`)
        this.deadzoneEl.style.setProperty("--dr",`${r*2}px`)
        this.deadzoneEl.style.setProperty("--deadzone-color",`${ColorM.rgba2hex(this.device.game.dead_zone.color)}`)

        this.deadzoneDestEl.style.setProperty("--dx",`${dest.x}px`)
        this.deadzoneDestEl.style.setProperty("--dy", `${dest.y}px`)
        this.deadzoneDestEl.style.setProperty("--dr",`${dr*2}px`)

        this.updateSafeLine()
    }
    updateSafeLine(){
        const p=this.device.game.active_entity?.position
        const dz=this.device.game.dead_zone

        if(!p||!dz){
            this.deadzoneLineEl.style.display="none"
            return
        }

        const ms=this.device.game.minimap.meter_size

        const px=p.x*ms
        const py=p.y*ms

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
    }
    on_tick(dt:number){
        if(this.followPlayer){
            this.centerOnPlayer()
        }
        this.updateDeadzone()
        this.updatePings(dt)
    }

    on_open(){
        const minimap=this.device.game.minimap
        this.mapTiles.innerHTML=""
        let max_w=0
        let max_h=0
        for(const tile of minimap.tiles.values()){
            const img=document.createElement("img")
            img.className="map-tile"
            img.draggable=false
            img.src=tile.image.src
            const px=tile.position.x*minimap.tile_size_px
            const py=tile.position.y*minimap.tile_size_px
            img.style.left=px+"px"
            img.style.top=py+"px"
            this.mapTiles.appendChild(img)
            max_w=Math.max(max_w,px+img.width)
            max_h=Math.max(max_h,py+img.height)
        }
        this.mapInner.style.width=max_w+"px"
        this.mapInner.style.height=max_h+"px"
        requestAnimationFrame(()=>{
            const minZoom=this.mapViewport.clientHeight/max_h
            this.zoom_input.min=minZoom.toString()
            if(this.zoom<minZoom){
                this.zoom=minZoom
            }
            this.updateTransform()
        })
    }
    on_close(){}
    on_clear(){}
    on_event(type:string, data:PrivateUpdate){
        if(type!=="private")return

        for(const p of data.pings){
            this.add_ping(p.position,this.device.game.definitions.pings.getFromNumber(p.def),ColorM.number2hex(p.color),p.id)
        }
    }
}