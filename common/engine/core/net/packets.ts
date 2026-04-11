import { NetStream } from "./stream.ts"
import { ID } from "../math/utils.ts"

export type PacketID=number

export abstract class Packet{
    abstract ID:PacketID // Identifier
    abstract Name:string //Name In Signal
    _size:number=0
    abstract encode(stream:NetStream):void
    abstract decode(stream:NetStream):void
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
    }
    encode(packet:Packet,stream:NetStream):NetStream{
        stream.writeUint16(2314) // Passcode
        stream.writeUint16(packet.ID)
        packet.encode(stream)
        return stream
    }
    decode(stream:NetStream):Packet{
        if(stream.index>=stream._view.byteLength)return new InvalidPacket()
        const passcode=stream.readUint16()
        if(passcode!=2314){
            return new InvalidPacket()
        }
        const id:PacketID=stream.readUint16()
        if (this.packets.get(id)){
            // deno-lint-ignore ban-ts-comment
            //@ts-expect-error
            const pt:new () => Packet=this.packets.get(id)
            const p=new pt()
            if(this.pre_packet)this.pre_packet(p)
            p.decode(stream)
            p._size=stream.index
            return p
        }else{
            return new InvalidPacket()
        }
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
    encode(stream: NetStream): void {
      stream.writeID(this.client_id)
    }
    decode(stream: NetStream): void {
      this.client_id=stream.readID()
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
    encode(stream: NetStream): void {
      stream.writeID(this.client_id)
    }
    decode(stream: NetStream): void {
      this.client_id=stream.readID()
    }
}

export abstract class UpdatePacketBase<PrivateUpdate> extends Packet{
    priv:PrivateUpdate
    objects?:NetStream
    constructor(priv:PrivateUpdate){
        super()
        this.priv=priv
    }
    override encode(stream: NetStream): void {
        stream.writeStreamDynamic(this.objects!)
        this.encode_private(stream)
    }
    override decode(stream: NetStream): void {
        this.objects=stream.readStreamDynamic()
        this.decode_private(stream)
    }
    abstract encode_private(stream:NetStream):void
    abstract decode_private(stream:NetStream):void
}
export class SteamPacket extends Packet{
    readonly ID=65533
    readonly Name="stream"
    stream!:NetStream
    size:number=0
    constructor(){
        super()
    }
    encode(stream: NetStream): void {
        stream.writeUint32(this.size)
        stream.writeStream(this.stream,0,this.size)
    }
    decode(stream: NetStream): void {
        const size=stream.readUint32()
        this.stream=new NetStream(stream.buffer as ArrayBuffer,stream.index,size)
    }
}
export class PingPacket extends Packet {
    readonly ID = 65532
    readonly Name = "ping"
    time!: number

    constructor(time: number = 0) {
        super()
        this.time = time
    }

    encode(stream: NetStream): void {
        stream.writeFloat64(this.time)
    }

    decode(stream: NetStream): void {
        this.time = stream.readFloat64()
    }
}
export class PongPacket extends Packet {
    readonly ID = 65531
    readonly Name = "pong"
    time!: number

    constructor(time: number = 0) {
        super()
        this.time = time
    }

    encode(stream: NetStream): void {
        stream.writeFloat64(this.time)
    }

    decode(stream: NetStream): void {
        this.time = stream.readFloat64()
    }
}

export class InvalidPacket extends Packet {
    readonly ID = -1
    readonly Name = "invalid"

    constructor() {
        super()
    }

    encode(stream: NetStream): void {
    }
    decode(stream: NetStream): void {
    }
}
