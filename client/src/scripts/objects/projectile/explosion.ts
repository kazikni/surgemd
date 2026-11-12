import { CircleCollider2D, ColorM, gel_events, GELComponent, Numeric, random, Stream, v2, v2m } from "common/engine/core.ts";
import { ABParticle2D, Sprite2D } from "common/engine/web.ts";
import { type ExplosionDef } from "common/scripts/definitions/objects/explosions.ts";
import { c_explosion, type C_Explosion, si_explosion, type SI_Explosion } from "common/scripts/game/objects/projectile/explosion.ts";
import { projectile_events } from "common/scripts/game/objects/projectile/projectile.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { FloorKind, Floors, FloorType } from "common/scripts/others/terrain.ts";
import { GameObject } from "../../main/gel.ts";

export type CC_Explosion=GameObject&C_Explosion&{
    sprite:Sprite2D
    max_radius:number
    t:number
    exploded:boolean

    explode():void
    finish():void
}

export const cc_explosion:GELComponent<CC_Explosion>={
    id_string:"cc_explosion",
    extensions:[c_explosion],
    events:{
        [gel_events.bind](){
            this.allow_tick=true
            this.max_radius=3
            this.t=0
            this.exploded=false
            this.sprite=new Sprite2D()
            this.sprite.visible=false
            this.sprite.hotspot=v2.half_one
            this.sprite.size=v2(400,400)
            this.sprite.zIndex=zIndexes.Explosions
        },
        [gel_events.create](){
            this.sprite.frame=this.app.resources.get_frame("base_explosion")
            this.scene.camera.add_object(this.sprite)
        },
        [gel_events.layer_set](){
            this.sprite.layer=this.layer
        },
        [gel_events.destroy](){
            this.sprite.destroy()
        },
        [gel_events.tick](dt:number){
            if(!this.def)return
            this.explode()
            this.sprite.tint.a=Numeric.clamp(Math.floor(255*(1-this.t)),0,255)
            this.t+=2.5*dt
            const r=this.max_radius*this.t
            this.sprite.scale=v2(r,r)
            if(this.t>=1&&this.finished)this.destroy()
        },
    },
    methods:{
        set_definition(def:ExplosionDef){
            this.def=def
            this.radius=def.size.end
            this.base_collider=new CircleCollider2D(v2(0,0),this.radius)
            this.max_radius=this.radius*(def.size.visual??1)
            this.sprite.tint=ColorM.hex(def.tint)
            this.sprite.position=this.position
            this.sprite.visible=true
        },
        explode(){
            if(this.exploded||!this.def)return
            this.exploded=true
            this.sprite.position=this.position
            const map=this.scene.map
            const floor=map?map.terrain.get_floor_type(this.position,this.layer,FloorType.Void) as FloorType:FloorType.Void
            const floor_def=Floors[floor]
            const liquid=floor_def?.floor_kind===FloorKind.Liquid
            if(this.def.assets){
                this.app.sounds.play(this.app.resources.get_sound(this.def.assets.liquid_sound&&liquid?this.def.assets.liquid_sound:this.def.assets.sound),{
                    position:v2.clone(this.position),
                    max_distance:150,
                    bus:"explosions",
                })
            }
            if(liquid){
                for(let i=0;i<5;i++){
                    const pos=random.random_in_circle(this.radius/2)
                    v2m.add(pos,pos,this.position)
                    this.scene.particles.add_particle(new ABParticle2D({
                        frame:{
                            image:"riple",
                            hotspot:v2.half_one,
                            zIndex:zIndexes.Decals,
                            layer:this.layer,
                            scale:0,
                        },
                        life_time:0.6,
                        position:pos,
                        speed:0,
                        direction:0,
                        to:{
                            tint:ColorM.default.transparent,
                            scale:5,
                        },
                    }))
                }
            }
            for(const p of this.def.particles??[]){
                for(let i=0;i<p.count;i++){
                    this.scene.particles.add_particle(new ABParticle2D({
                        frame:{
                            layer:this.layer,
                            hotspot:v2.half_one,
                            ...p.frame,
                        },
                        scale:p.frame.scale,
                        zIndex:zIndexes.Particles,
                        direction:random.rad(),
                        life_time:random.float(p.lifetime.min,p.lifetime.max),
                        position:v2.clone(this.position),
                        speed:random.float(p.speed.min,p.speed.max),
                        tint:ColorM.hex("#fff5"),
                        to:{
                            tint:ColorM.hex("#fff0"),
                            scale:1,
                        },
                    }))
                }
            }
            if(this.def.cam_shake){
                if(v2.distance(this.position,this.scene.camera.position)<=(this.def.cam_shake.distance??40)){
                    this.scene.camera.shake(this.def.cam_shake.intensity*0.2,this.def.cam_shake.duration)
                }
            }
        },
        finish(){
            if(this.finished)return
            this.finished=true
            this.emit_event(projectile_events.finish)
        },
    },
}

export const ccs_explosion:GELComponent<CC_Explosion&SI_Explosion>={
    id_string:"ccs_explosion",
    extensions:[si_explosion,cc_explosion],
}

export const ccn_explosion:GELComponent<CC_Explosion>={
    id_string:"ccn_explosion",
    extensions:[cc_explosion],
    events:{
        [gel_events.bind](){
            this.finished=true
        },
        [gel_events.net_decode](stream:Stream,_full:boolean){
            this.position=stream.read_pos2()
            stream.read_float(0,50,3)
            const def=this.app.definitions.explosions.getFromNumberSafe(stream.read_uint16())
            if(!def){
                this.destroy()
                return
            }
            if(!this.def)this.set_definition(def)
        },
    },
}
