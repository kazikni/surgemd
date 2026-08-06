import { AudioInput, DecodedAudio } from "../core/lang/audiosheet.ts";
async function runFFmpeg(executable: string,args: string[],stdin?: Uint8Array):Promise<Uint8Array> {
    const child = new Deno.Command(executable, {args,stdin: stdin ? "piped" : "null",stdout: "piped",stderr: "piped"}).spawn()
    const stdinTask = (async () => {
        if (!stdin) return
        const writer = child.stdin.getWriter()
        try {
            const CHUNK = 64 * 1024
            for(let i = 0; i < stdin.length; i += CHUNK) {
                await writer.write(stdin.subarray(i, Math.min(stdin.length, i + CHUNK)))
            }
        } finally {
            await writer.close()
        }
    })()

    const stdoutTask = child.stdout.bytes()
    const stderrTask = child.stderr.bytes()
    const statusTask = child.status

    const [_, stdout, stderr, status] = await Promise.all([
        stdinTask,
        stdoutTask,
        stderrTask,
        statusTask,
    ])
    if (!status.success) {
        throw new Error(new TextDecoder().decode(stderr));
    }
    return new Uint8Array(stdout)
}
function codecForExtension(ext: string): {format: string;codec?: string;extra: string[]}{
    switch (ext.toLowerCase()) {
        case "ogg":
            return {
                format: "ogg",
                codec: "libvorbis",
                extra: ["-q:a", "4"]
            }
        case "mp3":
            return {
                format: "mp3",
                codec: "libmp3lame",
                extra: ["-q:a", "2"]
            }
        case "wav":
            return {
                format: "wav",
                codec: "pcm_s16le",
                extra: []
            }
        case "flac":
            return {
                format: "flac",
                codec: "flac",
                extra: []
            }
        default:
            throw new Error(`Unsupported format "${ext}"`)
    }
}
export class FFmpegDecoder implements AudioDecoder {
    constructor(public readonly executable = "ffmpeg",public readonly sampleRate = 44100,public readonly channels = 2){}
    async decode(audio: AudioInput): Promise<DecodedAudio> {
        const bytes = await runFFmpeg(this.executable,[
            "-hide_banner",
            "-loglevel", "error",

            "-i", "-",

            "-vn",

            "-ar", this.sampleRate.toString(),
            "-ac", this.channels.toString(),

            "-f", "s16le",
            "-"
        ],audio.data)
        return {
            pcm: new Int16Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/2),
            sampleRate: this.sampleRate,
            channels: this.channels,
        } as DecodedAudio
    }
}
export class FFmpegEncoder implements AudioEncoder {
    constructor(public readonly executable = "ffmpeg") {}
    async encode(audio: DecodedAudio,extension:string):Promise<Uint8Array> {
        const cfg = codecForExtension(extension)
        const pcm = new Uint8Array(audio.pcm.buffer,audio.pcm.byteOffset,audio.pcm.byteLength)
        const args = [
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
        ]
        return (await runFFmpeg(this.executable,args,pcm)) as Uint8Array
    }
}