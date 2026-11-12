import { Packet, PolarMovement, Stream, Vec2 } from "../../engine/core.ts";
import { PacketType } from "../definitions/utils.ts";

export enum InputActionType{
    drop,
    use_item,
    set_hand,
    set_scope,
    emote,
    message,
    ping,
    spectate,
    command,
}
export type InputAction={
    type:InputActionType.drop
    drop_kind:number
    drop:number
}|{
    type:InputActionType.set_hand
    hand:number
}|{
    type:InputActionType.use_item
    slot:number
}|{
    type:InputActionType.set_scope
    scope_id:number
}|{
    type:InputActionType.emote
    id:number
}|{
    type:InputActionType.message
    value:string
}|{
    type:InputActionType.ping
    ping:number
    position:Vec2
}|{
    type:InputActionType.spectate
    val:number // 0 = Normal, 1 = Next, 2 = Previous
}|{
    type:InputActionType.command
    val:string[]
}

export interface InputData{
    movement:PolarMovement
    rotation:number
    distance_to_aim:number

    auto_fire:boolean
    use_weapon:boolean
    alt_use_weapon:boolean
    interact:boolean
    cancel:boolean
    reload:boolean
    swap_guns:boolean

    actions:InputAction[]
}
export function EmptyInputData():InputData{
    return {
        movement:{dir:0,scale:0},
        rotation:0,
        distance_to_aim:0,
        auto_fire:false,
        use_weapon:false,
        alt_use_weapon:false,
        interact:false,
        cancel:false,
        reload:false,
        swap_guns:false,
        actions:[]
    }
}

export class InputPacket extends Packet{
    ID=PacketType.Input
    Name="input"

    data:InputData=EmptyInputData()

    constructor(data?:InputData){
        super()
        if(data)this.data=data
    }
    encode(stream: Stream): void {
        const d=this.data
        stream.write_polar_mov2(d.movement)
            .write_rad(d.rotation)
            .write_float(d.distance_to_aim,0,1,1)
            .write_boolean_group(d.auto_fire,d.use_weapon,d.alt_use_weapon,d.interact,d.cancel,d.reload,d.swap_guns)
            .write_array(d.actions,(i)=>{
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
                    case InputActionType.emote:
                        stream.write_uint16(i.id)
                        break
                    case InputActionType.message:
                        stream.write_string_sized(i.value,50)
                        break
                    case InputActionType.ping:
                        stream.write_uint16(i.ping)
                        .write_pos2(i.position)
                        break
                    case InputActionType.spectate:
                        stream.write_uint8(i.val)
                        break
                    case InputActionType.command:
                        stream.write_array(i.val,(v)=>stream.write_string(v,2),1)
                        break
                }
            },1)
    }
    decode(stream: Stream): void {
        const movement=stream.read_polar_mov2()
        const rotation=stream.read_rad()
        const distance_to_aim=stream.read_float(0,1,1)
        const bg=stream.read_boolean_group()
        const actions=stream.read_array(()=>{
            const type=stream.read_uint8() as InputActionType
            switch(type){
                case InputActionType.drop:{
                    const drop=stream.read_uint8()
                    const drop_kind=stream.read_uint8()
                    return {type,drop,drop_kind}
                }
                case InputActionType.use_item:
                    return {type,slot:stream.read_uint8()}
                case InputActionType.set_hand:
                    return {type,hand:stream.read_uint8()}
                case InputActionType.set_scope:
                    return {type,scope_id:stream.read_uint8()}
                case InputActionType.emote:
                    return {type,id:stream.read_uint16()}
                case InputActionType.message:
                    return {type,value:stream.read_string_sized(50)}
                case InputActionType.ping:{
                    const ping=stream.read_uint16()
                    return {type,ping,position:stream.read_pos2()}
                }
                case InputActionType.spectate:
                    return {type,val:stream.read_uint8()}
                case InputActionType.command:
                    return {type,val:stream.read_array(()=>stream.read_string(2),1)}
            }
        },1) as InputAction[]
        this.data={
            movement,
            rotation,
            distance_to_aim,
            auto_fire:bg[0],
            use_weapon:bg[1],
            alt_use_weapon:bg[2],
            interact:bg[3],
            cancel:bg[4],
            reload:bg[5],
            swap_guns:bg[6],
            actions:actions.filter((a)=>a!==undefined),
        }
    }
}
