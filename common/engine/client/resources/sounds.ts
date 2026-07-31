import { SignalManager } from "../../core/math/utils.ts"
import { v2, Vec2 } from "../../core/math/vec2.ts"
import { Sound } from "./resources.ts";
export interface SoundPlaybackOptions{
    volume?: number
    loop?: boolean
    delay?: number
    offset?: number

    position?: Vec2

    max_distance?: number
    ref_distance?: number

    spatial?: boolean

    fade_in?: number
    fade_out?: number

    bus?: string

    on_complete?:()=>void
}
export enum VoiceState{
    free,
    playing,
    stopping
}
export class AudioBus {
    name:string
    gain:GainNode
    compressor?:DynamicsCompressorNode
    volume=1

    constructor(public ctx: AudioContext, public destination: AudioNode,name: string) {
        this.name = name
        this.gain = ctx.createGain()
        this.gain.gain.value = 1
        this.gain.connect(destination)
    }
    set_volume(volume: number) {
        volume = Math.max(0, volume)
        this.volume = volume
        this.gain.gain.cancelScheduledValues(this.ctx.currentTime)
        this.gain.gain.setTargetAtTime(volume,this.ctx.currentTime,0.03)
    }
    add_compressor(){
        if(this.compressor)return
        this.compressor = this.ctx.createDynamicsCompressor()
        this.gain.disconnect()
        this.gain.connect(this.compressor)
        this.compressor.connect(this.destination)
    }
    destroy() {
        try {
            this.gain.disconnect()
        } catch {}
        try {
            this.compressor?.disconnect()
        } catch {}
        this.compressor = undefined
    }
}
export class SpatialAudioSystem {
    listener_position:Vec2=v2(0,0)
    compute_pan(source:Vec2,maxDistance:number):number{
        maxDistance = Math.max(maxDistance, 0.001)
        const dx = source.x - this.listener_position.x
        return Math.max(-1,Math.min(1,dx/maxDistance))
    }
    compute_volume(source:Vec2,maxDistance:number,refDistance=1):number{
        maxDistance=Math.max(maxDistance,0.001)
        refDistance=Math.max(0.001,Math.min(refDistance,maxDistance))
        const dist=v2.distance(source,this.listener_position)
        if(dist<=refDistance)return 1
        const t=(dist-refDistance)/(maxDistance-refDistance)
        const clamped = Math.max(0,Math.min(1,t))
        return Math.pow(1-clamped,2)
    }
}
export class AudioInstance {
    state: VoiceState = VoiceState.free
    sound?: Sound
    source?: AudioBufferSourceNode
    gain: GainNode
    pan: StereoPannerNode

    id:number=0

    started_at = 0
    offset = 0

    loop = false
    spatial = true

    position?: Vec2

    base_volume = 1

    max_distance = 20
    ref_distance = 1

    stopping = false

    fade_out = 80

    on_complete?:(instance:AudioInstance)=>void

    constructor(public engine: AudioEngine,public ctx: AudioContext){
        this.gain=ctx.createGain()
        this.pan=ctx.createStereoPanner()
        this.gain.connect(this.pan)
    }

    play(sound:Sound,bus:AudioBus,options:SoundPlaybackOptions={}){
        this.stop(true)
        if(!sound.buffer)return

        this.sound=sound
        this.loop=!!options.loop
        this.position=options.position
        this.spatial=options.spatial??true

        this.base_volume=(options.volume??1)*(sound.volume??1)
        this.max_distance=Math.max(options.max_distance??20,0.001)
        this.ref_distance=Math.min(Math.max(options.ref_distance??1,0.001),this.max_distance)

        this.fade_out=options.fade_out??80
        this.on_complete=options.on_complete

        this.offset=options.offset ?? 0

        const duration = sound.buffer.duration

        if (duration > 0) {
            if (this.loop) {
                this.offset %= duration
                if (this.offset < 0)
                    this.offset += duration
            } else {
                this.offset = Math.max(0,Math.min(this.offset,duration))
            }
        }

        try {
            this.pan.disconnect()
        } catch {}

        this.pan.connect(bus.gain)
        const source=this.ctx.createBufferSource()

        this.source = source

        source.buffer = sound.buffer
        source.loop = this.loop
        source.connect(this.gain)

        const now=this.ctx.currentTime

        this.gain.gain.cancelScheduledValues(now)
        const fadeIn=Math.max(options.fade_in??0)/1000
        if(fadeIn>0){
            const targetVolume = this.compute_volume()
            this.gain.gain.setValueAtTime(0, now)
            this.gain.gain.linearRampToValueAtTime(targetVolume,now+fadeIn)
        }else{
            this.update_volume()
        }

        source.onended = () => {
            this.finish()
        }

        const delay =
            Math.max(
                0,
                options.delay ?? 0
            ) / 1000

        const startTime =
            now + delay

        source.start(
            startTime,
            this.offset
        )

        this.started_at =
            startTime

        this.state =
            VoiceState.playing

        this.stopping = false
    }

    compute_volume(): number {
        let volume=this.base_volume
        if (this.spatial && this.position){
            volume*=this.engine.spatial.compute_volume(this.position,this.max_distance,this.ref_distance)
        }
        return volume<0.003?0:volume
    }
    update_volume(){
        if(this.state !== VoiceState.playing)return
        let volume=this.base_volume
        if(this.spatial&&this.position){
            volume*=this.engine.spatial.compute_volume(this.position,this.max_distance,this.ref_distance)
            this.pan.pan.value=this.engine.spatial.compute_pan(this.position,this.max_distance)
        }else{
            this.pan.pan.value=0
        }
        if(volume<0.003)volume=0
        this.gain.gain.value=volume
    }
    update() {
        this.update_volume()
    }
    stop(immediate=false) {
        if(this.state===VoiceState.free)return

        if (this.stopping)
            return

        if (!this.source) {
            this.finish()
            return
        }

        this.stopping = true
        this.state =
            VoiceState.stopping

        const source =
            this.source

        if (immediate) {
            try {
                source.onended = null
                source.stop()
            } catch {}

            this.finish()
            return
        }

        const now =
            this.ctx.currentTime

        const end =
            now +
            this.fade_out / 1000

        this.gain.gain.cancelScheduledValues(now)
        this.gain.gain.setValueAtTime(
            this.gain.gain.value,
            now
        )
        this.gain.gain.linearRampToValueAtTime(
            0,
            end
        )

        source.onended = () => {
            this.finish()
        }

        try {
            source.stop(end)
        } catch {
            this.finish()
        }
    }
    finish() {
        if(this.state === VoiceState.free)return

        this.state=VoiceState.free

        this.stopping = false

        if (this.on_complete) {
            try {
                this.on_complete(this)
            } catch {}
            this.on_complete = undefined
        }

        if (this.source) {
            try {
                this.source.onended = null
            } catch {}

            try {
                this.source.disconnect()
            } catch {}

            this.source = undefined
        }

        this.sound = undefined
        this.position = undefined

        this.started_at = 0
        this.offset = 0

        this.gain.gain.cancelScheduledValues(this.ctx.currentTime)
        this.gain.gain.value = 1
    }

    get_offset(): number {
        if(this.state === VoiceState.free) return 0

        const elapsed = Math.max(
            0,
            this.ctx.currentTime -
                this.started_at
        )

        let pos =
            this.offset +
            elapsed

        if (this.sound?.buffer) {
            const duration =
                this.sound.buffer.duration

            if (
                this.loop &&
                duration > 0
            ) {
                pos %= duration
            } else {
                pos = Math.min(
                    pos,
                    duration
                )
            }
        }

        return pos
    }
}
export class VoicePool {
    voices: AudioInstance[] = []

    constructor(
        public engine: AudioEngine,
        public ctx: AudioContext,
        public maxVoices = 2000
    ) {}

    allocate(): AudioInstance {
        for (const voice of this.voices) {
            if (voice.state === VoiceState.free) {
                return voice
            }
        }

        if(this.voices.length < this.maxVoices) {
            const voice = new AudioInstance(this.engine, this.ctx)
            voice.id=this.voices.length
            this.voices.push(voice)
            return voice
        }

        let oldest = this.voices[0]

        for (const voice of this.voices) {
            if (voice.started_at < oldest.started_at) {
                oldest = voice
            }
        }

        oldest.stop(true)

        return oldest
    }

    update() {
        for (const voice of this.voices) {
            voice.update()
        }
    }
}

export class SoundController {
    bus?: string
    voice?: AudioInstance

    constructor(
        public engine: AudioEngine,
        bus?: string
    ) {
        this.bus = bus
    }

    get running(): boolean {
        return this.voice?.state === VoiceState.playing
    }

    get offset(): number {
        return this.voice?.get_offset() ?? 0
    }

    set(
        sound?: Sound | null,
        options: SoundPlaybackOptions = {}
    ) {
        if (!sound) {
            this.stop()
            return
        }

        if (
            this.voice &&
            this.voice.state !== VoiceState.free &&
            this.voice.sound === sound
        ) {
            return
        }

        this.stop()

        this.voice = this.engine.play(sound, {
            bus: this.bus,
            ...options
        })
    }

    stop(immediate = false) {
        if (!this.voice) return

        this.voice.stop(immediate)

        if (immediate) {
            this.voice = undefined
        }
    }

    update() {
        if (
            this.voice &&
            this.voice.state === VoiceState.free
        ) {
            this.voice = undefined
        }
    }

    set_volume(volume: number) {
        if (!this.voice) return
        this.voice.base_volume = volume
        this.voice.update_volume()
    }
    set_position(position: Vec2) {
        if (!this.voice) return
        this.voice.position = position
        this.voice.update_volume()
    }
}

export class AudioEngine {
    ctx: AudioContext

    master_bus: AudioBus

    buses = new Map<string, AudioBus>()

    voice_pool: VoicePool

    spatial: SpatialAudioSystem

    signals = new SignalManager()

    unlocked = false

    constructor() {
        // deno-lint-ignore no-explicit-any
        this.ctx = new ((self as any).AudioContext || (self as any).webkitAudioContext)()

        this.master_bus = new AudioBus(
            this.ctx,
            this.ctx.destination,
            "master"
        )

        this.master_bus.add_compressor()

        this.voice_pool = new VoicePool(
            this,
            this.ctx
        )

        this.spatial = new SpatialAudioSystem()

        this.init_unlock()
    }

    create_bus(name: string): AudioBus {
        const bus = new AudioBus(
            this.ctx,
            this.master_bus.gain,
            name
        )

        this.buses.set(name, bus)

        return bus
    }

    get_bus(name: string): AudioBus {
        return this.buses.get(name) ?? this.master_bus
    }

    play(
        sound?: Sound,
        options: SoundPlaybackOptions = {}
    ) {
        if (!sound) return

        if (!this.unlocked) return

        const voice = this.voice_pool.allocate()

        voice.play(
            sound,
            this.get_bus(options.bus ?? "master"),
            options
        )

        return voice
    }

    create_controller(bus?: string) {
        return new SoundController(this, bus)
    }

    update() {
        this.voice_pool.update()
    }

    set_listener_position(position: Vec2) {
        this.spatial.listener_position = position
    }

    set_master_volume(volume: number) {
        this.master_bus.set_volume(volume)
    }

    init_unlock() {
        const unlock = async () => {
            if (this.unlocked) return

            try {
                await this.ctx.resume()
            } catch {}

            this.unlocked = this.ctx.state === "running"

            if (this.unlocked) {
                this.signals.emit("unlock")
            }
        }

        addEventListener("pointerdown", unlock, {
            once: true
        })

        addEventListener("keydown", unlock, {
            once: true
        })
    }
}