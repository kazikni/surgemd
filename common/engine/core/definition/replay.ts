import { type AbstractGame } from "../game/game.ts";
import { NetStream } from "../net/stream.ts";

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
    frames: Uint8Array[] = []

    tickRate = 60
    version = 1

    frame_generator?: (r: ReplayRecorder,full:boolean) => NetStream

    constructor(
        game: AbstractGame<any>,
        frame_generator?: (r: ReplayRecorder,full:boolean) => NetStream
    ) {
        this.game = game
        this.frame_generator = frame_generator
    }

    /* ================= RECORD ================= */
    startRecording() {
        this.frames = []
        this.recording = true
    }
    stopRecording() {
        this.recording = false
    }
    updateRecord() {
        if (!this.recording) return

        let stream: NetStream
        if (this.frame_generator) {
            stream = this.frame_generator(this,true)
        } else {
            stream = this.game.scene_2d.objects.encode_all(true)
        }

        this.frames.push(
            new Uint8Array(stream._u8Array.slice(0, stream.length))
        )
    }
    update(){
        this.updateRecord()
    }
    /* ================= EXPORT ================= */
    export(): Uint8Array {
        const headerSize = 16
        let totalSize = headerSize

        for (const f of this.frames) {
            totalSize += 4 + f.length
        }

        const buffer = new ArrayBuffer(totalSize)
        const view = new DataView(buffer)
        const u8 = new Uint8Array(buffer)

        // Magic
        u8.set(new TextEncoder().encode(".REPL"), 0)

        view.setUint16(4, this.version, true)
        view.setUint16(6, this.tickRate, true)
        view.setUint32(8, this.frames.length, true)

        let offset = headerSize

        for (const frame of this.frames) {
            view.setUint32(offset, frame.length, true)
            offset += 4
            u8.set(frame, offset)
            offset += frame.length
        }

        return new Uint8Array(buffer)
    }

    /* ================= IMPORT ================= */
    load(data: Uint8Array) {
        const view = new DataView(data.buffer)

        const magic = new TextDecoder().decode(data.slice(0, 5))
        if (magic !== ".REPL") {
            throw new Error("Invalid replay file")
        }

        this.version = view.getUint16(4, true)
        this.tickRate = view.getUint16(6, true)

        const frameCount = view.getUint32(8, true)

        this.frames = []
        let offset = 16

        for (let i = 0; i < frameCount; i++) {
            const size = view.getUint32(offset, true)
            offset += 4

            this.frames.push(
                data.slice(offset, offset + size)
            )

            offset += size
        }
    }
    stop() {
    }
}