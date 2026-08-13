import {
    BackgroundEDef,
    BackgroundELayer,
    BackgroundELayerType
} from "common/scripts/config/background_effect.ts"

import {
    HideElement,
    ShowElement
} from "common/engine/web.ts"

interface BackgroundLayerInstance {
    def: BackgroundELayer
    element: HTMLDivElement
}

export class BackgroundManager {
    root!: HTMLDivElement
    background!: HTMLDivElement
    content!: HTMLDivElement

    current?: BackgroundEDef

    enabled=false
    time=0
    layers:BackgroundLayerInstance[] = []

    constructor(parent:HTMLElement=document.body) {
        this.create_html(parent)
    }

    private create_html(parent:HTMLElement) {
        this.root = document.createElement("div")
        this.root.className = "background-screen"
        this.root.innerHTML = `<div class="background-bg"></div><div class="background-content"></div>`
        parent.appendChild(this.root)
        this.background=this.root.querySelector(".background-bg") as HTMLDivElement
        this.content=this.root.querySelector(".background-content") as HTMLDivElement
        HideElement(this.root, true)
    }
    set_def(def: BackgroundEDef|undefined,timescale:number=1) {
        if(!def){
            this.clear()
            return
        }
        timescale*=(def.theme.timescale??1)
        this.current = def
        this.time = 0
        this.layers.length = 0
        this.background.innerHTML = ""
        this.content.innerHTML = ""
        this.root.className = "background-screen"

        if(def.theme.class_name){
            this.root.classList.add(...def.theme.class_name.split(/\s+/).filter(Boolean))
        }
        if(def.theme.css){
            this.root.style.cssText = def.theme.css
        }
        if(def.theme.accent!==undefined){
            this.root.style.setProperty("--background-accent",def.theme.accent)
        }
        for(const layer of def.layers){
            this.create_layer(this.background,layer,timescale)
        }
    }

    private create_layer(parent: HTMLDivElement,layer: BackgroundELayer,timescale:number=1): BackgroundLayerInstance {
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
            this.create_layer(element,c,timescale)
        }
        parent.appendChild(element)

        const instance: BackgroundLayerInstance={
            def: layer,
            element
        }
        this.layers.push(instance)
        return instance
    }
    async show() {
        if(!this.current)return
        ShowElement(this.root,true)
    }
    async hide() {
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
        this.background.innerHTML = ""
        this.content.innerHTML = ""
        this.layers.length = 0
        this.current = undefined
        this.time = 0
    }
}