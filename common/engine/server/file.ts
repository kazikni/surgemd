import { FileManager } from "../core/definition/file.ts"

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
}