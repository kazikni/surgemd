import { GameObjectType } from "common/scripts/others/constants.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { CircleHitbox2D, NetStream, v2, Vec2 } from "common/engine/core.ts";
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

    override on_create(args: {position:Vec2,rotation:number,def:DecalDef,tint?:DecalTint,scale?:number}): void {
        this.def=args.def
        this.base_hitbox=this.def.hitbox??new CircleHitbox2D(v2.zero(),0.5)
        this.position=args.position
        this.rotation=args.rotation
        this.tint=args.tint
        this.scale=args.scale
    }
    override on_encode(stream: NetStream, full: boolean): void {
        stream.writeBooleanGroup(this.tint!==undefined,this.scale!==undefined)
        if(full){
            stream.writePos2(this.position)
            .writeRad(this.rotation)
            .writeUint16(this.def.idNumber!)
            if(this.tint!==undefined){
                stream.writeUint32(this.tint.color)
                .writeUint8(this.tint.alpha)
            }
            if(this.scale!==undefined){
                stream.writeFloat32(this.scale)
            }
        }
    }
}