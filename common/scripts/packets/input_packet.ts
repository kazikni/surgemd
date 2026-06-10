import { Stream, Packet, PolarMovement } from "../../engine/core.ts";
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
    encode(stream: Stream): void {
        stream.write_polar_mov2(this.movement)
            .write_rad(this.angle)
            .write_float(this.distance_to_aim,0,1,1)
            .write_boolean_group(this.auto_fire,this.use_weapon,this.alt_use_weapon,this.interact,this.reload,this.swamp_guns)
            .write_array(this.actions,(i,_s)=>{
                stream.write_uint8(i.type)
                switch(i.type){
                  case InputActionType.drop:
                        stream.write_uint8(i.drop)
                        .write_uint8(i.drop_kind)
                        break
                  case InputActionType.use_item:
                        stream.write_uint8(i.slot)
                        break
                  case InputActionType.set_hand:
                        stream.write_uint8(i.hand)
                        break
                  case InputActionType.set_scope:
                        stream.write_uint8(i.scope_id)
                        break
                  case InputActionType.emote_emote:
                    stream.write_uint16(i.emote)
                    break
                  case InputActionType.emote_item:
                    stream.write_uint16(i.item)
                    break
                  case InputActionType.buy_on_shop:
                    stream.write_uint16(i.item_id)
                    break
                  case InputActionType.debug_give:
                  case InputActionType.debug_spawn:
                    stream.write_string_sized(i.item,32)
                    .write_uint8(i.count)
                    break
                }
          },1)
    }
    decode(stream: Stream): void {
        this.movement=stream.read_polar_mov2()
        this.angle=stream.read_rad()
        this.distance_to_aim=stream.read_float(0,1,1)
        const bg=stream.read_boolean_group()
        this.auto_fire=bg[0]
        this.use_weapon=bg[1]
        this.alt_use_weapon=bg[2]
        this.interact=bg[3]
        this.reload=bg[4]
        this.swamp_guns=bg[5]
        this.actions=stream.read_array((_s)=>{
          const ret={
              type:stream.read_uint8()
          } as InputAction
          switch(ret.type){
              case InputActionType.drop:
                ret["drop"]=stream.read_uint8()
                ret["drop_kind"]=stream.read_uint8()
                break
              case InputActionType.use_item:
                ret["slot"]=stream.read_uint8()
                break
              case InputActionType.set_hand:
                ret["hand"]=stream.read_uint8()
                break
              case InputActionType.set_scope:
                ret["scope_id"]=stream.read_uint8()
                break
              case InputActionType.emote_emote:
                ret["emote"]=stream.read_uint16()
                break
              case InputActionType.emote_item:
                ret["item"]=stream.read_uint16()
                break
              case InputActionType.buy_on_shop:
                ret["item_id"]=stream.read_uint16()
                break
              case InputActionType.debug_give:
              case InputActionType.debug_spawn:
                ret["item"]=stream.read_string_sized(32)
                ret["count"]=stream.read_uint8()
                break
          }
          return ret
        },1)
    }
}