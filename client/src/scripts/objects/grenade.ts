import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { ABParticle2D, CenterHotspot, CircleHitbox2D, ColorM, Stream, Particle2D, ParticlesEmitter2D, random, Sprite2D, v2, v2m } from "common/engine/client.ts";
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts";
import { GrenadeDef } from "common/scripts/definitions/items/grenades.ts";
export type HumanPhysicalData=MovingBodyPhysicalData&{
    zpos:number
}
export class Grenade extends MovingBody{
    string_type:string="grenade"
    number_type: number=GameObjectType.Grenade

    sprite:Sprite2D=new Sprite2D

    physical_data:HumanPhysicalData={
        rotation:0,
        zpos:0
    }
    def!:GrenadeDef
    particles_spawner?:ParticlesEmitter2D<Particle2D>

    constructor(){
        super()
    }
    override on_create(_args: Record<string, void>): void {
        this.game.cam2d.add_object(this.sprite)
    }
    override on_layer_set(): void {
        this.sprite.layer=this.layer
    }
    override on_destroy(): void {
        this.sprite.destroy()
        if(this.particles_spawner)this.particles_spawner.destroyed=true
    }
    override on_tick(dt:number): void {
        super.on_tick(dt)
        const s=(this.def.zBaseScale+(this.def.zScaleAdd*this.physical_data.zpos))*2
        this.sprite.position=this.position
        this.sprite.rotation=this.physical_data.rotation
        this.sprite.scale=v2(s,s)
        if(this.physical_data.zpos===0){
            this.sprite.zIndex=zIndexes.GrenadeGround
        }else{
            this.sprite.zIndex=zIndexes.GrenadeAir
        }
    }
    set_definition(def:GrenadeDef){
        if(this.def)return
        this.def=def
        this.base_hitbox=new CircleHitbox2D(v2(0,0),this.def.radius)
        this.sprite.hotspot=CenterHotspot
        this.sprite.zIndex=zIndexes.GrenadeAir
        this.sprite.set_frame(this.def.frames.world,this.game.resources)
        if(def.particles){
            this.particles_spawner=this.game.particles.add_emiter({
                delay:def.particles!.delay,
                particle:()=>{
                    const ang=random.rad()
                    const col=ColorM.number(def.particles!.tint)
                    const col2=ColorM.clone(col)
                    col2.a=0
                    const pos=v2.rotate_RadAngle(def.particles!.spawn,this.physical_data.rotation)
                    v2m.add(pos,pos,this.position)
                    return new ABParticle2D({
                        direction:ang,
                        frame:def.particles!.frame,
                        life_time:random.random1(def.particles!.lifetime),
                        position:pos,
                        speed:random.random1(def.particles!.speed),
                        tint:col,
                        angle:ang,
                        scale:0.01,
                        layer:this.layer,
                        to:{
                            scale:1,
                            tint:col2
                        }
                    })
                },
                enabled:false
            }),
            this.game.add_timeout(()=>{
                if(this.particles_spawner)this.particles_spawner.enabled=true
            },def.particles!.spawn_delay??0)
        }
    }
    override on_decode_net(stream: Stream, full: boolean): void {
        this.decode_physical_data(stream,full)
        this.physical_data.zpos=stream.read_float(0,1,1)
        if(full){
            this.set_definition(this.game.definitions.grenades.getFromNumber(stream.read_id()))
        }
    }
}