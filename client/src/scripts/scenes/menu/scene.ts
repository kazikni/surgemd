import { ShowElement } from "common/engine/web.ts";
import { BaseGEL, random, Scene } from "common/engine/core.ts";
import { type Application } from "../../main/app.ts";
import { CBackgrounds, CFeaturedLinks, CPopup, CSocialLinks, CTabs, CVersion } from "./components.ts";
import { MenuInitDefault } from "./def.ts";
import { backgrounds } from "common/scripts/config/background_effect.ts";
import { socials, sources } from "../../main/config.ts";

export class MenuScene extends Scene{
    declare app:Application
    menu:HTMLDivElement=document.querySelector("#menu") as HTMLDivElement

    gel:BaseGEL

    popup!:CPopup

    background?:CBackgrounds
    featured_links?:CFeaturedLinks
    version?:CVersion
    social?:CSocialLinks

    constructor(){
        super()
        this.gel=new BaseGEL()
        this.gel.__owner=this
    }

    override async on_init(){
        super.on_init()

        await this.app.resources.load_sound("menu_music",{src:sources.menu_music})

        this.background=new CBackgrounds(backgrounds.city_river)
        this.gel.add_component(this.background)

        this.featured_links=new CFeaturedLinks()
        this.featured_links.set_links([
            {
                name:"Content Creators",
                class:"btn-blue partner content-creator",
                content:[
                    random.choose([
                        {name:"Kazikni",url:"https://youtube.com/@kazikni"},
                        {name:"Namerio",url:"https://youtube.com/@namerio1"},
                    ]),
                ]
            },
            {
                name:"Partners",
                class:"btn-blue partner",
                content:[
                    {name:"Resurviv.biz",url:"https://resurviv.biz"}
                ]
            }
        ])
        this.gel.add_component(this.featured_links)

        this.version=new CVersion()
        this.gel.add_component(this.version)

        this.social=new CSocialLinks(socials)
        this.gel.add_component(this.social)
        
        this.popup=new CPopup()
        this.gel.add_component(this.popup)

        await this.app.update_api()

        const main=new CTabs()
        MenuInitDefault(main,this)
        this.gel.add_component(main)
    }
    override on_set(){
        ShowElement(this.menu)
        const c=this.app.sounds.controllers["music"]
        c?.set?.(this.app.resources.get_sound("menu_music"),{loop:true})
    }
    override on_unset(){
        ShowElement(this.menu)
    }
}