import { Server } from "common/engine/server.ts";
import { random } from "common/engine/core.ts";
import { ApiServer } from "../server.ts";

export class GroupPlayer {
    group:Group
    id = crypto.randomUUID()
    constructor(group:Group,public socket: WebSocket,public name = "Player"){
        this.group=group
    }
    send(data:any){
        this.socket.send(JSON.stringify(data))
    }
    send_snapshot(){
        this.send({
            type:"snapshot",
            code:this.group.code,
            leader:this.group.players_ids.indexOf(this.group.leader.id),
            self:this.group.players_ids.indexOf(this.id),
            players:this.group.players.map(p=>({
                id:p.id,
                name:p.name
            }))
        })
    }
}

export class Group {
    code = random.code(6)
    players: GroupPlayer[]=[]
    players_ids: string[]=[]
    locked = false
    autofill = true
    constructor(public manager:GroupManager){}
    get leader(){
        return this.players[0]
    }
    add_player(player:GroupPlayer){
        this.players.push(player)
        this.players_ids.push(player.id)
        this.send_snapshot()
        player.socket.onmessage=(e)=>{
            this.on_message(player,JSON.parse(e.data))
        }
        player.socket.onclose=()=>{
            this.remove_player(player)
        }
    }
    remove_player(player:GroupPlayer){
        let i=this.players.indexOf(player)
        if(i!==-1){
            this.players.splice(i,1)
        }
        i=this.players_ids.indexOf(player.id)
        if(i!==-1){
            this.players.splice(i,1)
        }
        this.send_snapshot()
        if(this.players.length<=0){
            this.manager.groups.delete(this.code)
        }
    }
    send_snapshot(){
        for(const p of this.players){
            p.send_snapshot()
        }
    }
    on_message(player:GroupPlayer,msg:any){
        switch(msg.type){
            case "lock":{
                if(player!==this.leader)return
                this.locked=!!msg.value
                this.send_snapshot()
                break
            }
            case "autofill":{
                if(player!==this.leader)return
                this.autofill=!!msg.value
                this.send_snapshot()
                break
            }
            case "kick":{
                if(player!==this.leader)return
                const target=this.players.find(v=>v.id===msg.id)
                if(!target)return
                if(target===this.leader)return
                target.socket.close()
                break
            }
        }
    }
}
export class GroupManager {
    groups = new Map<string,Group>()
    constructor( public api:ApiServer){}
    create(){
        const g = new Group(this)
        this.groups.set(g.code,g)
        return g
    }
    routes(server:Server){
        server.route("/group/create",(req)=>{
            const ws=server.default_handlers.websocket(req)
            if(!ws.socket){
                return ws.response
            }
            ws.socket.onopen=()=>{
                const group=this.create()
                const player = new GroupPlayer(group,ws.socket!)
                group.add_player(player)
            }
            return ws.response
        })
        server.route("/group/join",async (req)=>{
            const url = new URL(req.url)
            const code = url.searchParams.get("code")
            if(!code){
                return new Response("missing code",{
                    status:400
                })
            }
            const group=this.groups.get(code)
            if(!group){
                return new Response("group not found",{
                    status:404
                })
            }
            if(group.locked){
                return new Response("group locked",{
                    status:403
                })
            }
            const ws=server.default_handlers.websocket(req)
            if(!ws.socket){
                return ws.response
            }
            ws.socket.onopen=()=>{
                const player = new GroupPlayer(group,ws.socket!)
                group.add_player(player)
            }
            return ws.response
        })
    }
}