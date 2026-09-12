import { GameObjectType } from "common/scripts/others/constants.ts";
import { GameObject } from "../others/gameObject.ts";
import { Stream } from "common/engine/core.ts";
import { Graphics2D } from "common/engine/web.ts";

export class TilemapVisual extends GameObject{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    override string_type:string="tilemap_visual"
    override number_type: number=GameObjectType.TilemapVisual

    gfx=new Graphics2D()

    constructor(){
        super()
    }

    override on_destroy(): void {
        this.gfx.destroy()
    }
    override on_layer_set(): void {
        this.gfx.layer=this.layer
    }
    override on_create(args: any): void {
        super.on_create(args)
        this.gfx.initialize(this.game.scene_2d.camera.ctx)
        this.scene.camera.add_object(this.gfx)
    }
    override on_decode_net(stream:Stream,full:boolean): void {
    }
}