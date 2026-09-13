import { GameObjectType } from "common/scripts/others/constants.ts";
import { GameObject } from "../others/gameObject.ts";
import { Stream, TilemapLayer } from "common/engine/core.ts";
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

    set(tile:number,content:TilemapLayer):void{
        this.gfx.set_sprites(content,this.game.tilesets_instance[tile])
    }
    override on_decode_net(stream:Stream,full:boolean): void {
        this.position=stream.read_pos2()
        this.gfx.position=this.position
        this.gfx.rotation=stream.read_rad()
        if(full){
            switch(stream.read_uint8()){
                case 1:{
                    const tileset:number=stream.read_uint8()
                    const map:TilemapLayer=stream.read_array(()=>{
                        const tile=stream.read_uint16()
                        const matrix=stream.read_matrix2()
                        return {tile,matrix}
                    },2)
                    this.set(tileset,map)
                    break
                }
                case 2:{
                    const def=this.game.definitions.tilemapv.getFromNumber(stream.read_uint16())
                    this.set(def.tileset,def.layer)
                    break
                }
            }
        }
    }
}