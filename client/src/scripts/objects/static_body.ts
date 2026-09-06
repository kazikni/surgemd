import { ABParticle2D, Sound } from "common/engine/web.ts"
import { GameObject } from "../others/gameObject.ts"
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts"
import { GraphicsDConfig } from "../others/config.ts";
import { HitParticlesDef, HitSoundsDef } from "common/scripts/definitions/utils.ts";
import { Color, ColorM, Hitbox2D, random, Vec2 } from "common/engine/core.ts";
export type StaticBodyPhysicalData={
    hitbox:Hitbox2D
    side:number

    reflect_bullets:boolean
    no_collision:boolean
    no_bullets_collision:boolean
    passable_by_bullets:boolean
}
export interface StaticBodyAssetData{
    particles?:{
        tint?:Color,
        images:string[]
    }
    sounds:{
        hit:Sound[]
    }
}
export abstract class StaticBody extends GameObject{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    string_type:string="static_body"
    number_type: number=GameObjectType.StaticBody

    abstract physical_data:StaticBodyPhysicalData
    constructor(){
        super()
    }

    abstract assets_data:StaticBodyAssetData

    _add_own_particle(position:Vec2,force:number=1,small:boolean=false){
        if(!this.assets_data.particles)return
        const tint=this.assets_data.particles.tint
        const p=new ABParticle2D({
            frame:{
                image:random.choose(this.assets_data.particles.images),
                layer:this.layer
            },
            position,
            speed:random.float(1,2)*force,
            angle:random.rad(),
            direction:random.rad(),
            life_time:random.float(1,2),
            zIndex:zIndexes.Particles,
            scale:small?random.float(0.2,0.5):random.float(0.5,1),
            tint:this.assets_data.particles.tint,
            to:{
                speed:random.float(0.1,1),
                angle:random.rad(),
                tint:ColorM.mult_rgba(tint??ColorM.default.white,1,1,1,0),
            }
        })
        this.scene.particles.add_particle(p)
    }
    on_hitted(position:Vec2,critical:boolean){
        if(this.game.save.get_variable("sv_graphics_particles")>=GraphicsDConfig.Normal)this._add_own_particle(position,undefined,true)
        if(this.assets_data.sounds&&this.assets_data.sounds.hit&&this.assets_data.sounds.hit.length>0){
            this.game.sounds.play(random.choose(this.assets_data.sounds.hit),{
                position:this.position,
                max_distance:12,
                bus:"obstacles"
            })
        }
    }

    set_hit_sounds_def(sounds:HitSoundsDef){
        this.assets_data.sounds.hit.length=0
        if(sounds.hit){
            if(sounds.hit_variations){
                for(let i=1;i<=sounds.hit_variations;i++){
                    this.assets_data.sounds.hit.push(this.game.resources.get_sound(sounds.hit+`_${i}`))
                }
            }else{
                this.assets_data.sounds.hit.push(this.game.resources.get_sound(sounds.hit))
            }
        }
    }
    set_hit_particles_def(id:string,variation:number,particles:HitParticlesDef){
        this.assets_data.particles={
            images:[],
        }
        const particle=particles.particle??id+"_particle"
        if(particles.tint)this.assets_data.particles.tint=ColorM.number(typeof particles.tint==="number"?particles.tint:particles.tint[variation])
        if(particles.variations){
            for(let i=0;i<particles.variations;i++){
                this.assets_data.particles.images.push(`${particle}_${i+1}`)
            }
        }else{
            this.assets_data.particles.images.push(particle)
        }
    }
}