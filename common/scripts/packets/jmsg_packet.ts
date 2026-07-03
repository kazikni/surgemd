import { Stream, Packet } from "../../engine/core.ts";
import { PacketType } from "../definitions/utils.ts";
export class JoinnedPacket extends Packet{
    ID=PacketType.JMSG
    Name="joinned"
    msg:any
    constructor(){
        super()
    }
    encode(stream: Stream): void {
    }
    decode(stream: Stream): void {
    }
}