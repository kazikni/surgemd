import { ClientsManager } from "common/engine/core.ts";
import { make_packet_manager } from "common/scripts/net/packet_manager.ts";
import { BotPlayerConn } from "common/scripts/game/players/player_conn.ts";
import { type SI_Human } from "common/scripts/game/objects/human/human.ts";
import { type BattleRoyale } from "common/scripts/game/modes/battle_royale.ts";
import { DamageReason } from "common/scripts/definitions/utils.ts";
import { Game } from "../game/game.ts";

const check=(name:string,ok:boolean,info:unknown="")=>console.log(ok?"OK  ":"FAIL",name,info)
const game=new Game({tps:100,ntps:32},new ClientsManager(make_packet_manager()))
await game.init({mode:"normal",settings:{teams:2,group_size:2,min_players:2,deadzone:false}})
game.running=true
const br=game.sim.mode as BattleRoyale
const hs:SI_Human[]=[]
for(let i=0;i<8;i++)hs.push(br.join(new BotPlayerConn(),{name:"P"+i})!)
const team=(h:SI_Human)=>br.teams!.of(h)!.id
const group=(h:SI_Human)=>br.groups!.of(h)!
check("teams balanced",br.teams!.teams.map((t)=>t.humans.length).join(",")==="4,4",br.teams!.teams.map((t)=>t.humans.length))
check("groups of 2",br.groups!.teams.every((g)=>g.humans.length===2),br.groups!.teams.map((g)=>g.humans.length))
check("groups inside a single team",br.groups!.teams.every((g)=>g.humans.every((h)=>team(h)===g.team)),br.groups!.teams.map((g)=>[g.team,...g.humans.map(team)]))
const a=hs[0]
const mate=group(a).humans.find((h)=>h!==a)!
const team_mate=hs.find((h)=>h!==a&&h!==mate&&team(h)===team(a))!
const enemy=hs.find((h)=>team(h)!==team(a))!
check("group mate is ally",br.is_ally(a,mate))
check("team mate is ally",br.is_ally(a,team_mate))
check("enemy is not ally",!br.is_ally(a,enemy))
for(let t=0;t<0.1;t+=0.01)game.update(0.01)
check("started",br.started)

const hp=mate.health.value
mate.damage({amount:10,reason:DamageReason.Human,owner:a})
check("no friendly fire",mate.health.value===hp)
br.rules.humans.friendly_fire=true
mate.damage({amount:10,reason:DamageReason.Human,owner:a})
check("friendly fire damages ally",mate.health.value===hp-10&&br.is_ally(a,mate))
br.rules.humans.friendly_fire=false

enemy.damage({amount:1000,reason:DamageReason.Human,owner:a})
check("enemy with alive group mates gets knocked",enemy.knocked&&!enemy.dead)
const enemy_mate=group(enemy).humans.find((h)=>h!==enemy)!
const enemy_team=hs.filter((h)=>team(h)===team(enemy))
for(const h of enemy_team){
    if(h.dead)continue
    h.damage({amount:1000,reason:DamageReason.Human,owner:a})
    if(h.knocked&&!h.dead)h.damage({amount:1000,reason:DamageReason.Human,owner:a})
}
check("knocked group dies when no one stands",enemy.dead&&enemy_mate.dead)
check("finish when one team is left",br.finished,br.players.living().map((p)=>p.name))
check("closed when finished",br.closed&&!br.open)
check("killer got kills",br.players.of(a)!.status.kills>=enemy_team.length,br.players.of(a)!.status)
Deno.exit(0)
