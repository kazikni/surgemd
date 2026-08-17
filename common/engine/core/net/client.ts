import { FetchFileManager, FileManager } from "../definition/file.ts";
import { random } from "../math/random.ts";
import { ID, SignalManager } from "../math/utils.ts";
import { ConnectPacket, DisconnectPacket, InvalidPacket, MessagePacket, Packet, PacketsManager, PingPacket, PongPacket, SignalMessagePacket } from "./packets.ts";
import { DynamicStream, StaticStream, Stream } from "./stream.ts";

export class BasicSocket{
    readyState = 1;
    binaryType = "";
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;

    send(data: ArrayBuffer|Uint8Array|SharedArrayBuffer):void{}
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
    constructor(output?:OfflineSocket){
        super()
        this.output=output
    }
    override send(data: ArrayBuffer|Uint8Array|SharedArrayBuffer){
        if (!this.output) return;
        const out = this.output;
        const ev = OfflineSocket._event;
        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        ev.data = data
        out.message!(ev)
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
    manager:PacketsManager
    opened:boolean // Client Is Connected
    ID:ID=0 // Client ID Sysed With Server And Client
    IP:string // Client IP
    signals:SignalManager
    onopen?:()=>void

    ping:number=0
    full_ping:number=0
    last_ping_time:number=0
    recev_ping_emulation:number=0
    send_ping_emulation:number=0

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
        this.ws.onmessage = (msg) => {
            if (this.recev_ping_emulation > 0) {
                setTimeout(() => this._on_message(msg),this.recev_ping_emulation)
            } else {
                this._on_message(msg)
            }
        }
        this.IP=ip
        if(ip==""){
            this.on(DefaultSignals.CONNECT,(packet:ConnectPacket)=>{
                this.opened=true
                this.ID=packet.client_id
                if(this.onopen)this.onopen()
                this.emit_connect()
            })
        }
        this.on("pong", (packet: PongPacket) => {
            const now = performance.now()
            this.full_ping = now - packet.client_time
            this.ping=this.full_ping
            //this.ping = packet.server_time - packet.client_time
        })
        this.on("ping", (packet: PingPacket) => {
            this.emit_packet(new PongPacket(packet.client_time,performance.now()))
        })
    }
    private stream_cache:Stream=new DynamicStream(2048)

    emit(signal:string,msg?:any,bytes1:number=1,bytes2:number=2){
        const p=new SignalMessagePacket()
        p.signal=signal
        p.msg=msg
        p.bytes1=bytes1
        p.bytes2=bytes2
        this.emit_packet(p)
    }
    emit_packet(packet: Packet) {
        if (this.ws.readyState !== WebSocket.OPEN) return
        this.stream_cache.clear()
        this.manager.encode(packet, this.stream_cache)
        const data=this.stream_cache.data
        //const data=this.stream_cache.data.subarray(0,this.stream_cache.length)
        this._send(data)
    }
    async _on_message(msg:MessageEvent<ArrayBuffer|Blob>){
        let buf: ArrayBufferLike | null = null
        if (msg.data instanceof ArrayBuffer){
            buf = msg.data
        }else if(msg.data instanceof Uint8Array){
            buf=msg.data.buffer
        }else if(msg.data instanceof Blob) {
            buf=await msg.data.arrayBuffer()
        }
        if (buf) {
            const stream=new StaticStream(buf as ArrayBuffer)
            let packet = this.manager.decode(stream)
            while(!(packet instanceof InvalidPacket)){
                switch(packet.ID){
                    case 65530:
                        this.signals.emit(packet.Name, (packet as MessagePacket).msg)
                        break
                    case 65529:
                        this.signals.emit((packet as SignalMessagePacket).signal,(packet as SignalMessagePacket).msg)
                        break
                    default:
                        this.signals.emit(packet.Name, packet)
                        break
                }
                packet=this.manager.decode(stream)
            }
        }
    }
    _send(data:any){
        if(!this.ws.send)return
        if(this.send_ping_emulation>0){
            setTimeout(()=>this.ws.send(data),this.send_ping_emulation)
        }else{
            this.ws.send(data)
        }
    }
    async wait(signal:string):Promise<any>{
        return (await this.signals.wait(signal))[0]
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
    send_stream(stream:Stream){
        if(this.ws.readyState !== WebSocket.OPEN)return
        this._send(stream.data)
        //this._send(stream.data.subarray(0, Math.max(stream.length,Math.min(stream.data.length,4000))))
    }
    send(msg:any,bytes1:number=1,bytes2:number=2){
        const p=new MessagePacket()
        p.msg=msg
        p.bytes1=bytes1
        p.bytes2=bytes2
        this.emit_packet(p)
    }

    disconnect():void{
        if(this.ws.close)this.ws.close()
    }
    send_ping() {
        this.last_ping_time = performance.now()
        this.emit_packet(new PingPacket(this.last_ping_time))
    }
    emit_connect(){
        this.emit_packet(new ConnectPacket(this.ID))
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
        client.emit_connect()

        return client.ID
    }
    emit_packet(packet: Packet) {
        for (const client of this.clients.values()) {
            try {
                client.emit_packet(packet)
            } catch (error) {
                console.error("Error emitting packet to client:", error)
            }
        }
    }
    emit(signal:string,msg?:any,bytes1:number=1,bytes2:number=2) {
        for (const client of this.clients.values()) {
            try {
                client.emit(signal,msg,bytes1,bytes2)
            } catch (error) {
                console.error("Error emitting packet to client:", error)
            }
        }
    }
    async wait(signal:string):Promise<Record<number,any>>{
        const ret:Record<number,any>={}
        for (const client of this.clients.values()) {
            ret[client.ID]=(await client.signals.wait(signal))[0]
        }
        return ret
    }
    send_stream(stream:Stream){
        for (const client of this.clients.values()) {
            client.send_stream(stream)
        }
    }
    send(msg:any,bytes1?:number,bytes2?:number){
        for (const client of this.clients.values()) {
            client.send(msg,bytes1,bytes2)
        }
    }
    fake_connect():BasicSocket{
        const s1=new OfflineSocket(undefined)
        const s2=new OfflineSocket(s1)
        s1.output=s2
        this.activate_ws(s1,random.id(),"localhost","localhost")
        return s2
    }
    create_conn():[OfflineSocket,OfflineSocket]{
        const s1=new OfflineSocket(undefined)
        const s2=new OfflineSocket(s1)
        s1.output=s2
        return [s1,s2]
    }
    fake_connect_other_s(socket:BasicSocket){
        this.activate_ws(socket,random.id(),"localhost","localhost")
    }
}
