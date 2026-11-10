import { random, Scene } from "common/engine/core.ts";
import { type Application } from "../main/app.ts";

export class LoadingScreenScene extends Scene{
    declare app:Application
    loading_screen=document.querySelector("#loading-screen") as HTMLDivElement
    loading_screen_current:HTMLDivElement
    loading_screen_logo:HTMLDivElement

    images:[string,string,Blob][]=[]

    constructor(){
        super()
        this.loading_screen_current=this.loading_screen.querySelector("#loading-current") as HTMLDivElement
        this.loading_screen_logo=this.loading_screen.querySelector("#loading-screen-logo") as HTMLDivElement
    }

    override on_init(){
        super.on_init()
    }

    override on_set(){
        this.change_loading_screen()
        this.set_current("Start")

        this.loading_screen.style.opacity="1"
        this.loading_screen.style.pointerEvents="all"
    }
    override on_unset(){
        this.loading_screen.style.opacity="0"
        this.loading_screen.style.pointerEvents="none"
    }

    change_loading_screen(){
        if(this.images.length === 0)return
        const v=random.choose(this.images)
        this.loading_screen.style.backgroundImage=`url(${v[0]})`
    }
    set_current(text:string,unloading=false){
        this.loading_screen_current.textContent=text
        //this.content.loading_screen_current.innerHTML=`<p class="span-medium">${this.translation.get("menu.loading-screen."+(unloading?"unload":"load"),{text:text})}</p>`
    }

    async preload_loading_screens(paths: string[]) {
        for(const l of this.images){
            URL.revokeObjectURL(l[0])
        }
        this.images.length=0
        for(const path of paths){
            try {
                const response = await fetch(path)
                if (!response.ok) {
                    throw new Error(`${response.status} ${response.statusText}`)
                }
                const b=await response.blob()
                const url=URL.createObjectURL(b)
                this.images.push([url,path,b])
            } catch (e) {
                console.warn("Failed to preload loading screen:", path, e)
                return undefined
            }
        }
    }
}