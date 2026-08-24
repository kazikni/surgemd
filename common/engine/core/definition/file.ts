import { Path } from "../mod.ts";

export abstract class FileHandle {
    abstract write(data: Uint8Array): Promise<void>
    abstract seek(position: number): Promise<void>
    abstract close(): Promise<void>
    abstract flush(): Promise<void>
}
export abstract class FileManager{
    abstract is_directory(path:string):boolean

    abstract read_file(path:string):Promise<string>
    abstract write_file(path:string,content:string):Promise<void>

    abstract read_fileb(path:string):Promise<Uint8Array>
    abstract write_fileb(path:string,content:Uint8Array):Promise<void>

    abstract list_dir(path:string):Promise<string[]>
    abstract open(path: string, mode: "r" | "w" | "rw"): Promise<FileHandle>

    async list_dir_recursive(path:string,base:string=""):Promise<string[]>{
        const ret:string[]=[]
        const files=await this.list_dir(Path.join_simple(base,path))
        for(const p of files){
            const name=Path.join_simple(path,p)
            if(this.is_directory(Path.join_simple(base,name))){
                ret.push(...await (this.list_dir_recursive(name,base)))
            }else{
                ret.push(name)
            }
        }
        return ret
    }
}

export class FetchFileManager extends FileManager {
    base:string="/"
    override is_directory(path: string): boolean {
        return false
    }
    async read_file(path: string): Promise<string> {
        const res = await fetch(Path.join(this.base,path))
        if (!res.ok) throw new Error(`read_file failed: ${res.status}`)
        return await res.text()
    }
    async write_file(path: string, content: string): Promise<void> {
        const res = await fetch(Path.join(this.base,path), {
            method: "PUT",
            body: content,
            headers: { "Content-Type": "text/plain" }
        })
        if (!res.ok) throw new Error(`write_file failed: ${res.status}`)
    }
    async read_fileb(path: string): Promise<Uint8Array> {
        const res = await fetch(Path.join(this.base,path))
        if (!res.ok) throw new Error(`read_fileb failed: ${res.status}`)
        const buf = await res.arrayBuffer()
        return new Uint8Array(buf)
    }
    async write_fileb(path: string, content: Uint8Array): Promise<void> {
        const res = await fetch(Path.join(this.base,path), {
            method: "PUT",
            body: content,
            headers: { "Content-Type": "application/octet-stream" }
        })
        if (!res.ok) throw new Error(`write_fileb failed: ${res.status}`)
    }
    async list_dir(_path: string): Promise<string[]> {
        throw new Error("list_dir not supported over HTTP")
    }
    async open(path: string, mode: "r" | "w" | "rw"): Promise<FileHandle> {
        throw new Error("FetchFileManager Dont Support Open")
    }
}