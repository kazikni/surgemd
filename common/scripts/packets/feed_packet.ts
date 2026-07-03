import { Stream, Packet } from "../../engine/core.ts";
import { DamageReason, PacketType } from "../definitions/utils.ts"
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
export class FeedPacket extends Packet{
    ID=PacketType.Feed
    Name="feed"
    message!:FeedMessage
    constructor(){
        super()
    }
    encode(stream: Stream): void {
        stream.write_uint8(this.message.type)
        switch(this.message.type){
            case FeedMessageType.kill:
            case FeedMessageType.down:
                stream.write_boolean_group(this.message.killer!==undefined)
                .write_uint8(this.message.damage_reason)
                if(this.message.killer){
                    stream.write_id(this.message.killer.id)
                    .write_uint8(this.message.killer.kills)
                    .write_uint16(this.message.killer.used)
                }
                stream.write_id(this.message.victimId)
                break
            case FeedMessageType.join:
            case FeedMessageType.set_name:
                stream.write_id(this.message.playerId)
                stream.write_string_sized(this.message.playerName,28)
                stream.write_uint16((this.message.playerBadge??-1)+1)
                break
            case FeedMessageType.leader_dead:
            case FeedMessageType.leader_assigned:
                stream.write_id(this.message.player.id)
                stream.write_uint8(this.message.player.kills)
                break
        }
    }
    decode(stream: Stream): void {
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
        this.message=msg as unknown as FeedMessage
    }
}