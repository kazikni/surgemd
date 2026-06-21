import { Router } from "common/engine/server.ts";
import { type ApiServer } from "../server.ts";
import { random } from "common/engine/core.ts";
import { FindGameData, GameResult } from "common/scripts/config/config.ts";

export class RegionConnection {
    sockets: WebSocket[] = []
    pending = new Map<number, {resolve:(value:any)=>void}>()
    next_request_id = 0

    add(socket: WebSocket) {
        this.sockets.push(socket)
        socket.onclose = () => {
            this.remove(socket)
        }
        socket.onmessage = (e) => {
            const msg = JSON.parse(e.data)
            if (msg.request_id!==undefined) {
                const pending = this.pending.get(msg.request_id)
                if (pending) {
                    this.pending.delete(msg.request_id)
                    pending.resolve(msg)
                }
            }
        }
    }
    remove(socket: WebSocket) {
        const idx=this.sockets.indexOf(socket)
        if(idx!==-1){
            this.sockets.splice(idx,1)
        }
    }

    get random(): WebSocket | undefined {
        return this.sockets[random.int(0,this.sockets.length-1)]
    }

    send(data: unknown) {
        const msg = JSON.stringify(data)
        for (const s of this.sockets) {
            if (s.readyState === WebSocket.OPEN) {
                s.send(msg)
            }
        }
    }
    request(data:any) {
        const socket = this.random
        if (!socket) {
            throw new Error("Region offline")
        }
        return new Promise((resolve) => {
            const id = this.next_request_id++
            this.pending.set(id, {resolve})
            socket.send(JSON.stringify({
                ...data,
                request_id:id
            }))
        })
    }
}

export class RegionManager{
    api:ApiServer
    regions_ws:Record<string,RegionConnection>={}
    regions:string[]=[]
    constructor(api:ApiServer){
        this.api=api
    }
    async find_game(data: FindGameData):Promise<GameResult>{
        const region = this.regions_ws[data.region]
        if (!region) {
            return {
                success: false,
                error: "invalid_region"
            }
        }
        try {
            let config=undefined
            const mode=this.api.modes[data.mode]
            const group_size=mode.group_size[data.group_size??0]
            config={
                mode: mode.mode,
                group_size: group_size,
                mode_settings:mode.mode_settings
            }
            const msg=await region.request({
                type: "find_game",
                config: config
            })
            return msg as GameResult
        }catch{
            return {
                success: false,
                error: "region_offline"
            }
        }
    }
    get(region: string) {
        if (!this.regions_ws[region]) {
            this.regions_ws[region] = new RegionConnection()
            this.regions.push(region)
        }
        return this.regions_ws[region]
    }
    routes(router: Router) {
        router.route("/ws", (req) => {
            const result = this.api.server.default_handlers.websocket(req)
            if (!result.socket) {
                return result.response
            }
            const socket = result.socket
            let logged = false
            const timeout = setTimeout(() => {
                if (!logged) {
                    socket.close()
                }
            }, 3000)
            socket.onmessage = (e) => {
                const msg = JSON.parse(e.data)
                if (!logged) {
                    if (msg.type !== "login") {
                        socket.close()
                        return
                    }
                    const user = this.api.config.api.users?.[msg.region.user.name]
                    if (!user ||user.password !== msg.region.user.password ||!user.permitions?.allow_region) {
                        socket.close()
                        return
                    }
                    logged = true
                    clearTimeout(timeout)
                    this.get(msg.region.name).add(socket)
                    socket.send(JSON.stringify({"type":"logged"}))
                    return
                }
                if(msg.request_id!==undefined){
                    const region = this.regions_ws[msg.region]
                    if (!region) {
                        return
                    }
                    const pending = region.pending.get(msg.request_id)
                    if (pending) {
                        region.pending.delete(msg.request_id)
                        pending.resolve(msg)
                    }
                }
            }
            return result.response
        })
    }
}