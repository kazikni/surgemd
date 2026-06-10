import { Numeric, UpdatePacketBase, v2, Vec2 } from "../../engine/core.ts";
import { Stream } from "../../engine/core/net/stream.ts";
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
    force_default_scope:boolean

    group?:Record<number,GroupMemberState>
}
function encode_self_state(state:SelfStateUpdate,stream:Stream,definitions:GameDefinition){
    stream.write_uint8(state.health)
    .write_uint8(state.max_health)
    .write_uint8(state.boost)
    .write_uint8(state.max_boost)
    .write_uint8(state.boost_type)

    .write_uint16(state.money)

    .write_boolean_group2(
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

        state.force_default_scope
    )
    if(state.dirty.inventory.items){
        stream.write_array<InventoryItemData>(state.inventory.items,(i)=>{
            stream.write_uint16(i.idNumber)
            .write_uint8(i.type)
            .write_uint8(i.count)
        },1)
    }
    if(state.dirty.inventory.aitems){
        stream.write_array(Object.entries(state.inventory.aitems),(i)=>{
            const def=definitions.ammos.getFromString(i[0])
            stream.write_uint8(def.idNumber!)
            if(def.liquid){
                stream.write_float32(i[1])
            }else{
                stream.write_uint16(i[1] as unknown as number)
            }
        },1)
    }
    if(state.dirty.inventory.iitems){
        stream.write_array(state.inventory.iitems,(i)=>{
            stream.write_uint16(definitions.game_items.keysString[i.idString])
        },1)
    }
    if(state.dirty.inventory.weapons){
        stream.write_array(state.inventory.weapons,(i)=>{
            if(i)stream.write_uint16(definitions.game_items.keysString[i.idString]+1)
            else stream.write_uint16(0)
        },1)
    }
    if(state.dirty.inventory.hand){
        if(state.inventory.hand){
            stream.write_int8(state.inventory.hand.slot)
            if(state.inventory.hand.liquid){
                stream.write_float32(Numeric.maxDecimals(state.inventory.hand.ammo,1))
            }else{
                stream.write_uint16(state.inventory.hand.ammo)
            }
        }
    }
    if(state.dirty.action&&state.action){
        stream.write_float(state.action.delay,0,20,3)
        stream.write_uint8(state.action.type)
    }
    if(state.dirty.group){
        stream.write_number_dict(state.group??{},(i)=>{
            stream.write_float(i.health,0,1,1)
            stream.write_float(i.boost,0,1,1)
            stream.write_uint8(i.boost_type)
        },3)
    }
    stream.write_uint8(state.current_scope)
}
function decode_self_state(state:SelfStateUpdate,stream:Stream,definitions:GameDefinition){
    state.health=stream.read_uint8()
    state.max_health=stream.read_uint8()
    state.boost=stream.read_uint8()
    state.max_boost=stream.read_uint8()
    state.boost_type=stream.read_uint8()
    state.money=stream.read_uint16()
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

        force_default_scope
    ]=stream.read_boolean_group2()
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
        state.inventory.items=stream.read_array<InventoryItemData>(()=>{
            return {
                idNumber:stream.read_uint16(),
                type:stream.read_uint8(),
                count:stream.read_uint8()
            }
        },1)
    }
    if(dirtyAItems){
        const len=stream.read_uint8()
        state.inventory.aitems={}
        for(let i=0;i<len;i++){
            const def=definitions.ammos.getFromNumber(stream.read_uint8())
            if(def.liquid){
                state.inventory.aitems[def.idNumber!]=Numeric.maxDecimals(stream.read_float32(),1)
            }else{
                state.inventory.aitems[def.idNumber!]=stream.read_uint16()
            }
        }
    }
    if(dirtyIItems){
        state.inventory.iitems=stream.read_array(()=>{
            return definitions.game_items.valueNumber[stream.read_uint16()]
        },1)
    }
    if(dirtyWeapons){
        state.inventory.weapons=stream.read_array(()=>{
            const id=stream.read_uint16()
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
                slot:stream.read_int8(),
                ammo:liquid?stream.read_float32():stream.read_uint16(),
                liquid:liquid
            }
        }
    }
    if(dirtyAction){
        state.dirty.action=true
        if(hasAction){
            state.action={
                delay:stream.read_float(0,20,3),
                type:stream.read_uint8(),
            }
        }
    }
    if(dirtyGroup){
        state.dirty.group=true
        state.group=stream.read_number_dict(()=>{
            return {
                health:stream.read_float(0,1,1),
                boost:stream.read_float(0,1,1),
                boost_type:stream.read_uint8(),
            }
        },3)
    }
    state.current_scope=stream.read_uint8()
    state.force_default_scope=force_default_scope
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
    override encode_private(stream: Stream): void {
        stream.write_boolean_group(
            this.priv.active_entity.dirty,
            this.priv.self_state!==undefined
        )
        .write_array(this.priv.splashes,(d)=>{
            stream.write_boolean_group(d.critical,d.shield,d.shield_break)
            .write_uint16(Math.ceil(d.count))
            .write_id(d.taker)
            .write_uint8(d.taker_layer)
            .write_pos2(d.position)
        },1)
        .write_array(this.priv.pings,(e)=>{
            stream.write_pos2(e.position)
            .write_uint8(e.def)
            .write_int8(e.id)
            .write_uint32(e.color)
        },1)
        if(this.priv.active_entity.dirty){
            stream.write_id(this.priv.active_entity.id)
        }
        if(this.priv.self_state){
            encode_self_state(this.priv.self_state,stream,this.definition)
        }
    }
    override decode_private(stream: Stream): void {
        const bg=stream.read_boolean_group()
        this.priv.splashes=stream.read_array(()=>{
            const bg=stream.read_boolean_group()
            return {
               count:stream.read_uint16(),
               taker:stream.read_id(),
               taker_layer:stream.read_uint8(),
               position:stream.read_pos2(),
               critical:bg[0],
               shield:bg[1],
               shield_break:bg[2], 
            }
        },1)
        this.priv.pings=stream.read_array(()=>{
            return {
                position:stream.read_pos2(),
                def:stream.read_uint8(),
                id:stream.read_uint8(),
                color:stream.read_uint32()
            }
        },1)
        if(bg[0]){
            this.priv.active_entity={
                dirty:true,
                id:stream.read_id(),
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
                force_default_scope:false,
            }
            decode_self_state(this.priv.self_state,stream,this.definition)
        }
    }
}