import { NetStream, Packet } from "../../engine/core.ts";
import { HumanStatus } from "../others/constants.ts";
export type GameOverStatus={
    status:(HumanStatus&{id:number})[]
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
        stream.writeBooleanGroup(this.status.win)
        stream.writeArray(this.status.status,(status)=>{
            stream.writeID(status.id)
            .writeInt16(Math.ceil(status.score))
            .writeUint16(Math.ceil(status.damage))
            .writeUint16(Math.ceil(status.damage_taken))
            .writeUint8(status.kills)
        },1)
        if(!this.status.win){
            stream.writeID(this.status.eliminator)
        }
    }
    decode(stream: NetStream): void {
        const bg=stream.readBooleanGroup()
        this.status.win=bg[0]
        this.status.status=stream.readArray(()=>{
            return{
                id:stream.readID(),
                score:stream.readInt16(),
                damage:stream.readUint16(),
                damage_taken:stream.readUint16(),
                kills:stream.readUint8()
            }
        },1)
        if(!this.status.win){
            this.status.eliminator=stream.readID()
        }
    }
}