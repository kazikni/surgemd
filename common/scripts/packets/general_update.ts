import { KDate, NetStream, Packet, Vec2 } from "../../engine/core.ts";

export interface PlaneData{
    direction:number
    pos:Vec2
    complete:boolean
    type:number
    id:number
}
export enum DeadZoneState{
    Deenabled,
    Advancing,
    Waiting,
    Finished
}
export interface DeadZoneUpdate{
    state:DeadZoneState
    position:Vec2
    radius:number
    new_position:Vec2
    new_radius:number
}

export interface GeneralUpdate{
    dirty:{
        living_count:boolean
    }
    planes:PlaneData[]
    living_count:number[]
    deadzone?:DeadZoneUpdate
    ambient?:{
        date:KDate
        initial_date:KDate
        rain:number
        thunder_storm:number
    }
}
function encode_general_update(stream:NetStream,up:GeneralUpdate){
    stream.writeBooleanGroup(
        up.dirty.living_count,
        up.deadzone!==undefined,
        up.ambient!==undefined
    )
    if(up.deadzone){
        stream.writeUint8(up.deadzone.state)
        stream.writeFloat(up.deadzone.radius,0,3000,3)
        stream.writeFloat(up.deadzone.new_radius,0,3000,3)
        stream.writePos2(up.deadzone.position)
        stream.writePos2(up.deadzone.new_position)
    }
    if(up.dirty.living_count){
        stream.writeArray(up.living_count,(i,_s)=>{
            stream.writeUint8(i)
        },1)
    }
    stream.writeArray(up.planes,(e)=>{
        stream.writeID(e.id)
        stream.writePos2(e.pos)
        stream.writeRad(e.direction)
        stream.writeBooleanGroup(e.complete)
        stream.writeUint8(e.type)
    },1)
    if(up.ambient!==undefined){
        stream.writeKDate(up.ambient.date)
    }
}
function decode_general_update(stream:NetStream,up:GeneralUpdate){
    const [
        living_count,
        deadzone,
        ambient
    ]=stream.readBooleanGroup()
    if(deadzone){
        up.deadzone={
            state:stream.readUint8(),
            radius:stream.readFloat(0,3000,3),
            new_radius:stream.readFloat(0,3000,3),
            position:stream.readPos2(),
            new_position:stream.readPos2()
        }
    }
    up.dirty.living_count=living_count
    if(living_count){
        up.living_count=stream.readArray((_s)=>{
            return stream.readUint8()
        },1)
    }else{
        up.living_count=[]
    }
    up.planes=stream.readArray(()=>{
        return {
            id:stream.readID(),
            pos:stream.readPos2(),
            direction:stream.readRad(),
            complete:stream.readBooleanGroup()[0],
            type:stream.readUint8()
        }
    },1)
    up.ambient=undefined
    if(ambient){
        const date=stream.readKDate()
        up.ambient={
            date:date,
            initial_date:date,
            rain:0,
            thunder_storm:0,
        }
    }
}

export class GeneralUpdatePacket extends Packet{
    ID=7
    Name="general_update"
    content:GeneralUpdate={
        dirty:{
            living_count:false,
        },
        living_count:[],
        planes:[],
        deadzone:undefined
    }
    decode(stream: NetStream): void {
        decode_general_update(stream,this.content)
    }
    encode(stream: NetStream): void {
        encode_general_update(stream,this.content)
    }
}