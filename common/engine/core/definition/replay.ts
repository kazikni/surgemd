import { type AbstractGame } from "../game/game.ts";
import { NetStream } from "../net/stream.ts";
import { type FileHandle } from "./file.ts";

export interface RecordedReplay{
    header:{
        version:number
        frame_count:number
    }
    frames:NetStream[]
}
export class ReplayRecorder {
    game: AbstractGame<any>

    recording = false
    file?: FileHandle
    frameCount = 0

    tickRate:number
    version = 1

    private sizeBuf = new Uint8Array(4)
    private sizeView = new DataView(this.sizeBuf.buffer)

    frame_generator?: (r: ReplayRecorder,full:boolean) => NetStream

    constructor(
        game: AbstractGame<any>,
        frame_generator?: (r: ReplayRecorder,full:boolean) => NetStream,
        tick_rate:number=32
    ) {
        this.game = game
        this.frame_generator = frame_generator
        this.tickRate=tick_rate
    }

    /* ================= RECORD ================= */
    async startRecording(file: FileHandle, loadStream?: NetStream) {
        this.recording = true
        this.file = file
        this.frameCount = 0

        const header = new Uint8Array(32)
        const view = new DataView(header.buffer)

        header.set(NetStream.encoder.encode(".REPL"), 0)

        view.setUint16(5, this.version, true)
        view.setUint8(7, this.tickRate)
        view.setUint32(8, 0, true)

        await this.file.write(header)

        if (loadStream) {
            const data = new Uint8Array(loadStream._u8Array.slice(0, loadStream.length))

            this.sizeView.setUint32(0, data.length, true)

            await this.file.write(this.sizeBuf)
            await this.file.write(data)
        } else {
            this.sizeView.setUint32(0, 0, true)
            await this.file.write(this.sizeBuf)
        }
    }
    async stopRecording() {
        this.recording = false
        if (!this.file) return

        await this.file.seek(8)

        const buf = new Uint8Array(4)
        new DataView(buf.buffer).setUint32(0, this.frameCount, true)

        await this.file.write(buf)

        await this.file.close()
        this.file = undefined
    }
    async updateRecord() {
        if (!this.recording || !this.file) return

        let stream: NetStream
        if (this.frame_generator) {
            stream = this.frame_generator(this, this.frameCount===0)
        } else {
            stream = this.game.scene_2d.objects.encode_all(true)
        }

        const data = new Uint8Array(stream._u8Array.slice(0, stream.length))

        this.sizeView.setUint32(0, data.length, true)

        await this.file.write(this.sizeBuf)
        await this.file.write(data)

        this.frameCount++

        if (this.frameCount % 60 === 0) {
            await this.file.flush()
        }
    }
    async update(){
        await this.updateRecord()
    }
    stop() {
    }
}
export class ReplayWatcher {
    file?: FileHandle

    version = 0
    tickRate = 60
    frameCount = 0

    currentFrame = 0
    playing = false

    interval?: number

    on_frame?: (frame: NetStream, index: number) => void
    on_load?: (stream: NetStream|null) => void
    on_finish?: () => void

    private sizeBuf = new Uint8Array(4)
    private sizeView = new DataView(this.sizeBuf.buffer)

    async load(file: FileHandle) {
        this.file = file

        const header = new Uint8Array(32)
        await this.readExact(header)

        const view = new DataView(header.buffer)

        const magic = new TextDecoder().decode(header.slice(0, 5))
        if (magic !== ".REPL") {
            throw new Error("Invalid replay")
        }

        this.version = view.getUint16(5, true)
        this.tickRate = view.getUint8(7)
        this.frameCount = view.getUint32(8, true)

        await this.readExact(this.sizeBuf)
        const size = this.sizeView.getUint32(0, true)

        let loadStream: NetStream | null = null

        if (size > 0) {
            const data = new Uint8Array(size)
            await this.readExact(data)
            loadStream = new NetStream(data.buffer)
        }

        if (this.on_load) {
            this.on_load(loadStream)
        }

        this.currentFrame = 0
    }
    private async readExact(buffer: Uint8Array) {
        if (!this.file) throw new Error("No file")
        let offset = 0
        while (offset < buffer.length) {
            const chunk = new Uint8Array(buffer.buffer, offset)
            const n = await (this.file as any).read(chunk)
            if (!n) throw new Error("Unexpected EOF")
            offset += n
        }
    }
    play() {
        if (this.playing) return
        this.playing = true

        const delay = 1000 / this.tickRate

        this.interval = setInterval(() => {
            void this.nextFrame()
        }, delay)
    }
    pause() {
        this.playing = false
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = undefined
        }
    }
    async reset() {
        if (!this.file) return
        this.pause()
        await this.file.seek(0)
        await this.load(this.file)
    }
    async nextFrame() {
        if (!this.file || !this.playing) return

        if (this.currentFrame >= this.frameCount) {
            this.pause()

            if (this.on_finish) {
                this.on_finish()
            }

            return
        }

        await this.readExact(this.sizeBuf)
        const size = this.sizeView.getUint32(0, true)

        const data = new Uint8Array(size)
        await this.readExact(data)

        const stream = new NetStream(data.buffer)

        if (this.on_frame) {
            this.on_frame(stream, this.currentFrame)
        }

        this.currentFrame++
    }
}