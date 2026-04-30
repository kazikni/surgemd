import { NetStream, Packet } from "../../engine/core.ts";

export class JoinPacket extends Packet{
    ID=0
    Name="join"

    player_name:string=""
    is_mobile:boolean=false

    skin:{
        female:boolean

        shirt:number
        hair:number

        body_tint:number
        hair_tint:number
    }={
        female:false,

        shirt:0,
        hair:0,

        body_tint:0,
        hair_tint:0,
    }
    constructor(){
        super()
    }
    encode(stream: NetStream): void {
        stream.writeStringSized(30,this.player_name)
        stream.writeUint16(this.skin.shirt)
        stream.writeUint16(this.skin.hair)
        stream.writeUint32(this.skin.body_tint)
        stream.writeUint32(this.skin.hair_tint)
        stream.writeBooleanGroup(this.is_mobile,this.skin.female)
    }
    decode(stream: NetStream): void {
        this.player_name=stream.readStringSized(30)

        this.skin.shirt=stream.readUint16()
        this.skin.hair=stream.readUint16()
        
        this.skin.body_tint=stream.readUint32()
        this.skin.hair_tint=stream.readUint32()

        const bg=stream.readBooleanGroup()
        this.is_mobile=bg[0]
        this.skin.female=bg[1]
    }
}