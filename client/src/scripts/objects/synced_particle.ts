import { Stream, type Tween, v2, v2m } from "common/engine/core.ts";
import { Sprite2D } from "common/engine/web.ts";
import { type SyncedParticleDef } from "common/scripts/definitions/objects/synced_particles.ts";
import { object_instance_type, ObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../main/gel.ts";

export class SyncedParticle extends GameObject{
    def!:SyncedParticleDef
    sprite:Sprite2D=new Sprite2D()
    rotation:number=0
    time:number=0
    tweens:Tween<any>[]=[]

    constructor(){
        super()
        this.object_type=ObjectType.SyncedParticle
        this.instance_type=object_instance_type.synced_particle
        this.allow_tick=true
        this.sprite.hotspot=v2.half_one
        this.sprite.zIndex=zIndexes.SyncedParticle
    }

    on_create(){
        this.scene.camera.add_object(this.sprite)
    }
    on_layer_set(){
        this.sprite.layer=this.layer
    }
    on_destroy(){
        for(const t of this.tweens)t.kill()
        this.tweens.length=0
        const destroy=this.def?.animation?.destroy
        const expired=this.def!==undefined&&this.time>=this.def.lifetime*0.98
        if(!destroy||!expired){
            this.sprite.destroy()
            return
        }
        if(destroy.alpha)this.tweens.push(this.app.clock.add_tween({target:this.sprite.tint,to:{a:destroy.alpha.to},duration:destroy.alpha.duration}))
        if(destroy.scale)this.tweens.push(this.app.clock.add_tween({target:this.sprite.scale,to:{x:destroy.scale.to,y:destroy.scale.to},duration:destroy.scale.duration}))
        this.app.clock.add_timeout(()=>{
            for(const t of this.tweens)t.kill()
            this.sprite.destroy()
        },destroy.time)
    }

    on_tick(dt:number){
        if(!this.def)return
        this.time+=dt
        v2m.lerp(this.sprite.position,this.position,this.scene.global_interpolation)
        this.sprite.rotation=this.rotation
    }

    on_decode_net(stream:Stream,full:boolean){
        this.position=stream.read_pos2()
        this.rotation=stream.read_rad()
        if(!full){
            if(!this.app.save.settings.get_var("game_interpolation"))this.sprite.position=this.position
            return
        }
        this.time=stream.read_float(0,120,2)
        this.def=this.app.definitions.synced_particles.getFromNumber(stream.read_uint8())
        this.sprite.position=this.position
        this.sprite.set_frame(this.def.frame,this.app.resources)
        const spawn=this.def.animation?.spawn
        if(spawn?.alpha){
            this.sprite.tint.a=spawn.alpha.from
            this.tweens.push(this.app.clock.add_tween({target:this.sprite.tint,to:{a:spawn.alpha.to},duration:spawn.alpha.duration}))
        }
        if(spawn?.scale)this.tweens.push(this.app.clock.add_tween({target:this.sprite.scale,to:{x:spawn.scale.to,y:spawn.scale.to},duration:spawn.scale.duration}))
    }
}
