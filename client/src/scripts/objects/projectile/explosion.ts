import { CircleCollider2D, ColorM, Numeric, random, Stream, v2, v2m } from "common/engine/core.ts";
import { ABParticle2D, Sprite2D } from "common/engine/web.ts";
import { type ExplosionDef } from "common/scripts/definitions/objects/explosions.ts";
import { object_instance_type, ObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { FloorKind, Floors, FloorType } from "common/scripts/others/terrain.ts";
import { GameObject } from "../../main/gel.ts";

export class Explosion extends GameObject{
    def!:ExplosionDef
    sprite=new Sprite2D()
    radius:number=0
    max_radius:number=3
    t:number=0
    exploded:boolean=false

    constructor(){
        super()
        this.object_type=ObjectType.Explosion
        this.instance_type=object_instance_type.explosion
        this.allow_tick=true
        this.sprite.visible=false
        this.sprite.hotspot=v2.half_one
        this.sprite.size=v2(400,400)
        this.sprite.zIndex=zIndexes.Explosions
    }

    on_create(){
        this.sprite.frame=this.app.resources.get_frame("base_explosion")
        this.scene.camera.add_object(this.sprite)
    }
    on_layer_set(){
        this.sprite.layer=this.layer
    }
    on_destroy(){
        this.sprite.destroy()
    }

    on_decode_net(stream:Stream){
        this.position=stream.read_pos2()
        this.radius=stream.read_float(0,50,3)
        const def=this.app.definitions.explosions.getFromNumberSafe(stream.read_uint16())
        if(!def){
            this.destroy()
            return
        }
        if(this.def)return
        this.def=def
        this.base_collider=new CircleCollider2D(v2(0,0),this.radius)
        this.max_radius=this.radius*(def.size.visual??1)
        this.sprite.tint=ColorM.hex(def.tint)
        this.sprite.position=this.position
        this.sprite.visible=true
    }

    on_tick(dt:number){
        if(!this.def)return
        this.explode()
        this.sprite.tint.a=Numeric.clamp(Math.floor(255*(1-this.t)),0,255)
        this.t+=2.5*dt
        const r=this.max_radius*this.t
        this.sprite.scale=v2(r,r)
        if(this.t>=1)this.destroy()
    }

    explode(){
        if(this.exploded)return
        this.exploded=true
        const map=this.scene.map
        const floor=Floors[map.terrain.get_floor_type(this.position,this.layer,FloorType.Void) as FloorType]
        const liquid=floor?.floor_kind===FloorKind.Liquid
        this.app.sounds.play(this.app.resources.get_sound(this.def.assets.liquid_sound&&liquid?this.def.assets.liquid_sound:this.def.assets.sound),{
            position:v2.clone(this.position),
            max_distance:150,
            bus:"explosions",
        })
        if(liquid){
            for(let i=0;i<5;i++){
                const pos=random.random_in_circle(this.radius/2)
                v2m.add(pos,pos,this.position)
                this.scene.particles.add_particle(new ABParticle2D({
                    frame:{image:"riple",hotspot:v2.half_one,zIndex:zIndexes.Decals,layer:this.layer,scale:0},
                    life_time:0.6,
                    position:pos,
                    speed:0,
                    direction:0,
                    to:{tint:ColorM.default.transparent,scale:5},
                }))
            }
        }
        for(const p of this.def.particles??[]){
            for(let i=0;i<p.count;i++){
                this.scene.particles.add_particle(new ABParticle2D({
                    frame:{layer:this.layer,hotspot:v2.half_one,...p.frame},
                    scale:p.frame.scale,
                    zIndex:zIndexes.Particles,
                    direction:random.rad(),
                    life_time:random.float(p.lifetime.min,p.lifetime.max),
                    position:v2.clone(this.position),
                    speed:random.float(p.speed.min,p.speed.max),
                    tint:ColorM.hex("#fff5"),
                    to:{tint:ColorM.hex("#fff0"),scale:1},
                }))
            }
        }
        const shake=this.def.cam_shake
        if(shake&&v2.distance(this.position,this.scene.camera.position)<=(shake.distance??40)){
            this.scene.camera.shake(shake.intensity*0.2,shake.duration)
        }
    }
}
