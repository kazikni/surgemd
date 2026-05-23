import { Sound, Sprite2D, v2 } from "common/engine/client.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../others/gameObject.ts";
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

    create(_args: any) {
        this.game.cam2d.addObject(this.sprite)
    }

    override on_layer_set(layer: number): void {
        this.sprite.layer=layer
    }
    override on_destroy(): void {
        this.sprite.destroy()
    }
    update(dt:number): void {
        this.lifetime-=dt
        if(this.lifetime<=0){
            this.destroy()
        }
    }
    constructor(){
        super()
        this.sprite=new Sprite2D()
        this.sprite.hotspot=v2.half_one
        this.sprite.zIndex=zIndexes.Decals
    }
}