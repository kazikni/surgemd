import { Stream, Packet } from "../../engine/core.ts";
import { PacketType } from "../definitions/utils.ts";

export class JoinPacket extends Packet{
    ID=PacketType.Join
    Name="join"

    player_name:string=""
    group_token:string=""

    skin?:{
        female:boolean

        shirt:number
        hair:number

        body_tint:number
        hair_tint:number
    }

    wrapping:number=0
    victory_emote:number=0
    death_emote:number=0
    constructor(){
        super()
    }
    encode(stream: Stream): void {
        stream.write_string_sized(this.player_name,30)
        stream.write_string_sized(this.group_token,20)
        stream.write_boolean_group(this.skin!==undefined,this.skin?.female)
        if(this.skin!==undefined){
            stream.write_uint16(this.skin.shirt)
            stream.write_uint16(this.skin.hair)
            stream.write_uint32(this.skin.body_tint)
            stream.write_uint32(this.skin.hair_tint)
        }
        stream.write_uint16(this.wrapping)
        stream.write_uint16(this.victory_emote)
        stream.write_uint16(this.death_emote)
    }
    decode(stream: Stream): void {
        this.player_name=stream.read_string_sized(30)
        this.group_token=stream.read_string_sized(20)
        const bg=stream.read_boolean_group()
        if(bg[0]){
            this.skin={
                body_tint:0,
                female:bg[2],
                hair:0,
                hair_tint:0,
                shirt:0
            }
            this.skin.shirt=stream.read_uint16()
            this.skin.hair=stream.read_uint16()
            this.skin.body_tint=stream.read_uint32()
            this.skin.hair_tint=stream.read_uint32()
            this.skin.female=bg[1]
        }
        this.wrapping=stream.read_uint16()
        this.victory_emote=stream.read_uint16()
        this.death_emote=stream.read_uint16()
    }
}