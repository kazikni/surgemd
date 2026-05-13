import { FileHandle, FileManager } from "../../core/definition/file.ts";
import { NetStream } from "../../core/net/stream.ts";

export class BrowserFileHandle extends FileHandle {
    private data: Uint8Array
    private offset = 0

    constructor(data: Uint8Array) {
        super()
        this.data = data
    }

    async read(buffer: Uint8Array): Promise<number> {
        const remaining = this.data.length - this.offset
        if (remaining <= 0) return 0

        const toRead = Math.min(buffer.length, remaining)

        buffer.set(
            this.data.subarray(this.offset, this.offset + toRead),
            0
        )

        this.offset += toRead
        return toRead
    }

    async write(_data: Uint8Array): Promise<void> {
        throw new Error("BrowserFileHandle is read-only")
    }

    async seek(position: number): Promise<void> {
        this.offset = position
    }

    async close(): Promise<void> {
    }

    async flush(): Promise<void> {
    }
}
export class BrowserFileManager extends FileManager {
    private files = new Map<string, Uint8Array>()

    async registerFile(name: string, file: File) {
        const buf = await file.arrayBuffer()
        this.files.set(name, new Uint8Array(buf))
    }

    async read_file(path: string): Promise<string> {
        const data = this.files.get(path)
        if (!data) throw new Error("File not found")
        return NetStream.decoder.decode(data)
    }

    async write_file(): Promise<void> {
        throw new Error("write not supported")
    }

    async read_fileb(path: string): Promise<Uint8Array> {
        const data = this.files.get(path)
        if (!data) throw new Error("File not found")
        return data
    }

    async write_fileb(): Promise<void> {
        throw new Error("write not supported")
    }

    async list_dir(): Promise<string[]> {
        return Array.from(this.files.keys())
    }

    async open(path: string, _mode: "r" | "w" | "rw"): Promise<FileHandle> {
        const data = this.files.get(path)
        if (!data) throw new Error("File not found")

        return new BrowserFileHandle(data)
    }
}