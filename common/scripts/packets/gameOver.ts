import { NetStream, Packet } from "../../engine/core.ts";

export class GameOverPacket extends Packet{
    ID=3
    Name="gameover"
    Win:boolean=false
    Message:string=""
    Score:number=0
    Kills:number=0
    DamageDealth:number=0
    Eliminator:number=0
    constructor(){
        super()
    }
    encode(stream: NetStream): void {
        stream.writeBooleanGroup(this.Win)
        .writeUint16(this.Score)
        .writeUint8(this.Kills)
        .writeUint24(this.DamageDealth)
        .writeStringSized(15,this.Message)
        if(!this.Win){
            stream.writeID(this.Eliminator)
        }
    }
    decode(stream: NetStream): void {
        this.Win=stream.readBooleanGroup()[0]
        this.Score=stream.readUint16()
        this.Kills=stream.readUint8()
        this.DamageDealth=stream.readUint24()
        this.Message=stream.readStringSized(15)
        if(!this.Win){
            this.Eliminator=stream.readID()
        }
    }
}