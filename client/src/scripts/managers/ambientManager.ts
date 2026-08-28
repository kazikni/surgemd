import { ABParticle2D, ClientParticle2D, Lights2D, RainParticle2D, Sound, SoundController, Tween } from "common/engine/web.ts";
import { Layers, zIndexes } from "common/scripts/others/constants.ts";
import { type Game } from "../others/game.ts";
import { AmbientData } from "common/scripts/packets/general_update.ts";
import { CircleHitbox2D, ColorM, ease, KDate, matrix4, ParticlesEmitter2D, random, v2 } from "common/engine/core.ts";
import { GameState } from "../others/constants.ts";

export class AmbientManager{
    game:Game
    rain_particles_emitter:ParticlesEmitter2D<ClientParticle2D>
    ambient_particles_emitter:ParticlesEmitter2D<ClientParticle2D>
    snow_particles_emitter:ParticlesEmitter2D<ClientParticle2D>

    music:SoundController
    ambience:SoundController
    deadzone_ambience:SoundController

    fog_color:number=0
    fog_saturate:number=1
    fog_constrast:number=1
    fog_enabled:boolean=false

    finalization:boolean=false

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
            this.game.renderer.canvas.style.filter=`brightness(${val}) contrast(${1 + Math.max(0, val - 1) * 0.25})`
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
        this.rain_particles_emitter=this.game.scene_2d.particles.add_emiter({
                delay:0,
                limit:100,
                particle:()=>{
                    const speed=random.float(25,30)
                    const radius = Math.max(this.game.scene_2d.camera.width, this.game.scene_2d.camera.height) * random.float(0.9,1.1)
                    const ang = random.rad()

                    const spawn = v2.add(this.game.scene_2d.camera.position, v2.from_RadAngle(ang,radius))

                    const dirVec = v2.sub(this.game.scene_2d.camera.position, spawn)
                    const dir = Math.atan2(dirVec.y, dirVec.x)

                    const dist = v2.len(dirVec)*random.float(0.13,0.95)
                    const lifetime = dist / speed

                    return new RainParticle2D({
                        frame:{
                            main:{ image:"raindrop_1",layer:this.game.scene_2d.camera.layer,scale:random.float(0.4,0.7), },
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
                        on_tick:(o:RainParticle2D,dt:number)=>{
                            if(o.stage===0){
                                if(!o.sprite.matrix)o.sprite.matrix=matrix4.identity()
                                this.game.scene_2d.camera.get_topdown_perspective_2d(o.sprite.matrix,o.position,2-(1*(o.ticks/o.lifetime)),0)
                            }else{
                                o.sprite.matrix=undefined
                            }
                        }
                    })
                },
            enabled:false
        })
        this.ambient_particles_emitter=this.game.scene_2d.particles.add_emiter({
            delay:0,
            limit:10,
            particle:()=>{
                const ang=random.rad()
                const dir=random.rad()
                const ret=new ABParticle2D({
                    frame:{
                        image:random.choose(this.game.minimap.biome!.particles),
                        layer:this.game.scene_2d.camera.layer,
                    },
                    tint:ColorM.number(this.game.minimap.biome.particles_tint??0),
                    zIndex:zIndexes.Particles,
                    life_time:random.float(10,30),
                    direction:dir,
                    position:v2.random2(v2.sub(this.game.scene_2d.camera.position,this.game.scene_2d.camera.size),v2.add(this.game.scene_2d.camera.position,this.game.scene_2d.camera.size)),
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
        this.snow_particles_emitter=this.game.scene_2d.particles.add_emiter({
            delay:0.05,
            particle:()=>{
                const ang=random.rad()
                const dir=random.rad()
                const ret=new ABParticle2D({
                    frame:{
                        image:"snow_particle",
                        layer:this.game.scene_2d.camera.layer,
                    },
                    zIndex:zIndexes.Particles,
                    life_time:random.float(5,10),
                    direction:dir,
                    position:v2.random2(v2.sub(this.game.scene_2d.camera.position,this.game.scene_2d.camera.size),v2.add(this.game.scene_2d.camera.position,this.game.scene_2d.camera.size)),
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
        //this.game.sounds.init_html_sound_bindings("ui",this.game.resources)

        this.music=this.game.sounds.create_controller("music")
        this.ambience=this.game.sounds.create_controller("ambience")
        this.deadzone_ambience=this.game.sounds.create_controller("ambience")

        this.music.volume=0.4

        this.game.sounds.signals.on("unlock",async()=>{
            await this.game.resources.load_sound("menu_music",{src:`/assets/sounds/musics/menu_music.mp3`,volume:1})

            const video = document.getElementById("intro-video") as HTMLVideoElement
            const menu_music=this.game.resources.get_sound(`menu_music`)
            if(this.game.state===GameState.Idle)this.music.set(menu_music)
            if(this.game.menu.intro_fineshed){
                this.music.set(menu_music,{
                    loop:true
                })
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
        this.game.scene_2d.camera.add_object(this.light_map)*/
    }
    on_game_close(){
        this.music.set(this.game.resources.get_sound("menu_music"),{
            loop:true,
        })
        this.ambience.set(undefined)
        this.last_music_pos=0
        this.finalization=false
    }
    on_game_start(){
        this.music.set(this.game.resources.get_sound("level_music"),{
            loop:true
        })
        this.last_music_pos=0
        this.music.set(undefined)
        this.ambience.set(undefined)
        this.reload()
    }
    clear(){
        this.music.set(undefined)
        this.ambience.set(undefined)
    }
    update_day_light() {
        if(this.bolt_tween)return
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
        const rainDark = this.rain_value * 0.3

        this.global_ilumination = Math.max(light * (1 - rainDark),0.3)
    }
    set_rain_state(value:number=0,thunderstorm:number=0){
        if(!this.game.minimap.biome)return
        this.rain_value=value
        if(value<=0||this.game.scene_2d.camera.layer<Layers.Normal){
            if(this.game.minimap.biome.ambient_sound){
                this.ambience.set(this.game.resources.get_sound(this.game.minimap.biome.ambient_sound),{
                    loop:true,
                })
            }else{
                this.ambience.set(null)
            }
            this.thunders=0
            this.rain_particles_emitter.enabled=false
            this.snow_particles_emitter.enabled=false
        }else{
            this.rain_value=0
            this.thunders=thunderstorm
            this.rain_particles_emitter.enabled=true
            this.snow_particles_emitter.enabled=false
            if(thunderstorm){
                this.ambience.set(this.game.resources.get_sound("storm_ambience"),{
                    loop:true
                })
            }else{
                this.ambience.set(this.game.resources.get_sound("rain_ambience"),{
                    loop:true
                })
            }
        }
    }
    reload(){
        this.musics=this.game.minimap.biome.musics??[]

        /*if(this.game.minimap.biome.ambient_snow){
            this.fog_enabled=true
            this.fog_color=5
            this.fog_saturate=0.8
            this.fog_constrast=0.75
        }*/

        this.global_ilumination=1

        this.ambient_particles_emitter.enabled=true

        this.set_rain_state(0,0)
        this.deadzone_ambience_sound=this.game.resources.get_sound("deadzone_ambience")
    }
    end_game=false
    update_camera(){
        if(!this.game.active_entity)return
        this.bullet_whiz_hitbox=new CircleHitbox2D(this.game.active_entity!.position,(this.game.active_entity!.base_hitbox as CircleHitbox2D).radius*7)
        if(this.rain_value>0)this.rain_particles_emitter.limit=20+(this.rain_value*200)/this.game.scene_2d.camera.zoom
        else this.rain_particles_emitter.limit=0
    }
    render(){
    }
    update(dt:number){
        if(this.game.match_started)this.date.second+=dt
        if(this.date.second>=1){
            this.date.second=0
            this.date.minute++
            if(this.date.minute>=60){
                this.date.minute=0
                this.date.hour+=1
            }
            
            if(this.thunders>0&&this.rain_value){
                if(Math.random()<=this.thunders*0.5){
                    this.bolt()
                }
            }

            if(this.game.state===GameState.Playing&&!this.finalization&&!this.music.running&&this.musics.length>0){
                if(Math.random()<=0.009){
                    if(this.finding_music&&this.game.save.get_variable("sv_sounds_gameplay_music")){
                        const music=random.choose(this.musics)
                        this.game.resources.unload_sound("gameplay_music")
                        this.game.resources.load_sound("gameplay_music",{
                            src:music,
                            volume:1
                        }).then((v)=>{
                            if(this.finalization){
                                this.game.resources.unload_sound("gameplay_music")
                                return
                            }
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
            this.game.sounds.play(this.game.resources.get_sound(`thunder_${random.int(1,3)}`),{
                bus:"ambience"
            })
            this.bolt_tween=this.game.add_tween({
                target: this,
                // deno-lint-ignore ban-ts-comment
                //@ts-ignore
                to: { global_ilumination: 1.5 },
                duration: 0.3,
                yoyo: true,
                ease:ease.elasticOut,
                onComplete: () => {
                    this.bolt_tween = undefined;
                    
                },
            }) as unknown as Tween<Lights2D>
        }
    }
    start_finalization(){
        if(this.finalization)return
        this.finalization=true
        this.music.set(null)
        this.game.sounds.play(this.game.resources.get_sound("ui_final"),{
            bus:"ui",
            volume:0.75
        })
        if(this.game.save.get_variable("sv_sounds_gameplay_music")){
            this.game.resources.unload_sound("gameplay_music")
            this.game.resources.load_sound("gameplay_music",{
                src:"/assets/sounds/musics/finalization_music_1.mp3",
                volume:1
            }).then((v)=>{
                if(this.game.state===GameState.Gameover){
                    this.game.resources.unload_sound("gameplay_music")
                    return
                }
                this.music.set(v)
            })
        }
    }
}