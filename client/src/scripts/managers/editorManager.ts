import { HideElement, Key, ShowElement } from "common/engine/client.ts";
import { type Game } from "../others/game.ts";
import { Layers } from "common/scripts/others/constants.ts";
import { ColorM, v2 } from "common/engine/core.ts";

export class EditorManager{
    game:Game
    ui!:HTMLDivElement

    context_menu?:SMDEMenu

    objects_window!:SMDEWindow
    constructor(game:Game){
        this.game=game
    }
    mouse_position(elem:HTMLElement){
        elem.style.left=this.game.input_manager.real_mouse_position.x+"px"
        elem.style.top=this.game.input_manager.real_mouse_position.y+"px"
    }
    create_menu(){
        const menu=new SMDEMenu()
        menu.className="editor-menu"
        return menu
    }
    create_window(){
        const menu=new SMDEWindow()
        menu.className="editor-window"
        return menu
    }
    tick(dt:number){
        if(this.game.input_manager.keyDown(Key.Mouse_Middle)){
            if(this.context_menu)this.context_menu.remove()
            this.context_menu=this.create_menu()
                this.mouse_position(this.context_menu)

            const fm=this.create_menu()
            fm.add_option("Load")
            this.context_menu.add_submenu("File",fm)

            const wm=this.create_menu()
            wm.add_option("Objects",()=>{
                this.objects_window.style.display=""
                this.mouse_position(this.objects_window)
            })
            wm.add_option("Terrain")
            this.context_menu.add_submenu("Windows",wm)

            this.context_menu.add_option("Close",()=>this.game.close_game())

            this.ui.appendChild(this.context_menu)
        }
    }
    start(){
        HideElement(this.game.ui.content.game_gui)
        HideElement(this.game.ui.content.post_proccess.tiltshift)
        HideElement(this.game.ui.content.post_proccess.vignetting)

        this.game.cam2d.layer=Layers.Normal
        this.game.cam2d.position=v2(0,0)
        this.game.terrain.clear()
        this.game.terrain.draw(this.game.terrain_gfx,Layers.Normal)

        this.game.ui_gfx.ctx.fill_color=ColorM.hex("#fff8")
        this.game.ui_gfx.ctx.circle(v2.zero,0.25)
        this.game.ui_gfx.ctx.fill()

        this.ui=document.createElement("div")
        this.ui.classList="game-editor-ui"
        document.body.appendChild(this.ui)

        this.objects_window=this.create_window()
        this.objects_window.id="editor-objects-window"
        this.objects_window.addEventListener("close",(e:CustomEvent)=>{
            e.preventDefault()
            this.objects_window.style.display="none"
        })
        this.objects_window.innerHTML=`
<div class="background-menu" id="objects">
<div>`
        this.objects_window.style.display="none"
        this.ui.appendChild(this.objects_window)
    }
    close(){
        ShowElement(this.game.ui.content.game_gui)
    }
}