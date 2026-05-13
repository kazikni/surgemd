import { join } from "https://deno.land/std/path/mod.ts"
import { Router } from "common/engine/server.ts";
import { type ApiServer } from "../server.ts";
export interface NewsData {
    title:string
    id:string
    content:string
}
export class NewsManager {
    data: NewsData[] = []
    expanded = new Map<string,string>()
    constructor(public api:ApiServer,public basePath:string){}
    async load(){
        const mainPath = join(this.basePath,"main.json")
        const raw = await Deno.readTextFile(mainPath)
        const json = JSON.parse(raw)
        this.data.length = 0
        this.expanded.clear()
        for(const entry of json.order){
            const contentPath = join(
                this.basePath,
                "content",
                `${entry.id}.md`
            )
            let content = ""
            try{
                content = await Deno.readTextFile(contentPath)
            }catch{}
            this.data.push({
                title:entry.title,
                id:entry.id,
                content
            })
            const expandedPath = join(
                this.basePath,
                "expanded",
                `${entry.id}.md`
            )
            try{
                const expanded = await Deno.readTextFile(expandedPath)
                this.expanded.set(entry.id,expanded)
            }catch{}
        }
    }
    getExpanded(id:string){
        return this.expanded.get(id)
    }
    route(router:Router){
        router.route("/news/get", () => {
            return this.api.server.default_handlers.cors(
                Response.json(this.data)
            )
        })
    }
}