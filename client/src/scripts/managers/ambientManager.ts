import { ABParticle2D, CircleHitbox2D, ClientParticle2D, ColorM, ease, KDate, Lights2D, ManipulativeSoundInstance, ParticlesEmitter2D, RainParticle2D, random, Tween, v2 } from "common/engine/client.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { type Game } from "../others/game.ts";
import { BiomeDef } from "common/scripts/definitions/maps/base.ts";

export class AmbientManager{
    game:Game
    rain_particles_emitter:ParticlesEmitter2D<ClientParticle2D>
    ambient_particles_emitter:ParticlesEmitter2D<ClientParticle2D>
    snow_particles_emitter:ParticlesEmitter2D<ClientParticle2D>

    biome!:BiomeDef
    music:ManipulativeSoundInstance
    ambience:ManipulativeSoundInstance

    fog_color:number=0
    fog_saturate:number=1
    fog_constrast:number=1
    fog_enabled:boolean=false

    //light_map:Lights2D=new Lights2D()
    // Temporaly
    _global_ilumination:number=1
    get global_ilumination():number{
        return this._global_ilumination
    }
    set global_ilumination(val:number){
        this._global_ilumination=val
        if(this.fog_enabled){
            this.game.renderer.canvas.style.filter=`hue-rotate(${this.fog_color}deg) saturate(${this.fog_saturate}) contrast(${this.fog_constrast}) brightness(${val})`
        }else{
            this.game.renderer.canvas.style.filter=`brightness(${val})`
        }
    }

    date:KDate={
        second:0,
        minute:0,
        day:10,
        hour:4,
        month:3,
        year:2000
    }

    bullet_whiz_hitbox?:CircleHitbox2D
    last_music_pos:number=0

    musics:string[]=[]

    constructor(game:Game){
        this.game=game
        this.rain_particles_emitter=this.game.particles.add_emiter({
                delay:0,
                limit:100,
                particle:()=>{
                    const speed=random.float(25,30)
                    const radius = Math.max(this.game.cam2d.width, this.game.cam2d.height) * random.float(0.9,1.1)
                    const ang = random.rad()

                    const spawn = v2.add(this.game.cam2d.position, v2.from_RadAngle(ang,radius))

                    const dirVec = v2.sub(this.game.cam2d.position, spawn)
                    const dir = Math.atan2(dirVec.y, dirVec.x)

                    const dist = v2.len(dirVec)*random.float(0.13,0.95)
                    const lifetime = dist / speed

                    return new RainParticle2D({
                        frame:{
                            main:{ image:"raindrop_1", layer:100,scale:random.float(0.4,0.7), },
                            wave:{ image:"raindrop_2" },
                        },
                        zindex:{
                            main:zIndexes.Rain1,
                            wave:zIndexes.Rain2,
                        },
                        position: spawn,
                        rotation: dir,
                        speed,
                        lifetime:lifetime,
                        decay_time:10,
                    })
                },
            enabled:false
        })
        this.ambient_particles_emitter=this.game.particles.add_emiter({
            delay:0,
            limit:10,
            particle:()=>{
                const ang=random.rad()
                const dir=random.rad()
                const ret=new ABParticle2D({
                    frame:{
                        image:random.choose(this.biome!.ambient.particles),
                        layer:100
                    },
                    life_time:random.float(10,30),
                    direction:dir,
                    position:v2.random2(this.game.cam2d.visual_position,v2.add(this.game.cam2d.visual_position,v2(this.game.cam2d.width,this.game.cam2d.height))),
                    speed:random.float(0.4,1),
                    angle:ang,
                    scale:random.float(0.5,1),
                    to:{
                        angle:ang+random.float(-6,6),
                        direction:dir+random.float(-3,3),
                    }
                })
                return ret
            },
            enabled:false
        })
        const snow_color1=ColorM.number(0xededff)
        snow_color1.a=0
        const snow_color2=ColorM.number(0xededff)
        this.snow_particles_emitter=this.game.particles.add_emiter({
            delay:0.05,
            particle:()=>{
                const ang=random.rad()
                const dir=random.rad()
                const ret=new ABParticle2D({
                    frame:{
                        image:"snow_particle"
                    },
                    life_time:random.float(5,10),
                    direction:dir,
                    zIndex:zIndexes.Particles,
                    position:v2.random2(this.game.cam2d.visual_position,v2.add(this.game.cam2d.visual_position,v2(this.game.cam2d.width,this.game.cam2d.height))),
                    speed:random.float(0.1,0.7),
                    angle:ang,
                    scale:random.float(0.4,0.7),
                    tint:snow_color1,
                    to:{
                        angle:ang+random.float(-6,6),
                        direction:dir+random.float(-3,3),
                        scale:0.01,
                        tint:snow_color2,
                    }
                })
                return ret
            },
            enabled:false
        })
        this.game.sounds.init_html_sound_bindings("ui",this.game.resources)

        this.music=this.game.sounds.get_manipulative_si("music")??game.sounds.add_manipulative_si("music")
        this.music.volume=0.4
        this.ambience=game.sounds.add_manipulative_si("ambience")
        this.ambience.volume=0.25
        this.game.sounds.signals.on("load",async()=>{
            await this.game.resources.load_audio("menu_music",{src:`/sounds/musics/menu_music_${random.int(1,2)}.mp3`,volume:1},"essentials")
            await this.game.resources.load_audio("gameover_music",{src:`/sounds/musics/game_over_music_1.mp3`,volume:1},"essentials")
            const menu_music=this.game.resources.get_audio(`menu_music`)
            this.music.set(menu_music)
        })

        /*this.light_map.zIndex=zIndexes.Lights
        this.light_map.layer=1000
        this.light_map.ambient = 0
        this.light_map.quality=2
        this.game.cam2d.addObject(this.light_map)*/
    }
    on_game_close(){
        this.end_game=false
        this.music.set(this.game.resources.get_audio("menu_music"),true)
        this.ambience.set(undefined)
        this.last_music_pos=0
    }
    on_game_start(){
        this.end_game=false
        this.music.set(this.game.resources.get_audio("level_music"),true)
        this.reload()
        this.last_music_pos=0
    }
    clear(){
        this.music.set(undefined)
        this.ambience.set(undefined)
    }
    reload(){
        this.biome=this.game.terrain.biome!
        if(this.biome.ambient.sound){
            this.ambience.set(this.game.resources.get_audio(this.biome.ambient.sound),true)
        }else{
            this.ambience.set(null)
        }
        if(this.game.save.get_variable("sv_graphics_climate")){
            this.ambient_particles_emitter.enabled=(this.biome?.ambient.particles!=undefined&&this.biome.ambient.particles.length>0)
            this.rain_particles_emitter.enabled=(this.biome?.ambient.rain!)
            this.snow_particles_emitter.enabled=(this.biome?.ambient.snow!)
            this.ambience.set(this.game.resources.get_audio("storm_ambience"),true)
        }else{
            this.ambient_particles_emitter.enabled=false
            this.rain_particles_emitter.enabled=false
            this.snow_particles_emitter.enabled=false
        }
        this.musics=this.biome.musics??[]

        //this.game.light_map.ambient=0

        if(this.biome.ambient.snow){
            this.fog_enabled=true
            this.fog_color=5
            this.fog_saturate=0.8
            this.fog_constrast=0.75
        }

        this.global_ilumination=0.5
    }
    /*musics:string[]=[
        "game_snow_music_1",
        "game_snow_music_2",
    ]*/
    end_game=false
    grand_finale(){
        if(this.end_game)return
        /*this.end_game=true
        this.music.set(null)
        this.game.addTimeout(()=>{
            if(this.game.living_count[0]>2){
                this.end_game=false
                return
            }
            this.music.set(this.game.resources.get_audio(random.choose(this.ending_music)))
            this.game.guiManager.information_killbox_messages.push(`Grand Finale`)
        },3)*/
    }
    updateLightFromDate() {
        const { hour, minute } = this.date
        const time = hour + minute / 60

        let t = 0

        if (time >= 6 && time < 19) {
            t = (time - 6) / (19 - 6)
        } else {
            if (time >= 19) {
                t = 1 - ((time - 19) / (24 - 19))
            } else {
                t = 1 - (time / 6)
            }
        }
        const ambient = (1 - t) * 0.6
        this.light_map.ambient = ambient
    }
    update_camera(){
        if(!this.game.active_entity)return
        this.bullet_whiz_hitbox=new CircleHitbox2D(this.game.active_entity!.position,(this.game.active_entity!.base_hitbox as CircleHitbox2D).radius*6)
        this.rain_particles_emitter.limit=70/this.game.cam2d.zoom
        this.ambient_particles_emitter.limit=5/this.game.cam2d.zoom
    }
    render(){
    }
    update(dt:number){
        this.date.second+=dt
        if(this.date.second>=1){
            this.date.second=0
            this.date.minute++
            if(this.date.minute>=60){
                this.date.minute=0
                this.date.hour+=1
            }
            this.game.tab.update_header(this.date)
            //this.updateLightFromDate()
        }

        if(!this.game.game_over){
            if(!this.music.running&&this.musics.length>0){
                if(Math.random()<=0.0001){
                    this.music.set(this.game.resources.get_audio(random.choose(this.musics)))
                }
            }

            if(this.biome.ambient.rain){
                if(Math.random()<=0.005){
                    this.bolt()
                }
            }
        }
        /*if(this.game.living_count&&this.game.living_count[0]<=2){
            this.grand_finale()
        }*/
    }
    bolt_tween?:Tween<Lights2D>
    bolt(){
        if(this.bolt_tween){
        //
        }else{
        this.game.sounds.play(this.game.resources.get_audio(`thunder_${random.int(1,3)}`),{
    
        },"ambience")
        this.bolt_tween=this.game.add_tween({
            target: this,
            // deno-lint-ignore ban-ts-comment
            //@ts-ignore
            to: { global_ilumination: 1 },
            duration: 0.3,
            yoyo: true,
            ease:ease.elasticOut,
            onComplete: () => {
                this.bolt_tween = undefined;
            },
        }) as unknown as Tween<Lights2D>
        }
    }
}