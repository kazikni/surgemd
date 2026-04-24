import { FileHandle, FileManager } from "../core/definition/file.ts"
export class DenoFileHandle extends FileHandle {
    file: Deno.FsFile

    constructor(file: Deno.FsFile) {
        super()
        this.file = file
    }

    async write(data: Uint8Array) {
        let offset = 0
        while (offset < data.length) {
            const written = await this.file.write(data.subarray(offset))
            offset += written ?? 0
        }
    }

    async seek(position: number) {
        await this.file.seek(position, Deno.SeekMode.Start)
    }
    async close() {
        this.file.close()
    }
    async flush() {
        await this.file.sync()
    }
}
export class DenoFileManager extends FileManager {
    async read_file(path: string): Promise<string> {
        return await Deno.readTextFile(path)
    }
    async write_file(path: string, content: string): Promise<void> {
        await Deno.writeTextFile(path, content)
    }
    async read_fileb(path: string): Promise<Uint8Array> {
        return await Deno.readFile(path)
    }
    async write_fileb(path: string, content: Uint8Array): Promise<void> {
        await Deno.writeFile(path, content)
    }
    async list_dir(path: string): Promise<string[]> {
        const out: string[] = []
        for await (const entry of Deno.readDir(path)) {
            out.push(entry.name)
        }
        return out
    }
    async open(path: string, mode: "r" | "w" | "rw"): Promise<FileHandle> {
        const file = await Deno.open(path, {
            read: mode.includes("r"),
            write: mode.includes("w"),
            create: mode!=="r",
            truncate: mode === "w"
        })

        return new DenoFileHandle(file)
    }
}