import { PacketsManager,ConnectPacket, DisconnectPacket,Packet, PingPacket, PongPacket } from "./packets.ts";
import { ID } from "../math/utils.ts";
import { SignalManager } from "../math/utils.ts"
import { NetStream } from "./stream.ts"
import { BaseGameObject2D, AbstractGame } from "../game/game.ts";
import { random } from "../math/random.ts";
import { FetchFileManager, FileManager } from "../definition/file.ts";

//Definitions
export interface HostConfig {
    port: number
    name?: string
    https?: boolean
    cert?: string
    key?: string
    ca?: string
}

export class BasicSocket{
    readyState = 1;
    binaryType = "";
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;

    send:((this:BasicSocket,_data: ArrayBuffer|Uint8Array|SharedArrayBuffer) => void)|null=null;
    // deno-lint-ignore no-explicit-any
    onmessage:((this:BasicSocket,_ev: MessageEvent<any>) => void)|null=null;
    close:((this:BasicSocket,_code?: number, _reason?: string) => void)|null=(code?: number, reason?: string)=>{
        if(this.onclose)this.onclose(code,reason)
        this.readyState=3
    };
    onclose:((this:BasicSocket,_code?: number, _reason?: string) => void)|null=null;
    onerror:((this:BasicSocket,_error: Error) => void)|null=null;
    onopen:((this:BasicSocket) => void)|null=null;
}
export class OfflineSocket extends BasicSocket{
    output?:OfflineSocket
    private static _event: MessageEvent<any> = { data: null } as any;
    constructor(output?:OfflineSocket,lag=10){
        super()
        this.output=output
        
        this.send = (s) => {
            if (!this.output) return;
            const out = this.output;
            const ev = OfflineSocket._event;
            // deno-lint-ignore ban-ts-comment
            //@ts-ignore
            ev.data = s;
            if (out.onmessage){
                setTimeout(() => {
                    out.onmessage!(ev);
                }, lag)
            }
        };
    }
    open(){
        this.readyState=this.OPEN
        if(this.onopen)this.onopen()
    }
    // deno-lint-ignore no-explicit-any
    message(ev: MessageEvent<any>){
        if(this.onmessage)this.onmessage(ev)
    }
}
export const DefaultSignals={
    CONNECT:"connect",
    DISCONNECT:"disconnect",
    OBJECTS:"objects"
}
export class Client{
    ws:BasicSocket
    protected manager:PacketsManager
    opened:boolean // Client Is Connected
    ID:ID=0 // Client ID Sysed With Server And Client
    IP:string // Clinet IP
    protected signals:SignalManager
    onopen?:()=>void
    show_errors:boolean=true

    ping:number=0
    lastPingTime:number=0

    constructor(websocket:BasicSocket,packet_manager:PacketsManager,ip:string=""){
        this.ws=websocket
        this.opened=false
        this.signals=new SignalManager
        this.manager=packet_manager
        this.ws.onopen=()=>{
            
        }
        this.ws.onclose=()=>{
            this.opened=false
            this.signals.emit(DefaultSignals.DISCONNECT,new DisconnectPacket(this.ID))
        }
        if(this.show_errors){
            this.ws.onmessage=async(msg:MessageEvent<ArrayBuffer|Blob>)=>{
                let buf: ArrayBufferLike | null = null
                if (msg.data instanceof ArrayBuffer) buf = msg.data
                else if (msg.data instanceof Blob) {
                    buf=await msg.data.arrayBuffer()
                }

                if (buf) {
                    const packet = this.manager.decode(new NetStream(buf));
                    this.signals.emit(packet.Name, packet);
                }
            }
        }else{
            this.ws.onmessage=async(msg:MessageEvent<ArrayBuffer|Blob>)=>{
                try{
                    let buf: ArrayBufferLike | null = null
                    if (msg.data instanceof ArrayBuffer) buf = msg.data
                    else if (msg.data instanceof Blob) {
                        buf=await msg.data.arrayBuffer()
                    }

                    if (buf) {
                        const packet = this.manager.decode(new NetStream(buf));
                        this.signals.emit(packet.Name, packet);
                    }
                }catch(error){
                    console.error("decode Message Error:",error)
                }
            }
        }
        
        this.IP=ip
        if(ip==""){
            this.on(DefaultSignals.CONNECT,(packet:ConnectPacket)=>{
                this.opened=true
                this.ID=packet.client_id
                if(this.onopen)this.onopen()
                this.emit(new ConnectPacket(this.ID))
            })
        }

        this.on("pong", (packet: PongPacket) => {
            const now = performance.now()
            this.ping = now - packet.time
        })
        this.on("ping", (packet: PingPacket) => {
            this.emit(new PongPacket(packet.time))
        })
    }
    private stream_cache:NetStream=new NetStream(new ArrayBuffer(1024 * 40))

    /**
     * Send A `Packet` To `Server/Client`
     * @param packet To Send
     */
    emit(packet: Packet): void {
        if (this.ws.readyState !== WebSocket.OPEN) return
        this.stream_cache.clear()
        this.manager.encode(packet, this.stream_cache)
        if (this.ws.send) this.ws.send(this.stream_cache._u8Array.subarray(0,this.stream_cache.length))
    }

    /**
     * On Recev A `Packet` From `Server/Client`
     * @param name Name Of `Packet`, you can change the Packet Name In Property `MyPacket.Name`(readonly)
     * @param callback Callback `(packet:MyPacket)=>void`
     */
    // deno-lint-ignore ban-types
    on(name:string,callback:Function){
        this.signals.on(name,callback)
    }
    sendStream(stream:NetStream){
        if (this.ws.readyState !== WebSocket.OPEN) return
        if (this.ws.send) this.ws.send(stream._u8Array.subarray(0, stream.length))
    }
    /**
     * Disconnect Websocket
     */
    disconnect():void{
        if(this.ws.close)this.ws.close()
    }
    send_ping(){
        this.lastPingTime = performance.now()
        this.emit(new PingPacket(this.lastPingTime))
    }
}
export class OfflineClientsManager{
    clients:Map<ID,Client>
    packets_manager:PacketsManager
    onconnection?:(client:Client,username:string)=>void
    canConnect?: (ip:string)=>boolean

    file:FileManager
    constructor(packets:PacketsManager,onconnection?:(client:Client)=>void,file:FileManager=new FetchFileManager){
        this.clients=new Map()
        this.packets_manager=packets
        this.file=file
        this.onconnection=onconnection
    }
    clear(){
        for(const c of this.clients.values()){
            c.disconnect()
        }
        this.clients.clear()
    }
    activate_ws(ws:BasicSocket,id:number,ip:string,username:string):ID{
        const client=new Client(ws,this.packets_manager,ip)
        client.ID=id
        client.on(DefaultSignals.DISCONNECT,(packet:DisconnectPacket)=>{
            this.clients.delete(packet.client_id)
        })
        this.clients.set(client.ID,client)
        client.opened=true
        client.on(DefaultSignals.CONNECT,()=>{
            if(this.onconnection)this.onconnection(client,username)
        })
        client.emit(new ConnectPacket(client.ID))

        return client.ID
    }
    emit(packet: Packet) {
        for (const client of this.clients.values()) {
            try {
                client.emit(packet);
            } catch (error) {
                console.error("Error emitting packet to client:", error);
            }
        }
    }
    sendStream(stream:NetStream){
        for (const client of this.clients.values()) {
            client.sendStream(stream)
        }
    }
    fake_connect(lag:number):BasicSocket{
        const s1=new OfflineSocket(undefined,lag)
        const s2=new OfflineSocket(s1,lag)
        s1.output=s2
        this.activate_ws(s1,random.id(),"localhost","localhost")
        return s2
    }
    fake_connect_other_s(socket:BasicSocket){
        this.activate_ws(socket,random.id(),"localhost","localhost")
    }
}

export abstract class AbstractServerGame<DefaultGameObject2D extends BaseGameObject2D=BaseGameObject2D> extends AbstractGame<DefaultGameObject2D>{
    public clients:OfflineClientsManager
    public allowJoin:boolean
    public id:ID=1
    ticks:number=0
    ntps:number=30
    constructor(tps:number,id:ID,clients:OfflineClientsManager,objects:Array<new()=>DefaultGameObject2D>){
        super(tps,objects)
        this.id=id
        this.allowJoin=true
        this.clients=clients

        setTimeout(this.fpsShow.bind(this),1000)
    }
    fpsShow(){
        if(!this.running)return
        console.log(`TPS:${this.ticks}/${this.tps}`)
        this.ticks=0
        setTimeout(this.fpsShow.bind(this),1000)
    }
    override on_stop(): void {
        super.on_stop()
        for(const c of this.clients.clients.values()){
            c.disconnect()
        }

        //clearInterval(this.net_update_interval)
        //this.net_update_interval=undefined
    }
    private net_tick_delay:number=0
    net_full_tick:number=0
    override update(dt: number, new_list: boolean=false, destroy_queue: boolean=false): void {
        super.update(dt,new_list,destroy_queue)
        this.ticks++

        this.net_tick_delay+=dt
        if(this.net_tick_delay>=1/this.ntps){
            this.net_full_tick-=this.net_tick_delay

            this.net_update(this.net_full_tick<=0)

            if(this.net_full_tick<=0)this.net_full_tick=this.ntps*10

            this.net_full_tick=0
            this.net_tick_delay=0
        }
    }
    handle_connection(client:Client,username:string):void{

    }
    net_update_interval?:number
    net_update(full:boolean){
        this.scene_2d.objects.apply_destroy_queue()
        this.scene_2d.objects.update_to_net()
    }
    override mainloop(rqf?: boolean,auto_mainloop?:boolean): void {
        super.mainloop(rqf,auto_mainloop)
        this.clients.onconnection=this.handle_connection.bind(this)
        if(this.net_update_interval)this.net_update_interval=setInterval(()=>this.net_update(false),this.ntps)
    }
    update_delay:number=3
}
