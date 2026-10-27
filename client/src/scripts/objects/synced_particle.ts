import { Sprite2D, type Tween } from "common/engine/web.ts"
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts"
import { SyncedParticleDef } from "common/scripts/definitions/objects/synced_particles.ts";
import { MovingBody } from "./moving_body.ts";
import { CircleHitbox2D, Stream, v2 } from "common/engine/core.ts";

export class SyncedParticle extends MovingBody{
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

    constructor(){
        super()
    }
    override on_create(_args: Record<string,any>): void {
        this.base_hitbox=new CircleHitbox2D(v2.zero(),3)
        this.scene.camera.add_object(this.sprite)
    }
    override on_layer_set(): void {
        this.sprite.layer=this.layer
    }
    override on_destroy(): void {
        for(const t of this.tweens)t.kill()
        const time=this.time>=0.98?this.def.animation?.destroy?.time??0:0
        this.game.clock.add_timeout(()=>{
            this.sprite.destroy()
            for(const t of this.tweens)t.kill()
        },time)
        if(time){
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
    override on_tick(dt:number){
        if(!this.def)return
        super.on_tick(dt)

        this.sprite.position=this.position
        this.sprite.rotation=this.rotation

        this.time+=dt
    }
    set_definition(def:SyncedParticleDef){
        if(this.def)return
        this.def=def
        this.sprite.hotspot=v2.half_one
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
    override on_decode_net(stream:Stream,full: boolean):void{
        super.decode_physical_data(stream,full)
        if (full) {
            this.time=stream.read_float(0,60,2)
            const id=stream.read_uint8()
            this.set_definition(this.game.definitions.synced_particles.getFromNumber(id))
        }
    }
}