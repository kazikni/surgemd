import { KDate, Stream, Packet, Vec2 } from "../../engine/core.ts";
import { DamageReason, PacketType } from "../definitions/utils.ts";

export interface GeneralFullMainState{
    players:{id:number,name:string,badge?:number}[]
    ntps:number
    date:KDate
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
    timer:number
}
export interface AmbientData{
    date:KDate
    initial_date:KDate
    rain:number
    thunder_storm:number
}
export interface MapZone{
    id?:number
    position:Vec2
    icon:number
    color:number
    radius:number
}
export interface GeneralUpdate{
    started:boolean
    feed_enabled:boolean

    leader_enabled:boolean
    leader?:{
        id:number
        kills:number
    }

    living_count:number[]
    feed:FeedMessage[]
    deadzone?:DeadZoneUpdate
    ambient?:AmbientData
    main_state?:GeneralFullMainState
    map_zones:MapZone[]
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
        advancing_scale:number
        waiting_scale:number
        initial:number
        limit:number
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
    }
    damage_reason:DamageReason
    victimId:number
    used?:number
}
export interface FeedMessageLeader{
    type:FeedMessageType.leader_assigned|FeedMessageType.leader_dead,
    player:number
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
            stream.write_boolean_group(msg.killer!==undefined,msg.used!==undefined)
            .write_uint8(msg.damage_reason)
            if(msg.killer){
                stream.write_id(msg.killer.id)
                .write_uint8(msg.killer.kills)
            }
            if(msg.used!==undefined)stream.write_id(msg.used)
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
            stream.write_id(msg.player)
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
                    kills:stream.read_uint8()
                }
            }
            if(bg[1])msg["used"]=stream.read_id()
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
            msg["player"]=stream.read_id()
            break
    }
    return msg as unknown as FeedMessage
}

export function encode_general_main_state(stream:Stream,s:GeneralFullMainState){
    stream.write_uint8(s.ntps)
    stream.write_array(s.players,(e)=>{
        stream.write_uint16((e.badge??-1)+1)
        stream.write_string_sized(e.name,28)
        stream.write_id(e.id)
    },1)
    stream.write_kdate(s.date)
}
export function decode_general_main_state(stream:Stream):GeneralFullMainState{
    const s={
    } as GeneralFullMainState
    s.ntps=stream.read_uint8()
    s.players=stream.read_array((_e)=>{
        const b=stream.read_uint16()
        return {
            name:stream.read_string_sized(28),
            id:stream.read_id(),
            badge:b===0?undefined:b-1
        }
    },1)
    s.date=stream.read_kdate()
    return s
}
function encode_general_update(stream:Stream,up:GeneralUpdate){
    stream.write_boolean_group(
        up.started,
        up.feed_enabled,
        up.leader_enabled,
        up.leader!==undefined,
        up.deadzone!==undefined,
        up.ambient!==undefined,
        up.main_state!==undefined
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
    if(up.leader){
        stream.write_id(up.leader.id??0)
        stream.write_uint16(up.leader.kills??0)
    }
    stream.write_array(up.living_count,(i,_s)=>{
        stream.write_uint8(i)
    },1)
    stream.write_array(up.map_zones,(i)=>{
        stream.write_boolean_group(i.id!==undefined)
        stream.write_uint32(i.color)
        .write_uint8(i.icon)
        .write_pos2(i.position)
        .write_float32(i.radius)
        if(i.id!==undefined)stream.write_id(i.id)
    },1)
    if(up.main_state)encode_general_main_state(stream,up.main_state)
}
function decode_general_update(stream:Stream,up:GeneralUpdate){
    const [
        started,
        feed_enabled,
        leader_enabled,
        leader,
        deadzone,
        ambient,
        main_state
    ]=stream.read_boolean_group()
    up.started=started
    up.feed_enabled=feed_enabled
    up.leader_enabled=leader_enabled
    up.ambient=undefined
    up.leader=undefined

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
    if(leader){
        up.leader={
            id:stream.read_id(),
            kills:stream.read_uint16()
        }
    }
    up.living_count=stream.read_array((_s)=>{
        return stream.read_uint8()
    },1)
    up.map_zones=stream.read_array(()=>{
        const [id]=stream.read_boolean_group()
        const ret:MapZone={
            color:stream.read_uint32(),
            icon:stream.read_uint8(),
            position:stream.read_pos2(),
            radius:stream.read_float32()
        }
        if(id)ret.id=stream.read_id()
        return ret
    },1)
    up.main_state=undefined
    if(main_state)up.main_state=decode_general_main_state(stream)
}

export class GeneralUpdatePacket extends Packet{
    ID=PacketType.GeneralUpdate
    Name="general_update"
    content:GeneralUpdate={
        started:false,
        feed_enabled:false,
        leader_enabled:false,
        living_count:[],
        feed:[],
        deadzone:undefined,
        map_zones:[]
    }
    decode(stream: Stream): void {
        decode_general_update(stream,this.content)
    }
    encode(stream: Stream): void {
        encode_general_update(stream,this.content)
    }
}