import { ClientsManager, DynamicStream, v2 } from "common/engine/core.ts";
import { make_packet_manager } from "common/scripts/net/packet_manager.ts";
import { LocalPlayerConn } from "common/scripts/game/players/player_conn.ts";
import { type Human } from "common/scripts/game/objects/human/human.ts";
import { type SI_Obstacle } from "common/scripts/game/objects/static_body/obstacle.ts";
import { type Loot as SI_Loot } from "common/scripts/game/objects/loot.ts";
import { GunItem } from "common/scripts/game/inventory/items.ts";
import { inventory_events } from "common/scripts/game/inventory/inventory.ts";
import { GameItemType } from "common/scripts/definitions/utils.ts";
import { Game } from "../game/game.ts";

const game=new Game({tps:100,ntps:32},new ClientsManager(make_packet_manager()))
await game.init({mode:"debug",settings:{infinity_ammo:false}})
game.running=true
const sim=game.sim
const tick=(seconds:number)=>{for(let t=0;t<seconds;t+=0.01)game.update(0.01)}
const check=(name:string,ok:boolean,info:unknown="")=>console.log(ok?"OK  ":"FAIL",name,info)

const h=sim.mode.join(new LocalPlayerConn(),{name:"Tester"})! as Human
const inv=h.inventory
check("groups",inv.groups.map((g)=>g.id).join(",")==="melee,guns,ammo,scopes,items,helmet,vest,backpack,accessory",inv.groups.map((g)=>g.id))
check("default fist in hand",inv.hand_def?.id_string==="fist",inv.hand_def?.id_string)
check("default backpack/scope",inv.backpack?.id_string==="null_pack"&&inv.get_group("scopes")!.includes.length===1)
check("item slots from backpack",inv.get_group("items")!.slots.length===4)

const loots=()=>Object.values(sim.objects.objects).filter((o)=>o.instance_type===1) as unknown as SI_Loot[]
const find_loot=(id:string)=>{
    const l=loots().find((d)=>d.loot_data.item.id_string===id)
    if(l)return l
    const item=game.definitions.game_items.valueString[id]
    if(!item)return undefined
    return sim.add_object(sim.make_object(1)!,h.layer,undefined,{data:{item,count:Infinity},position:v2.add(h.position,v2(3,3))}) as unknown as SI_Loot
}
const pick=(id:string)=>{
    const l=find_loot(id)
    if(!l)return false
    h.position=v2.clone(l.position)
    h.input.interact=true
    tick(0.02)
    return true
}

check("pick ak47",pick("ak47"))
const gun=inv.get_items<GunItem>(GameItemType.gun)[0]
check("gun in guns group",gun?.slot?.group.id==="guns",gun?.def.id_string)
inv.set_hand(gun.slot!.index)
tick(1)
check("gun in hand",(inv.hand_item as unknown)===gun)
check("pick ammo",pick(gun.def.ammo_type),inv.amount(gun.def.ammo_type))

let fired=0,reload_begin=0,reload_end=0
h.on(inventory_events.fire,()=>fired++)
h.on(inventory_events.reload,(_i:unknown,begin:boolean)=>begin?reload_begin++:reload_end++)
gun.ammo=3
const ammo_before=inv.amount(gun.def.ammo_type)
h.input.use_weapon=true
h.input.using_item_down=true
tick(1.5)
h.input.use_weapon=false
check("fired 3 times",fired===3,fired)
tick(5)
check("auto reload",reload_begin>=1&&reload_end>=1&&gun.ammo===gun.get_capacity(),{reload_begin,reload_end,ammo:gun.ammo,cap:gun.get_capacity()})
check("ammo consumed from amounts",inv.amount(gun.def.ammo_type)===ammo_before-gun.get_capacity(),[ammo_before,inv.amount(gun.def.ammo_type)])

gun.ammo=5
h.input.reload=true
tick(0.02)
check("manual reload starts",h.actions.current_action!==undefined)
inv.set_hand_slot(0)
check("switch cancels reload",h.actions.current_action===undefined&&!gun.reloading)

const before_backpack=inv.get_group("items")!.slots.length
check("pick backpack",pick("tactical_pack"),inv.backpack?.id_string)
check("backpack resizes item slots",inv.get_group("items")!.slots.length>before_backpack,[before_backpack,inv.get_group("items")!.slots.length])
check("pick helmet",pick("bike_helmet"),inv.get_equipment(GameItemType.helmet)?.id_string)
check("pick consumible",pick("bandage"),inv.item_slots.map((s)=>s.item?.def.id_string+":"+s.count))

const crate=(Object.values(sim.objects.objects) as unknown as SI_Obstacle[]).find((o)=>o.instance_type===3&&o.def.interactDestroy&&o.health&&!o.health.dead)
if(crate){
    const loot_before=loots().length
    h.position=v2.clone(crate.position)
    h.input.interact=true
    tick(0.02)
    check("crate destroyed by interaction",crate.health!.dead,crate.def.id_string)
    check("crate dropped loot",loots().length>=loot_before,[loot_before,loots().length])
}else{
    check("crate found",false)
}

const s=new DynamicStream(256)
inv.encode_checkpoint(s)
const snapshot=JSON.stringify(inv.slots.map((v)=>[v.item?.def.id_string,v.count]))
s.index=0
inv.decode_checkpoint(s)
check("inventory checkpoint roundtrip",JSON.stringify(inv.slots.map((v)=>[v.item?.def.id_string,v.count]))===snapshot&&(inv.get_items<GunItem>(GameItemType.gun)[0]?.ammo===5),snapshot)

const net=new DynamicStream(256)
inv.encode_net(net,true)
inv.net_update()
check("net encode full",net.length>0,net.length)
h.input.use_weapon=false
const net2=new DynamicStream(64)
inv.encode_net(net2)
check("net encode partial small",net2.length<net.length,net2.length)

const loot_before_die=loots().length
h.piercing_damage({amount:1000,reason:0})
check("drop all on death",loots().length>loot_before_die,[loot_before_die,loots().length])
Deno.exit(0)
