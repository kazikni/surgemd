
import * as fs from "node:fs/promises";
import { open, FileHandle as NodeFile } from "node:fs/promises";

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
    async read_file(path: string): Promise<string> {
        return await fs.readFile(path, "utf8");
    }

    async write_file(path: string, content: string): Promise<void> {
        await fs.writeFile(path, content, "utf8");
    }

    async read_fileb(path: string): Promise<Uint8Array> {
        return new Uint8Array(await fs.readFile(path));
    }

    async write_fileb(path: string, content: Uint8Array): Promise<void> {
        await fs.writeFile(path, content);
    }

    async list_dir(path: string): Promise<string[]> {
        return await fs.readdir(path);
    }

    async open(
        path: string,
        mode: "r" | "w" | "rw"
    ): Promise<FileHandle> {
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