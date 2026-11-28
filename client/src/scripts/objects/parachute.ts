import { ColorM, matrix4, Numeric, random, Stream, v2, v2m } from "common/engine/core.ts";
import { ABParticle2D, Sprite2D } from "common/engine/web.ts";
import { object_instance_type, ObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { FloorKind, Floors, FloorType } from "common/scripts/others/terrain.ts";
import { GameObject } from "../main/gel.ts";

export class Parachute extends GameObject{
    time:number=0
    lifetime:number=10
    sprite:Sprite2D=new Sprite2D()

    constructor(){
        super()
        this.object_type=ObjectType.Parachute
        this.instance_type=object_instance_type.parachute
        this.allow_tick=true
        this.sprite.layer=99999
        this.sprite.propertys={no_layer_parallax:true,all_layers:true}
    }
    on_create(){
        this.sprite.set_frame({
            image:"parachute",
            scale:2,
            hotspot:v2.half_one,
            zIndex:zIndexes.Parachute
        },this.app.resources)
        this.scene.camera.add_object(this.sprite)
    }
    on_destroy(){
        this.sprite.destroy()
    }
    land(){
        const floor=Floors[this.scene.map.terrain.get_floor_type(this.position,this.layer,FloorType.Void) as FloorType]
        if(floor?.floor_kind===FloorKind.Liquid){
            this.app.sounds.play(this.app.resources.get_sound("airdrop_landed_liquid"),{
                position:v2.clone(this.position),
                max_distance:30,
            })
            for(let i=0;i<7;i++){
                this.scene.particles.add_particle(new ABParticle2D({
                    frame:{image:"riple",hotspot:v2.half_one,zIndex:zIndexes.Decals,layer:this.layer,scale:0},
                    life_time:0.75,
                    position:v2.add(this.position,random.random_in_circle(2)),
                    speed:0,
                    direction:0,
                    to:{tint:ColorM.default.transparent,scale:6}
                }))
            }
        }else{
            this.app.sounds.play(this.app.resources.get_sound("airdrop_landed"),{
                position:v2.clone(this.position),
                max_distance:30,
            })
        }
    }
    on_tick(dt:number){
        this.time+=dt
        if(this.time>=this.lifetime){
            this.time=this.lifetime
            this.land()
            this.destroy()
            return
        }
        const t=Numeric.clamp(1-this.time/this.lifetime,0,1)
        v2m.single(this.sprite.scale,1.3+1.25*t)
        this.sprite.position=this.position
        this.sprite.zIndex=zIndexes.Airbodys+t
        if(this.app.save.settings.get_var("graphics_perspective")){
            this.sprite.matrix=matrix4.parallax_2d(this.scene.camera.position,1.03+t)
        }
    }
    on_decode_net(stream:Stream,full:boolean){
        this.time=stream.read_float(0,30,2)
        if(full){
            this.position=stream.read_pos2()
            this.lifetime=stream.read_float(0,30,2)
        }
    }
}
