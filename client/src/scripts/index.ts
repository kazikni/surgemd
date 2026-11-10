import { WebglRenderer } from "common/engine/web/rendering/renderer.ts";
import { Application } from "./main/app.ts";
import "../scss/main.scss"
import { FetchFileManager } from "common/engine/core.ts";

const canvas=document.querySelector("#game-canvas") as HTMLCanvasElement
const renderer=new WebglRenderer(canvas)
const app = new Application(new FetchFileManager(),renderer)
app.bind()
app.mainloop(true)

if((import.meta as unknown as {env?:{DEV?:boolean}}).env?.DEV)(globalThis as unknown as {app:Application}).app=app
