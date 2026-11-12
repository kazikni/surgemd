import { BaseGELO, BasicSocket, Client, DefaultSignals, DynamicStream, SignalManager, Stream, WorkerSocket } from "common/engine/core.ts";
import { HideElement, ShowElement } from "common/engine/web.ts";
import { gelo_instance_type } from "common/scripts/others/constants.ts";
import { type JoinData, JoinedPacket, JoinPacket } from "common/scripts/net/join_packet.ts";
import { make_packet_manager } from "common/scripts/net/packet_manager.ts";
import { type ActiveHumanState, StartPacket, UpdatePacket } from "common/scripts/net/update_packet.ts";
import { GameGELO, GameObject, GameScene } from "../../main/gel.ts";
import { type Application } from "../../main/app.ts";
import { type CC_GameMap } from "../../gelo/map.ts";
import { type CC_Deadzone } from "../../gelo/deadzone.ts";
import { active_human, type ActiveHuman } from "../../objects/active_human.ts";
import { net_scene_defs } from "./netdefs.ts";
import { cc_freecam } from "../../gelo/free_cam.ts";
import { api_server } from "../../main/config.ts";
import { FindGameData, FindGameResult } from "common/scripts/config/config.ts";

export interface PlaySceneDefs{
    objects:Record<number|string,(...args: any)=>GameObject>
    gelo:Record<number|string,(...args: any)=>GameGELO>
}

export type PlaySceneKind="none"|"worker"|"online"

export interface WorkerGameOptions{
    mode?:string
    settings?:Record<string,any>
    tps?:number
    ntps?:number
}
export type OnlineGameOptions={
    token?:string
}&({
    type:"direct"
    url?:string
}|{
    type?:"find"
    url?:string
    mode?:number
    region?:string
})

export type WorkerMessage={
    type:"init"
    options:WorkerGameOptions
}|{
    type:"set_state"
    pause?:boolean
}

export const play_events={
    joined:"joined",
    game_over:"game_over",
    active_die:"active_die",
    disconnected:"disconnected",
    closed:"closed",
}
export class PlayScene extends GameScene {
    game_div:HTMLDivElement=document.querySelector("#game") as HTMLDivElement

    declare map:CC_GameMap
    deadzone?:CC_Deadzone

    defs:PlaySceneDefs=net_scene_defs

    kind:PlaySceneKind="none"
    events=new SignalManager()

    client?:Client
    worker?:Worker

    active_human?:ActiveHuman
    active_id?:number
    active_state?:ActiveHumanState

    info={
        started:false,
        living_count:0,
        ntps:32,
    }

    timeout:number=10000

    constructor(app?:Application){
        super()
        if(app)this.init(app)
    }

    override on_init(){
        super.on_init()
        this.camera.aspect_lock=true
        this.gelo.make_gelo_net_cb=(tp)=>this.make_gelo(tp)
    }

    override make_object(type: number | string, ...args:any[]): GameObject | undefined {
        return this.defs.objects[type]?.(...args)
    }
    override make_gelo(type: number | string, ...args:any[]): GameGELO | undefined {
        return this.defs.gelo[type]?.(...args)
    }
    override _registry_gelo(gelo:GameGELO){
        super._registry_gelo(gelo)
        switch((gelo as BaseGELO).instance_type){
            case gelo_instance_type.map:
                this.map=gelo as unknown as CC_GameMap
                break
            case gelo_instance_type.deadzone:
                this.deadzone=gelo as unknown as CC_Deadzone
                break
        }
    }

    async worker_initialize(options:WorkerGameOptions={}){
        await this.close()
        this.kind="worker"

        const worker=new Worker(new URL("./worker.ts",import.meta.url),{type:"module"})
        this.worker=worker
        worker.addEventListener("error",(e)=>console.error("[PLAY-WORKER]",e))
        const socket=new WorkerSocket(worker)
        await this.attach_client(socket,()=>{
            const msg:WorkerMessage={type:"init",options}
            worker.postMessage(msg)
        })
    }
    async online_initialize(options:OnlineGameOptions={type:"find"}){
        let url=options.url??api_server.toString("http")
        let token=options.token??undefined

        if(!options.type||options.type==="find"){
            const ghost:FindGameResult=await(await fetch(url+"/find-game",{
                method:"post",
                body:JSON.stringify({
                    mode:options.mode??0,
                    region:options.region??await this.get_region()
                } as FindGameData),
                signal: AbortSignal.timeout(4000)
            })).json()
            if(!ghost.success){
                throw new Error(`Find Game Failed: ${ghost.error}`)
            }
            url=ghost.address
            token=ghost.token
        }
        await this.close()
        this.kind="online"

        const ws=new WebSocket(url)
        ws.binaryType="arraybuffer"
        const failed=new Promise<never>((_resolve,reject)=>{
            ws.addEventListener("error",()=>reject(new Error(`${url}`)))
        })
        await Promise.race([this.attach_client(ws as unknown as BasicSocket),failed])
    }

    async get_region():Promise<string>{
        if(!this.app.api_public)await this.app.update_api()
        const regions=this.app.api_public?.regions??[]
        const region=this.app.save.settings.get_var("game_region") as string
        if(regions.length===0||regions.includes(region))return region
        return regions[0]
    }

    private async attach_client(socket:BasicSocket,after_create?:()=>void){
        const client=new Client(socket,make_packet_manager())
        this.client=client

        client.on("start",(p:StartPacket)=>{
            this.info.ntps=p.ntps
            this.gelo.decode(p.gelos)
        })
        client.on("update",(p:UpdatePacket)=>this.on_update_packet(p))
        client.on("game_over",(msg:{win:boolean})=>this.events.emit(play_events.game_over,msg))
        client.on(DefaultSignals.DISCONNECT,()=>{
            if(this.client===client)this.events.emit(play_events.disconnected)
        })

        const started=client.wait("start")
        const disconnected=new Promise<never>((_resolve,reject)=>{
            client.on(DefaultSignals.DISCONNECT,()=>reject(new Error("Disconnected")))
        })
        after_create?.()
        await Promise.race([started,disconnected])
    }

    async join(data:JoinData={name:""}):Promise<ActiveHuman|undefined>{
        if(!this.client)throw new Error("Not Connected")
        const client=this.client
        const joined=client.wait("joined") as Promise<JoinedPacket>
        const disconnected=new Promise<never>((_resolve,reject)=>{
            client.on(DefaultSignals.DISCONNECT,()=>reject(new Error("Join Failed")))
        })
        client.emit_packet(new JoinPacket(data))

        const p=await Promise.race([joined,disconnected])
        this.info.ntps=p.ntps
        this.active_id=p.human_id
        this.try_bind_active()
        this.events.emit(play_events.joined,this.active_human)
        return this.active_human
    }
    free_cam(){
        const o=new GameGELO()
        o.add_component(cc_freecam)
        this.gelo.registry(o)
        return o
    }

    set_active_human(obj:GameObject){
        if(this.active_human===obj as unknown)return
        this.active_human?.release_active?.()
        obj.add_component(active_human)
        this.active_human=obj as unknown as ActiveHuman
        this.active_id=obj.id
    }
    private try_bind_active(){
        if(this.active_id===undefined)return
        if(this.active_human&&this.active_human.id===this.active_id&&!this.active_human.destroyed)return
        const obj=this.objects.get_object(this.active_id)
        if(obj)this.set_active_human(obj)
    }

    private on_update_packet(p:UpdatePacket){
        if(p.objects)this.objects.proccess_net(p.objects,true)
        if(p.gelos)this.gelo.decode(p.gelos)
        this.info.started=p.started
        this.info.living_count=p.living_count
        if(p.active){
            this.active_state=p.active
            if(this.active_id!==p.active.id){
                this.active_id=p.active.id
            }
        }
        this.try_bind_active()
    }

    async close(){
        if(this.kind==="none")return
        const client=this.client
        this.client=undefined
        client?.disconnect()
        if(this.worker){
            this.worker.terminate()
            this.worker=undefined
        }
        this.active_human?.release_active()
        this.active_human=undefined
        this.active_id=undefined
        this.active_state=undefined

        this.clear()
        for(const id of Object.keys(this.gelo.content)){
            this.gelo.unregistry(id)
        }
        this.deadzone=undefined
        this.info.started=false
        this.info.living_count=0

        this.kind="none"
        this.events.emit(play_events.closed)
        await Promise.resolve()
    }

    override on_set(): void {
        super.on_set()
        ShowElement(this.game_div)
        ShowElement(this.app.renderer.canvas)
        if(this.kind==="worker"&&this.worker){
            this.worker.postMessage({type:"set_state",pause:false} as WorkerMessage)
        }
    }
    override on_unset(): void {
        HideElement(this.game_div)
        HideElement(this.app.renderer.canvas)
        if(this.kind==="worker"&&this.worker){
            this.worker.postMessage({type:"set_state",pause:true} as WorkerMessage)
        }
    }

    override update(dt: number): void {
        super.update(dt,true,true)
    }
}