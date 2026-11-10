
import * as fs from "fs";

import {
    FileHandle,
    FileManager
} from "../core/definition/file.ts";
export class NodeFileHandle extends FileHandle {
    constructor(
        public readonly file: fs.promises.FileHandle
    ) {
        super();
    }

    async write(data: Uint8Array) {
        let offset = 0;

        while (offset < data.length) {
            const { bytesWritten } =
                await this.file.write(
                    data,
                    offset,
                    data.length - offset
                );

            offset += bytesWritten;
        }
    }

    async seek(position: number) {
        await this.file.seek(position, 0);
    }
    async close() {
        await this.file.close();
    }
    async flush() {
        await this.file.sync();
    }
}

export class NodeFileManager extends FileManager {
    read_file(path: string): Promise<string> {
        return fs.promises.readFile(path, "utf8")
    }
    write_file(path: string, content: string): Promise<void> {
        return fs.promises.writeFile(path, content, "utf8")
    }

    async read_fileb(path:string):Promise<Uint8Array> {
        return new Uint8Array(await fs.promises.readFile(path))
    }
    write_fileb(path:string,content:Uint8Array): Promise<void> {
        return fs.promises.writeFile(path, content)
    }

    list_dir(path: string): Promise<string[]> {
        return fs.promises.readdir(path)
    }
    make_dir(path: string): Promise<void> {
        return fs.promises.mkdir(path,{recursive:true}) as Promise<void>
    }

    async exist(path: string): Promise<boolean> {
        try{
            await fs.promises.stat(path)
            return true
        }catch{
            return false
        }
    }
    async is_directory(path: string): Promise<boolean> {
        try{
            const stat=await fs.promises.stat(path)
            return stat.isDirectory()
        }catch(e){
            return false
        }
    }
    async is_file(path: string): Promise<boolean> {
        try{
            const stat=await fs.promises.stat(path)
            return stat.isFile()
        }catch(e){
            return false
        }
    }

    async open(path: string,mode: "r" | "w" | "rw"): Promise<FileHandle>{
        const flags =
            mode === "r"
                ? "r"
                : mode === "w"
                ? "w"
                : "r+";

        return new NodeFileHandle(await fs.promises.open(path, flags))
    }
    override remove(path: string): Promise<void> {
        return fs.promises.unlink(path)
    }
}