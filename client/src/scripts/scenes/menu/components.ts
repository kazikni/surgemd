import {
BackgroundEDef,
    gel_events,
    DynamicGELComponent,
} from "common/engine/core.ts";

import { HideElement, ShowTab } from "common/engine/web.ts";
import { BackgroundManager } from "common/engine/web/misc/background.ts";
import { type  MenuScene } from "./scene.ts";
import { game_version } from "common/scripts/config/config.ts";

export const menu_events={
}

interface Partner{name:string,url:string,class?:string}

export interface mtctx{menu:MenuScene,c:CTabs}

export type SubMenuOption={
    type: "button";
    id: string;
    name: string;
    subtab?: string;
    onclick?: (e: MouseEvent) => void;
}|{
    type: "label";
    name: string;
};

export type MenuSubTabDef = {
    generate: (parent: HTMLDivElement,ctx:mtctx) => void;
    on_open?: (parent: HTMLDivElement) => void;
    on_close?: (parent: HTMLDivElement) => void;
};

export interface MenuTabDef {
    name: string;
    id: string;
    options: (SubMenuOption | undefined)[];
    subtabs: Record<string, MenuSubTabDef>;
    on_open?: () => void;
    on_close?: () => void;
}

export interface PopupCTX {
    parent: HTMLDivElement;
    scene: MenuScene;
    resolve: (value?: unknown) => void;
    close: () => void;
}

export type PopupFunction = (ctx: PopupCTX) => void;

interface ActivePopup {
    overlay: HTMLDivElement;
    close: () => void;
}
interface MenuTab {
    def: MenuTabDef;
    element: HTMLDivElement;
    button: HTMLButtonElement;
    options: HTMLDivElement;
    content: HTMLDivElement;
    subtabs: Record<string, HTMLDivElement>;
    current_subtab: string;
}

export class CBackgrounds extends DynamicGELComponent<MenuScene>{
    content:HTMLDivElement
    manager:BackgroundManager

    constructor(def: BackgroundEDef|undefined){
        super()

        this.content=document.createElement("div")
        this.content.id="menu-background"

        this.make_event(gel_events.bind,"on_bind")
        this.make_event(gel_events.unbind,"on_unbind")

        this.manager=new BackgroundManager()
        this.manager.initialize(this.content)
        this.manager.set_def(def)
    }

    on_bind(v:MenuScene){
        v.menu.appendChild(this.content)
        this.manager.show()
    }
    on_unbind(_v:MenuScene){
        this.content.remove()
    }
}
export class CTabs extends DynamicGELComponent<MenuScene> {
    options_element = document.createElement("div");
    content_element = document.createElement("div");

    tabs: Record<string, MenuTab> = {};
    current_tab = "";

    constructor() {
        super();

        this.make_event(gel_events.bind, "on_bind");
        this.make_event(gel_events.unbind, "on_unbind");

        this.options_element.id = "menu-options";
        this.content_element.id = "menu-content";
    }

    on_bind(scene: MenuScene) {
        scene.menu.append(this.options_element, this.content_element);
        this.options_element.style.opacity="1"
    }

    on_unbind(_scene: MenuScene) {
        this.close_tab();
        this.options_element.remove();
        this.content_element.remove();
    }

    set_tabs(definitions: (MenuTabDef | undefined)[],scene:MenuScene) {
        this.close_tab();
        const ctx={c:this,menu:scene}

        this.tabs = {};
        this.current_tab = "";

        this.options_element.replaceChildren();
        this.content_element.replaceChildren();

        const logo = document.createElement("img");
        logo.id = "title-section";
        logo.src = "/assets/img/menu/logos/title.svg";
        logo.draggable = false;
        this.options_element.appendChild(logo);

        for (const def of definitions) {
            if (!def) continue;

            const button = document.createElement("button");
            button.id = `${def.id}-menu-option`;
            button.className = "btn-blue menu-options-btn";
            button.textContent = scene.app.translation.get(def.name)
            button.onclick = () => this.load_tab(def.id);

            this.options_element.appendChild(button);

            const element = document.createElement("kl-md-submenu") as HTMLDivElement;
            element.id = `menu-${def.id}-submenu`;
            element.className = "md-menu-game";
            element.style.display = "none";
            element.style.userSelect = "none";

            const options = document.createElement("kl-md-submenu-options") as HTMLDivElement;
            const content = document.createElement("kl-md-submenu-content") as HTMLDivElement;

            const close = document.createElement("button");
            close.className = "close-btn submenu-close-btn btn-red";
            close.textContent = "X";
            close.onclick = () => this.load_tab("");

            const title = document.createElement("span");
            title.className = "tab-title span-text-base";
            title.textContent = scene.app.translation.get(def.name);

            element.append(options, content, close, title);
            this.content_element.appendChild(element);

            const subtabs: Record<string, HTMLDivElement> = {};

            for (const id of Object.keys(def.subtabs)) {
                const panel = document.createElement("div");
                panel.id = `${def.id}-${id}-sm-extra`;
                panel.className = "background-menu-md menu-panel-blue";
                panel.style.display = "none";

                def.subtabs[id].generate(panel,ctx);
                subtabs[id] = panel;
                content.appendChild(panel);
            }

            const tab: MenuTab = {
                def,
                element,
                button,
                options,
                content,
                subtabs,
                current_subtab: "",
            };

            for (const option of def.options) {
                if (!option) continue;

                if (option.type === "label") {
                    const label = document.createElement("p");
                    label.className = "span-text-base";
                    label.textContent = scene.app.translation.get(option.name);
                    options.appendChild(label);
                    continue;
                }

                const button = document.createElement("button");
                button.id = `btn-${def.id}-${option.id}`;
                button.className = "btn-blue";
                button.textContent = scene.app.translation.get(option.name);

                button.onclick = (event) => {
                    if (option.subtab) {
                        this.load_subtab(def.id, option.subtab);
                    }

                    option.onclick?.(event);
                };

                options.appendChild(button);
            }

            this.tabs[def.id] = tab;

            const first_subtab = Object.keys(subtabs)[0];
            if (first_subtab) {
                this.load_subtab(def.id, first_subtab);
            }
        }
    }

    load_tab(id: string) {
        this.close_tab();

        if(!id) {
            this.options_element.style.opacity = "1";
            this.options_element.style.pointerEvents = "";
            return;
        }

        const tab = this.tabs[id];
        if (!tab) return;

        this.current_tab = id;

        ShowTab(id, {
            [id]: tab.element,
        }, true);

        tab.element.style.display = "";
        this.options_element.style.opacity = "0";
        this.options_element.style.pointerEvents = "none";

        tab.def.on_open?.();
    }

    close_tab() {
        if (!this.current_tab) return;

        const tab = this.tabs[this.current_tab];
        if (tab) {
            tab.def.on_close?.();
            HideElement(tab.element,true)
        }

        this.current_tab = "";
    }

    load_subtab(tab_id: string, id: string) {
        const tab = this.tabs[tab_id];
        if (!tab || !tab.subtabs[id]) return;

        if (tab.current_subtab) {
            const previous = tab.current_subtab;
            tab.def.subtabs[previous]?.on_close?.(
                tab.subtabs[previous],
            );

            tab.subtabs[previous].style.display = "none";
        }

        tab.current_subtab = id;
        tab.subtabs[id].style.display = "";

        tab.def.subtabs[id].on_open?.(tab.subtabs[id]);
    }
}
export class CFeaturedLinks extends DynamicGELComponent<MenuScene>{
    content:HTMLDivElement

    constructor(){
        super()

        this.make_event(gel_events.bind,"on_bind")
        this.make_event(gel_events.unbind,"on_unbind")

        this.content=document.createElement("div")
        this.content.id="featured-links"
        this.content.className="span-text"
    }
    set_links(links:{content:Partner[],name:string,class:string}[]=[]){
        let val=""
        for(const l of links){
            if(l.content.length===0)continue
            val+="<h2>"+l.name+"</h2>"
            for(const li of l.content){
                val+=`<div class="${l.class+" "+(li.class??"")}" onclick="location.href='${li.url}'">${li.name}</div>`
            }
        }
        this.content.innerHTML=val
    }

    on_bind(v:MenuScene){
        v.menu.appendChild(this.content)
    }
    on_unbind(_v:MenuScene){
        this.content.remove()
    }

}
export class CSocialLinks extends DynamicGELComponent<MenuScene>{
    content:HTMLDivElement

    constructor(socials:Record<string,string>){
        super()

        this.make_event(gel_events.bind,"on_bind")
        this.make_event(gel_events.unbind,"on_unbind")

        this.content=document.createElement("div")
        this.content.id="main-social"
        this.content.className="social-links span-text"

        
        let social_links=`
<a href="${socials.discord}" target="_blank" class="social-link">
    <i class="social-icon discord"></i>
</a>
<a href="${socials.youtube}" target="_blank" class="social-link">
    <i class="social-icon youtube"></i>
</a>
<a href="${socials.github}" target="_blank" class="social-link">
    <i class="social-icon github"></i>
</a>`

        this.content.innerHTML=social_links
        /*if(!is_binary){
            if(is_mobile()){
                social_links+=`
<a href="${socials.android}" target="_blank" class="social-link">
    <i class="social-icon android"></i>
</a>`
            }else if(navigator.userAgent.match(/linux/i)){
                social_links+=`
<a href="${socials.linux}" target="_blank" class="social-link">
    <i class="social-icon linux"></i>
</a>`
            }else{
                social_links+=`
<a href="${socials.windows}" target="_blank" class="social-link">
    <i class="social-icon windows"></i>
</a>`
            }
        }*/
    }

    on_bind(v:MenuScene){
        v.menu.appendChild(this.content)
    }
    on_unbind(_v:MenuScene){
        this.content.remove()
    }
}
export class CVersion extends DynamicGELComponent<MenuScene>{
    content:HTMLDivElement

    clicks=0
    click_last:number=0

    constructor(){
        super()

        this.make_event(gel_events.bind,"on_bind")
        this.make_event(gel_events.unbind,"on_unbind")

        this.content=document.createElement("p")
        this.content.id="game-version"
        this.content.className="span-text"
    }

    on_bind(v:MenuScene){
        v.menu.appendChild(this.content)

        const debug_mode=v.app.save.settings.get_var("debug_enabled")
        this.content.addEventListener("pointerdown",(e)=>{
            const now=performance.now()
            if(now-this.click_last>4000){
                this.clicks=0
            }
            if(this.clicks===0){
                this.click_last=performance.now()
            }

            this.clicks++
            if(this.clicks>10){
                v.app.save.settings.set_var("debug_enabled",!debug_mode)
                self.location.reload()
            }
        })
        this.content.innerText=game_version+(debug_mode?"-Debug":"")
    }
    on_unbind(_v:MenuScene){
        this.content.remove()
    }
}

export class CPopup extends DynamicGELComponent<MenuScene> {
    private scene?: MenuScene;
    private active = new Set<ActivePopup>();

    constructor() {
        super();

        this.make_event(gel_events.bind, "on_bind");
        this.make_event(gel_events.unbind, "on_unbind");
    }

    on_bind(scene: MenuScene) {
        this.scene = scene;
    }

    on_unbind(_scene: MenuScene) {
        for (const popup of [...this.active]) {
            popup.close();
        }

        this.scene = undefined;
    }

    popup<T>(
        content: (ctx: PopupCTX) => void,
    ): Promise<T> {
        const scene = this.scene;

        if (!scene) {
            return Promise.reject(
                new Error("Popup component is not bound to a scene."),
            );
        }

        return new Promise<T>((resolve) => {
            const overlay = document.createElement("div");
            overlay.className = "game-popup-overlay";
            overlay.style.opacity = "0";

            const popup = document.createElement("div");
            popup.className = "game-popup menu-panel-blue";

            overlay.appendChild(popup);
            document.body.appendChild(overlay);

            let finished = false;

            const finish=(value?:T) => {
                if (finished) return;
                finished = true;
                this.active.delete(activePopup);
                overlay.style.opacity = "0";
                setTimeout(() => {
                    overlay.remove();
                }, 200);
                resolve(value!);
            };

            const activePopup: ActivePopup = {
                overlay,
                close: () => finish(undefined),
            };

            this.active.add(activePopup);

            const ctx: PopupCTX = {
                parent: popup,
                scene,

                resolve: (value) => {
                    finish(value as T | undefined);
                },

                close: () => {
                    finish(undefined);
                },
            };

            try {
                content(ctx);
            } catch (error) {
                finish(undefined);
                console.error("Failed to create popup:", error);
            }

            requestAnimationFrame(() => {
                if (!finished) {
                    overlay.style.opacity = "1";
                }
            });
        });
    }
}