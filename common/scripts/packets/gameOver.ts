import { NetStream, Packet } from "../../engine/core.ts";
import { PlayerStatus } from "../others/constants.ts";
export interface LeaderboardPlayer{
    id:number
    rank:number
    score:number
    kills:number
}
export type GameOverStatus={
    status:PlayerStatus[]
    leaderboards?:LeaderboardPlayer[]
}&({
    win:true
}|{
    win:false
    eliminator:number
})
export class GameOverPacket extends Packet{
    ID=3
    Name="gameover"
    status:GameOverStatus={
        status:[],
        win:false,
        eliminator:0
    }
    constructor(){
        super()
    }
    encode(stream: NetStream): void {
        stream.writeBooleanGroup(this.status.win,this.status.leaderboards!==undefined)
        stream.writeArray(this.status.status,(status)=>{
            stream.writeID(status.id)
            .writeInt16(Math.ceil(status.score))
            .writeUint16(Math.ceil(status.damage))
            .writeUint16(Math.ceil(status.damage_taken))
            .writeUint8(status.kills)
            .writeArray(status.score_applyer,(v)=>{
                stream.writeUint8(v.type)
                .writeInt16(v.amount)
                .writeFloat32(v.multiplier)
            },2)
        },1)
        if(!this.status.win){
            stream.writeID(this.status.eliminator)
        }
        if(this.status.leaderboards){
            stream.writeArray(this.status.leaderboards,(v)=>{
                stream.writeID(v.id)
                .writeUint8(v.kills)
                .writeUint8(v.rank)
                .writeInt16(v.score)
            },1)
        }
    }
    decode(stream: NetStream): void {
        const bg=stream.readBooleanGroup()
        this.status.win=bg[0]
        this.status.status=stream.readArray(()=>{
            return {
                id:stream.readID(),
                score:stream.readInt16(),
                damage:stream.readUint16(),
                damage_taken:stream.readUint16(),
                kills:stream.readUint8(),
                score_applyer:stream.readArray(()=>{
                    return {
                        type:stream.readUint8(),
                        amount:stream.readInt16(),
                        multiplier:stream.readFloat32()
                    }
                },2),
                time_alive:0,
            }
        },1)
        if(!this.status.win){
            this.status.eliminator=stream.readID()
        }
        if(bg[1]){
            this.status.leaderboards=stream.readArray(()=>{
                return {
                    id:stream.readID(),
                    kills:stream.readUint8(),
                    rank:stream.readUint8(),
                    score:stream.readInt16(),
                }
            },1)
        }
    }
}