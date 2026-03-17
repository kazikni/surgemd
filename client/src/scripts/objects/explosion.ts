import { ExplosionDef } from "common/scripts/definitions/objects/explosions.ts";
import { GameObject } from "../others/gameObject.ts";
import { ABParticle2D, CenterHotspot, CircleHitbox2D, ColorM, NetStream, random, Sprite2D, v2 } from "common/engine/client.ts";
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts";
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
    t:number=0
    constructor(){
        super()
        this.sprite.visible=false
        this.sprite.hotspot=CenterHotspot
        this.sprite.size=v2.new(300,300)
    }
    override on_layer_set(layer: number): void {
        this.sprite.layer=layer
    }
    create(_args: Record<string, void>): void {
        this.base_hitbox=new CircleHitbox2D(v2.new(0,0),0)

        this.sprite.frame=this.game.resources.get_sprite("base_explosion")
        this.game.cam2d.addObject(this.sprite)
    }
    update(dt:number): void {
        if(this.def){
            this.sprite.tint.a=1-this.t
            this.t+=3*dt;
            (this.base_hitbox as CircleHitbox2D).radius=this.maxRadius*this.t
            this.sprite.scale=v2.new((this.base_hitbox as CircleHitbox2D).radius,(this.base_hitbox as CircleHitbox2D).radius)
            if(this.t>=1){
                this.destroy()
            }
        }
    }
    override on_destroy(): void {
      this.sprite.destroy()
    }
    override decode(stream: NetStream, _full: boolean): void {
        const pos=stream.readPos2()
        this.position=pos

        this.maxRadius=stream.readFloat(0,50,3)

        this.set_definition(this.game.definitions.explosions.getFromNumber(stream.readID()))

        this._base_hitbox=new CircleHitbox2D(v2.new(0,0),this.maxRadius)

        this.sprite.position=this.position
        this.sprite.visible=true
    }
    set_definition(def:ExplosionDef){
        if(this.def)return
        this.def=def

        this.def=def
        this.sprite.tint=ColorM.hex(this.def.tint)
        
        if(this.def.assets&&this.game.play_sounds)this.game.sounds.play(this.game.resources.get_audio(this.def.assets.sound),{
            position:this.position,
            max_distance:150,
            rolloffFactor:0.5
        },"explosions")

        if(def.particles){
            for(const p of def.particles){
                for(let i=0;i<p.count;i++){
                    this.game.particles.add_particle(new ABParticle2D({
                        frame:{
                            layer:this.layer,
                            hotspot:CenterHotspot,
                            ...p.frame,
                        },
                        scale:p.frame.scale,
                        zIndex:zIndexes.Particles,
                        direction:random.deg(),
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
    }
}