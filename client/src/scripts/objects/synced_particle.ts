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
    tweens:Tween<any>[]=[]

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
        for(const t of this.tweens)t.kill()
    }
    override update(dt:number){
        if(!this.def)return
        super.update(dt)

        this.sprite.position=this.position
        this.sprite.rotation=this.physical_data.rotation

        this.time+=dt

        if(this.time>=this.def.lifetime&&!this.dead){
            this.dead=true
            for(const t of this.tweens)t.kill()

            this.game.add_timeout(()=>this.destroy(),this.def.animation?.destroy?.time??0)
            if(this.def.animation?.destroy){
                if(this.def.animation.destroy.alpha){
                    const t=this.game.add_tween({
                        target:this.sprite.tint,
                        to:{
                            a:this.def.animation.destroy.alpha.to
                        },
                        duration:this.def.animation.destroy.alpha.duration,
                    })
                    this.tweens.push(t)
                }
                if(this.def.animation.destroy.scale){
                    const t=this.game.add_tween({
                        target:this.sprite.scale,
                        to:{
                            x:this.def.animation.destroy.scale.to,
                            y:this.def.animation.destroy.scale.to,
                        },
                        duration:this.def.animation.destroy.scale.duration,
                    })
                    this.tweens.push(t)
                }
            }
        }
    }
    set_definition(def:SyncedParticleDef){
        if(this.def)return
        this.def=def
        this.sprite.hotspot=CenterHotspot
        this.sprite.zIndex=zIndexes.SyncedParticle

        this.sprite.set_frame(def.frame,this.game.resources)

        if(def.animation?.spawn){
            if(def.animation.spawn.alpha){
                this.sprite.tint.a=def.animation.spawn.alpha.from
                const t=this.game.add_tween({
                    target:this.sprite.tint,
                    to:{
                        a:def.animation.spawn.alpha.to
                    },
                    duration:def.animation.spawn.alpha.duration,
                    onComplete:()=>{
                        const idx=this.tweens.indexOf(t)
                        if(idx!==-1)this.tweens.splice(idx,1)
                    }
                })
                this.tweens.push(t)
            }
            if(def.animation.spawn.scale){
                const t=this.game.add_tween({
                    target:this.sprite.scale,
                    to:{
                        x:def.animation.spawn.scale.to,
                        y:def.animation.spawn.scale.to,
                    },
                    duration:def.animation.spawn.scale.duration,
                    onComplete:()=>{
                        const idx=this.tweens.indexOf(t)
                        if(idx!==-1)this.tweens.splice(idx,1)
                    }
                })
                this.tweens.push(t)
            }
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