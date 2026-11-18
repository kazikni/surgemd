import { DynamicStream, Packet, Stream } from "../../engine/core.ts";
import { PacketType } from "../definitions/utils.ts";

export interface ActiveHumanState{
    id:number
    spectating:boolean

    health:number
    max_health:number

    boost:number
    max_boost:number
    boost_def:number

    knocked:boolean
}

export class UpdatePacket extends Packet{
    ID=PacketType.Update
    Name="update"

    content!:Stream
    active?:ActiveHumanState

    encode(stream: Stream): void {
        stream.write_boolean_group(this.active!==undefined)
        stream.write_stream_dynamic(this.content)
        if(this.active){
            const a=this.active
            stream.write_id(a.id)
            stream.write_boolean_group(a.spectating,a.knocked)
            stream.write_float32(a.health)
            stream.write_float32(a.max_health)
            stream.write_float32(a.boost)
            stream.write_float32(a.max_boost)
            stream.write_uint16(a.boost_def)
        }
    }
    decode(stream: Stream): void {
        const [has_active]=stream.read_boolean_group()
        this.content=stream.read_stream_dynamic()
        if(has_active){
            const id=stream.read_id()
            const [spectating,knocked]=stream.read_boolean_group()
            this.active={
                id,
                spectating,
                knocked,
                health:stream.read_float32(),
                max_health:stream.read_float32(),
                boost:stream.read_float32(),
                max_boost:stream.read_float32(),
                boost_def:stream.read_uint16(),
            }
        }
    }
}

export class StartPacket extends Packet{
    ID=PacketType.Start
    Name="start"

    gelos:Stream=new DynamicStream()

    encode(stream: Stream): void {
        stream.write_stream_dynamic(this.gelos)
    }
    decode(stream: Stream): void {
        this.gelos=stream.read_stream_dynamic()
    }
}

export class GeneralPacket extends Packet{
    ID=PacketType.GeneralUpdate
    Name="general"

    gelos:Stream=new DynamicStream()

    encode(stream: Stream): void {
        stream.write_stream_dynamic(this.gelos)
    }
    decode(stream: Stream): void {
        this.gelos=stream.read_stream_dynamic()
    }
}
