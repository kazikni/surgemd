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

    objects?:Stream
    gelos?:Stream

    active?:ActiveHumanState

    started:boolean=false
    living_count:number=0

    encode(stream: Stream): void {
        stream.write_boolean_group(this.objects!==undefined,this.gelos!==undefined,this.active!==undefined,this.started)
        stream.write_uint16(this.living_count)
        if(this.objects)stream.write_stream_dynamic(this.objects)
        if(this.gelos)stream.write_stream_dynamic(this.gelos)
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
        const [has_objects,has_gelos,has_active,started]=stream.read_boolean_group()
        this.started=started
        this.living_count=stream.read_uint16()
        if(has_objects)this.objects=stream.read_stream_dynamic()
        if(has_gelos)this.gelos=stream.read_stream_dynamic()
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
    ntps:number=32

    encode(stream: Stream): void {
        stream.write_uint8(this.ntps)
        stream.write_stream_dynamic(this.gelos)
    }
    decode(stream: Stream): void {
        this.ntps=stream.read_uint8()
        this.gelos=stream.read_stream_dynamic()
    }
}
