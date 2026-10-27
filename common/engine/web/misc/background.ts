import { BackgroundEDef, BackgroundELayer, BackgroundELayerType, BackgroundTransitionType } from "../../core/definition/utils.ts";
import { HideElement, ShowElement } from "./utils.ts";

interface BackgroundLayerInstance {
    def: BackgroundELayer
    element: HTMLDivElement
}
interface BackgroundInstance {
    def: BackgroundEDef
    element: HTMLDivElement
    layers: BackgroundLayerInstance[]
}
export class BackgroundManager {
    root!: HTMLDivElement
    background!: HTMLDivElement
    content!: HTMLDivElement

    current?: BackgroundEDef

    enabled=false
    time=0
    layers:BackgroundLayerInstance[] = []

    constructor() {
    }
    initialize(root:HTMLDivElement) {
        this.root=root
        this.root.innerHTML = `<div class="background-bg"></div><div class="background-content"></div>`
        this.background=this.root.querySelector(".background-bg") as HTMLDivElement
        this.content=this.root.querySelector(".background-content") as HTMLDivElement
        HideElement(this.root, true)
    }
    set_def(def: BackgroundEDef|undefined,timescale: number=1){
        this.clear()
        if(!def){
            return
        }
        timescale *= def.theme.timescale ?? 1
        const instance=this.create_background(def,timescale)

        this.background.appendChild(instance.element)

        this.current = def
        this.layers = instance.layers
    }
    private create_background(def: BackgroundEDef,timescale: number): BackgroundInstance {
        const element = document.createElement("div")

        element.className = "background-instance"

        element.style.position = "absolute"
        element.style.inset = "0"
        element.style.overflow = "hidden"

        const instance: BackgroundInstance={
            def,
            element,
            layers: []
        }

        if(def.theme.class_name){
            element.classList.add(...def.theme.class_name.split(/\s+/).filter(Boolean))
        }
        if(def.theme.css){
            element.style.cssText += def.theme.css
        }
        if(def.theme.accent !== undefined){
            element.style.setProperty("--background-accent",def.theme.accent)
        }
        if(def.inner_html){
            element.insertAdjacentHTML("afterbegin",def.inner_html)
        }

        for(const layer of def.layers){
            this.create_layer(element,layer,instance,timescale)
        }

        element.style.position = "absolute"
        element.style.inset = "0"
        element.style.overflow = "hidden"
        return instance
    }
    private create_layer(parent: HTMLDivElement,layer: BackgroundELayer,bg_instance:BackgroundInstance,timescale:number=1): BackgroundLayerInstance {
        const element=document.createElement("div")

        element.className=`background-object ${layer.class_name ?? ""}`
        element.style.position = "absolute"
        element.style.bottom="0"
        if(layer.css)element.style.cssText += layer.css

        if(layer.top!==undefined)element.style.top=`${layer.top}vw`
        if(layer.bottom!==undefined)element.style.bottom=`${layer.bottom}vw`
        if(layer.left!==undefined)element.style.left=`${layer.left}vw`
        if(layer.right!==undefined)element.style.right=`${layer.right}vw`

        if(layer.type === BackgroundELayerType.Tile){
            element.style.width="500%"
            element.style.left="-200%"
            element.style.right="0"
            element.style.backgroundRepeat="repeat no-repeat"
            element.style.backgroundSize="auto 100%"
            element.style.animation=`scroll-right-animation ${500/(layer.speed*timescale)}s linear infinite`
            if(layer.size){
                element.style.height=`${layer.size}vw`
            }
        }else{
            //element.style.width="100%"
            //element.style.height="100%"
            //if(layer.size)element.style.backgroundSize=`${layer.size}vh ${layer.size}vh`
        }
        for(const c of (layer.childs??[])){
            this.create_layer(element,c,bg_instance,timescale)
        }
        parent.appendChild(element)

        const instance: BackgroundLayerInstance={
            def: layer,
            element
        }
        bg_instance.layers.push(instance)
        return instance
    }
    show() {
        if(!this.current)return
        ShowElement(this.root,true)
        this.enabled=true
    }
    hide() {
        this.enabled = false
        HideElement(this.root)
    }

    update(dt: number) {
        if(!this.enabled)return
        if(!this.current)return
        this.time += dt
        for (const layer of this.layers) {
            if(layer.def.type!==BackgroundELayerType.Tile){
                continue
            }
        }
    }
    clear() {
        this.current=undefined
        this.time = 0
        this.layers.length = 0
        this.background.innerHTML = ""
        this.content.innerHTML = ""
        this.root.className = "background-screen"
        this.root.style.cssText=""
    }
    
    async transition(def: BackgroundEDef|undefined,type:BackgroundTransitionType=BackgroundTransitionType.CrossFade,duration: number=1,timescale: number = 1): Promise<void> {
        if(!def){
            await this.transition_out(duration)
            return
        }
        timescale*=def.theme.timescale ?? 1

        const old=this.background.querySelector(".background-instance") as HTMLDivElement|null
        const next=this.create_background(def,timescale)

        next.element.style.opacity = "0"
        if(old){
            old.style.opacity = "1"
        }
        this.background.appendChild(next.element)
        next.element.getBoundingClientRect()

        if(type===BackgroundTransitionType.None){
            if(old){
                old.remove()
            }
            this.current = def
            this.layers = next.layers
            return
        }

        if(type === BackgroundTransitionType.Fade){
            await this.fade_transition(next.element, old,duration)
        }else if(type === BackgroundTransitionType.CrossFade){
            await this.crossfade_transition(next.element,old,duration)
        }

        if(old){
            old.remove()
        }

        this.current = def
        this.layers = next.layers
    }

    async transition_out(duration: number = 1): Promise<void> {
        const old=this.background.querySelector(".background-instance")as HTMLDivElement|null
        if(!old){
            this.current = undefined
            this.layers.length = 0
            return
        }
        await this.animate_opacity(old,1,0,duration)
        old.remove()
        this.current = undefined
        this.layers.length = 0
    }
    private async fade_transition(next: HTMLDivElement,old: HTMLDivElement | null,duration: number): Promise<void> {
        if(old){
            await this.animate_opacity(old,1,0,duration/2)
            await this.animate_opacity(next,0,1,duration/2)
        }else{
            await this.animate_opacity(next,0,1,duration)
        }
    }
    private async crossfade_transition(next: HTMLDivElement,old: HTMLDivElement | null,duration: number): Promise<void> {
        next.style.opacity = "0"
        if(old){
            old.style.opacity = "1"
        }
        await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()))
        const animations: Promise<void>[] = []
        animations.push(this.animate_opacity(next,0,1,duration))
        if(old){
            animations.push(this.animate_opacity(old,1,0,duration))
        }
        await Promise.all(animations)
    }

    private animate_opacity(element: HTMLElement,from: number,to: number,duration: number): Promise<void> {
        return new Promise(resolve => {
            element.style.opacity = String(from)
            const animation = element.animate(
                [{ opacity: from },{ opacity: to }],
                {duration: duration*1000,easing: "ease-in-out",fill: "forwards"}
            )
            animation.onfinish = () => {
                element.style.opacity = String(to)
                resolve()
            }
            animation.oncancel = () => {
                resolve()
            }
        })
    }
}