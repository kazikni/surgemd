import {random} from "../core/math/random.ts";
import {BasicSocket,ClientsManager} from "../core/net/client.ts";
import type {IncomingMessage} from "http";
import type {Duplex} from "stream";
import type {WebSocket} from "ws";

export interface NodeServeHandlerInfo {
    remoteAddr:{hostname:string};
    upgradeWebSocket?:(req:Request,onSocket:(socket:WebSocket)=>void)=>Response;
}

export class NodeClientsManager extends ClientsManager {
    handler(IDGen?:()=>number) {
        return this._createHandler(IDGen);
    }

    handler_log(IDGen?:()=>number) {
        return this._createHandler(IDGen,true);
    }

    private _createHandler(IDGen?:()=>number,checkLogin=false) {
        if(!IDGen){
            IDGen=()=>{
                let id=random.id();
                while(this.clients.get(id))id=random.id();
                return id;
            };
        }

        return (req:Request,url:string[],info:NodeServeHandlerInfo):Response|null=>{
            if(url.length>1&&url[url.length-1]!=="index.html")return null;

            if((req.headers.get("upgrade")||"").toLowerCase()!=="websocket"){
                return new Response("Request isn't trying to upgrade to WebSocket.",{status:406});
            }

            let username:string|null=null;

            if(checkLogin){
                const cookie=req.headers.get("cookie")??"";
                const match=cookie.match(/(?:^|;\s*)username=([^;]+)/);
                username=match?decodeURIComponent(match[1]):"";
            }

            const ip=info.remoteAddr.hostname||req.headers.get("x-forwarded-for")||"unknown";

            if(this.canConnect&&!this.canConnect(ip)){
                return new Response("Too many connections",{status:429});
            }

            if(!info.upgradeWebSocket){
                return new Response("WebSocket upgrade unavailable",{status:500});
            }

            info.upgradeWebSocket(req,socket=>{
                const id=IDGen!();
                this.activate_ws(socket as unknown as BasicSocket,id,ip,username!);
            });

            return new Response(null,{status:101});
        };
    }
}