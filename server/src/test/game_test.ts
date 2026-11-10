// Teste rapido da simulacao (sem render): deno run -A src/test/game_test.ts
import { Client, ClientsManager, DynamicStream } from "common/engine/core.ts";
import { make_packet_manager } from "common/scripts/net/packet_manager.ts";
import { JoinPacket, JoinedPacket } from "common/scripts/net/join_packet.ts";
import { InputPacket } from "common/scripts/net/input_packet.ts";
import { StartPacket, UpdatePacket } from "common/scripts/net/update_packet.ts";
import { Game } from "../game/game.ts";
import { mode_events } from "common/scripts/game/gelo/mode.ts";
import { type SI_BattleRoyale } from "common/scripts/game/modes/battle_royale.ts";

const packets=make_packet_manager()
const clients=new ClientsManager(packets)
const game=new Game({tps:100,ntps:32},clients)
await game.init({mode:"normal",settings:{bots:5,map:{def:"normal",seed:1}}})
game.running=true // sem clock: vamos chamar update() na mao
game.clients.onconnection=game.handle_connection.bind(game)

const sim=game.sim
console.log("objects after map generation:",Object.keys(sim.objects.objects).length)

// Cliente falso (mesma coisa que o worker faz)
const [server_socket,client_socket]=clients.create_conn()
const client=new Client(client_socket,packets)
let start:StartPacket|undefined
let joined:JoinedPacket|undefined
let updates=0
let last_update:UpdatePacket|undefined
let game_over:any
client.on("start",(p:StartPacket)=>{start=p})
client.on("joined",(p:JoinedPacket)=>{joined=p})
client.on("update",(p:UpdatePacket)=>{updates++;last_update=p})
client.on("game_over",(m:any)=>{game_over=m})
;clients.fake_connect_other_s(server_socket)

console.log("start packet:",start?`ok (${start.gelos.length} bytes)`:"MISSING")
client.emit_packet(new JoinPacket({name:"Tester"}))
console.log("joined:",joined?`human ${joined.human_id}`:"MISSING")

const br=sim.mode as unknown as SI_BattleRoyale
let finished=false
br.on(mode_events.finish,(w:any[])=>{finished=true;console.log("finish! winners:",w.map((h)=>h.name))})

const dt=1/100
let t=0
const input=new InputPacket()
input.data.movement={dir:0,scale:1}
for(;t<60*15&&!finished;t+=dt){
    if(Math.floor(t*10)%10===0)client.emit_packet(input)
    game.update(dt)
    if(Math.abs(t-5)<dt/2){
        console.log("t=5s started:",br.started,"living:",br.get_living_count(),"deadzone state:",sim.deadzone?.state)
        const h=sim.objects.get_object(joined!.human_id) as any
        console.log("player pos:",h?.position,"health:",h?.health?.value)
        // Checkpoint roundtrip
        const s=new DynamicStream(1024)
        sim.make_checkpoint(s)
        const count=Object.keys(sim.objects.objects).length
        s.index=0
        sim.load_checkpoint(s)
        console.log("checkpoint:",s.length,"bytes, objects",count,"->",Object.keys(sim.objects.objects).length,"players:",br.get_living_count())
    }
}
console.log("simulated",t.toFixed(1),"s, updates received:",updates,"last update bytes objects:",last_update?.objects?.length,"game_over:",game_over)
console.log("game data:",game.get_data())
Deno.exit(0)
