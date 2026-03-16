import { NetStream, Packet } from "../../engine/core.ts";
import { DamageReason } from "../definitions/utils.ts"
export enum KillFeedMessageType{
    kill,
    down,
    join,
    killleader_assigned,
    killleader_dead
}
export interface KillFeedMessageKill{
    type:KillFeedMessageType.kill|KillFeedMessageType.down,
    killer?:{
        id:number
        kills:number
        used:number
    }
    damage_reason:DamageReason
    victimId:number
}
export interface KillFeedMessageKillleader{
    type:KillFeedMessageType.killleader_assigned|KillFeedMessageType.killleader_dead,
    player:{
        kills:number
        id:number
    }
}
export interface KillFeedMessageJoin{
    type:KillFeedMessageType.join
    playerId:number
    playerBadge?:number
    playerName:string
}
export type KillFeedMessage=KillFeedMessageKill|KillFeedMessageJoin|KillFeedMessageKillleader
export class KillFeedPacket extends Packet{
    ID=4
    Name="killfeed"
    message!:KillFeedMessage
    constructor(){
        super()
    }
    encode(stream: NetStream): void {
        stream.writeUint8(this.message.type)
        switch(this.message.type){
            case KillFeedMessageType.kill:
            case KillFeedMessageType.down:
                stream.writeBooleanGroup(this.message.killer!==undefined)
                .writeUint8(this.message.damage_reason)
                if(this.message.killer){
                    stream.writeID(this.message.killer.id)
                    .writeUint8(this.message.killer.kills)
                    .writeUint16(this.message.killer.used)
                }
                stream.writeID(this.message.victimId)
                break
            case KillFeedMessageType.join:
                stream.writeID(this.message.playerId)
                stream.writeStringSized(28,this.message.playerName)
                stream.writeUint16((this.message.playerBadge??-1)+1)
                break
            case KillFeedMessageType.killleader_dead:
            case KillFeedMessageType.killleader_assigned:
                stream.writeID(this.message.player.id)
                stream.writeUint8(this.message.player.kills)
                break
        }
    }
    decode(stream: NetStream): void {
        const msg={
            type:stream.readUint8() as KillFeedMessageType,
        } as Record<string,unknown>
        switch(msg.type){
            case KillFeedMessageType.kill:
            case KillFeedMessageType.down:{
                const bg=stream.readBooleanGroup()
                msg["damage_reason"]=stream.readUint8()
                if(bg[0]){
                    msg["killer"]={
                        id:stream.readID(),
                        kills:stream.readUint8(),
                        used:stream.readUint16()
                    }
                }
                msg["victimId"]=stream.readID()
                break
            }
            case KillFeedMessageType.join:{
                msg["playerId"]=stream.readID()
                msg["playerName"]=stream.readStringSized(28)
                const b=stream.readUint16()
                msg["playerBadge"]=b===0?undefined:b-1
                break
            }
            case KillFeedMessageType.killleader_dead:
            case KillFeedMessageType.killleader_assigned:
                msg["player"]={
                    id:stream.readID(),
                    kills:stream.readUint8()
                }
                break
        }
        this.message=msg as unknown as KillFeedMessage
    }
}