import { ABParticle2D, CircleHitbox2D, ClientParticle2D, ColorM, ease, KDate, Lights2D, ManipulativeSoundInstance, ParticlesEmitter2D, RainParticle2D, random, Sound, Tween, v2 } from "common/engine/client.ts";
import { Layers, zIndexes } from "common/scripts/others/constants.ts";
import { type Game } from "../others/game.ts";
import { BiomeDef } from "common/scripts/definitions/maps/base.ts";
import { AmbientData } from "common/scripts/packets/general_update.ts";

export class AmbientManager{
    game:Game
    rain_particles_emitter:ParticlesEmitter2D<ClientParticle2D>
    ambient_particles_emitter:ParticlesEmitter2D<ClientParticle2D>
    snow_particles_emitter:ParticlesEmitter2D<ClientParticle2D>

    biome!:BiomeDef
    music:ManipulativeSoundInstance
    ambience:ManipulativeSoundInstance
    deadzone_ambience:ManipulativeSoundInstance

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
        day:0,
        hour:0,
        month:0,
        year:0
    }

    bullet_whiz_hitbox?:CircleHitbox2D
    last_music_pos:number=0

    finding_music:boolean=true
    musics:string[]=[]

    thunders:number=0
    rain_value:number=0
    deadzone_ambience_sound?:Sound

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
        this.deadzone_ambience=game.sounds.add_manipulative_si("ambience")

        this.game.resources.load_audio("menu_music",{src:`/sounds/musics/menu_music_${random.int(1,2)}.mp3`,volume:1},"essentials")
        this.game.resources.load_audio("gameover_music",{src:`/sounds/musics/game_over_music_1.mp3`,volume:1},"essentials")
        this.game.sounds.signals.on("load",()=>{
            const video = document.getElementById("intro-video") as HTMLVideoElement
            const menu_music=this.game.resources.get_audio(`menu_music`)
            if(this.game.menu.intro_fineshed){
                this.music.set(menu_music)
            }else{
                video.addEventListener("ended",()=>{
                    this.music.set(menu_music)
                })
            }
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
    update_day_light() {
        const time = this.date.hour + this.date.minute / 60

        let light = 0
        if (time < 5) {
            light = 0.4
        }else if (time >= 5 && time < 6) {
            const t = (time - 5) / 1
            light = 0.4 + (1.0 - 0.4) * t
        }else if (time >= 6 && time < 19) {
            light = 1.0
        }else if (time >= 19 && time < 20) {
            const t = (time - 19) / 1
            light = 1.0 - (1.0 - 0.4) * t
        }else{
            light = 0.4
        }

        light = ease.quadraticInOut(light)
        const rainDark = this.rain_value * 0.2

        this.global_ilumination = Math.max(light * (1 - rainDark),0.4)
    }
    set_rain_state(value:number=0,thunderstorm:number=0){
        this.rain_value=value
        if(value===0||!this.game.save.get_variable("sv_graphics_climate")||this.game.current_layer<Layers.Normal){
            if(this.biome.ambient.sound){
                this.ambience.set(this.game.resources.get_audio(this.biome.ambient.sound),true)
            }else{
                this.ambience.set(null)
            }
            this.thunders=thunderstorm
            this.rain_particles_emitter.enabled=false
            this.snow_particles_emitter.enabled=false
        }else{
            this.thunders=thunderstorm
            this.rain_particles_emitter.enabled=true
            this.snow_particles_emitter.enabled=false
            if(thunderstorm){
                this.ambience.set(this.game.resources.get_audio("storm_ambience"),true)
            }else{
                this.ambience.set(this.game.resources.get_audio("rain_ambience"),true)
            }
        }
    }
    reload(){
        this.biome=this.game.terrain.biome!
        /*if(){
            this.ambient_particles_emitter.enabled=(this.biome?.ambient.particles!=undefined&&this.biome.ambient.particles.length>0)
            this.rain_particles_emitter.enabled=(this.biome?.ambient.rain!)
            this.snow_particles_emitter.enabled=(this.biome?.ambient.snow!)
        }else{
        }*/
        this.musics=this.biome.musics??[]

        if(this.biome.ambient.snow){
            this.fog_enabled=true
            this.fog_color=5
            this.fog_saturate=0.8
            this.fog_constrast=0.75
        }

        this.global_ilumination=1

        this.set_rain_state(0,0)
        this.deadzone_ambience_sound=this.game.resources.get_audio("deadzone_ambience")
    }
    /*musics:string[]=[
        "game_snow_music_1",
        "game_snow_music_2",
    ]*/
    end_game=false
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

        if(this.rain_value>0)this.rain_particles_emitter.limit=(this.rain_value*150)/this.game.cam2d.zoom

        this.ambient_particles_emitter.limit=5/this.game.cam2d.zoom
    }
    render(){
    }
    update(dt:number){
        if(this.game.started)this.date.second+=dt
        if(this.date.second>=1){
            this.date.second=0
            this.date.minute++
            if(this.date.minute>=60){
                this.date.minute=0
                this.date.hour+=1
            }
            
            if(this.biome.ambient.rain&&this.thunders){
                if(Math.random()<=0.05){
                    this.bolt()
                }
            }

            if(!this.game.game_over){
                if(this.finding_music&&!this.music.running&&this.musics.length>0){
                    if(Math.random()<=0.01){
                        const music=random.choose(this.musics)
                        this.game.resources.load_audio("gameplay_music",{
                            src:music,
                            volume:1
                        },undefined,undefined,true).then((v)=>{
                            this.music.set(v)
                            this.finding_music=true
                        })
                        this.finding_music=false
                    }
                }
            }

            this.game.device.update_header(this.date)
            this.update_day_light()
        }

        /*if(this.game.living_count&&this.game.living_count[0]<=2){
            this.grand_finale()
        }*/
    }
    update_from_data(data:AmbientData){
        if(data.rain!==this.rain_value||data.thunder_storm!==this.thunders){
            this.set_rain_state(data.rain,data.thunder_storm)
        }
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