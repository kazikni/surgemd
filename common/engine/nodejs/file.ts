
import * as fs from "fs";
import { open, FileHandle as NodeFile,readFile,writeFile,readdir,mkdir, } from "fs/promises";

import {
    FileHandle,
    FileManager
} from "../core/definition/file.ts";
export class NodeFileHandle extends FileHandle {
    constructor(
        public readonly file: NodeFile
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
        return readFile(path, "utf8")
    }
    write_file(path: string, content: string): Promise<void> {
        return writeFile(path, content, "utf8")
    }

    async read_fileb(path:string):Promise<Uint8Array> {
        return new Uint8Array(await readFile(path))
    }
    write_fileb(path:string,content:Uint8Array): Promise<void> {
        return writeFile(path, content)
    }

    list_dir(path: string): Promise<string[]> {
        return readdir(path);
    }
    override make_dir(path: string): Promise<void> {
        return mkdir(path)
    }
    override async exist(path: string): Promise<boolean> {
        try{
            await fs.promises.access(path)
            return true
        }catch{
            return false
        }
    }
    override is_directory(path: string): boolean {
        const stat = fs.statSync(path)
        return stat.isDirectory()
    }

    async open(path: string,mode: "r" | "w" | "rw"): Promise<FileHandle>{
        const flags =
            mode === "r"
                ? "r"
                : mode === "w"
                ? "w"
                : "r+";

        const file = await open(path, flags);
        return new NodeFileHandle(file);
    }
}