import {FileManager} from "common/engine/core.ts"
import { FileHandle } from "common/engine/core/definition/file.ts";
declare global{
    interface Window{
        electronAPI:{
            isBinary:()=>Promise<boolean>
            make_dir:(path:string)=>Promise<void>
            readFile:(path:string)=>Promise<string>
            writeFile:(path:string,content:string)=>Promise<void>
            readFileB:(path:string)=>Promise<string>
            writeFileB:(path:string,content:string)=>Promise<void>
            listDir:(path:string)=>Promise<string[]>
            fullscreen:(enable:boolean)=>Promise<void>
            exist:(path:string)=>Promise<boolean>
        }
    }
}
export const is_binary=typeof window.electronAPI==="undefined"?false:await window.electronAPI.isBinary()

export class BinFileManager extends FileManager{
    override open(path: string, mode: "r" | "w" | "rw"): Promise<FileHandle> {
      throw new Error("Method not implemented.");
    }
    override is_directory(path: string): boolean {
      throw new Error("Method not implemented.");
    }
    override make_dir(path: string): Promise<void> {
        return window.electronAPI.make_dir(path)
    }
    async read_file(path:string):Promise<string>{
        return await window.electronAPI.readFile(path)
    }
    async write_file(path:string,content:string):Promise<void>{
        await window.electronAPI.writeFile(path,content)
    }
    async read_fileb(path:string):Promise<Uint8Array>{
        const b64=await window.electronAPI.readFileB(path)
        const bin=atob(b64)
        const arr=new Uint8Array(bin.length)
        for(let i=0;i<bin.length;i++){
            arr[i]=bin.charCodeAt(i)
        }
        return arr
    }
    async write_fileb(path:string,content:Uint8Array):Promise<void>{
        let bin=""
        for(let i=0;i<content.length;i++){
            bin+=String.fromCharCode(content[i])
        }
        await window.electronAPI.writeFileB(path,btoa(bin))
    }
    async list_dir(path:string):Promise<string[]>{
        return await window.electronAPI.listDir(path)
    }

    override exist(path: string): Promise<boolean> {
        return window.electronAPI.exist(path)
    }
}

let is_fullscreen=false
export function set_full_screen(enable:boolean){
    is_fullscreen=enable
    if(is_binary){
        window.electronAPI.fullscreen(enable)
    }else{
        if(enable){
            if(!document.fullscreenElement){
                document.documentElement.requestFullscreen().catch(()=>{})
            }
        }else{
            if(document.fullscreenElement){
                document.exitFullscreen().catch(()=>{})
            }
        }
    }
}
if(is_binary){
    document.addEventListener("keydown", e=>{
        if(e.key==="F11"){
            is_fullscreen=!is_fullscreen
            set_full_screen(is_fullscreen)
        }
    })
}