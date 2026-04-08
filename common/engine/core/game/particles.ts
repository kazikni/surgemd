import { v2, Vec2 } from "../math/vec2.ts";
import { type AbstractGame } from "./game.ts";

export abstract class Particle2D{
    position:Vec2=v2(0,0)
    rotation:number=0
    scale:number=0

    manager!:ParticlesManager2D
    emitter?:ParticlesEmitter2D<any>
    destroyed:boolean=false

    abstract update(dt:number):void;
    abstract on_create():void;
    abstract on_destroy():void;

    constructor(){

    }
}
export interface ParticlesEmitter2DConfig<Particle extends Particle2D>{
    particle:()=>Particle|undefined
    delay:number
    enabled?:boolean
    limit?:number
}
export class ParticlesEmitter2D<Particle extends Particle2D>{
    particle:()=>Particle|undefined
    delay:number
    enabled:boolean

    destroyed:boolean=false
    current_delay:number=0

    limit:number

    particles:Particle[]=[]
    manager!:ParticlesManager2D<any>
    constructor(config:ParticlesEmitter2DConfig<Particle>){
        this.particle=config.particle
        this.delay=config.delay
        this.enabled=config.enabled!==undefined?config.enabled:true
        this.limit=config.limit??0
    }

    add_particle():Particle|undefined{
        if(this.limit===0||this.limit>this.particles.length){
            this.current_delay=this.delay
            const p=this.particle()
            if(p){
                p.emitter=this
                this.particles.push(p)
                this.manager.add_particle(p)
            }
            return p
        }
    }
}
export class ParticlesManager2D<Particle extends Particle2D=Particle2D>{
    particles:Particle[]=[]
    emitters:ParticlesEmitter2D<Particle>[]=[]
    game:AbstractGame<any>

    constructor(game:AbstractGame<any>){
        this.game=game
    }
    add_particle(p:Particle):Particle{
        p.manager=this
        this.particles.push(p)
        p.on_create()
        return p
    }
    add_emiter(config:ParticlesEmitter2DConfig<Particle>):ParticlesEmitter2D<Particle>{
        const e=new ParticlesEmitter2D<Particle>(config)
        e.manager=this
        this.emitters.push(e)
        return e
    }
    update(dt:number){
        for(let i=0;i<this.emitters.length;i++){
            const em=this.emitters[i]
            if(em.destroyed){
                this.emitters.splice(i,1)
                i--
                continue
            }
            if(em.enabled&&!em.destroyed){
                if(em.delay===0&&em.limit!==0){
                    while(em.particles.length<em.limit){
                        const p=em.add_particle()
                        if(!p)break
                    }
                }else{
                    em.current_delay-=dt
                    if(em.current_delay<=0){
                        em.add_particle()
                    }
                }
            }
        }
        for(let i=0;i<this.particles.length;i++){
            if(this.particles[i].destroyed){
                if(this.particles[i].emitter!==undefined){
                    const idx=this.particles[i].emitter!.particles.indexOf(this.particles[i])
                    if(idx!==-1)this.particles[i].emitter!.particles.splice(idx,1)
                }
                this.particles[i].on_destroy()
                this.particles.splice(i,1)
                i--
                continue
            }
            this.particles[i].update(dt)
        }
    }
    clear(){
        for(let i=0;i<this.particles.length;i++){
            if(!this.particles[i].destroyed){
                this.particles[i].on_destroy()
                this.particles[i].destroyed=true
            }
        }
        this.particles.length=0
        for(let i=0;i<this.emitters.length;i++){
            this.emitters[i].particles.length=0
            this.emitters[i].current_delay=0
        }
    }
}

// Current Particles
type ParticlePoolBucket<Particle extends BaseParticle2D> = {
    id: number
    alive: Particle[]
    dead: Particle[]
    factory: new () => Particle
}
export abstract class BaseParticle2D {
    alive: boolean = false
    bucket!:ParticlePoolBucket<any>
    pool!: ParticlePool<any>

    abstract on_create(args: any): void
    abstract on_tick(dt: number): void
    abstract on_destroy(): void
    abstract on_transfer(other:BaseParticle2D): void

    kill() {
        if(!this.alive)return
        this.pool.release(this)
    }
}
export class ParticleEmitter<T extends BaseParticle2D> {
    pool: ParticlePool<T>
    bucket: ParticlePoolBucket<T>

    delay: number
    timer: number = 0

    enabled = true
    burst = 1

    constructor(pool: ParticlePool<T>, id: number, delay: number) {
        this.pool = pool
        this.bucket=pool.buckets.get(id)!
        this.delay = delay
    }

    emit(args: any) {
        for (let i=0;i<this.burst;i++) {
            this.pool.create(this.bucket.id, args)
        }
    }
    update(dt: number, argsFactory?: () => any) {
        if (!this.enabled) return
        this.timer -= dt
        if (this.timer <= 0) {
            this.timer = this.delay
            if (argsFactory)
                this.emit(argsFactory())
        }
    }
}
export class ParticlePool<Particle extends BaseParticle2D> {
    buckets: Map<number, ParticlePoolBucket<Particle>> = new Map()

    allocate(bucket_id: number, capacity: number, factory: new () => Particle) {
        if (!this.buckets.has(bucket_id)) {
            this.buckets.set(bucket_id, {
                id: bucket_id,
                alive: [],
                dead: [],
                factory
            })
        }
        const bucket = this.buckets.get(bucket_id)!
        for (let i = 0; i < capacity; i++) {
            const p = new factory()
            p.bucket=bucket
            p.pool = this
            bucket.dead.push(p)
        }
    }
    create(bucket_id: number, args: any): Particle|undefined {
        const bucket = this.buckets.get(bucket_id)
        if (!bucket) return
        const p = bucket.dead.pop()
        if (!p) return

        p.alive = true
        bucket.alive.push(p)
        p.on_create(args)
        return p
    }
    release(p:Particle) {
        const bucket = p.bucket
        p.on_destroy()
        p.alive = false
        const idx = bucket.alive.indexOf(p)
        if (idx !== -1) bucket.alive.splice(idx, 1)
        bucket.dead.push(p)
    }
    update(dt: number) {
        for (const bucket of this.buckets.values()) {
            const alive = bucket.alive
            for (let i = 0; i < alive.length; i++) {
                const p = alive[i]
                p.on_tick(dt)
            }
        }
    }
    get_alive(bucket_id:number): Particle[] {
        return this.buckets.get(bucket_id)?.alive ?? []
    }
    total_alive(): number {
        let total = 0
        for (const b of this.buckets.values())
            total += b.alive.length
        return total
    }
}