import { SignalManager } from "../../core/math/utils.ts";
import { v2, Vec2 } from "../../core/math/vec2.ts";
import { ResourcesManager, Sound } from "./resources.ts";

export interface SoundOptions {
    volume?: number;
    loop?: boolean;
    delay?: number;
    offset?: number;
    position?: Vec2;
    max_distance?: number;
    rolloffFactor?: number;
    on_complete?: () => void;
}
export enum SoundPlayState {
    playFinished,
    playSucceeded,
    playInterrupted
}
const SoundsMaxInstances = 300;

export class SoundInstance {
    manager: SoundManager;
    buffer: AudioBuffer | null = null;

    volume: number = 1;
    volumeOld!: number;

    delay: number = 0;

    pan = 0;
    panOld!: number;

    loop = false;

    sourceNode: AudioBufferSourceNode | null = null;
    on_complete?: () => void;

    playState: SoundPlayState = SoundPlayState.playFinished;
    stopping: boolean = false;
    stopTime = 0;
    offset=0;

    gainNode: GainNode | null = null;
    pannerNode: PannerNode | null = null;
    destination: GainNode | null = null;
    paramEvents = 0;

    position?: Vec2;
    maxDistance = 20;
    rolloffFactor = 1.0;

    ctx: AudioContext
    _startedAt = 0;

    constructor(manager: SoundManager, ctx: AudioContext) {
        this.manager = manager;
        this.ctx = ctx;
        this.volumeOld = this.volume;
    }

    /**
     * Start this instance with given params.
     * signature kept compatible with your previous usage.
     */
    start(destination: GainNode, buffer: AudioBuffer, volume: number, loop: boolean, delay: number, offset: number, position?: Vec2, rolloffFactor?: number, max_distance?: number) {
        // If currently playing, stop gracefully first
        if (this.playState === SoundPlayState.playSucceeded && this.sourceNode) {
            // schedule fade and stop
            this.stop();
        }

        // ensure previous nodes disconnected and nulled (defensive)
        this._cleanupNodes();
        this.offset=offset
        this.buffer = buffer;
        this.destination = destination;
        this.volume = volume;
        this.volumeOld = volume;
        this.stopping = false;
        this.position = position;
        this.rolloffFactor = rolloffFactor ?? 1.0;
        this.maxDistance = max_distance ?? 20;
        this.loop = !!loop;
        this.delay = delay ?? 0;

        this.sourceNode = this.ctx.createBufferSource();
        this.gainNode = this.ctx.createGain();
        this.pannerNode = this.ctx.createPanner();

        this.pannerNode.panningModel = "equalpower";
        try {
            this.pannerNode.distanceModel = "inverse";
            this.pannerNode.refDistance = 1;
            this.pannerNode.maxDistance = this.maxDistance;
            this.pannerNode.rolloffFactor = this.rolloffFactor;
        } catch (_e) {
            //
        }

        this.sourceNode.buffer = buffer;
        this.sourceNode.loop = !!loop;

        this.sourceNode.connect(this.gainNode);
        this.gainNode.connect(this.pannerNode);
        this.pannerNode.connect(destination);

        this.gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);

        if (this.position) {
            try {
                this.pannerNode.positionX.setValueAtTime(this.position.x, this.ctx.currentTime);
                this.pannerNode.positionY.setValueAtTime(0, this.ctx.currentTime);
                this.pannerNode.positionZ.setValueAtTime(this.position.y, this.ctx.currentTime);
            } catch {/**/}
        } else {
            try {
                this.pannerNode.positionX.setValueAtTime(0, this.ctx.currentTime);
                this.pannerNode.positionY.setValueAtTime(0, this.ctx.currentTime);
                this.pannerNode.positionZ.setValueAtTime(0, this.ctx.currentTime);
            } catch {/**/}
        }

        this.sourceNode.onended = () => {
            this._finish();
        };

        try {
            this.sourceNode.start(this.ctx.currentTime + (delay ?? 0), offset ?? 0);
        } catch (_e) {
            this._finish();
            return;
        }

        this.playState = SoundPlayState.playSucceeded;
        this._startedAt = this.ctx.currentTime;

        this.stopTime = loop ? Number.POSITIVE_INFINITY : this.ctx.currentTime + (buffer.duration - (offset ?? 0)) + (delay ?? 0);

        if (!this.manager.playingInstances.includes(this)) {
            this.manager.playingInstances.push(this);
        }
    }

    updateListenerPosition(listenerPos: Vec2) {
        if (!this.position || !this.pannerNode) return;

        const relX = this.position.x - listenerPos.x;
        const relY = this.position.y - listenerPos.y;

        try {
            this.pannerNode.positionX.setValueAtTime(relX, this.ctx.currentTime);
            this.pannerNode.positionZ.setValueAtTime(relY, this.ctx.currentTime);
        } catch {/**/}
    }

    setGain(gain: number) {
        if (this.stopping) return;
        if (this.gainNode) {
            this.gainNode.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.02);
            ++this.paramEvents;
        }
    }

    stop() {
        if (this.stopping) return;
        this.setGain(0.0);
        const scheduledStop = this.ctx.currentTime + 0.08;
        this.stopTime = scheduledStop;
        this.stopping = true;
        this.playState = SoundPlayState.playInterrupted;

        if (this.sourceNode) {
            try {
                this.sourceNode.stop(scheduledStop);
            } catch {
                try { this.sourceNode.stop(); } catch {/**/}
            }
        }
    }

    _finish() {
        if (this.playState === SoundPlayState.playFinished) return;
        this.playState = SoundPlayState.playFinished;
        this.stopping = false;

        if (this.on_complete) {
            try { this.on_complete(); } catch {/**/}
            this.on_complete = undefined;
        }
        this._cleanupNodes()
        this.buffer = null
    }

    _cleanupNodes() {
        if (this.sourceNode) {
            try { this.sourceNode.onended = null; } catch {/**/}
            try { this.sourceNode.disconnect(); } catch {/**/}
            this.sourceNode = null;
        }
        if (this.gainNode) {
            try { this.gainNode.disconnect(); } catch {/**/}
            this.gainNode = null;
        }
        if (this.pannerNode) {
            try { this.pannerNode.disconnect(); } catch {/**/}
            this.pannerNode = null;
        }
        this.destination = null;
    }
    getPosition(): number {
        if (!this.sourceNode) return 0;
        return (this.ctx.currentTime - this._startedAt)+this.offset;
    }
    disconnect() {
        this._finish();
    }
}

export class ManipulativeSoundInstance {
    volume_id: string = "";
    instance: SoundInstance | null = null;
    manager: SoundManager;
    constructor(volume_id: string = "", manager: SoundManager) {
        this.instance = null;
        this.volume_id = volume_id;
        this.manager = manager;
    }
    get running(): boolean {
        return !!(this.instance && this.instance.playState === SoundPlayState.playSucceeded);
    }
    update() {
        if (this.instance?.ctx) {
            if (this.instance.ctx.currentTime > this.instance.stopTime && !this.instance.loop) {
                this.instance._finish();
            }
        }
    }
    get_position(): number {
        if (!this.instance) return 0
        return this.instance.getPosition()
    }
    set(sound: Sound | null | undefined, loop: boolean = false, position?: number) {
        if (sound) {

            if (this.instance && this.instance.buffer !== sound.buffer) {

                const pos = position ?? this.get_position()

                this.instance.stop()

                const volume =
                    (sound.volume ?? 1) *
                    (this.manager.masterVolume ?? 1) *
                    (this.manager.volumes[this.volume_id] ?? 1)

                this.instance = this.manager.play(
                    sound,
                    { loop, volume, offset: pos },
                    this.volume_id
                )!

                return
            }

            if (this.instance && this.instance.buffer === sound.buffer) return

            const volume =
                (sound.volume ?? 1) *
                (this.manager.masterVolume ?? 1) *
                (this.manager.volumes[this.volume_id] ?? 1)

            this.instance = this.manager.play(
                sound,
                { loop, volume, offset: position ?? 0 },
                this.volume_id
            )!
        } else {
            if (this.instance) this.instance.stop()
            this.instance = null
        }
    }
}

export class SoundManager {
    // deno-lint-ignore no-explicit-any
    ctx: AudioContext = new (self.AudioContext || (self as any).webkitAudioContext)();
    audioUnlocked = false
    mute = false;
    muteOld = false;
    masterVolume = 1;
    masterVolumeOld = 1;
    volumes: Record<string, number> = {};
    soundInstances: SoundInstance[] = [];
    playingInstances: SoundInstance[] = [];
    instanceId = 0;

    listener_position: Vec2 = v2(0, 0);

    masterGainNode!: GainNode;
    compressorNode!: DynamicsCompressorNode;

    manipulatives: ManipulativeSoundInstance[] = [];

    signals:SignalManager=new SignalManager()

    constructor() {
        // deno-lint-ignore no-explicit-any
        try { (self as any).audioEngine = this; } catch {/**/}

        this.masterGainNode = this.ctx.createGain();
        this.compressorNode = this.ctx.createDynamicsCompressor();
        this.masterGainNode.connect(this.compressorNode);
        this.compressorNode.connect(this.ctx.destination);

        for (let i = 0; i < Math.min(16, SoundsMaxInstances); i++) {
            this.soundInstances.push(new SoundInstance(this, this.ctx));
        }
        this.init_audio_unlock()
    }
    init_audio_unlock() {
        const unlock = this.ctx_load.bind(this)

        self.addEventListener("click", unlock, { once: true })
        self.addEventListener("keydown", unlock, { once: true })
        
        window.addEventListener("click", unlock, { once: true })
        window.addEventListener("keydown", unlock, { once: true })

        //self.addEventListener("touchstart", unlock, { once: true })
        //self.addEventListener("touchend", unlock, { once: true })
    }
    init_html_sound_bindings(volume_id: string, resources: ResourcesManager) {
        const handler = (ev: Event) => {
            const target = ev.currentTarget as HTMLElement;
            const soundId = target.getAttribute("play-sound");
            if (!soundId) return;

            const sound = resources.get_audio(soundId);
            if (!sound) {
                console.warn(`⚠️ Sound '${soundId}' not found in resources`);
                return;
            }

            this.play(sound, undefined, volume_id);
        };

        const soundElements = document.querySelectorAll<HTMLElement>("[play-sound]");
        soundElements.forEach((el,_k)=>{
            if ((el as any)._soundBound) return;
            (el as any)._soundBound = true;

            el.addEventListener("click", handler);
            //el.addEventListener("touchstart", handler);
        })
    }

    ctx_load() {
        if (this.audioUnlocked) return

        const ctx = this.ctx
        if (!ctx) return

        const finishUnlock = () => {
            if (this.audioUnlocked) return
            this.audioUnlocked = true
            this.signals.emit("load")
        }

        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        if (ctx.state === "suspended" || ctx.state === "interrupted") {
            ctx.resume().then(finishUnlock).catch(err => {
                console.warn("⚠️ Failed to resume AudioContext:", err)
            })
        } else {
            finishUnlock()
        }
    }
    finishUnlock = () => {
        if (this.audioUnlocked) return;
        this.audioUnlocked = true;
        self.removeEventListener("click", this.ctx_load)
        self.removeEventListener("touchstart", this.ctx_load)
        self.removeEventListener("touchend", this.ctx_load)
        self.removeEventListener("keydown", this.ctx_load)
        console.log("🔊 AudioContext resumed — sounds enabled")
        this.signals.emit("load")
    };


    add_manipulative_si(volume_id: string): ManipulativeSoundInstance {
        const m = new ManipulativeSoundInstance(volume_id, this);
        this.manipulatives.push(m);
        return m;
    }
    get_manipulative_si(volume_id: string):ManipulativeSoundInstance|undefined{
        for(const m of this.manipulatives){
            if(m.volume_id===volume_id)return m
        }
    }

    play(sound: Sound, params: Partial<SoundOptions> = {}, volume_group?: string): SoundInstance | undefined {
        if (!sound || !sound.buffer) return;

        let volume = params.volume != undefined ? params.volume : 1
        volume *= (sound.volume ?? 1) * this.masterVolume
        volume *= (volume_group && this.volumes[volume_group] !== undefined) ? this.volumes[volume_group] : 1
        volume = this.mute ? 0 : volume

        const loop = !!params.loop
        const delay = params.delay ? params.delay * 0.001 : 0
        const offset = params.offset ? params.offset : 0

        let instance = this.soundInstances.find(i => i.playState === SoundPlayState.playFinished);
        if (!instance && this.soundInstances.length < SoundsMaxInstances) {
            instance = new SoundInstance(this, this.ctx);
            this.soundInstances.push(instance);
        }
        if (!instance) {
            let oldestIndex = -1;
            let oldestStarted = Infinity;
            for (let idx = 0; idx < this.soundInstances.length; idx++) {
                const s = this.soundInstances[idx];
                if (s.playState === SoundPlayState.playSucceeded && s._startedAt < oldestStarted) {
                    oldestStarted = s._startedAt;
                    oldestIndex = idx;
                }
            }
            if (oldestIndex >= 0) {
                const s = this.soundInstances[oldestIndex];
                s.stop();
                instance = s;
            } else {
                instance = new SoundInstance(this, this.ctx);
                this.soundInstances.push(instance);
            }
        }

        if (params.on_complete) instance.on_complete = params.on_complete
        instance.start(this.masterGainNode, sound.buffer, volume, loop, delay, offset, params.position, params.rolloffFactor, params.max_distance);

        if (!this.playingInstances.includes(instance)) {
            this.playingInstances.push(instance);
        }

        return instance;
    }

    update(_dt: number) {
        const masterVolume = this.mute ? 0 : this.masterVolume;
        const masterVolumeOld = this.muteOld ? 0 : this.masterVolumeOld;
        this.masterVolumeOld = this.masterVolume;
        this.muteOld = this.mute;

        if (masterVolume != masterVolumeOld) {
            try {
                this.masterGainNode.gain.setTargetAtTime(masterVolume, this.ctx.currentTime, 0.02);
            } catch {/**/}
        }
        for (const m of this.manipulatives) m.update();
        for (let i = this.playingInstances.length - 1; i >= 0; i--) {
            const instance = this.playingInstances[i];

            if (instance.volumeOld != instance.volume) instance.volumeOld = instance.volume;

            instance.updateListenerPosition(this.listener_position)
            if (instance.playState === SoundPlayState.playFinished) {
                this.playingInstances.splice(i, 1);
                continue;
            }

            if (!instance.loop && instance.stopTime < this.ctx.currentTime) {
                instance._finish();
                this.playingInstances.splice(i, 1);
                continue;
            }

            if (!instance.loop && instance.gainNode && instance.gainNode.gain && instance.gainNode.gain.value < 0.001) {
                instance._finish();
                this.playingInstances.splice(i, 1);
                continue;
            }
        }
    }

    updateListenerPosition() {
        try {
            if (this.ctx.listener) {
                this.ctx.listener.positionX?.setValueAtTime(this.listener_position.x, this.ctx.currentTime);
                this.ctx.listener.positionY?.setValueAtTime(this.listener_position.y, this.ctx.currentTime);
                this.ctx.listener.positionZ?.setValueAtTime(0, this.ctx.currentTime);
            }
        } catch {/**/}
    }
    freeFinishedInstances() {
        const keep = 8;
        let finishedCount = 0;
        const survivors: SoundInstance[] = [];
        for (const s of this.soundInstances) {
            if (s.playState === SoundPlayState.playFinished) {
                finishedCount++;
                if (this.soundInstances.length - finishedCount >= keep) {
                    continue;
                }
            }
            survivors.push(s);
        }
        this.soundInstances = survivors;
    }
}
