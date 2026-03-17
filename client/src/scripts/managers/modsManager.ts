import { ModContext, ModManifest, ModsManager } from "common/engine/core/definition/modsManager.ts";
import { MenuManager } from "./menuManager.ts";
import { Game } from "../others/game.ts";
import {MDModModule, ModResult} from "common/scripts/others/mods.ts"
import {md_make_globals} from "common/scripts/others/mod_globals.ts"
export class CModsManager extends ModsManager<ModManifest,Game,ModContext<Game,ModManifest>,ModResult,MDModModule<Game,ModContext<Game,ModManifest>,ModResult>>{
    override make_globals(): Record<string, any> {
        return {
            ...md_make_globals(),
            ...super.make_globals(),
        }
    }
    menu_manage(p:HTMLDivElement,menu:MenuManager){
        p.innerHTML=""
        for(const mod of this.getAll()){
            const m=document.createElement("div")
            m.className="mod-root background-menu"
            m.innerHTML=`
<h1>${mod.name}</h1>
<h3>${mod.version}</h3>
${mod.author?`<h3>Author: ${mod.author}</h3>`:""}
${mod.description?`<p>${mod.description}</p>`:""}
<button class="${this.isEnabled(mod.id)?"btn-red":"btn-green"}">${this.isEnabled(mod.id)?"Disable":"Enable"}</button>
`
            const btn=m.querySelector("button") as HTMLButtonElement
            btn.onclick=(e)=>{
                this.toggle(mod.id)
                this.menu_manage(p,menu)
            }
            p.appendChild(m)
        }
    }
}