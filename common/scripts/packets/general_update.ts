import { KDate, Stream, Packet, Vec2 } from "../../engine/core.ts";
import { PacketType } from "../definitions/utils.ts";

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
    timer:number
}
export interface AmbientData{
    date:KDate
    initial_date:KDate
    rain:number
    thunder_storm:number
}
export interface GeneralUpdate{
    started:boolean
    living_count:number[]
    deadzone?:DeadZoneUpdate
    ambient?:AmbientData
}
export interface MakeDeadZoneSettings{
    wait_time:{
        initial:number
        min:number
        decay:number
    }
    advancing_time:{
        initial:number
        min:number
        decay:number
    }
    radius:{
        initial:number
        decay:number
    }
    damage:{
        add:number
    }
    count:number
}
export interface DeadZoneStage {
    state: DeadZoneState
    radius: number
    time: number
    damage: number
}
function encode_general_update(stream:Stream,up:GeneralUpdate){
    stream.write_boolean_group(
        up.started,
        up.deadzone!==undefined,
        up.ambient!==undefined,
    )
    if(up.deadzone){
        stream.write_uint8(up.deadzone.state)
        .write_float(up.deadzone.radius,0,3000,3)
        .write_float(up.deadzone.new_radius,0,3000,3)
        .write_pos2(up.deadzone.position)
        .write_pos2(up.deadzone.new_position)
        .write_uint16(Math.floor(up.deadzone.timer))
    }
    if(up.ambient!==undefined){
        stream.write_kdate(up.ambient.date)
        .write_float(up.ambient.rain,0,1,1)
        .write_float(up.ambient.thunder_storm,0,1,1)
    }
    stream.write_array(up.living_count,(i,_s)=>{
        stream.write_uint8(i)
    },1)
}
function decode_general_update(stream:Stream,up:GeneralUpdate){
    const [
        started,
        deadzone,
        ambient
    ]=stream.read_boolean_group()
    up.started=started
    up.ambient=undefined

    if(deadzone){
        up.deadzone={
            state:stream.read_uint8(),
            radius:stream.read_float(0,3000,3),
            new_radius:stream.read_float(0,3000,3),
            position:stream.read_pos2(),
            new_position:stream.read_pos2(),
            timer:stream.read_uint16(),
        }
    }
    if(ambient){
        const date=stream.read_kdate()
        up.ambient={
            date:date,
            initial_date:date,
            rain:0,
            thunder_storm:0,
        }
        up.ambient.rain=stream.read_float(0,1,1)
        up.ambient.thunder_storm=stream.read_float(0,1,1)
    }
    up.living_count=stream.read_array((_s)=>{
        return stream.read_uint8()
    },1)
}

export class GeneralUpdatePacket extends Packet{
    ID=PacketType.GeneralUpdate
    Name="general_update"
    content:GeneralUpdate={
        started:false,
        living_count:[],
        deadzone:undefined
    }
    decode(stream: Stream): void {
        decode_general_update(stream,this.content)
    }
    encode(stream: Stream): void {
        encode_general_update(stream,this.content)
    }
}