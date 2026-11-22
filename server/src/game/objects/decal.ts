import { CheckpointContext, CircleCollider2D, Stream, v2, Vec2 } from "common/engine/core.ts";
import { type DecalDef, type DecalTint } from "common/scripts/definitions/objects/decals.ts";
import { object_instance_type, ObjectType } from "common/scripts/others/constants.ts";
import { SimObject } from "../base.ts";

export class Decal extends SimObject{
    def!:DecalDef
    rotation:number=0
    scale?:number
    tint?:DecalTint

    constructor(){
        super()
        this.object_type=ObjectType.Decal
        this.instance_type=object_instance_type.decal
    }

    on_create(args:{position:Vec2,rotation?:number,def:DecalDef,tint?:DecalTint,scale?:number}){
        this.def=args.def
        this.position=args.position
        this.rotation=args.rotation??0
        this.tint=args.tint
        this.scale=args.scale
        this.base_collider=this.def.collider??new CircleCollider2D(v2.zero(),0.5)
    }

    on_encode_net(stream:Stream,full:boolean){
        stream.write_boolean_group(this.tint!==undefined,this.scale!==undefined)
        if(!full)return
        stream.write_pos2(this.position)
        .write_rad(this.rotation)
        .write_uint16(this.def.id_number!)
        if(this.tint!==undefined)stream.write_uint32(this.tint.color).write_uint8(this.tint.alpha)
        if(this.scale!==undefined)stream.write_float32(this.scale)
    }
    on_encode_checkpoint(stream:Stream,_ctx:CheckpointContext){
        stream.write_pos2(this.position)
        .write_rad(this.rotation)
        .write_uint16(this.def.id_number!)
        .write_boolean_group(this.tint!==undefined,this.scale!==undefined)
        if(this.tint!==undefined)stream.write_uint32(this.tint.color).write_uint8(this.tint.alpha)
        if(this.scale!==undefined)stream.write_float32(this.scale)
    }
    on_decode_checkpoint(stream:Stream,_ctx:CheckpointContext){
        const position=stream.read_pos2()
        const rotation=stream.read_rad()
        const def=this.app.definitions.decals.getFromNumber(stream.read_uint16())
        const [has_tint,has_scale]=stream.read_boolean_group()
        this.on_create({
            position,
            rotation,
            def,
            tint:has_tint?{color:stream.read_uint32(),alpha:stream.read_uint8()}:undefined,
            scale:has_scale?stream.read_float32():undefined,
        })
    }
}
