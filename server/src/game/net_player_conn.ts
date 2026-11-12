import { Client, DefaultSignals, DynamicStream, RectCollider2D, v2, Vec2 } from "common/engine/core.ts";
import { type Human } from "common/scripts/game/objects/human/human.ts";
import { PlayerConn } from "common/scripts/game/players/player_conn.ts";
import { type InputPacket } from "common/scripts/net/input_packet.ts";
import { JoinedPacket, type JoinPacket } from "common/scripts/net/join_packet.ts";
import { StartPacket, UpdatePacket } from "common/scripts/net/update_packet.ts";
import { type DamageParams } from "common/scripts/others/constants.ts";
import { type Game } from "./game.ts";
import { type ServerObject } from "./scene.ts";

export const PlayerViewSize=v2(26,16)

export class NetPlayerConn extends PlayerConn{
    game:Game
    client:Client
    username:string=""

    view_objects:ServerObject[]=[]
    full_update:boolean=true
    last_position:Vec2=v2.zero()

    gelo_stream=new DynamicStream(256)

    constructor(game:Game,client:Client){
        super(client.ID)
        this.game=game
        this.client=client

        client.on("join",(p:JoinPacket)=>this.on_join(p))
        client.on("input",(p:InputPacket)=>{
            const h=this.human
            if(!h||h.dead||this.spectating)return
            h.process_input(p.data)
        })
        client.on(DefaultSignals.DISCONNECT,()=>{
            if(this.human)console.log(`[GAME-${this.game.id}] ${this.human.name} Disconnected`)
            this.disconnect()
        })
    }

    send_start(){
        const sim=this.game.sim
        const p=new StartPacket()
        p.ntps=this.game.ntps
        const gelos=[sim.map,...(sim.deadzone?[sim.deadzone]:[])]
        sim.gelo.encode(gelos,p.gelos)
        this.client.emit_packet(p)
    }

    on_join(p:JoinPacket){
        const mode=this.game.sim.mode
        if(this.human&&!this.human.dead)return
        const h=mode.join(this,p.data)
        if(!h){
            this.client.disconnect()
            return
        }
        console.log(`[GAME-${this.game.id}] ${h.name} Joined`)
        this.full_update=true
        this.view_objects.length=0

        const jp=new JoinedPacket()
        jp.human_id=h.id
        jp.ntps=this.game.ntps
        this.client.emit_packet(jp)
    }

    override set_human(human?: Human): void {
        super.set_human(human)
        this.full_update=true
    }

    override on_human_die(_params: DamageParams): void {
        this.spectating=true
    }
    override on_game_finish(win: boolean): void {
        this.client.emit("game_over",{win})
    }

    get_view_objects():ServerObject[]{
        const sim=this.game.sim
        const center=this.human&&!this.human.destroyed?this.human.position:this.last_position
        this.last_position=v2.clone(center)
        const rect=new RectCollider2D(v2.sub(center,PlayerViewSize),v2.add(center,PlayerViewSize))
        const layer=this.human?.layer??sim.map.default_layer
        return sim.cells.get_objects_layers(rect,[layer-1,layer,layer+1])
    }

    override net_update(): void {
        if(!this.client.opened||!this.join)return
        const sim=this.game.sim

        const up=new UpdatePacket()
        up.started=sim.mode.started
        up.living_count=sim.mode.get_living_count()

        const objs=this.get_view_objects()
        const full=this.full_update
        const o=sim.objects.encode_list_net(objs,this.view_objects,full,full)
        this.view_objects=o.last
        up.objects=o.strm
        this.full_update=false

        if(sim.deadzone){
            this.gelo_stream.clear()
            sim.gelo.encode([sim.deadzone],this.gelo_stream)
            up.gelos=this.gelo_stream
        }

        const h=this.human
        if(h){
            up.active={
                id:h.id,
                spectating:this.spectating,
                knocked:h.knocked,
                health:h.health.value,
                max_health:h.health.max,
                boost:h.boost.value,
                max_boost:h.boost.max,
                boost_def:h.boost.def.id_number??0,
            }
        }
        this.client.emit_packet(up)
    }
}