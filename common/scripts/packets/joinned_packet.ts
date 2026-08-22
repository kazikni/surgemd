import { KDate, Stream, Packet } from "../../engine/core.ts";
import { PacketType } from "../definitions/utils.ts";
export enum ShopItemType {
    tab,
    section,
    clicable,
    item,
}
export type ShopNode =
    {
        type: ShopItemType.tab
        id: string
        name?: string
        content: ShopNode[]
        icon?: string
    }|{
        type: ShopItemType.section
        id: string
        name?: string
        icon?: string
        content: ShopNode[]
    }|{
        type: ShopItemType.clicable
        id: string
        cost?:number
        name?: string
        icon?: string
    }|{
        type: ShopItemType.item
        id: string
        cost?:number
        name?: string
        icon?: string
    }
export class JoinnedPacket extends Packet{
    ID=PacketType.Joinned
    Name="joinned"

    players:{id:number,name:string,badge?:number}[]=[]
    leader?:{id:number,kills:number}
    ntps:number=0

    date!:KDate

    constructor(){
        super()
    }
    encode(stream: Stream): void {
        stream.write_boolean_group(this.leader!==undefined)
        stream.write_uint8(this.ntps)
        if(this.leader){
            stream.write_id(this.leader.id)
            stream.write_uint8(this.leader.kills)
        }
        stream.write_array(this.players,(e)=>{
            stream.write_uint16((e.badge??-1)+1)
            stream.write_string_sized(e.name,28)
            stream.write_id(e.id)
        },1)
        stream.write_kdate(this.date)
    }
    decode(stream: Stream): void {
        const [leader]=stream.read_boolean_group()
        this.ntps=stream.read_uint8()
        if(leader){
            this.leader={
              id:stream.read_id(),
              kills:stream.read_uint8()
            }
        }
        this.players=stream.read_array((_e)=>{
            const b=stream.read_uint16()
            return {
                name:stream.read_string_sized(28),
                id:stream.read_id(),
                badge:b===0?undefined:b-1
            }
        },1)
        this.date=stream.read_kdate()
    }
}