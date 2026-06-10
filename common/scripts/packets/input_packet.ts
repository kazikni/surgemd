import { NetStream, Packet, PolarMovement } from "../../engine/core.ts";
export enum InputActionType{
    drop,
    use_item,
    set_hand,
    debug_give,
    set_scope,
    emote_emote,
    emote_item,
    buy_on_shop,
    debug_spawn,
}
export type InputAction=({
    type:InputActionType.drop,
    drop_kind:number,
    drop:number
}|{
    type:InputActionType.set_hand,
    hand:number
}|{
    type:InputActionType.use_item,
    slot:number
}|{
    type:InputActionType.use_item,
    slot:number
}|{
    type:InputActionType.set_scope,
    scope_id:number
}|{
    type:InputActionType.emote_emote,
    emote:number
}|{
    type:InputActionType.emote_item,
    item:number
}|{
    type:InputActionType.buy_on_shop,
    item_id:number
}|{
    type:InputActionType.debug_give|InputActionType.debug_spawn,
    item:string,
    count:number
})
export class InputPacket extends Packet{
    ID=1
    Name="input"

    movement:PolarMovement={dir:0,scale:0}
    angle:number=0
    distance_to_aim:number=0

    auto_fire:boolean=false
    use_weapon:boolean=false
    alt_use_weapon:boolean=false
    interact:boolean=false
    reload:boolean=false
    swamp_guns:boolean=false

    actions:InputAction[]=[]

    constructor(){
        super()
    }
    encode(stream: NetStream): void {
        stream.writePolarMov2(this.movement)
        .writeRad(this.angle)
        .writeFloat(this.distance_to_aim,0,1,1)
        .writeBooleanGroup(this.auto_fire,this.use_weapon,this.alt_use_weapon,this.interact,this.reload,this.swamp_guns)
        .writeArray(this.actions,(i,_s)=>{
            stream.writeUint8(i.type)
            switch(i.type){
              case InputActionType.drop:
                    stream.writeUint8(i.drop)
                    .writeUint8(i.drop_kind)
                    break
              case InputActionType.use_item:
                    stream.writeUint8(i.slot)
                    break
              case InputActionType.set_hand:
                    stream.writeUint8(i.hand)
                    break
              case InputActionType.set_scope:
                    stream.writeUint8(i.scope_id)
                    break
              case InputActionType.emote_emote:
                stream.writeUint16(i.emote)
                break
              case InputActionType.emote_item:
                stream.writeUint16(i.item)
                break
              case InputActionType.buy_on_shop:
                stream.writeUint16(i.item_id)
                break
              case InputActionType.debug_give:
              case InputActionType.debug_spawn:
                stream.writeStringSized(32,i.item)
                .writeUint8(i.count)
                break
            }
        },1)
    }
    decode(stream: NetStream): void {
        this.movement=stream.readPolarMov2()
        this.angle=stream.readRad()
        this.distance_to_aim=stream.readFloat(0,1,1)
        const bg=stream.readBooleanGroup()
        this.auto_fire=bg[0]
        this.use_weapon=bg[1]
        this.alt_use_weapon=bg[2]
        this.interact=bg[3]
        this.reload=bg[4]
        this.swamp_guns=bg[5]
        this.actions=stream.readArray((_s)=>{
          const ret={
              type:stream.readUint8()
          } as InputAction
          switch(ret.type){
              case InputActionType.drop:
                ret["drop"]=stream.readUint8()
                ret["drop_kind"]=stream.readUint8()
                break
              case InputActionType.use_item:
                ret["slot"]=stream.readUint8()
                break
              case InputActionType.set_hand:
                ret["hand"]=stream.readUint8()
                break
              case InputActionType.set_scope:
                ret["scope_id"]=stream.readUint8()
                break
              case InputActionType.emote_emote:
                ret["emote"]=stream.readUint16()
                break
              case InputActionType.emote_item:
                ret["item"]=stream.readUint16()
                break
              case InputActionType.buy_on_shop:
                ret["item_id"]=stream.readUint16()
                break
              case InputActionType.debug_give:
              case InputActionType.debug_spawn:
                ret["item"]=stream.readStringSized(32)
                ret["count"]=stream.readUint8()
                break
          }
          return ret
        },1)
    }
}