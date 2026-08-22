import { spawn } from "node:child_process";
import {
    AudioDecoder,
    AudioEncoder,
    AudioInput,
    DecodedAudio
} from "../core/lang/audiosheet.ts";

function runFFmpeg(
    executable: string,
    args: string[],
    stdin?: Uint8Array
): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        const child = spawn(executable, args, {
            stdio: ["pipe", "pipe", "pipe"]
        });

        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];

        child.stdout.on("data", d => stdout.push(d));
        child.stderr.on("data", d => stderr.push(d));

        child.on("error", reject);

        child.on("close", code => {
            if (code !== 0) {
                reject(new Error(Buffer.concat(stderr).toString()));
                return;
            }

            resolve(
                new Uint8Array(Buffer.concat(stdout))
            );
        });

        if (stdin) {
            child.stdin.write(stdin);
        }

        child.stdin.end();
    });
}

function codecForExtension(ext: string): {
    format: string;
    codec?: string;
    extra: string[];
} {
    switch (ext.toLowerCase()) {
        case "ogg":
            return {
                format: "ogg",
                codec: "libvorbis",
                extra: ["-q:a", "4"]
            };

        case "mp3":
            return {
                format: "mp3",
                codec: "libmp3lame",
                extra: ["-q:a", "2"]
            };

        case "wav":
            return {
                format: "wav",
                codec: "pcm_s16le",
                extra: []
            };

        case "flac":
            return {
                format: "flac",
                codec: "flac",
                extra: []
            };

        default:
            throw new Error(`Unsupported format "${ext}"`);
    }
}

export class FFmpegDecoder implements AudioDecoder {
    constructor(
        public readonly executable = "ffmpeg",
        public readonly sampleRate = 44100,
        public readonly channels = 2
    ) {}

    async decode(audio: AudioInput): Promise<DecodedAudio> {
        const bytes = await runFFmpeg(
            this.executable,
            [
                "-hide_banner",
                "-loglevel", "error",

                "-i", "-",

                "-vn",

                "-ar", this.sampleRate.toString(),
                "-ac", this.channels.toString(),

                "-f", "s16le",
                "-"
            ],
            audio.data
        );

        return {
            pcm: new Int16Array(
                bytes.buffer,
                bytes.byteOffset,
                bytes.byteLength / 2
            ),
            sampleRate: this.sampleRate,
            channels: this.channels
        };
    }
}

export class FFmpegEncoder implements AudioEncoder {
    constructor(
        public readonly executable = "ffmpeg"
    ) {}

    async encode(
        audio: DecodedAudio,
        extension: string
    ): Promise<Uint8Array> {
        const cfg = codecForExtension(extension);

        const pcm = new Uint8Array(
            audio.pcm.buffer,
            audio.pcm.byteOffset,
            audio.pcm.byteLength
        );

        return await runFFmpeg(
            this.executable,
            [
                "-hide_banner",
                "-loglevel", "error",

                "-f", "s16le",

                "-ar", audio.sampleRate.toString(),
                "-ac", audio.channels.toString(),

                "-i", "-",

                "-vn",

                ...(cfg.codec ? ["-c:a", cfg.codec] : []),
                ...cfg.extra,

                "-f", cfg.format,
                "-"
            ],
            pcm
        );
    }
}