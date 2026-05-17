import { NetStream, Packet } from "../../engine/core.ts";
import { HumanStatus } from "../others/constants.ts";
export type GameOverStatus={
    status:HumanStatus
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
        status:{
            damage:0,
            damage_taken:0,
            kills:0,
            score:0,
        },
        win:false,
        eliminator:0
    }
    constructor(){
        super()
    }
    encode(stream: NetStream): void {
        stream.writeBooleanGroup(this.status.win)
        .writeInt16(Math.ceil(this.status.status.score))
        .writeUint16(Math.ceil(this.status.status.damage))
        .writeUint16(Math.ceil(this.status.status.damage_taken))
        .writeUint8(this.status.status.kills)
        if(!this.status.win){
            stream.writeID(this.status.eliminator)
        }
    }
    decode(stream: NetStream): void {
        const bg=stream.readBooleanGroup()
        this.status.win=bg[0]
        this.status.status.score=stream.readInt16()
        this.status.status.damage=stream.readUint16()
        this.status.status.damage_taken=stream.readUint16()
        this.status.status.kills=stream.readUint8()
        if(!this.status.win){
            this.status.eliminator=stream.readID()
        }
    }
}