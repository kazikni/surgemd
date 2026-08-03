import { FileManager } from "../definition/file.ts";
import { Path } from "../math/utils.ts";
import { Stream } from "../net/stream.ts";

export interface AudioSheet{
    codec:"ogg"
    duration:number
    sampleRate:number
    channels:number
    audio: Uint8Array
    sounds: Record<string, AudioSheetPart>
}
export interface AudioInput {
    name: string
    extension: string
    data: Uint8Array
}
export interface DecodedAudio {
    pcm: Int16Array          // PCM S16LE
    sampleRate: number
    channels: number
}
export interface AudioSheetPart {
    name: string
    startSample: number
    sampleCount: number
}
export interface AudioSheetSource extends DecodedAudio{
    name: string
}
export interface MergedPCM extends DecodedAudio {
    entries: AudioSheetPart[]
}
export interface AudioDecoder{
    decode(audio: AudioInput):Promise<DecodedAudio>
}
export interface AudioEncoder{
    encode(audio: DecodedAudio,extension:string):Promise<Uint8Array>
}

export const audios={
    concatPCM(buffers: readonly AudioSheetSource[]): MergedPCM {
        if(buffers.length === 0)throw new Error("No audio.")
        const sampleRate = buffers[0].sampleRate
        const channels = buffers[0].channels
        let totalSamples = 0
        for (const b of buffers) {
            if(b.sampleRate !== sampleRate)throw new Error("Different sample rate.")
            if(b.channels !== channels)throw new Error("Different channels.")
            totalSamples += b.pcm.length
        }
        const pcm = new Int16Array(totalSamples)
        const entries: AudioSheetPart[]=[]
        let offset = 0
        for (const b of buffers) {
            pcm.set(b.pcm, offset)
            entries.push({
                name: b.name,
                startSample: offset / channels,
                sampleCount: b.pcm.length / channels
            })
            offset += b.pcm.length
        }
        return {
            pcm,
            sampleRate,
            channels,
            entries
        }
    },
    is_audio(path: string): boolean {
        return /\.(mp3|ogg|wav|flac)$/i.test(path);
    },
    async read_recursive(fs: FileManager,dir: string,base = dir): Promise<AudioInput[]> {
        const result: AudioInput[] = []
        for (const name of await fs.list_dir(dir)) {
            const full = dir+"/"+name
            if (!this.is_audio(name)) {
                try {
                    result.push(...await this.read_recursive(fs, full, base));
                    continue;
                } catch {
                }
            }
            if (!this.is_audio(name)) continue
            result.push({
                name: Path.filename(Path.basename(name)),
                extension: Path.extname(name),
                data: await fs.read_fileb(full)
            })
        }
        return result
    },
    async compile(decoder: AudioDecoder,encoder: AudioEncoder,inputs: AudioInput[],output_extension:string="ogg"): Promise<AudioSheet> {
        const decoded: AudioSheetSource[]=[]
        for (const input of inputs){
            decoded.push({
                ...(await decoder.decode(input)),
                name: input.name
            })
        }
        const merged=this.concatPCM(decoded)
        const audio=await encoder.encode(merged,output_extension)
        const sounds: Record<string, AudioSheetPart>={}
        for(const e of merged.entries)sounds[e.name]=e
        return {
            codec: "ogg",
            sampleRate: merged.sampleRate,
            channels: merged.channels,
            duration:merged.pcm.length/merged.channels/merged.sampleRate,
            audio,
            sounds
        }
    },
    async compile_group(fs: FileManager,decoder: AudioDecoder,encoder: AudioEncoder,input: string): Promise<AudioSheet> {
        const files = await this.read_recursive(fs, input)
        files.sort((a,b) =>a.name.localeCompare(b.name))
        return await this.compile(decoder,encoder,files)
    },
    write_definitions(stream:Stream,sheet:AudioSheet){
        stream.write_string_sized(".KSND", 5)
        .write_uint16(0)
        .write_float32(sheet.sampleRate)
        .write_array(Object.keys(sheet.sounds),(v)=>{
            stream.write_string(v)
            .write_uint32(sheet.sounds[v].sampleCount)
            .write_uint32(sheet.sounds[v].startSample)
        },2)
    }
}