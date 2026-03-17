import { FileManager } from "common/engine/client.ts";

export const is_binary =typeof window.go_is_binary_version==="undefined"?false:await window.go_is_binary_version()
if (is_binary) {
    console.log("Running as desktop binary")
}
export class GoFileManager extends FileManager {
    async read_file(path: string): Promise<string> {
        return await window.go_fs_readFile(path)
    }
    async write_file(path: string, content: string): Promise<void> {
        await window.go_fs_writeFile(path, content)
    }
    async read_fileb(path: string): Promise<Uint8Array> {
        const b64 = await window.go_fs_readFileB(path)
        const bin = atob(b64)
        const arr = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) {
            arr[i] = bin.charCodeAt(i)
        }
        return arr
    }
    async write_fileb(path: string, content: Uint8Array): Promise<void> {
        let bin = ""
        for (let i = 0; i < content.length; i++) {
            bin += String.fromCharCode(content[i])
        }
        const b64 = btoa(bin)
        await window.go_fs_writeFileB(path, b64)
    }
    async list_dir(path: string): Promise<string[]> {
        return await window.go_fs_listDir(path)
    }
}
export async function exec_cmd(command: string): Promise<string> {
    if (!is_binary) {
        throw new Error("exec_cmd avaliable only in desktop version")
    }

    return await window.go_exec_cmd(command)
}

export async function exec_server(
    port: number,
    mode: string,
    settings: object,
    password: string = ""
) {
    if (!is_binary) throw new Error("Desktop only")

    return await window.go_exec_server(
        port,
        mode,
        JSON.stringify(settings),
        password
    )
}

export async function stop_server() {
    if (!is_binary) throw new Error("Desktop only")
    return await window.go_stop_server()
}
let is_fullscreen=false
if(is_binary){
    document.addEventListener("keydown", e=>{
        if(e.key==="F11"){
            is_fullscreen=!is_fullscreen
            window.go_toggle_fullscreen(is_fullscreen)
        }
    })
}

export function set_full_screen(enable:boolean){
    if(is_binary){
        window.go_toggle_fullscreen(enable)
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