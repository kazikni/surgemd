import { GameObjectType } from "common/scripts/others/constants.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { CheckpointContext, Rect, RectHitbox2D, Stream, TilemapLayer} from "common/engine/core.ts";
import { TilemapVDef } from "common/scripts/definitions/objects/tilemap.ts";

export class TilemapVisual extends ServerGameObject{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    override string_type:string="tilemap_visual"
    override number_type: number=GameObjectType.TilemapVisual

    rotation:number=0

    def?:TilemapVDef
    content?:{
        layer:TilemapLayer
        tileset:number
    }

    constructor(){
        super()
    }

    set_tiles(rect:Rect,layer:TilemapLayer,tileset:number=1){
        this.base_hitbox=new RectHitbox2D(rect.min,rect.max)
        this.content={
            tileset,
            layer,
        }
    }
    set_def(def:TilemapVDef){
        this.def=def
        this.base_hitbox=new RectHitbox2D(def.rect.min,def.rect.max)
        this.content=undefined
    }

    override on_encode_checkpoint(stream: Stream, ctx:CheckpointContext){
        stream.write_pos2(this.position)
        stream.write_rad(this.rotation)
        if(this.content){
            stream.write_uint8(1)
            const rect=this.base_hitbox.to_rect()
            stream.write_pos2(rect.min)
            stream.write_pos2(rect.max)
            stream.write_uint8(this.content.tileset)
            stream.write_array(this.content.layer,(v)=>{
                stream.write_uint16(v.tile)
                stream.write_matrix2(v.matrix)
            },2)
        }else if(this.def){
            stream.write_uint8(2)
            stream.write_uint16(this.def.idNumber!)
        }
    }
    override on_decode_checkpoint(stream:Stream,ctx:CheckpointContext): void {
        this.position=stream.read_pos2()
        this.rotation=stream.read_rad()
        this.def=undefined
        switch(stream.read_uint8()){
            case 1:{
                const rect={min:stream.read_pos2(),max:stream.read_pos2()}
                const tileset:number=stream.read_uint8()
                const map:TilemapLayer=stream.read_array(()=>{
                    const tile=stream.read_uint16()
                    const matrix=stream.read_matrix2()
                    return {tile,matrix}
                },2)
                this.set_tiles(rect,map,tileset)
                break
            }
            case 2:{
                const def=this.game.definitions.tilemapv.getFromNumber(stream.read_uint16())
                this.set_def(def)
                break
            }
        }
    }
    override on_encode_net(stream: Stream, full: boolean){
        stream.write_pos2(this.position)
        stream.write_rad(this.rotation)
        if(full){
            stream.write_uint16(this.def?.idNumber??0)
            if(this.content&&!this.def){
                stream.write_uint8(this.content.tileset)
                stream.write_array(this.content.layer,(v)=>{
                    stream.write_uint16(v.tile)
                    stream.write_matrix4(v.matrix)
                },2)
            }
        }
    }
}