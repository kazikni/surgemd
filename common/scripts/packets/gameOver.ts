import { Stream, Packet } from "../../engine/core.ts";
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
    encode(stream: Stream): void {
        stream.write_boolean_group(this.status.win,this.status.leaderboards!==undefined)
        stream.write_array(this.status.status,(status)=>{
            stream.write_id(status.id)
            .write_int16(Math.ceil(status.score))
            .write_uint16(Math.ceil(status.damage))
            .write_uint16(Math.ceil(status.damage_taken))
            .write_uint8(status.kills)
            .write_array(status.score_applyer,(v)=>{
                stream.write_uint8(v.type)
                .write_int16(v.amount)
                .write_float32(v.multiplier)
            },2)
        },1)
        if(!this.status.win){
            stream.write_id(this.status.eliminator)
        }
        if(this.status.leaderboards){
            stream.write_array(this.status.leaderboards,(v)=>{
                stream.write_id(v.id)
                .write_uint8(v.kills)
                .write_uint8(v.rank)
                .write_int16(v.score)
            },1)
        }
    }
    decode(stream: Stream): void {
        const bg=stream.read_boolean_group()
        this.status.win=bg[0]
        this.status.status=stream.read_array(()=>{
            return {
                id:stream.read_id(),
                score:stream.read_int16(),
                damage:stream.read_uint16(),
                damage_taken:stream.read_uint16(),
                kills:stream.read_uint8(),
                score_applyer:stream.read_array(()=>{
                    return {
                        type:stream.read_uint8(),
                        amount:stream.read_int16(),
                        multiplier:stream.read_float32()
                    }
                },2),
                time_alive:0,
            }
        },1)
        if(!this.status.win){
            this.status.eliminator=stream.read_id()
        }
        if(bg[1]){
            this.status.leaderboards=stream.read_array(()=>{
                return {
                    id:stream.read_id(),
                    kills:stream.read_uint8(),
                    rank:stream.read_uint8(),
                    score:stream.read_int16(),
                }
            },1)
        }
    }
}