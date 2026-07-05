import { StaticStream, Stream } from "./stream.ts"
import { ID } from "../math/utils.ts"

export type PacketID=number

export abstract class Packet{
    abstract ID:PacketID // Identifier
    abstract Name:string //Name In Signal
    _size:number=0
    abstract encode(stream:Stream):void
    abstract decode(stream:Stream):void
    toString():string{return `{ID:${this.ID}}`}
}

export class PacketsManager{
    packets:Map<PacketID,new () => Packet>
    pre_packet?:(packet:Packet)=>void
    constructor(){
        this.packets=new Map()
        this.add_packet(InvalidPacket)
        this.add_packet(ConnectPacket)
        this.add_packet(DisconnectPacket)
        this.add_packet(SteamPacket)
        this.add_packet(PingPacket)
        this.add_packet(PongPacket)
        this.add_packet(MessagePacket)
        this.add_packet(SignalMessagePacket)
    }
    encode(packet:Packet,stream:Stream):Stream{
        stream.write_uint16(packet.ID)
        //console.log(packet.ID,"send")
        packet.encode(stream)
        stream.write_uint16(2314) // Passcode
        return stream
    }
    decode(stream:Stream):Packet{
        if(stream.index>=stream.data.length)return new InvalidPacket()
        try{
            const id:PacketID=stream.read_uint16()
            if(this.packets.get(id)){
                const pt:new () => Packet=this.packets.get(id)!
                const p=new pt()
                if(this.pre_packet)this.pre_packet(p)
                p.decode(stream)
                const passcode=stream.read_uint16()
                if(passcode!=2314){
                    return new InvalidPacket()
                }
                p._size=stream.index
                return p
            }
        }catch(e){
            console.error(e)
        }
        return new InvalidPacket()
    }
    add_packet(pack:new () => Packet){
        const p=new pack()
        this.packets.set(p.ID,pack)
    }
}

export class ConnectPacket extends Packet{
    client_id:ID
    readonly ID=65535
    readonly Name="connect"
    constructor(id:number=0){
        super()
        this.client_id=id
    }
    encode(stream: Stream): void {
      stream.write_id(this.client_id)
    }
    decode(stream: Stream): void {
      this.client_id=stream.read_id()
    }
}
export class DisconnectPacket extends Packet{
    client_id:ID
    readonly ID=65534
    readonly Name="disconnect"
    constructor(id:number=0){
        super()
        this.client_id=id
    }
    encode(stream: Stream): void {
      stream.write_id(this.client_id)
    }
    decode(stream: Stream): void {
      this.client_id=stream.read_id()
    }
}

export abstract class UpdatePacketBase<PrivateUpdate> extends Packet{
    priv:PrivateUpdate
    objects?:Stream
    constructor(priv:PrivateUpdate){
        super()
        this.priv=priv
    }
    override encode(stream: Stream): void {
        stream.write_stream_dynamic(this.objects!)
        this.encode_private(stream)
    }
    override decode(stream: Stream): void {
        this.objects=stream.read_stream_dynamic()
        this.decode_private(stream)
    }
    abstract encode_private(stream:Stream):void
    abstract decode_private(stream:Stream):void
}
export class SteamPacket extends Packet{
    readonly ID=65533
    readonly Name="stream"
    stream!:Stream
    size:number=0
    constructor(){
        super()
    }
    encode(stream: Stream): void {
        stream.write_uint32(this.size)
        stream.write_stream(this.stream,0,this.size)
    }
    decode(stream: Stream): void {
        const size=stream.read_uint32()
        this.stream=new StaticStream(stream.buffer as ArrayBuffer,stream.index,size)
    }
}
export class PingPacket extends Packet {
    readonly ID = 65532
    readonly Name = "ping"
    client_time:number
    server_time:number

    constructor(client_time:number=0,server_time:number=0) {
        super()
        this.client_time = client_time
        this.server_time=server_time
    }
    encode(stream: Stream): void {
        stream.write_float64(this.client_time)
        stream.write_float64(this.server_time)
    }
    decode(stream: Stream): void {
        this.client_time = stream.read_float64()
        this.server_time = stream.read_float64()
    }
}
export class PongPacket extends Packet {
    readonly ID = 65531
    readonly Name = "pong"
    client_time:number
    server_time:number

    constructor(client_time:number=0,server_time:number=0) {
        super()
        this.client_time = client_time
        this.server_time=server_time
    }
    encode(stream: Stream): void {
        stream.write_float64(this.client_time)
        stream.write_float64(this.server_time)
    }
    decode(stream: Stream): void {
        this.client_time = stream.read_float64()
        this.server_time = stream.read_float64()
    }
}
export class MessagePacket extends Packet {
    readonly ID = 65530
    readonly Name = "message"
    msg:any
    bytes1:number=1
    bytes2:number=1

    constructor() {
        super()
    }

    encode(stream: Stream): void {
        let header = 0
        header |= (this.bytes1 - 1)       // bits 0-1
        header |= (this.bytes2 - 1) << 2  // bits 2-3
        stream.write_uint8(header)
        stream.write_object(this.msg,this.bytes1 as 1|2|3|4,this.bytes2 as 1|2|3|4)
    }
    decode(stream: Stream): void {
        const header = stream.read_uint8()
        this.bytes1 = ((header & 0b11) + 1)
        this.bytes2 = (((header >> 2) & 0b11) + 1)
        this.msg=stream.read_object(this.bytes1 as 1|2|3|4,this.bytes2 as 1|2|3|4)
    }
}
export class SignalMessagePacket extends Packet {
    readonly ID = 65529
    readonly Name = "signal_message"

    signal:string=""
    msg:any
    bytes1:number=1
    bytes2:number=1

    constructor() {
        super()
    }

    encode(stream: Stream): void {
        let header = 0
        header |= (this.bytes1 - 1)       // bits 0-1
        header |= (this.bytes2 - 1) << 2  // bits 2-3
        stream.write_uint8(header)
        stream.write_string(this.signal,1)
        stream.write_object(this.msg,this.bytes1 as 1|2|3|4,this.bytes2 as 1|2|3|4)
    }
    decode(stream: Stream): void {
        const header = stream.read_uint8()
        this.bytes1 = ((header & 0b11) + 1)
        this.bytes2 = (((header >> 2) & 0b11) + 1)
        this.signal=stream.read_string(1)
        this.msg=stream.read_object(this.bytes1 as 1|2|3|4,this.bytes2 as 1|2|3|4)
    }
}
export class InvalidPacket extends Packet {
    readonly ID = -1
    readonly Name = "invalid"

    constructor() {
        super()
    }

    encode(stream: Stream): void {
    }
    decode(stream: Stream): void {
    }
}
