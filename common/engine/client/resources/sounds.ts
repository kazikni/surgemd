import { SignalManager } from "../../core/math/utils.ts"
import { v2, Vec2 } from "../../core/math/vec2.ts"
import { Sound } from "./resources.ts";

export interface SoundPlaybackOptions {
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

    on_complete?: ()=>void
}
export enum VoiceState {
    free,
    playing,
    stopping
}
export class AudioBus {
    name:string
    gain:GainNode
    compressor?:DynamicsCompressorNode
    volume:number=1
    constructor(public ctx:AudioContext,public destination:AudioNode,name:string){
        this.name=name
        this.gain=ctx.createGain()
        this.gain.connect(destination)
    }
    set_volume(volume:number){
        this.volume=volume
        this.gain.gain.setTargetAtTime(
            volume,
            this.ctx.currentTime,
            0.03
        )
    }
    add_compressor(){
        this.compressor=this.ctx.createDynamicsCompressor()
        this.gain.disconnect()
        this.gain.connect(this.compressor)
        this.compressor.connect(this.destination)
    }
}
export class SpatialAudioSystem {
    listener_position:Vec2=v2(0,0)
    compute_pan(source:Vec2,maxDistance:number):number{
        const dx=source.x-this.listener_position.x
        return Math.max(-1,Math.min(1,dx/maxDistance))
    }
    compute_volume(source:Vec2,maxDistance:number):number{
        const dist=v2.distance(source,this.listener_position)
        return Math.max(0,1-(dist/maxDistance))
    }
}
export class AudioVoice {
    state:VoiceState=VoiceState.free
    sound?:Sound
    source?:AudioBufferSourceNode
    gain:GainNode
    pan:StereoPannerNode
    started_at=0
    offset=0
    loop=false
    position?:Vec2
    spatial=true
    base_volume=1
    max_distance=20
    stopping=false
    on_complete?:()=>void
    constructor(public engine:AudioEngine,public ctx:AudioContext){
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
        this.max_distance=options.max_distance??20
        this.on_complete=options.on_complete
        this.offset=options.offset??0
        this.source=this.ctx.createBufferSource()
        this.gain=this.ctx.createGain()
        this.pan=this.ctx.createStereoPanner()
        this.gain.connect(this.pan)
        this.pan.connect(bus.gain)
        this.source.buffer=sound.buffer
        this.source.loop=this.loop
        this.source.connect(this.gain)
        this.gain.gain.value=this.base_volume
        this.source.onended=()=>{
            this.finish()
        }
        const delay=(options.delay??0)*0.001
        this.source.start(this.ctx.currentTime+delay,this.offset)
        this.started_at=this.ctx.currentTime
        this.state=VoiceState.playing
        this.stopping=false
    }
    update(){
        if(this.state!==VoiceState.playing)return
        if(this.spatial&&this.position){
            const spatial=this.engine.spatial
            const pan=spatial.compute_pan(
                this.position,
                this.max_distance
            )
            const volume=spatial.compute_volume(
                this.position,
                this.max_distance
            )
            this.pan.pan.value=pan
            this.gain.gain.value=this.base_volume*volume
        }
    }
    stop(immediate=false){
        if(this.state===VoiceState.free)return
        if(!this.source){
            this.finish()
            return
        }
        if(this.stopping)return
        this.stopping=true
        this.state=VoiceState.stopping
        if(immediate){
            try{
                this.source.stop()
            }catch{
                this.finish()
            }
            return
        }
        const now=this.ctx.currentTime
        const end=now+0.08
        this.gain.gain.cancelScheduledValues(now)
        this.gain.gain.setValueAtTime(this.gain.gain.value,now)
        this.gain.gain.linearRampToValueAtTime(0,end)
        try{
            this.source.stop(end)
        }catch{
            this.finish()
        }
    }
    finish(){
        if(this.state===VoiceState.free)return
        this.state=VoiceState.free
        if(this.on_complete){
            try{
                this.on_complete()
            }catch{}
            this.on_complete=undefined
        }
        if(this.source){
            try{
                this.source.onended=null
            }catch{}
            try{
                this.source.disconnect()
            }catch{}
        }
        try{
            this.gain.disconnect()
        }catch{}
        try{
            this.pan.disconnect()
        }catch{}
        this.source=undefined
        this.sound=undefined
        this.position=undefined
        this.started_at=0
        this.offset=0
        this.stopping=false
    }
    get_offset():number{
        if(this.state===VoiceState.free)return 0
        const elapsed=this.ctx.currentTime-this.started_at
        let pos=this.offset+elapsed
        if(this.sound?.buffer){
            const duration=this.sound.buffer.duration

            if(this.loop&&duration>0){
                pos%=duration
            }else{
                pos=Math.min(pos,duration)
            }
        }

        return pos
    }
}
export class VoicePool {
    voices:AudioVoice[]=[]
    constructor(public engine:AudioEngine,public ctx:AudioContext,public maxVoices:number=1000){}
    allocate():AudioVoice{
        for(const v of this.voices){
            if(v.state===VoiceState.free){
                return v
            }
        }
        if(this.voices.length<this.maxVoices){
            const v=new AudioVoice(this.engine,this.ctx)
            this.voices.push(v)
            return v
        }
        const worst=this.voices[0]
        worst.stop(true)
        worst.finish()
        return worst
    }
    update(){
        for(const v of this.voices){
            v.update()
        }
    }
}
export class SoundController {
    bus?:string
    voice?:AudioVoice
    get running():boolean{
        return this.voice?.state===VoiceState.playing
    }
    get offset():number{
        return this.voice?.get_offset()??0
    }
    constructor(public engine:AudioEngine,bus?:string){
        this.bus=bus
    }
    set(sound?:Sound|null,options:SoundPlaybackOptions={}){
        if(!sound){
            this.stop()
            return
        }
        if(this.voice&&this.voice.sound===sound)return
        this.stop()
        this.voice=this.engine.play(sound,{bus:this.bus,...options})
    }
    stop(){
        if(this.voice){
            this.voice.stop()
            this.voice=undefined
        }
    }
    set_volume(volume:number){
        if(this.voice){
            this.voice.base_volume=volume
        }
    }
    set_position(position:Vec2){
        if(this.voice){
            this.voice.position=position
        }
    }
}
export class AudioEngine {
    ctx:AudioContext
    master_bus:AudioBus
    buses:Map<string,AudioBus>=new Map()
    voice_pool:VoicePool
    spatial:SpatialAudioSystem
    signals=new SignalManager()
    unlocked=false
    constructor(){
        // deno-lint-ignore no-explicit-any
        this.ctx=new ((self as any).AudioContext||(self as any).webkitAudioContext)()
        this.master_bus=new AudioBus(
            this.ctx,
            this.ctx.destination,
            "master"
        )
        this.master_bus.add_compressor()
        this.voice_pool=new VoicePool(this,this.ctx)
        this.spatial=new SpatialAudioSystem()
        this.init_unlock()
    }

    create_bus(name:string):AudioBus{
        const bus=new AudioBus(this.ctx,this.master_bus.gain,name)
        this.buses.set(name,bus)
        return bus
    }
    get_bus(name:string):AudioBus{
        return this.buses.get(name)??this.master_bus
    }
    play(sound?:Sound,options:SoundPlaybackOptions={}){
        if(!sound)return
        const voice=this.voice_pool.allocate()
        const bus=this.get_bus(
            options.bus??"master"
        )
        voice.play(sound,bus,options)
        return voice
    }
    create_controller(bus?:string){
        return new SoundController(this,bus)
    }
    update(){
        this.voice_pool.update()
    }
    set_listener_position(position:Vec2){
        this.spatial.listener_position=position
    }
    set_master_volume(volume:number){
        this.master_bus.set_volume(volume)
    }
    init_unlock(){
        const unlock=()=>{
            if(this.unlocked)return
            this.ctx.resume()
            this.unlocked=true
            this.signals.emit("unlock")
        }
        addEventListener("click",unlock,{once:true})
        addEventListener("keydown",unlock,{once:true})
    }
}
