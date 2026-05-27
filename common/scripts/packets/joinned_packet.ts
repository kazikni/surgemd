import { KDate, NetStream, Packet } from "../../engine/core.ts";
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
    ID=5
    Name="joinned"
    players:{id:number,name:string,badge?:number}[]=[]
    leader?:{id:number,kills:number}

    date!:KDate
    mode:{
        shop?:ShopNode[]
    }={}
    constructor(){
        super()
    }
    encode(stream: NetStream): void {
        stream.writeBooleanGroup(this.leader!==undefined)
        if(this.leader){
            stream.writeID(this.leader.id)
            stream.writeUint8(this.leader.kills)
        }
        stream.writeArray(this.players,(e)=>{
            stream.writeUint16((e.badge??-1)+1)
            stream.writeStringSized(28,e.name)
            stream.writeID(e.id)
        },1)
        stream.writeArray(this.mode.shop??[],(n)=>{
            stream.writeObject(n,1,1)
        },1)
        stream.writeKDate(this.date)
    }
    decode(stream: NetStream): void {
        const [leader]=stream.readBooleanGroup()
        if(leader){
            this.leader={
              id:stream.readID(),
              kills:stream.readUint8()
            }
        }
        this.players=stream.readArray((_e)=>{
            const b=stream.readUint16()
            return {
                name:stream.readStringSized(28),
                id:stream.readID(),
                badge:b===0?undefined:b-1
            }
        },1)
        this.mode.shop=stream.readArray(()=>{
            return stream.readObject(1,1) as ShopNode
        },1)
        this.date=stream.readKDate()
    }
}