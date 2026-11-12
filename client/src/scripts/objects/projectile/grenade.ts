import { CircleCollider2D, ColorM, gel_events, GELComponent, matrix4, Numeric, type Particle2D, type ParticlesEmitter2D, random, Stream, v2, v2m } from "common/engine/core.ts";
import { ABParticle2D, Sprite2D } from "common/engine/web.ts";
import { type GrenadeDef } from "common/scripts/definitions/items/grenades.ts";
import { c_grenade, type C_Grenade, si_grenade, type SI_Grenade } from "common/scripts/game/objects/projectile/grenade.ts";
import { projectile_events } from "common/scripts/game/objects/projectile/projectile.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { FloorKind, Floors, FloorType } from "common/scripts/others/terrain.ts";
import { GameObject } from "../../main/gel.ts";

export type CC_Grenade=GameObject&C_Grenade&{
    sprite:Sprite2D
    particles_spawner?:ParticlesEmitter2D<Particle2D>
    visual_position:{x:number,y:number}
    visual_rotation:number

    tick_visual(dt:number):void
    finish():void
}

export const cc_grenade:GELComponent<CC_Grenade>={
    id_string:"cc_grenade",
    extensions:[c_grenade],
    events:{
        [gel_events.bind](){
            this.allow_tick=true
            this.sprite=new Sprite2D()
            this.sprite.hotspot=v2.half_one
            this.sprite.visible=false
            this.visual_position=v2.zero()
            this.visual_rotation=0
        },
        [gel_events.create](){
            this.scene.camera.add_object(this.sprite)
        },
        [gel_events.layer_set](){
            this.sprite.layer=this.layer
        },
        [gel_events.destroy](){
            this.sprite.destroy()
            if(this.particles_spawner)this.particles_spawner.destroyed=true
        },
    },
    methods:{
        set_definition(def:GrenadeDef){
            if(this.def)return
            this.def=def
            this.base_collider=new CircleCollider2D(v2(0,0),def.radius)
            this.sprite.hotspot=v2.half_one
            this.sprite.zIndex=def.z_index_air??zIndexes.GrenadeAir1
            this.sprite.set_frame(def.frames.world,this.app.resources)
            this.sprite.visible=true
            this.visual_position=v2.clone(this.position)
            this.visual_rotation=this.rotation
            if(def.particles){
                const p=def.particles
                this.particles_spawner=this.scene.particles.add_emiter({
                    delay:p.delay,
                    particle:()=>{
                        const ang=random.rad()
                        const col=ColorM.number(p.tint)
                        const col2=ColorM.clone(col)
                        col2.a=0
                        const pos=v2.rotate_RadAngle(p.spawn,this.visual_rotation)
                        v2m.add(pos,pos,this.visual_position)
                        return new ABParticle2D({
                            direction:ang,
                            frame:p.frame,
                            life_time:random.random1(p.lifetime),
                            position:pos,
                            speed:random.random1(p.speed),
                            tint:col,
                            angle:ang,
                            scale:0.01,
                            zIndex:zIndexes.Particles,
                            layer:this.layer,
                            to:{
                                scale:1,
                                tint:col2,
                            },
                        })
                    },
                    enabled:false,
                }) as ParticlesEmitter2D<Particle2D>
                this.app.clock.add_timeout(()=>{
                    if(this.particles_spawner)this.particles_spawner.enabled=true
                },p.spawn_delay??0)
            }
        },
        tick_visual(_dt:number){
            if(!this.def)return
            const s=(this.def.zBaseScale+(this.def.zScaleAdd*this.zpos))*2
            this.sprite.position=this.visual_position
            this.sprite.rotation=this.visual_rotation
            this.sprite.scale=v2(s,s)
            const air=this.def.z_index_air??zIndexes.GrenadeAir1
            if(this.zpos===0){
                if(this.sprite.zIndex===air){
                    const map=this.scene.map
                    const floor=map?map.terrain.get_floor_type(this.position,this.layer,FloorType.Void) as FloorType:FloorType.Void
                    const floor_def=Floors[floor]
                    if(floor_def?.footstep_sounds&&floor_def.footstep_sounds.length>0){
                        this.app.sounds.play(this.app.resources.get_sound(random.choose(floor_def.footstep_sounds)),{
                            position:v2.clone(this.position),
                            max_distance:15,
                            volume:0.4,
                            bus:"explosions",
                        })
                    }
                    if(floor_def?.floor_kind===FloorKind.Liquid){
                        this.scene.particles.add_particle(new ABParticle2D({
                            direction:0,
                            frame:{
                                image:"riple",
                                hotspot:v2.half_one,
                                zIndex:zIndexes.Decals,
                                layer:this.layer,
                                scale:0,
                            },
                            life_time:0.5,
                            position:v2.clone(this.position),
                            speed:0,
                            to:{
                                scale:3,
                                tint:ColorM.default.transparent,
                            },
                        }))
                    }
                }
                this.sprite.zIndex=zIndexes.GrenadeGround
                this.sprite.matrix=undefined
            }else{
                this.sprite.zIndex=air
                if(this.def.parralax!==undefined&&this.app.save.settings.get_var("graphics_perspective")){
                    this.sprite.matrix=matrix4.parallax_2d(this.scene.camera.position,1+(this.def.parralax*this.zpos))
                    this.sprite.propertys={no_layer_parallax:true}
                }
            }
        },
        finish(){
            if(this.finished)return
            this.finished=true
            this.emit_event(projectile_events.finish)
            this.destroy()
        },
    },
}

export const ccs_grenade:GELComponent<CC_Grenade&SI_Grenade>={
    id_string:"ccs_grenade",
    extensions:[si_grenade,cc_grenade],
    events:{
        [gel_events.tick](dt:number){
            this.visual_position=v2.clone(this.position)
            this.visual_rotation=this.rotation
            this.tick_visual(dt)
        },
    },
}

export const ccn_grenade:GELComponent<CC_Grenade>={
    id_string:"ccn_grenade",
    extensions:[cc_grenade],
    events:{
        [gel_events.net_decode](stream:Stream,full:boolean){
            this.position=stream.read_pos2()
            this.rotation=stream.read_rad()
            this.zpos=stream.read_float(0,1,1)
            if(full){
                const def=this.app.definitions.grenades.getFromNumber(stream.read_uint16())
                this.owner_id=stream.read_id()
                this.set_definition(def)
            }
            if(full||!this.app.save.settings.get_var("game_interpolation")){
                this.visual_position=v2.clone(this.position)
                this.visual_rotation=this.rotation
            }
        },
        [gel_events.tick](dt:number){
            if(this.app.save.settings.get_var("game_interpolation")){
                const t=Numeric.clamp(dt*20,0,1)
                v2m.lerp(this.visual_position,this.position,t)
                this.visual_rotation=Numeric.lerp_rad(this.visual_rotation,this.rotation,t)
            }
            this.tick_visual(dt)
        },
    },
}
