import { ClientsManager, DynamicStream, v2 } from "common/engine/core.ts";
import { make_packet_manager } from "common/scripts/net/packet_manager.ts";
import { LocalPlayerConn } from "common/scripts/game/players/player_conn.ts";
import { type SI_Human } from "common/scripts/game/objects/human/human.ts";
import { HumanFunctionScript, HumanScript } from "common/scripts/game/objects/human/script.ts";
import { GrenadeItem, type GunItem } from "common/scripts/game/inventory/items.ts";
import { GameItemType } from "common/scripts/definitions/utils.ts";
import { human_events } from "common/scripts/game/objects/human/events.ts";
import { HumanAnimationType, type DamageParams, type HumanAnimation, object_instance_type } from "common/scripts/others/constants.ts";
import { Game } from "../game/game.ts";

const game=new Game({tps:100,ntps:32},new ClientsManager(make_packet_manager()))
await game.init({mode:"debug",settings:{infinity_ammo:false}})
game.running=true
const sim=game.sim
const tick=(seconds:number)=>{for(let t=0;t<seconds;t+=0.01)game.update(0.01)}
const atick=async(seconds:number)=>{
    for(let t=0;t<seconds;t+=0.01){
        game.update(0.01)
        await new Promise((r)=>setTimeout(r,0))
    }
}
let failed=0
const check=(name:string,ok:boolean,info:unknown="")=>{
    if(!ok)failed++
    console.log(ok?"OK  ":"FAIL",name,info)
}
const count=(type:number)=>Object.values(sim.objects.objects).filter((o)=>o.instance_type===type).length
const defs=game.definitions

const shooter=sim.mode.join(new LocalPlayerConn(),{name:"Shooter"})! as SI_Human
const target_conn=new LocalPlayerConn()
let target=sim.mode.join(target_conn,{name:"Target"})! as SI_Human
tick(0.1)
const base=v2.clone(shooter.position)
const place=()=>{
    shooter.position=v2.clone(base)
    target.position=v2.add(base,v2(6,0))
    shooter.physical.velocity=v2.zero()
    target.physical.velocity=v2.zero()
    shooter.input.rotation=0
    target.health.value=target.health.max
    shooter.health.value=shooter.health.max
}
const animations:HumanAnimation[]=[]
shooter.on(human_events.animation,(a:HumanAnimation)=>animations.push(a))

place()
const gun_def=defs.guns.getFromString("ak47")
shooter.inventory.give_item(gun_def,1,false,{ammo:true})
shooter.inventory.give_item(defs.game_items.valueString[gun_def.ammo_type],120,false)
const gun=shooter.inventory.get_items<GunItem>(GameItemType.gun)[0]
check("gun given",gun!==undefined,gun?.def.id_string)
shooter.inventory.set_hand(gun.slot!.index)
check("switch animation",animations.some((a)=>a.type===HumanAnimationType.Switch))
tick(1.5)
check("hand def synced",shooter.hand?.id_string==="ak47",shooter.hand?.id_string)

place()
const hp=target.health.value
const ammo=gun.ammo
shooter.input.use_weapon=true
shooter.input.using_item_down=true
let bullets=0
for(let i=0;i<5;i++){
    game.update(0.01)
    bullets=Math.max(bullets,count(object_instance_type.bullet))
}
shooter.input.use_weapon=false
check("bullet spawned",bullets>0,bullets)
check("fire animation",animations.some((a)=>a.type===HumanAnimationType.Fire))
tick(1)
check("ammo consumed",gun.ammo<ammo,[ammo,gun.ammo])
check("target hit by bullet",target.health.value<hp,[hp,target.health.value])
check("bullets finished",count(object_instance_type.bullet)===0,count(object_instance_type.bullet))

place()
target.position=v2.add(base,v2(0,30))
const before_shots=gun.ammo
shooter.input.use_weapon=true
tick(0.5)
shooter.input.use_weapon=false
tick(3)
check("bullets expire by range",count(object_instance_type.bullet)===0)
check("auto fire consumed ammo",gun.ammo<before_shots||gun.reloading,[before_shots,gun.ammo])
tick(4)

place()
shooter.inventory.give_item(defs.game_items.valueString["frag_grenade"],2,false)
const nade=shooter.inventory.get_items<GrenadeItem>(GameItemType.grenade)[0]
check("grenade given",nade instanceof GrenadeItem&&nade.slot!.count===2,nade?.slot?.count)
shooter.inventory.use_slot(nade.slot!.index)
tick(0.1)
check("grenade in hand",(shooter.inventory.hand_item as unknown)===nade)
shooter.input.use_weapon=true
shooter.input.using_item_down=true
shooter.input.distance_to_aim=0.5
tick(0.05)
check("cooking",nade.holding!==undefined)
check("cook animation",animations.some((a)=>a.type===HumanAnimationType.Cook))
const speed_mod=shooter.modifiers.speed
check("holding grenade slows",speed_mod!==undefined&&speed_mod<1,speed_mod)
tick(0.5)
shooter.input.use_weapon=false
tick(0.05)
check("grenade thrown",count(object_instance_type.grenade)===1,count(object_instance_type.grenade))
check("throw animation",animations.some((a)=>a.type===HumanAnimationType.Throw))
check("grenade consumed",nade.slot?.count===1,nade.slot?.count)
const g=Object.values(sim.objects.objects).find((o)=>o.instance_type===object_instance_type.grenade) as unknown as {zpos:number,position:{x:number,y:number},fuse_delay:number}
const start=v2.clone(g.position)
tick(2)
check("grenade moved and landed",v2.distance(start,g.position)>0.5&&g.zpos===0,[v2.distance(start,g.position),g.zpos])
target.position=v2.clone(g.position)
target.health.value=target.health.max
let explosions=0
const hp2=target.health.value
for(let t=0;t<6;t+=0.01){
    game.update(0.01)
    explosions=Math.max(explosions,count(object_instance_type.explosion))
}
check("grenade exploded",explosions>0&&count(object_instance_type.grenade)===0,explosions)
check("explosion damaged target",target.dead||target.health.value<hp2,[hp2,target.health.value,target.dead])
tick(2.5)
target=target_conn.human as SI_Human
if(target.dead)target.revive()
tick(0.1)
check("target revived",target!==undefined&&!target.dead&&target.registred)

place()
shooter.inventory.give_item(defs.game_items.valueString["bandage"],2,false)
const bandage_slot=shooter.inventory.item_slots.find((s)=>s.item?.def.id_string==="bandage")!
shooter.health.value=30
shooter.inventory.use_slot(bandage_slot.index)
check("consuming started",shooter.actions.current_action!==undefined)
check("consuming animation",animations.some((a)=>a.type===HumanAnimationType.Consuming))
tick(1)
check("consuming slows",(shooter.modifiers.speed??1)<1,shooter.modifiers.speed)
tick(2.2)
check("bandage healed",Math.abs(shooter.health.value-50)<0.01,shooter.health.value)
check("bandage consumed",bandage_slot.count===1,bandage_slot.count)
shooter.health.value=shooter.health.max*0.8
shooter.inventory.use_slot(bandage_slot.index)
check("bandage condition blocks",shooter.actions.current_action===undefined)

shooter.inventory.give_item(defs.game_items.valueString["yellow_soda"],1,false)
const soda=shooter.inventory.item_slots.find((s)=>s.item?.def.id_string==="yellow_soda")!
shooter.boost.value=0
shooter.inventory.use_slot(soda.index)
tick(3.2)
check("soda gives boost",Math.abs(shooter.boost.value-25)<0.5&&shooter.boost.def.id_string==="adrenaline",[shooter.boost.value,shooter.boost.def.id_string])

place()
check("sit animation",shooter.play_momentary("sit"))
const sit_pos=v2.clone(shooter.position)
shooter.input.movement={dir:0,scale:1}
tick(0.5)
check("sit locks movement",v2.distance(sit_pos,shooter.position)<0.01,v2.distance(sit_pos,shooter.position))
check("low priority cannot replace",!shooter.play_momentary("wave"))
shooter.stop_momentary()
tick(0.3)
check("stop unlocks movement",v2.distance(sit_pos,shooter.position)>0.1)
shooter.input.movement={dir:0,scale:0}
let ended=false
shooter.play_momentary("wake_up",{on_end:(c)=>ended=c})
tick(1)
check("wake up active",shooter.is_momentary("wake_up")&&!ended)
tick(2)
check("wake up ends by duration",!shooter.momentary&&ended)
shooter.inventory.set_hand(gun.slot!.index)
tick(1)
shooter.play_momentary("suicide",{item:shooter.inventory.hand_def})
check("suicide variation by weapon",shooter.momentary?.variation===0,shooter.momentary?.variation)
shooter.stop_momentary()

place()
const dest=v2.add(base,v2(2,1))
let said=""
shooter.on(human_events.message,(m:{text:string})=>said=m.text)
let done=false
shooter.set_script(new HumanFunctionScript(async(s)=>{
    await s.say("Where am I?",0.5)
    await s.move_to(dest,1,true,0.1,5)
    done=true
},true))
check("script takes control",shooter.controlled)
shooter.process_input({movement:{dir:Math.PI,scale:1},rotation:0,distance_to_aim:0,auto_fire:false,use_weapon:true,alt_use_weapon:false,interact:false,cancel:false,reload:false,swap_guns:false,actions:[]})
check("player input ignored",!shooter.input.use_weapon)
check("script said",said==="Where am I?",said)
await atick(4)
check("script moved",done&&v2.distance(shooter.position,dest)<0.3,v2.distance(shooter.position,dest))
check("script detached",shooter.script===undefined&&!shooter.controlled)

place()
class FriendScript extends HumanScript{
    override interactable=true
    override keep_alive=true
    talks=0
    hurt=0
    override on_interact(user:SI_Human){
        this.talks++
        void this.say(`Hi ${user.name}`,1)
    }
    override on_damaged(params:DamageParams){
        this.hurt++
        if(params.owner)void this.say("Why did you shoot me?",1)
    }
}
const friend=new FriendScript()
target.set_script(friend)
target.position=v2.add(shooter.position,v2(1,0))
await atick(0.1)
shooter.input.interact=true
await atick(0.02)
check("npc interaction",friend.talks===1&&target.message?.text==="Hi Shooter",[friend.talks,target.message?.text])
target.position=v2.add(shooter.position,v2(5,0))
shooter.input.rotation=0
shooter.input.use_weapon=true
shooter.input.using_item_down=true
await atick(0.3)
shooter.input.use_weapon=false
await atick(0.5)
check("npc reacts to damage",friend.hurt>0&&target.message?.text==="Why did you shoot me?",[friend.hurt,target.message?.text])

place()
shooter.inventory.use_slot(nade.slot!.index)
tick(0.1)
shooter.input.use_weapon=true
shooter.input.using_item_down=true
tick(0.4)
shooter.input.use_weapon=false
tick(0.05)
const cp=new DynamicStream(1024)
sim.make_checkpoint(cp)
const grenades=count(object_instance_type.grenade)
cp.index=0
sim.clear()
sim.load_checkpoint(cp)
check("grenade saved in checkpoint",grenades===1&&count(object_instance_type.grenade)===1,[grenades,count(object_instance_type.grenade)])

const net=new DynamicStream(4096)
const objs=Object.values(sim.objects.objects)
sim.objects.encode_list_net(objs,[],true,true,undefined,net)
check("net encode",net.index>0,net.index)

console.log(failed===0?"ALL OK":`${failed} FAILED`)
game.stop()
Deno.exit(failed===0?0:1)
