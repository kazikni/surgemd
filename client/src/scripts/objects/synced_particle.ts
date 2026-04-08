import { CenterHotspot, CircleHitbox2D, Color, ColorM, NetStream, Sprite2D, type Tween, v2, v2m } from "common/engine/client.ts"
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts"
import { SyncedParticleDef } from "common/scripts/definitions/objects/synced_particle.ts";
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts";

export class SyncedParticle extends MovingBody{
    override physical_data: MovingBodyPhysicalData;
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    string_type:string="synced_particle"
    number_type: number=GameObjectType.SyncedParticle
    def!:SyncedParticleDef

    sprite:Sprite2D=new Sprite2D()
    time:number=0
    dead:boolean=false
    tween?:Tween<Color>

    override on_layer_set(layer: number): void {
        this.sprite.layer=layer
    }
    // deno-lint-ignore no-explicit-any
    create(_args: Record<string,any>): void {
        this.base_hitbox=new CircleHitbox2D(v2.zero(),3)
        this.game.cam2d.addObject(this.sprite)
    }
    constructor(){
        super()
        this.physical_data={
            rotation:0
        }
    }

    override on_destroy(): void {
        this.sprite.destroy()
        if(this.tween)this.tween.kill()
    }
    override update(dt: number): void {
        if(!this.def)return
        super.update(dt)

        this.sprite.position=this.position
        this.sprite.rotation=this.physical_data.rotation

        if(this.dead){
            if(this.tween)this.tween.kill()
            this.tween=this.game.add_tween({
                target:this.sprite.tint,
                duration:0.5,
                to:{
                    a:0
                }
            })
        }else{
            this.time+=dt
            if(this.time>=this.def.lifetime){
                this.time=this.def.lifetime
                this.dead=true
            }
            const scal=(this.def.frame.scale??2)
            if(this.sprite.scale.x<scal){
                v2m.single(this.sprite.scale,this.sprite.scale.x+5*dt)
            }else if(this.sprite.scale.x!==scal){
                v2m.single(this.sprite.scale,scal)
            }
        }
    }
    set_definition(def:SyncedParticleDef){
        if(this.def)return
        this.def=def
        this.sprite.hotspot=CenterHotspot
        this.sprite.zIndex=zIndexes.SyncedParticle
        this.sprite.tint=ColorM.rgba(255,255,255,0)
        this.sprite.set_frame(def.frame,this.game.resources)
        v2m.single(this.sprite.scale,0.01)
        if(this.is_new){
            this.tween=this.game.add_tween({
                target:this.sprite.tint,
                duration:1,
                to:{
                    a:0.8
                }
            })
        }else{
            this.sprite.tint.a=0.8
        }
    }
    override decode(stream:NetStream,full: boolean):void{
        super.decode_physical_data(stream,full)
        if (full) {
            this.time=stream.readFloat(0,60,2)
            const id=stream.readUint8()
            this.set_definition(this.game.definitions.synced_particle.getFromNumber(id))
        }
    }
}