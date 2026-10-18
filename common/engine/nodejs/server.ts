import {createServer as createHttpServer,IncomingMessage,Server as HttpServer} from "node:http";
import {createServer as createHttpsServer} from "node:https";
import {readFile,stat} from "node:fs/promises";
import {existsSync} from "node:fs";
import {join,extname,resolve,sep} from "node:path";
import {Duplex} from "node:stream";
import {WebSocket,WebSocketServer} from "ws";
import {Path} from "../core/math/utils.ts";
import {Router,Server} from "../server/server.ts";
import {HandlerFunc,HandlerFuncAsync} from "../core/net/server_base.ts";
import {NodeServeHandlerInfo} from "./clients_manager.ts";

type Handler=HandlerFunc|HandlerFuncAsync;
type UpgradeCallback=(socket:WebSocket)=>void;

export class NodeRouter implements Router {
    private routes=new Map<string,Handler[]>();
    private sub_routers=new Map<string,NodeRouter>();
    failCallback:Handler;

    constructor(failCallback:Handler=((_req)=>new Response("Not Found :(",{status:404}))){
        this.failCallback=failCallback;
    }
    folder(url: string, path: string): void {
    }

    protected add_route(url:string,handler:Handler){
        if(!this.routes.has(url))this.routes.set(url,[]);
        this.routes.get(url)!.push(handler);
    }

    private _route(url:string[],handler:Handler|NodeRouter){
        if(url.length===1){
            if(handler instanceof NodeRouter){
                this.sub_routers.set(url[0],handler);
                this.add_route(url[0],handler._handler());
            }else this.add_route(url[0],handler);
        }else if(url.length>1){
            const name=url.shift()!;
            if(!this.sub_routers.has(name)){
                const router=new NodeRouter(this.failCallback);
                this.sub_routers.set(name,router);
                this.add_route(name,router._handler());
            }
            this.sub_routers.get(name)!._route(url,handler);
        }
    }

    private _remove_route(url:string[]){
        if(url.length===1)this.routes.delete(url[0]);
        else if(url.length>1){
            const name=url.shift()!;
            this.sub_routers.get(name)?._remove_route(url);
        }
    }

    remove_route(url:string){
        this._remove_route(Path.split(url));
    }

    route(url:string,...handlers:(Handler|Router)[]){
        for(const handler of handlers)this._route(Path.split(url),handler as Handler|NodeRouter);
    }

    router(url:string):Router{
        let current:NodeRouter=this;
        for(const part of Path.split(url)){
            if(!current.sub_routers.has(part)){
                const router=new NodeRouter(this.failCallback);
                current.sub_routers.set(part,router);
                current.add_route(part,router._handler());
            }
            current=current.sub_routers.get(part)!;
        }
        return current;
    }

    protected _handler():HandlerFuncAsync{
        return async(req,path,info)=>{
            path.shift();
            const handlers=[
                ...(this.routes.get(path[0])??[]),
                ...(this.routes.get("")??[])
            ];
            for(const handler of handlers){
                const response=await handler(req,[...path],info);
                if(response)return response;
            }
            return null;
        };
    }
}

export class NodeServer extends NodeRouter implements Server {
    port:number;
    ssl:boolean;
    certFile:string;
    keyFile:string;
    caFile?:string;
    server:HttpServer|null=null;
    private wsServer=new WebSocketServer({noServer:true});
    private upgradeRoutes=new Map<string,(req:Request,path:string[],info:NodeServeHandlerInfo,onSocket:UpgradeCallback)=>Response|null|Promise<Response|null>>();

    constructor(port=5000,ssl=false,certFile="",keyFile="",caFile?:string){
        super();
        this.port=port;
        this.ssl=ssl;
        this.certFile=certFile;
        this.keyFile=keyFile;
        this.caFile=caFile;
    }
    default_handlers: { websocket(req: Request): { response: Response; socket?: WebSocket; }; cors(res: Response): Response; no_cache(res: Response): Response; json_request(req: Request, method?: string): Promise<{ response?: Response; content: any; }>; };

    websocket(url:string,handler:(req:Request,path:string[],info:NodeServeHandlerInfo)=>Response|null|Promise<Response|null>){
        const path=resolveRoute(url);
        this.upgradeRoutes.set(path,async(req,parts,info,onSocket)=>{
            info.upgradeWebSocket=(request,callback)=>{
                callbackSocket=callback;
                return new Response(null,{status:200});
            };
            callbackSocket=undefined;
            const result=await handler(req,parts,info);
            if(callbackSocket)onSocketWrapper=callbackSocket;
            return result;
        });
    }

    private async handleRequest(req:IncomingMessage,res:import("node:http").ServerResponse){
        try{
            const request=await toRequest(req);
            const path=["",...Path.split(new URL(request.url).pathname)];
            const response=await this._handler()(request,path,{remoteAddr:{hostname:getIP(req)} } as never);
            const result=response??await this.failCallback(request,path,{remoteAddr:{hostname:getIP(req)}} as never)??new Response("Not Found",{status:404});
            res.writeHead(result.status,Object.fromEntries(result.headers.entries()));
            res.end(Buffer.from(await result.arrayBuffer()));
        }catch(error){
            console.error(error);
            if(!res.headersSent)res.writeHead(500);
            res.end("Internal Server Error");
        }
    }

    run(){
        const handler=this.handleRequest.bind(this);
        if(this.ssl){
            this.server=createHttpsServer({
                cert:existsSync(this.certFile)?undefined:undefined,
                key:existsSync(this.keyFile)?undefined:undefined
            },handler);
        }else this.server=createHttpServer(handler);

        this.server.on("upgrade",(req,socket,head)=>{
            void this.handleUpgrade(req,socket,head);
        });

        this.server.listen(this.port,"0.0.0.0");
    }

    private async handleUpgrade(req:IncomingMessage,socket:Duplex,head:Buffer){
        try{
            const url=new URL(req.url??"/",`http://${req.headers.host??"localhost"}`);
            const path=["",...Path.split(url.pathname)];
            const request=await toRequest(req);
            const info:NodeServeHandlerInfo={remoteAddr:{hostname:getIP(req)}};
            const handler=this.findUpgradeHandler(path);
            if(!handler){
                socket.destroy();
                return;
            }
            let accepted=false;
            info.upgradeWebSocket=(request,callback)=>{
                this.wsServer.handleUpgrade(req,socket,head,ws=>{
                    accepted=true;
                    callback(ws);
                });
                return new Response(null,{status:200});
            };
            const result=await handler(request,path,info);
            if(!accepted&&result?.status!==101)socket.destroy();
        }catch(error){
            console.error(error);
            socket.destroy();
        }
    }

    private findUpgradeHandler(path:string[]){
        const key="/"+path.filter(Boolean).join("/");
        return this.upgradeRoutes.get(key);
    }

    async stop(){
        if(!this.server)return;
        await new Promise<void>((resolve,reject)=>this.server!.close(error=>error?reject(error):resolve()));
        this.server=null;
    }
}

let callbackSocket:UpgradeCallback|undefined;
let onSocketWrapper:UpgradeCallback|undefined;

function resolveRoute(url:string){
    return "/"+Path.split(url).filter(Boolean).join("/");
}

function getIP(req:IncomingMessage){
    const forwarded=req.headers["x-forwarded-for"];
    return (typeof forwarded==="string"?forwarded.split(",")[0].trim():undefined)??req.socket.remoteAddress??"unknown";
}

async function toRequest(req:IncomingMessage):Promise<Request>{
    const protocol=(req.socket as Duplex&{encrypted?:boolean}).encrypted?"https":"http";
    const host=req.headers.host??"localhost";
    const headers=new Headers();
    for(const [key,value] of Object.entries(req.headers)){
        if(Array.isArray(value))headers.set(key,value.join(", "));
        else if(value!==undefined)headers.set(key,value);
    }
    const method=req.method??"GET";
    const hasBody=method!=="GET"&&method!=="HEAD";
    const chunks:Buffer[]=[];
    if(hasBody)for await(const chunk of req)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
    return new Request(`${protocol}://${host}${req.url??"/"}`,{
        method,
        headers,
        ...(hasBody?{body:Buffer.concat(chunks)}:{})
    });
}