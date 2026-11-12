import { CircleCollider2D, ColorM, matrix4, Numeric, type Particle2D, type ParticlesEmitter2D, random, Stream, v2, v2m } from "common/engine/core.ts";
import { ABParticle2D, Sprite2D } from "common/engine/web.ts";
import { type GrenadeDef } from "common/scripts/definitions/items/grenades.ts";
import { object_instance_type, ObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { FloorKind, Floors, FloorType } from "common/scripts/others/terrain.ts";
import { GameObject } from "../../main/gel.ts";

export class Grenade extends GameObject{
    def!:GrenadeDef
    sprite=new Sprite2D()
    particles_spawner?:ParticlesEmitter2D<Particle2D>
    zpos:number=0
    rotation:number=0
    visual_position=v2.zero()
    visual_rotation:number=0

    constructor(){
        super()
        this.object_type=ObjectType.Grenade
        this.instance_type=object_instance_type.grenade
        this.allow_tick=true
        this.sprite.hotspot=v2.half_one
        this.sprite.visible=false
    }

    on_create(){
        this.scene.camera.add_object(this.sprite)
    }
    on_layer_set(){
        this.sprite.layer=this.layer
    }
    on_destroy(){
        this.sprite.destroy()
        if(this.particles_spawner)this.particles_spawner.destroyed=true
    }

    on_decode_net(stream:Stream,full:boolean){
        this.position=stream.read_pos2()
        this.rotation=stream.read_rad()
        this.zpos=stream.read_float(0,1,1)
        if(full){
            this.set_definition(this.app.definitions.grenades.getFromNumber(stream.read_uint16()))
            stream.read_id()
        }
        if(full||!this.app.save.settings.get_var("game_interpolation")){
            this.visual_position=v2.clone(this.position)
            this.visual_rotation=this.rotation
        }
    }

    set_definition(def:GrenadeDef){
        if(this.def)return
        this.def=def
        this.base_collider=new CircleCollider2D(v2(0,0),def.radius)
        this.sprite.zIndex=def.z_index_air??zIndexes.GrenadeAir1
        this.sprite.set_frame(def.frames.world,this.app.resources)
        this.sprite.visible=true
        if(!def.particles)return
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
                    to:{scale:1,tint:col2},
                })
            },
            enabled:false,
        }) as ParticlesEmitter2D<Particle2D>
        this.app.clock.add_timeout(()=>{
            if(this.particles_spawner)this.particles_spawner.enabled=true
        },p.spawn_delay??0)
    }

    on_tick(dt:number){
        if(!this.def)return
        if(this.app.save.settings.get_var("game_interpolation")){
            const t=Numeric.clamp(dt*20,0,1)
            v2m.lerp(this.visual_position,this.position,t)
            this.visual_rotation=Numeric.lerp_rad(this.visual_rotation,this.rotation,t)
        }
        const s=(this.def.zBaseScale+(this.def.zScaleAdd*this.zpos))*2
        this.sprite.position=this.visual_position
        this.sprite.rotation=this.visual_rotation
        this.sprite.scale=v2(s,s)
        const air=this.def.z_index_air??zIndexes.GrenadeAir1
        if(this.zpos===0){
            if(this.sprite.zIndex===air)this.land()
            this.sprite.zIndex=zIndexes.GrenadeGround
            this.sprite.matrix=undefined
        }else{
            this.sprite.zIndex=air
            if(this.def.parralax!==undefined&&this.app.save.settings.get_var("graphics_perspective")){
                this.sprite.matrix=matrix4.parallax_2d(this.scene.camera.position,1+(this.def.parralax*this.zpos))
                this.sprite.propertys={no_layer_parallax:true}
            }
        }
    }

    land(){
        const map=this.scene.map
        const floor=Floors[map.terrain.get_floor_type(this.position,this.layer,FloorType.Void) as FloorType]
        if(floor?.footstep_sounds?.length){
            this.app.sounds.play(this.app.resources.get_sound(random.choose(floor.footstep_sounds)),{
                position:v2.clone(this.position),
                max_distance:15,
                volume:0.4,
                bus:"explosions",
            })
        }
        if(floor?.floor_kind===FloorKind.Liquid){
            this.scene.particles.add_particle(new ABParticle2D({
                direction:0,
                frame:{image:"riple",hotspot:v2.half_one,zIndex:zIndexes.Decals,layer:this.layer,scale:0},
                life_time:0.5,
                position:v2.clone(this.position),
                speed:0,
                to:{scale:3,tint:ColorM.default.transparent},
            }))
        }
    }
}
