import { TabApp, TabManager } from "../managers/tabManager.ts"
import { ColorM, v2, v2m, Vec2 } from "common/engine/client.ts"
import { Color } from "common/engine/client.ts"

type MapPlayer = {
    id:number
    pos: Vec2
    color: Color
}
type PlayerVisual = {
    el: HTMLDivElement
    id:number
    pos: Vec2 
    target: Vec2
    color: Color
}
export class MapTabApp extends TabApp {
    private mapImg!: HTMLImageElement
    private mapViewport!: HTMLDivElement
    private mapInner!: HTMLDivElement
    private playersLayer!: HTMLDivElement

    private zoom = 3
    private minZoom = 0.1
    private maxZoom = 4

    private offset = v2.new(0,0)
    private dragging = false
    private lastMouse = v2.new(0,0)

    private followPlayer = true
    private players: MapPlayer[] = []
    private visuals: Record<string,PlayerVisual> = {}

    private deadzoneEl!: HTMLDivElement
    private deadzoneDestEl!: HTMLDivElement

    constructor(tab: TabManager) {
        super("Map", "/img/menu/gui/tab/icons/map.svg", tab)
    }
    private updateDeadzone(){
        const dz = this.game.dead_zone

        if(!dz || dz.radius<=0)return

        const ms = this.tab.game.minimap.ms

        const pos = v2.new(
            dz.position.x/ms,
            dz.position.y/ms
        )

        const dest_pos = v2.new(
            dz.dest_position.x/ms,
            dz.dest_position.y/ms
        )

        const r = dz.radius/ms
        const dr = dz.dest_radius/ms

        this.deadzoneEl.style.setProperty('--dx',`${pos.x}px`)
        this.deadzoneEl.style.setProperty('--dy',`${pos.y}px`)
        this.deadzoneEl.style.setProperty('--dr',`${r*2}px`)
        this.deadzoneEl.style.boxShadow=`0 0 0 8000px ${ColorM.rgba2hex(this.game.dead_zone.color)}`
        
        this.deadzoneDestEl.style.setProperty('--dx',`${dest_pos.x}px`)
        this.deadzoneDestEl.style.setProperty('--dy',`${dest_pos.y}px`)
        this.deadzoneDestEl.style.setProperty('--dr',`${dr*2}px`)

    }
    override on_run(): void {
        this.element!.classList.add("tab-map-app")

        this.element!.innerHTML = `
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
                    <img class="map-image" draggable="false"/>
                    <div class="map-deadzone"></div>
                    <div class="map-deadzone-dest"></div>
                    <div class="map-players"></div>
                </div>
            </div>
        </div>
        `

        this.mapViewport  = this.element!.querySelector(".map-viewport")!
        this.mapInner     = this.element!.querySelector(".map-inner")!
        this.mapImg       = this.element!.querySelector(".map-image")!
        this.playersLayer = this.element!.querySelector(".map-players")!

        this.mapImg.src = this.tab.game.minimap.image.src

        this.minZoom=300/this.game.minimap.image.width

        this.deadzoneEl = this.element!.querySelector(".map-deadzone")!
        this.deadzoneDestEl = this.element!.querySelector(".map-deadzone-dest")!
        this.setupControls()
        this.updateTransform()

    }
    private clampOffset() {
        const vw = this.mapViewport.clientWidth
        const vh = this.mapViewport.clientHeight

        const img = this.mapImg

        const mapW = img.width  * this.zoom
        const mapH = img.height * this.zoom

        const margin = 100 * this.zoom

        const minX = vw - mapW - margin
        const maxX = margin

        const minY = vh - mapH - margin
        const maxY = margin

        this.offset.x = Math.max(minX, Math.min(maxX, this.offset.x))
        this.offset.y = Math.max(minY, Math.min(maxY, this.offset.y))
    }
    private setupControls() {
        const zoomInput = this.element!.querySelector("#map-zoom") as HTMLInputElement
        zoomInput.min=this.minZoom.toString()
        zoomInput.oninput = () => {
            this.zoom = parseFloat(zoomInput.value)
            this.updateTransform()
        }

        const followChk = this.element!.querySelector("#map-follow-player") as HTMLInputElement
        followChk.onchange = () => {
            this.followPlayer = followChk.checked
        }

        this.mapViewport.onwheel = (e) => {
            e.preventDefault()
            const delta = -e.deltaY * 0.0004
            this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom + delta))
            zoomInput.value = this.zoom.toString()
            this.updateTransform()
        }

        this.mapViewport.onmousedown = (e) => {
            this.dragging = true
            this.lastMouse = v2.new(e.clientX, e.clientY)
        }

        window.onmouseup = () => this.dragging = false

        window.onmousemove = (e) => {
            if (!this.dragging) return
            const dx = e.clientX - this.lastMouse.x
            const dy = e.clientY - this.lastMouse.y
            this.offset.x += dx
            this.offset.y += dy
            this.lastMouse = v2.new(e.clientX, e.clientY)
            this.updateTransform()
        }

        const centerBtn = this.element!.querySelector("#map-center-player")! as HTMLButtonElement
        centerBtn.onclick = () => this.centerOnPlayer()
    }

    private updateTransform() {
        this.clampOffset()

        this.mapInner.style.transform =
            `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.zoom})`

        const inv = 1 / this.zoom
        this.mapInner.style.setProperty('--inv-zoom', inv.toString())
    }

    private worldToMap(pos: Vec2): Vec2 {
        const ms = this.tab.game.minimap.ms
        return v2.new(pos.x / ms, pos.y / ms)
    }

    private centerOnWorld(pos: Vec2) {
        const m = this.worldToMap(pos)
        this.offset.x = -m.x * this.zoom + this.mapViewport.clientWidth  / 2
        this.offset.y = -m.y * this.zoom + this.mapViewport.clientHeight / 2
        this.updateTransform()
    }

    private centerOnPlayer() {
        const pos = this.tab.game.active_entity?.position
        if (!pos) return
        this.centerOnWorld(pos)
    }

    update_players(players: MapPlayer[]) {
        for (const p of players) {
            let v = this.visuals[p.id]

            if (!v) {
                const el = document.createElement("div")
                el.className = "map-player"
                this.playersLayer.appendChild(el)

                v = this.visuals[p.id] = {
                    el,
                    id: p.id,
                    pos: v2(p.pos.x, p.pos.y),
                    target: v2(p.pos.x, p.pos.y),
                    color: p.color
                }
            }

            v.target.x = p.pos.x
            v.target.y = p.pos.y
            v.color = p.color

            v.el.style.background =
                `rgba(${v.color.r*255},${v.color.g*255},${v.color.b*255},1)`
        }
    }

    override on_tick(dt: number): void {
        if (this.followPlayer) {
            const pos=this.tab.game.active_entity?.position
            if (pos)this.centerOnWorld(pos)
        }
        this.update_players([{
            id:this.game.active_entity_id??0,
            color:ColorM.number(0x3a6699),
            pos:this.game.active_entity?.position??v2.zero
        }])
        this.updateDeadzone()
        for (const id in this.visuals) {
            const v = this.visuals[id]
            v2m.lerp(v.pos,v.target,this.game.global_interpolation*1.2)
            const m = this.worldToMap(v.pos)
            v.el.style.setProperty('--px', `${m.x}px`)
            v.el.style.setProperty('--py', `${m.y}px`)
        }
    }

    override on_stop(): void {}
}