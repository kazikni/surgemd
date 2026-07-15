import { KDate, Stream, Packet, Vec2 } from "../../engine/core.ts";
import { DamageReason, PacketType } from "../definitions/utils.ts";

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
    feed:FeedMessage[]
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
        initial:number
    }
    count:number
}
export interface DeadZoneStage {
    state: DeadZoneState
    radius: number
    time: number
    damage: number
}
export enum FeedMessageType{
    kill,
    down,
    join,
    set_name,
    leader_assigned,
    leader_dead
}
export interface FeedMessageKill{
    type:FeedMessageType.kill|FeedMessageType.down,
    killer?:{
        id:number
        kills:number
        used:number
    }
    damage_reason:DamageReason
    victimId:number
}
export interface FeedMessageLeader{
    type:FeedMessageType.leader_assigned|FeedMessageType.leader_dead,
    player:{
        kills:number
        id:number
    }
}
export interface FeedMessageSP{
    type:FeedMessageType.join|FeedMessageType.set_name
    playerId:number
    playerBadge?:number
    playerName:string
}
export type FeedMessage=FeedMessageKill|FeedMessageSP|FeedMessageLeader

function encode_feed_message(msg:FeedMessage,stream:Stream){
    stream.write_uint8(msg.type)
    switch(msg.type){
        case FeedMessageType.kill:
        case FeedMessageType.down:
            stream.write_boolean_group(msg.killer!==undefined)
            .write_uint8(msg.damage_reason)
            if(msg.killer){
                stream.write_id(msg.killer.id)
                .write_uint8(msg.killer.kills)
                .write_uint16(msg.killer.used)
            }
            stream.write_id(msg.victimId)
            break
        case FeedMessageType.join:
        case FeedMessageType.set_name:
            stream.write_id(msg.playerId)
            stream.write_string_sized(msg.playerName,28)
            stream.write_uint16((msg.playerBadge??-1)+1)
            break
        case FeedMessageType.leader_dead:
        case FeedMessageType.leader_assigned:
            stream.write_id(msg.player.id)
            stream.write_uint8(msg.player.kills)
            break
    }
}
function decode_feed_message(stream:Stream):FeedMessage{
    const msg={
        type:stream.read_uint8() as FeedMessageType,
    } as Record<string,unknown>
    switch(msg.type){
        case FeedMessageType.kill:
        case FeedMessageType.down:{
            const bg=stream.read_boolean_group()
            msg["damage_reason"]=stream.read_uint8()
            if(bg[0]){
                msg["killer"]={
                    id:stream.read_id(),
                    kills:stream.read_uint8(),
                    used:stream.read_uint16()
                }
            }
            msg["victimId"]=stream.read_id()
            break
        }
        case FeedMessageType.set_name:
        case FeedMessageType.join:{
            msg["playerId"]=stream.read_id()
            msg["playerName"]=stream.read_string_sized(28)
            const b=stream.read_uint16()
            msg["playerBadge"]=b===0?undefined:b-1
            break
        }
        case FeedMessageType.leader_dead:
        case FeedMessageType.leader_assigned:
            msg["player"]={
                id:stream.read_id(),
                kills:stream.read_uint8()
            }
            break
    }
    return msg as unknown as FeedMessage
}
function encode_general_update(stream:Stream,up:GeneralUpdate){
    stream.write_boolean_group(
        up.started,
        up.deadzone!==undefined,
        up.ambient!==undefined,
    )

    stream.write_array(up.feed,(msg)=>encode_feed_message(msg,stream))
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

    up.feed=stream.read_array(()=>decode_feed_message(stream))
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
        feed:[],
        deadzone:undefined
    }
    decode(stream: Stream): void {
        decode_general_update(stream,this.content)
    }
    encode(stream: Stream): void {
        encode_general_update(stream,this.content)
    }
}