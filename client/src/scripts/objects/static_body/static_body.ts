import { Color, ColorM, ease, gel_events, GELComponent, random, Vec2 } from "common/engine/core.ts";
import { ABParticle2D, Sound } from "common/engine/web.ts";
import { c_static_body, C_StaticBody } from "common/scripts/game/objects/static_body/static_body.ts";
import { HitParticlesDef, HitSoundsDef } from "common/scripts/definitions/utils.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { GraphicsDConfig } from "../../main/config.ts";
import { GameObject } from "../../main/gel.ts";

export type CC_StaticBody=C_StaticBody&GameObject&{
    assets:{
        particles:{
            tint?:Color
            images:string[]
        }
        sounds:{
            hit?:Sound[]
            break?:Sound
        }
    }
    add_own_particle(position:Vec2,force?:number,small?:boolean):void
    on_hitted(position:Vec2,_critical?:boolean):void
    set_hit_sounds_def(sounds:HitSoundsDef):void
    set_hit_particles_def(id:string,variation:number,particles:HitParticlesDef):void
}
export const cc_static_body:GELComponent<CC_StaticBody>={
    id_string:"cc_static_body",
    extensions:[c_static_body],
    events:{
        [gel_events.bind]:function(){
            this.assets={
                particles:{images:[]},
                sounds:{}
            }
        }
    },
    methods:{
        add_own_particle(position:Vec2,force=1,small=false){
            const particles=this.assets.particles
            if(!particles||particles.images.length===0)return

            const angle=random.rad()
            const p=new ABParticle2D({
                frame:{
                    image:random.choose(particles.images),
                    layer:this.layer
                },
                position,
                speed:random.float(1,2)*force,
                angle,
                direction:random.rad(),
                life_time:random.float(1,2),
                zIndex:zIndexes.Particles,
                scale:small?random.float(0.2,0.5):random.float(0.5,1),
                tint:particles.tint,
                to:{
                    speed:random.float(0.1,0.2),
                    angle:angle+random.neg_float(0.1,4),
                    tint:particles.tint===undefined?ColorM.default.transparent:ColorM.mult_rgba(particles.tint,1,1,1,0),
                    tint_ease:ease.quarticIn
                }
            })
            this.scene.particles.add_particle(p)
        },
        on_hitted(position:Vec2,_critical=false){
            if(this.app.save.settings.get_var("graphics_particles")>=GraphicsDConfig.Normal){
                this.add_own_particle(position,1,true)
            }

            const sounds=this.assets.sounds.hit
            if(sounds&&sounds.length>0){
                this.app.sounds.play(random.choose(sounds),{
                    position,
                    max_distance:12,
                    bus:"obstacles"
                })
            }
        },
        set_hit_sounds_def(sounds:HitSoundsDef){
            this.assets.sounds={}
            if(sounds.hit){
                this.assets.sounds.hit=[]
                if(sounds.hit_variations){
                    for(let i=1;i<=sounds.hit_variations;i++){
                        this.assets.sounds.hit.push(this.app.resources.get_sound(`${sounds.hit}_${i}`))
                    }
                }else{
                    this.assets.sounds.hit.push(this.app.resources.get_sound(sounds.hit))
                }
            }
            if(sounds.break){
                this.assets.sounds.break=this.app.resources.get_sound(sounds.break)
            }
        },
        set_hit_particles_def(id:string,variation:number,particles:HitParticlesDef){
            this.assets.particles={
                images:[]
            }

            const particle=particles.particle??`${id}_particle`

            if(particles.tint){
                this.assets.particles.tint=ColorM.number(
                    typeof particles.tint==="number"?particles.tint:particles.tint[variation]
                )
            }

            if(particles.variations){
                for(let i=0;i<particles.variations;i++){
                    this.assets.particles.images.push(`${particle}_${i+1}`)
                }
            }else{
                this.assets.particles.images.push(particle)
            }
        },
    }
}