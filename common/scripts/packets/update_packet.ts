import { Numeric, UpdatePacketBase, v2, Vec2 } from "../../engine/core.ts";
import { NetStream } from "../../engine/core/net/stream.ts";
import { type GameDefinition, GameItem, WeaponDef } from "../definitions/game_defs.ts";
import { BoostType } from "../definitions/player/boosts.ts";
import { InventoryItemData } from "../definitions/utils.ts";
import { ActionsType } from "../others/constants.ts";
export interface PingData{
    position:Vec2
    def:number
    id:number
    color:number
}
export interface DamageSplash{
    count:number

    position:Vec2
    taker:number
    taker_layer:number

    shield:boolean
    critical:boolean
    shield_break:boolean
}
export interface PrivateUpdate{
    splashes:DamageSplash[]

    active_entity:{
        dirty:boolean
        id:number
    }
    pings:PingData[]

    self_state?:SelfStateUpdate
}
export interface GroupMemberState{
    boost_type:BoostType
    boost:number
    health:number
}
export interface SelfStateUpdate{
    dirty:{
        inventory:{
            items:boolean
            aitems:boolean
            iitems:boolean
            weapons:boolean
            hand:boolean
        }
        action:boolean
        team:boolean
        group:boolean
    }

    health:number
    max_health:number

    boost:number
    max_boost:number
    boost_type:BoostType

    money:number

    inventory:{
        items:InventoryItemData[]
        aitems:Record<string,number>
        iitems:GameItem[]
        weapons:(WeaponDef|undefined)[]
        hand?:{
            slot:number
            ammo:number
            liquid:boolean
        }
    }

    action?:{delay:number,type:ActionsType}

    current_scope:number

    group?:Record<number,GroupMemberState>
}
function encode_self_state(state:SelfStateUpdate,stream:NetStream,definitions:GameDefinition){
    stream.writeUint8(state.health)
    .writeUint8(state.max_health)
    .writeUint8(state.boost)
    .writeUint8(state.max_boost)
    .writeUint8(state.boost_type)

    .writeUint16(state.money)

    .writeBooleanGroup2(
        state.dirty.inventory.items,
        state.dirty.inventory.aitems,
        state.dirty.inventory.iitems,
        state.dirty.inventory.weapons,
        state.dirty.inventory.hand,

        state.dirty.action,
        state.dirty.group,
        state.dirty.team,

        state.inventory.hand!==undefined, //has Hand
        state.action!==undefined, //has Action

        state.inventory.hand?.liquid, // Is Liquid
    )
    if(state.dirty.inventory.items){
        stream.writeArray<InventoryItemData>(state.inventory.items,(i)=>{
            stream.writeUint16(i.idNumber)
            .writeUint8(i.type)
            .writeUint8(i.count)
        },1)
    }
    if(state.dirty.inventory.aitems){
        stream.writeArray(Object.entries(state.inventory.aitems),(i)=>{
            const def=definitions.ammos.getFromString(i[0])
            stream.writeUint8(def.idNumber!)
            if(def.liquid){
                stream.writeFloat32(i[1])
            }else{
                stream.writeUint16(i[1] as unknown as number)
            }
        },1)
    }
    if(state.dirty.inventory.iitems){
        stream.writeArray(state.inventory.iitems,(i)=>{
            stream.writeUint16(definitions.game_items.keysString[i.idString])
        },1)
    }
    if(state.dirty.inventory.weapons){
        stream.writeArray(state.inventory.weapons,(i)=>{
            if(i)stream.writeUint16(definitions.game_items.keysString[i.idString]+1)
            else stream.writeUint16(0)
        },1)
    }
    if(state.dirty.inventory.hand){
        if(state.inventory.hand){
            stream.writeInt8(state.inventory.hand.slot)
            if(state.inventory.hand.liquid){
                stream.writeFloat32(Numeric.maxDecimals(state.inventory.hand.ammo,1))
            }else{
                stream.writeUint16(state.inventory.hand.ammo)
            }
        }
    }
    if(state.dirty.action&&state.action){
        stream.writeFloat(state.action.delay,0,20,3)
        stream.writeUint8(state.action.type)
    }
    if(state.dirty.group){
        stream.writeNumberDict(state.group??{},(i)=>{
            stream.writeFloat(i.health,0,1,1)
            stream.writeFloat(i.boost,0,1,1)
            stream.writeUint8(i.boost_type)
        },3)
    }
    stream.writeUint8(state.current_scope)
}
function decode_self_state(state:SelfStateUpdate,stream:NetStream,definitions:GameDefinition){
    state.health=stream.readUint8()
    state.max_health=stream.readUint8()
    state.boost=stream.readUint8()
    state.max_boost=stream.readUint8()
    state.boost_type=stream.readUint8()
    state.money=stream.readUint16()
    const [
        dirtyItems,
        dirtyAItems,
        dirtyIItems,
        dirtyWeapons,
        dirtyHand,

        dirtyAction,
        dirtyGroup,
        dirtyTeam,

        hasHand,
        hasAction,
        liquid,
    ]=stream.readBooleanGroup2()
    state.dirty={
        inventory:{
            items:dirtyItems,
            aitems:dirtyAItems,
            iitems:dirtyIItems,
            weapons:dirtyWeapons,
            hand:dirtyHand,
        },
        action:dirtyAction,
        group:dirtyGroup,
        team:dirtyTeam
    }
    if(dirtyItems){
        state.inventory.items=stream.readArray<InventoryItemData>(()=>{
            return {
                idNumber:stream.readUint16(),
                type:stream.readUint8(),
                count:stream.readUint8()
            }
        },1)
    }
    if(dirtyAItems){
        const len=stream.readUint8()
        state.inventory.aitems={}
        for(let i=0;i<len;i++){
            const def=definitions.ammos.getFromNumber(stream.readUint8())
            if(def.liquid){
                state.inventory.aitems[def.idNumber!]=Numeric.maxDecimals(stream.readFloat32(),1)
            }else{
                state.inventory.aitems[def.idNumber!]=stream.readUint16()
            }
        }
    }
    if(dirtyIItems){
        state.inventory.iitems=stream.readArray(()=>{
            return definitions.game_items.valueNumber[stream.readUint16()]
        },1)
    }
    if(dirtyWeapons){
        state.inventory.weapons=stream.readArray(()=>{
            const id=stream.readUint16()
            if(id==0){
                return undefined
            }else{
                return definitions.game_items.valueNumber[id-1] as WeaponDef
            }
        },1)
    }
    if(dirtyHand){
        state.inventory.hand=undefined
        if(hasHand){
            state.inventory.hand={
                slot:stream.readInt8(),
                ammo:liquid?stream.readFloat32():stream.readUint16(),
                liquid:liquid
            }
        }
    }
    if(dirtyAction){
        state.dirty.action=true
        if(hasAction){
            state.action={
                delay:stream.readFloat(0,20,3),
                type:stream.readUint8(),
            }
        }
    }
    if(dirtyGroup){
        state.dirty.group=true
        state.group=stream.readNumberDict(()=>{
            return {
                health:stream.readFloat(0,1,1),
                boost:stream.readFloat(0,1,1),
                boost_type:stream.readUint8(),
            }
        },3)
    }
    state.current_scope=stream.readUint8()
}
export class UpdatePacket extends UpdatePacketBase<PrivateUpdate>{
    ID=2
    Name="update"
    definition!:GameDefinition
    constructor(){
        super({
            splashes:[],
            active_entity:{
                dirty:false,
                id:0,
            },
            pings:[]
        })
    }
    override encode_private(stream: NetStream): void {
        stream.writeBooleanGroup(
            this.priv.active_entity.dirty,
            this.priv.self_state!==undefined
        )
        .writeArray(this.priv.splashes,(d)=>{
            stream.writeBooleanGroup(d.critical,d.shield,d.shield_break)
            .writeUint16(Math.ceil(d.count))
            .writeID(d.taker)
            .writeUint8(d.taker_layer)
            .writePos2(d.position)
        },1)
        .writeArray(this.priv.pings,(e)=>{
            stream.writePos2(e.position)
            .writeUint8(e.def)
            .writeInt8(e.id)
            .writeUint32(e.color)
        },1)
        if(this.priv.active_entity.dirty){
            stream.writeID(this.priv.active_entity.id)
        }
        if(this.priv.self_state){
            encode_self_state(this.priv.self_state,stream,this.definition)
        }
    }
    override decode_private(stream: NetStream): void {
        const bg=stream.readBooleanGroup()
        this.priv.splashes=stream.readArray(()=>{
            const bg=stream.readBooleanGroup()
            return {
               count:stream.readUint16(),
               taker:stream.readID(),
               taker_layer:stream.readUint8(),
               position:stream.readPos2(),
               critical:bg[0],
               shield:bg[1],
               shield_break:bg[2], 
            }
        },1)
        this.priv.pings=stream.readArray(()=>{
            return {
                position:stream.readPos2(),
                def:stream.readUint8(),
                id:stream.readUint8(),
                color:stream.readUint32()
            }
        },1)
        if(bg[0]){
            this.priv.active_entity={
                dirty:true,
                id:stream.readID(),
            }
        }
        if(bg[1]){
            this.priv.self_state={
                health:0,
                max_health:0,

                max_boost:0,
                boost:0,
                boost_type:BoostType.Shield,

                money:0,

                dirty:{
                    inventory:{
                        items:false,
                        aitems:false,
                        iitems:false,
                        weapons:false,
                        hand:false,
                    },
                    action:false,
                    group:false,
                    team:false,
                },
                action:undefined,
                inventory:{
                    items:[],
                    aitems:{},
                    iitems:[],
                    weapons:[],
                    hand:undefined
                },
                current_scope:0,
            }
            decode_self_state(this.priv.self_state,stream,this.definition)
        }
    }
}