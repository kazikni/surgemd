import { ExplosionDef } from "common/scripts/definitions/objects/explosions.ts";
import { GameObject } from "../others/gameObject.ts";
import { ABParticle2D, CenterHotspot, CircleHitbox2D, ColorM, Stream, random, Sprite2D, v2, v2m, Numeric } from "common/engine/client.ts";
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { FloorKind, Floors, FloorType } from "common/scripts/others/terrain.ts";
export class Explosion extends GameObject{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    string_type:string="explosion"
    number_type: number=GameObjectType.Explosion
    def!:ExplosionDef

    ////////////////////////////
    // Visual                 //
    ////////////////////////////
    sprite:Sprite2D=new Sprite2D()

    ////////////////////////////
    // State                   //
    ////////////////////////////
    maxRadius:number=3
    radius:number=0
    t:number=0
    constructor(){
        super()
        this.sprite.visible=false
        this.sprite.hotspot=CenterHotspot
        this.sprite.size=v2(400,400)

        this.allow_tick=true
    }
    override on_layer_set(): void {
        this.sprite.layer=this.layer
    }
    override on_create(_args: Record<string, void>): void {
        this.base_hitbox=new CircleHitbox2D(v2(0,0),0)
        this.sprite.frame=this.game.resources.get_frame("base_explosion")
        this.game.cam2d.add_object(this.sprite)
    }
    override on_tick(dt:number): void {
        this.explode()
        if(this.def){
            this.sprite.tint.a=Numeric.clamp(Math.floor(255*(1-this.t)),0,255)
            this.t+=2.5*dt
            const r=this.maxRadius*this.t
            this.sprite.scale=v2(r,r)
            if(this.t>=1){
                this.destroy()
            }
        }
    }
    override on_destroy(): void {
      this.sprite.destroy()
    }
    exploded:boolean=false
    explode(){
        if(this.exploded||!this.def)return
        this.exploded=true
        const floor=this.game.terrain.get_floor_type(this.position,this.layer,FloorType.Void) as FloorType
        const floor_def=Floors[floor]
        
        if(this.def.assets&&this.game.play_sounds){
            this.game.sounds.play(this.game.resources.get_sound(this.def.assets.liquid_sound&&floor_def.floor_kind===FloorKind.Liquid?this.def.assets.liquid_sound:this.def.assets.sound),{
                position:this.position,
                max_distance:150,
                bus:"explosions"
            })
        }
        if(floor_def.floor_kind===FloorKind.Liquid){
            for(let i=0;i<5;i++){
                const pos=random.random_in_circle(this.radius/2)
                v2m.add(pos,pos,this.position)
                this.game.particles.add_particle(new ABParticle2D({
                    frame:{
                        image:"riple",
                        hotspot:CenterHotspot,
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
                        scale:5
                    }
                }))
            }
        }
        if(this.def.particles){
            for(const p of this.def.particles){
                for(let i=0;i<p.count;i++){
                    this.game.particles.add_particle(new ABParticle2D({
                        frame:{
                            layer:this.layer,
                            hotspot:CenterHotspot,
                            ...p.frame,
                        },
                        scale:p.frame.scale,
                        zIndex:zIndexes.Particles,
                        direction:random.rad(),
                        life_time:random.float(p.lifetime.min,p.lifetime.max),
                        position:this.position,
                        speed:random.float(p.speed.min,p.speed.max),
                        tint:ColorM.hex("#fff5"),
                        to:{
                            tint:ColorM.hex("#fff0"),
                            scale:1
                        }
                    }))
                }
            }
        }
        if(this.def.cam_shake){
            if(v2.distance(this.position,this.game.cam2d.position)<=(this.def.cam_shake.distance??40))this.game.cam2d.shake(this.def.cam_shake.intensity*0.2,this.def.cam_shake.duration)
        }
    }
    set_definition(def:ExplosionDef){
        if(this.def)return
        this.def=def
        ;(this.base_hitbox as CircleHitbox2D).radius=this.radius
        this.maxRadius=(this.radius*(this.def.size.visual??1))
        this.sprite.tint=ColorM.hex(this.def.tint)
    }
    override on_decode_net(stream: Stream, _full: boolean): void {
        const pos=stream.read_pos2()
        this.position=pos

        this.radius=stream.read_float(0,50,3)

        this.set_definition(this.game.definitions.explosions.getFromNumber(stream.read_id()))

        this._base_hitbox=new CircleHitbox2D(v2(0,0),this.radius)

        this.sprite.position=this.position
        this.sprite.visible=true
    }
}