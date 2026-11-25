import { type BasicSocket, ClientsManager } from "../core/net/client.ts"
import { random } from "../core/math/random.ts"
import { Stream } from "../core/net/stream.ts"

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

export interface RawSocketInfo {
    ip: string
    path: string
    headers: Record<string, string>
}

export class RawWebSocket {
    readonly CONNECTING = 0
    readonly OPEN = 1
    readonly CLOSING = 2
    readonly CLOSED = 3

    readyState = 1
    binaryType = "arraybuffer"

    onclose: ((code?: number, reason?: string) => void) | null = null
    onerror: ((error: Error) => void) | null = null
    onopen: (() => void) | null = null

    private _onmessage: ((ev: { data: ArrayBuffer }) => void) | null = null
    private pending: ArrayBuffer[] = []

    get onmessage() {
        return this._onmessage
    }
    set onmessage(cb: ((ev: { data: ArrayBuffer }) => void) | null) {
        this._onmessage = cb
        if (!cb) return
        const queued = this.pending
        this.pending = []
        for (const data of queued) cb({ data })
    }

    private queue: Uint8Array[] = []
    private writing = false

    constructor(private conn: Deno.TcpConn, readonly info: RawSocketInfo) {}

    _deliver(data: ArrayBuffer) {
        if (this._onmessage) this._onmessage({ data })
        else this.pending.push(data)
    }

    send(data: ArrayBuffer | Uint8Array) {
        if (this.readyState !== this.OPEN) return
        const payload = data instanceof Uint8Array ? data : new Uint8Array(data)
        const len = payload.length
        const head = len < 126 ? 2 : len < 65536 ? 4 : 10
        const frame = new Uint8Array(head + len)
        frame[0] = 0x82
        if (len < 126) {
            frame[1] = len
        } else if (len < 65536) {
            frame[1] = 126
            new DataView(frame.buffer).setUint16(2, len)
        } else {
            frame[1] = 127
            new DataView(frame.buffer).setBigUint64(2, BigInt(len))
        }
        frame.set(payload, head)
        this._raw_write(frame)
    }

    _raw_write(frame: Uint8Array) {
        this.queue.push(frame)
        if (!this.writing) this._drain()
    }

    private async _drain() {
        this.writing = true
        try {
            while (this.queue.length > 0) {
                const buf = this.queue.shift()!
                let off = 0
                while (off < buf.length) off += await this.conn.write(buf.subarray(off))
            }
        } catch {
            this._shutdown()
        } finally {
            this.writing = false
        }
    }

    close = (code = 1000, _reason?: string) => {
        if (this.readyState === this.CLOSED || this.readyState === this.CLOSING) return
        this.readyState = this.CLOSING
        const body = new Uint8Array(4)
        body[0] = 0x88 // FIN + close
        body[1] = 2
        new DataView(body.buffer).setUint16(2, code)
        this._raw_write(body)
        setTimeout(() => this._shutdown(), 100)
    }

    _shutdown() {
        if (this.readyState === this.CLOSED) return
        this.readyState = this.CLOSED
        try {
            this.conn.close()
        } catch { /* ja fechado */ }
        this.onclose?.()
    }
}

function parse_request(head: string) {
    const lines = head.split("\r\n")
    const path = (lines[0] ?? "").split(" ")[1] ?? "/"
    const headers: Record<string, string> = {}
    for (let i = 1; i < lines.length; i++) {
        const idx = lines[i].indexOf(":")
        if (idx > 0) {
            headers[lines[i].slice(0, idx).trim().toLowerCase()] = lines[i].slice(idx + 1).trim()
        }
    }
    return { path, headers }
}

async function accept_key(key: string) {
    const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(key + GUID))
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
}

export type RawWsHandler = (socket: RawWebSocket, info: RawSocketInfo) => void

export class RawWsServer {
    private listener?: Deno.Listener
    private routes = new Map<string, RawWsHandler>()

    constructor(
        readonly port: number,
        readonly hostname = "0.0.0.0",
        readonly max_message = 1 << 20,
    ) {}

    route(path: string, handler: RawWsHandler) {
        this.routes.set(path.replace(/\/+$/, "") || "/", handler)
    }

    private match(path: string) {
        const clean = path.split("?")[0].replace(/\/+$/, "") || "/"
        return this.routes.get(clean)
    }

    run() {
        this.listener = Deno.listen({ port: this.port, hostname: this.hostname })
        ;(async () => {
            for await (const conn of this.listener!) {
                this.handle(conn as Deno.TcpConn).catch(() => {
                    try {
                        conn.close()
                    } catch {/**/}
                })
            }
        })()
    }

    stop() {
        try {
            this.listener?.close()
        } catch {/**/}
    }

    private async handle(conn: Deno.TcpConn) {
        conn.setNoDelay(true)

        const chunk = new Uint8Array(4096)
        let head = new Uint8Array(0)
        let split = -1
        while (split < 0) {
            const n = await conn.read(chunk)
            if (n === null) return conn.close()
            const next = new Uint8Array(head.length + n)
            next.set(head)
            next.set(chunk.subarray(0, n), head.length)
            head = next
            if (head.length > 16384) return conn.close()
            split = index_of_crlf2(head)
        }
        const text = new TextDecoder().decode(head.subarray(0, split))
        const { path, headers } = parse_request(text)
        const handler = this.match(path)
        const key = headers["sec-websocket-key"]

        if (!handler || !key || (headers["upgrade"] ?? "").toLowerCase() !== "websocket") {
            await conn.write(new TextEncoder().encode("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n"))
            return conn.close()
        }

        await conn.write(Stream.encoder.encode(
            "HTTP/1.1 101 Switching Protocols\r\n" +
                "Upgrade: websocket\r\n" +
                "Connection: Upgrade\r\n" +
                `Sec-WebSocket-Accept: ${await accept_key(key)}\r\n\r\n`,
        ))

        const ip = headers["x-forwarded-for"]?.split(",")[0].trim() ??
            (conn.remoteAddr as Deno.NetAddr).hostname
        const info: RawSocketInfo = { ip, path, headers }
        const socket = new RawWebSocket(conn, info)

        handler(socket, info)
        socket.onopen?.()

        let rest = head.subarray(split + 4)
        await this.read_loop(conn, socket, rest)
    }

    private async read_loop(conn: Deno.TcpConn, socket: RawWebSocket, initial: Uint8Array) {
        let buf = initial.slice()
        const chunk = new Uint8Array(65536)
        let frag: Uint8Array[] = []

        while(socket.readyState === socket.OPEN){
            for(;;){
                if (buf.length < 2) break
                const fin = (buf[0] & 0x80) !== 0
                const opcode = buf[0] & 0x0f
                const masked = (buf[1] & 0x80) !== 0
                let len = buf[1] & 0x7f
                let off = 2
                if (len === 126) {
                    if (buf.length < 4) break
                    len = new DataView(buf.buffer, buf.byteOffset).getUint16(2)
                    off = 4
                } else if (len === 127) {
                    if (buf.length < 10) break
                    len = Number(new DataView(buf.buffer, buf.byteOffset).getBigUint64(2))
                    off = 10
                }
                if (len > this.max_message) {
                    socket._shutdown()
                    return
                }
                const mask_len = masked ? 4 : 0
                if (buf.length < off + mask_len + len) break

                const mask = masked ? buf.subarray(off, off + 4) : undefined
                const start = off + mask_len
                const payload = buf.slice(start, start + len)
                if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3]
                buf = buf.subarray(start + len)

                if (opcode === 0x8) {
                    socket._shutdown()
                    return
                } else if (opcode === 0x9) {
                    const pong = new Uint8Array(2 + payload.length)
                    pong[0] = 0x8a
                    pong[1] = payload.length
                    pong.set(payload, 2)
                    socket._raw_write(pong)
                } else if (opcode === 0xa) { // pong: ignora
                } else if (opcode === 0x0 || opcode === 0x1 || opcode === 0x2) {
                    frag.push(payload)
                    if (fin) {
                        let data: Uint8Array
                        if (frag.length === 1) {
                            data = frag[0]
                        } else {
                            const total = frag.reduce((a, b) => a + b.length, 0)
                            data = new Uint8Array(total)
                            let p = 0
                            for (const f of frag) {
                                data.set(f, p)
                                p += f.length
                            }
                        }
                        frag = []
                        socket._deliver(data.buffer.slice(data.byteOffset, data.byteOffset + data.length) as ArrayBuffer)
                    }
                }
            }

            const n = await conn.read(chunk)
            if (n === null) break
            const next = new Uint8Array(buf.length + n)
            next.set(buf)
            next.set(chunk.subarray(0, n), buf.length)
            buf = next
        }
        socket._shutdown()
    }
}

function index_of_crlf2(b: Uint8Array) {
    for (let i = 0; i + 3 < b.length; i++) {
        if (b[i] === 13 && b[i + 1] === 10 && b[i + 2] === 13 && b[i + 3] === 10) return i
    }
    return -1
}
export class RawWsClientsManager extends ClientsManager {
    attach(server: RawWsServer, path: string, check_login = false) {
        server.route(path, (socket, info) => {
            if (this.canConnect && !this.canConnect(info.ip)) {
                socket.close(1013)
                return
            }
            let username = ""
            if (check_login) {
                const m = (info.headers["cookie"] ?? "").match(/username=([^;]+)/)
                username = m ? decodeURIComponent(m[1]) : ""
            }
            let id = random.id()
            while (this.clients.get(id)) id = random.id()
            this.activate_ws(socket as unknown as BasicSocket, id, info.ip, username)
        })
    }
}