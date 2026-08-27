import { Sound, Sprite2D } from "common/engine/web.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../others/gameObject.ts";
import { v2 } from "common/engine/core.ts";
export class ClientDecal extends GameObject{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    string_type:string="client_decal"
    number_type: number=20
    ////////////////////////////
    // Visual                 //
    ////////////////////////////
    sprite:Sprite2D=new Sprite2D()
    ////////////////////////////
    // State                  //
    ////////////////////////////
    lifetime:number=15
    dying:boolean=false
    can_die:boolean=true
    ////////////////////////////
    // Assets                 //
    ////////////////////////////
    sounds?:{
        break?:Sound
        hit?:Sound[]
    }

    constructor(){
        super()
        this.sprite=new Sprite2D()
        this.sprite.hotspot=v2.half_one
        this.sprite.zIndex=zIndexes.ClientDecals

        this.allow_tick=true
    }
    override on_create(_args: any) {
        this.game.scene_2d.camera.add_object(this.sprite)
    }
    override on_layer_set(): void {
        this.sprite.layer=this.layer
    }
    override on_destroy(): void {
        this.sprite.destroy()
    }

    override on_tick(dt:number): void {
        this.lifetime-=dt
        if(this.lifetime<=0){
            this.destroy()
        }
    }
}