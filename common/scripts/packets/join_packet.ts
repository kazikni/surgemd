import { NetStream, Packet } from "../../engine/core.ts";

export class JoinPacket extends Packet{
    ID=0
    Name="join"

    player_name:string=""
    player_skin:number=0
    is_mobile:boolean=false
    constructor(){
        super()
    }
    encode(stream: NetStream): void {
        stream.writeStringSized(30,this.player_name)
        stream.writeUint16(this.player_skin)
        stream.writeBooleanGroup(this.is_mobile)
    }
    decode(stream: NetStream): void {
        this.player_name=stream.readStringSized(30)
        this.player_skin=stream.readUint16()
        const bg=stream.readBooleanGroup()
        this.is_mobile=bg[0]
    }
}