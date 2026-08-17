import { Router } from "common/engine/deno.ts"
import { type ApiServer } from "../server.ts"
import { random } from "common/engine/core.ts"
import { ApiUserDefinition, FindGameData, FindGameResult } from "common/scripts/config/config.ts"

export class RegionConnection {
    pending = new Map<number, { resolve: (value: any) => void }>()
    next_request_id = 0

    constructor(public socket: WebSocket,public user: ApiUserDefinition) {
        socket.addEventListener("message", (e) => {
            const msg = JSON.parse(e.data)
            if (msg?.request_id===undefined) {
                return;
            }
            const pending = this.pending.get(msg.request_id)
            if (!pending) {
                return
            }
            this.pending.delete(msg.request_id)
            pending.resolve(msg)
        })
    }
    send(data: unknown) {
        if (this.socket.readyState !== WebSocket.OPEN) {
            return
        }
        this.socket.send(JSON.stringify(data));
    }
    request(data: any) {
        if (this.socket.readyState !== WebSocket.OPEN) {
            throw new Error("Socket closed")
        }
        return new Promise((resolve) => {
            const id = this.next_request_id++
            this.pending.set(id, { resolve })
            this.socket.send(JSON.stringify({
                ...data,
                request_id: id
            }))
        })
    }
}

export class RegionConnections {
    sockets: RegionConnection[] = []
    add(socket: WebSocket, user: ApiUserDefinition) {
        const conn = new RegionConnection(socket, user)
        this.sockets.push(conn)
        socket.addEventListener("close", () => {
            this.remove(conn)
        })
        return conn
    }
    remove(conn: RegionConnection){
        const idx = this.sockets.indexOf(conn)
        if (idx !== -1) {
            this.sockets.splice(idx, 1)
        }
    }
    get random():RegionConnection|undefined{
        if (this.sockets.length === 0) {
            return undefined
        }
        return this.sockets[random.int(0, this.sockets.length - 1)]
    }
    send(data: unknown) {
        for (const conn of this.sockets) {
            conn.send(data)
        }
    }
    request(data: any) {
        const conn = this.random
        if (!conn) {
            throw new Error("Region offline")
        }
        return conn.request(data)
    }
}

export class RegionManager {
    api: ApiServer

    regions_ws: Record<string, RegionConnections> = {}
    regions: string[] = []

    constructor(api: ApiServer) {
        this.api = api;

        for (const r of api.config.game.regions) {
            if (this.regions_ws[r]) continue;

            this.regions_ws[r] = new RegionConnections();
            this.regions.push(r);
        }
    }

    async find_game(data: FindGameData): Promise<FindGameResult> {
        const region = this.regions_ws[data.region];
        if (!region) {
            return {
                success: false,
                error: "invalid_region"
            };
        }

        try {
            return await region.request({
                type: "find_game",
                config: this.api.get_game_config(
                    data.mode,
                    data.group_size ?? 0
                )
            }) as FindGameResult;
        } catch {
            return {
                success: false,
                error: "region_offline"
            };
        }
    }

    get(region: string, allow_create_region = false) {
        if (!this.regions_ws[region] && allow_create_region) {
            this.regions_ws[region] = new RegionConnections();
            this.regions.push(region);
        }

        return this.regions_ws[region];
    }

    routes(router: Router) {
        router.route("/ws", (req) => {
            const result = this.api.server.default_handlers.websocket(req);

            if (!result.socket) {
                return result.response;
            }

            const socket = result.socket;

            let logged = false;

            const timeout = setTimeout(() => {
                if (!logged) {
                    socket.close();
                }
            }, 3000);

            socket.addEventListener("message", (e) => {
                if (logged) {
                    return;
                }

                const msg = JSON.parse(e.data);

                if (msg.type !== "login") {
                    socket.close();
                    return;
                }

                const user =
                    this.api.config.users?.[msg.authentication.user.name];

                if (
                    !user ||
                    user.password !== msg.authentication.user.password ||
                    !user.permitions?.allow_region
                ) {
                    socket.close();
                    return;
                }

                const region = this.get(
                    msg.region.name,
                    user.permitions.allow_create_region
                );

                if (!region) {
                    socket.close();
                    return;
                }

                logged = true;
                clearTimeout(timeout);

                region.add(socket, user);

                socket.send(JSON.stringify({
                    type: "logged"
                }));
            });

            return result.response;
        });
    }
}