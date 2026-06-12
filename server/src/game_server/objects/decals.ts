import { GameObjectType } from "common/scripts/others/constants.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { CheckpointContext, CircleHitbox2D, Stream, v2, Vec2 } from "common/engine/core.ts";
import { DecalDef, DecalTint } from "common/scripts/definitions/objects/decals.ts";

export class Decal extends ServerGameObject{
    string_type:string="decal"
    number_type: number=GameObjectType.Decal

    rotation:number=0
    def!:DecalDef

    scale?:number
    tint?:DecalTint

    constructor(){
        super()
    }

    override on_create(args?: {position:Vec2,rotation:number,def:DecalDef,tint?:DecalTint,scale?:number}): void {
        if(args)this.set_configuration(args.position,args.rotation,args.def,args.tint,args.scale)
    }
    set_configuration(position:Vec2,rotation:number,def:DecalDef,tint?:DecalTint,scale?:number){
        this.def=def
        this.base_hitbox=this.def.hitbox??new CircleHitbox2D(v2.zero(),0.5)
        this.position=position
        this.rotation=rotation
        this.tint=tint
        this.scale=scale

    }
    override on_encode_net(stream: Stream, full: boolean): void {
        stream.write_boolean_group(this.tint!==undefined,this.scale!==undefined)
        if(full){
            stream.write_pos2(this.position)
            .write_rad(this.rotation)
            .write_uint16(this.def.idNumber!)
            if(this.tint!==undefined){
                stream.write_uint32(this.tint.color)
                .write_uint8(this.tint.alpha)
            }
            if(this.scale!==undefined){
                stream.write_float32(this.scale)
            }
        }
    }
    override on_encode_checkpoint(stream: Stream, ctx: CheckpointContext): void {
        stream.write_pos2(this.position)
        .write_rad(this.rotation)
        .write_uint16(this.def.idNumber!)
        .write_boolean_group(this.tint!==undefined,this.scale!==undefined)
        if(this.tint!==undefined){
            stream.write_uint32(this.tint.color)
            .write_uint8(this.tint.alpha)
        }
        if(this.scale!==undefined){
            stream.write_float32(this.scale)
        }
    }
    override on_decode_checkpoint(stream: Stream, ctx: CheckpointContext): void {
        const pos=stream.read_pos2()
        const angle=stream.read_rad()
        const def=stream.read_uint16()
        const bg=stream.read_boolean_group()
        let tint:DecalTint|undefined
        let scale:number|undefined
        if(bg[0]){
            tint={
                color:stream.read_uint32(),
                alpha:stream.read_uint8()
            }
        }
        if(bg[1]){
            scale=stream.read_float32()
        }
        this.set_configuration(pos,angle,this.game.definitions.decals.getFromNumber(def),tint,scale)
    }
}