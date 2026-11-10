import { CutsceneCommand, Scene } from "common/engine/core.ts";
import { CutsceneManager } from "common/engine/web/misc/cutscene.ts";
import { type Application } from "../../main/app.ts";
import { default_cutscene_theme } from "common/scripts/config/background_effect.ts";
import { HideElement, ShowElement } from "common/engine/web.ts";

export class CutsceneScene extends Scene{
    declare app:Application

    manager!:CutsceneManager
    div:HTMLDivElement=document.createElement("div")

    override on_init(): void {
        this.div.id="history-overlay"
        HideElement(this.div)
        document.body.appendChild(this.div)

        this.manager=new CutsceneManager(this.app.resources,this.app.sounds,this.app.input,this.app.translation)
        this.manager.initialize(this.div)
        this.manager.default_theme=default_cutscene_theme
    }

    override on_set(): void {
        ShowElement(this.div)
        this.manager.clear_content()
    }
    override on_unset(): void {
        this.manager.clear_content()
        HideElement(this.div)
    }

    show_cutscene(cutscene:CutsceneCommand[],time_scale?:number){
        return this.manager.play(cutscene,time_scale)
    }
}