import { type DamageParams } from "../objects/projectile/projectile.ts";
import { Client, DefaultSignals, DynamicStream, RectCollider2D, Stream, v2, Vec2 } from "common/engine/core.ts";
import { GELONet } from "../main/base.ts";
import { type Human } from "../objects/human/human.ts";
import { PlayerConn } from "./player_conn.ts";
import { type InputPacket } from "common/scripts/net/input_packet.ts";
import { JoinedPacket, type JoinPacket } from "common/scripts/net/join_packet.ts";
import { GeneralPacket, StartPacket, UpdatePacket } from "common/scripts/net/update_packet.ts";
import { type Game } from "../main/game.ts";
import { type ServerGELO, type ServerObject } from "../main/scene.ts";

export const PlayerViewSize=v2(26,16)

export class NetPlayerConn extends PlayerConn{
    game:Game
    client:Client
    username:string=""

    view_objects:ServerObject[]=[]
    full_update:boolean=true
    last_position:Vec2=v2.zero()
    send_joined:boolean=false

    stream:DynamicStream=new DynamicStream(512)
    update:UpdatePacket=new UpdatePacket()

    constructor(game:Game,client:Client){
        super(client.ID)
        this.game=game
        this.client=client
        this.update.content=new DynamicStream(128)
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

    net_update(general:Stream){
        if(!this.client.opened)return
        const sim=this.game.sim
        this.stream.clear()
        this.stream.write_stream(general)

        if(this.send_joined){
            this.send_joined=false
            const jp=new JoinedPacket()
            jp.human_id=this.human?.id??0
            jp.ntps=this.game.ntps
            sim.gelo.net_encode_list(Object.values(sim.gelo.content).filter((g)=>g.net===GELONet.Joined),jp.gelos,true)
            this.client.manager.encode(jp,this.stream)
        }

        if(this.join){
            const center=this.human&&!this.human.destroyed?this.human.position:this.last_position
            this.last_position=v2.clone(center)
            const layer=this.human?.layer??sim.map.default_layer
            const objs=sim.cells.get_objects_layers(new RectCollider2D(v2.sub(center,PlayerViewSize),v2.add(center,PlayerViewSize)),[layer-1,layer,layer+1])

            this.update.content.clear()
            this.view_objects=sim.objects.encode_list_net(objs,this.view_objects,this.full_update,this.full_update,undefined,this.update.content).last
            this.full_update=false

            const h=this.human
            this.update.active=h?{
                id:h.id,
                spectating:this.spectating,
                knocked:h.knocked,
                health:h.health.value,
                max_health:h.health.max,
                boost:h.boost.value,
                max_boost:h.boost.max,
                boost_def:h.boost.def.id_number??0,
            }:undefined
            this.client.manager.encode(this.update,this.stream)
        }

        if(this.stream.length>0)this.client.send_stream(this.stream)
    }
}

export class NetPlayerManager{
    game:Game
    conns=new Map<number,NetPlayerConn>()

    start?:DynamicStream
    general:GeneralPacket=new GeneralPacket()
    general_stream:DynamicStream=new DynamicStream(256)

    constructor(game:Game){
        this.game=game
    }

    connect(client:Client,username:string){
        const game=this.game
        if(!game.initialized||!game.running||!game.sim.mode.can_connect()||this.conns.has(client.ID)){
            client.disconnect()
            return
        }
        const conn=new NetPlayerConn(game,client)
        conn.username=username
        if(!game.sim.mode.connect(conn)){
            client.disconnect()
            return
        }
        this.conns.set(client.ID,conn)

        client.on("join",(p:JoinPacket)=>{
            if(conn.human&&!conn.human.dead)return
            const h=game.sim.mode.join(conn,p.data)
            if(!h){
                client.disconnect()
                return
            }
            console.log(`[GAME-${game.id}] ${h.name} Joined`)
            conn.full_update=true
            conn.view_objects.length=0
            conn.send_joined=true
        })
        client.on("input",(p:InputPacket)=>{
            const h=conn.human
            if(!h||h.dead||conn.spectating)return
            h.process_input(p.data)
        })
        client.on(DefaultSignals.DISCONNECT,()=>{
            if(conn.human)console.log(`[GAME-${game.id}] ${conn.human.name} Disconnected`)
            this.conns.delete(client.ID)
            conn.disconnect()
        })

        if(!this.start){
            const sim=game.sim
            const sp=new StartPacket()
            sim.gelo.net_encode_list(Object.values(sim.gelo.content).filter((g)=>g.net===GELONet.Start),sp.gelos,true)
            this.start=new DynamicStream(sp.gelos.length+16)
            client.manager.encode(sp,this.start)
        }
        client.send_stream(this.start)
    }

    net_update(){
        const sim=this.game.sim
        const gelos:ServerGELO[]=Object.values(sim.gelo.content).filter((g)=>g.net===GELONet.General||(g.net!==GELONet.None&&g.net_dirty))

        this.general_stream.clear()
        if(gelos.length>0){
            this.general.gelos.clear()
            sim.gelo.net_encode_list(gelos,this.general.gelos,false)
            this.game.clients.packets_manager.encode(this.general,this.general_stream)
        }

        for(const conn of this.conns.values())conn.net_update(this.general_stream)

        for(const g of gelos){
            if(g.net===GELONet.Start&&g.net_dirty)this.start=undefined
            g.net_dirty=false
        }
    }

    clear(){
        this.conns.clear()
        this.start=undefined
    }
}
