import { NetStream, Packet } from "../../engine/core.ts";

export class JoinPacket extends Packet{
    ID=0
    Name="join"

    player_name:string=""

    skin?:{
        female:boolean

        shirt:number
        hair:number

        body_tint:number
        hair_tint:number
    }
    constructor(){
        super()
    }
    encode(stream: NetStream): void {
        stream.writeStringSized(30,this.player_name)
        stream.writeBooleanGroup(this.skin!==undefined,this.skin?.female)
        if(this.skin!==undefined){
            stream.writeUint16(this.skin.shirt)
            stream.writeUint16(this.skin.hair)
            stream.writeUint32(this.skin.body_tint)
            stream.writeUint32(this.skin.hair_tint)
        }
    }
    decode(stream: NetStream): void {
        this.player_name=stream.readStringSized(30)
        const bg=stream.readBooleanGroup()
        if(bg[1]){
            this.skin={
                body_tint:0,
                female:bg[2],
                hair:0,
                hair_tint:0,
                shirt:0
            }
            this.skin.shirt=stream.readUint16()
            this.skin.hair=stream.readUint16()
            this.skin.body_tint=stream.readUint32()
            this.skin.hair_tint=stream.readUint32()
            this.skin.female=bg[1]
        }
    }
}