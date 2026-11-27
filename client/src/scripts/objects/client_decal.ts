import { FrameDef, v2 } from "common/engine/core.ts";
import { Sprite2D } from "common/engine/web.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { GameObject, type GameScene } from "../main/gel.ts";

export class ClientDecal extends GameObject{
    sprite:Sprite2D=new Sprite2D()
    lifetime:number=15

    constructor(){
        super()
        this.sprite.hotspot=v2.half_one
        this.sprite.zIndex=zIndexes.ClientDecals
        this.allow_tick=true
    }

    static spawn(scene:GameScene,layer:number,frame:FrameDef,lifetime?:number):ClientDecal{
        const decal=new ClientDecal()
        if(lifetime!==undefined)decal.lifetime=lifetime
        scene.add_object(decal,layer)
        decal.sprite.set_frame(frame,scene.app.resources)
        return decal
    }

    on_create(){
        this.scene.camera.add_object(this.sprite)
    }
    on_layer_set(){
        this.sprite.layer=this.layer
    }
    on_destroy(){
        this.sprite.destroy()
    }
    on_tick(dt:number){
        this.lifetime-=dt
        if(this.lifetime<=0)this.destroy()
    }
}
