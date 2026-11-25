import { Path } from "../core/math/utils.ts";
import { Server } from "../server/server.ts";
import { default_handlers, DenoRouter } from "./server.ts";
import { ConnReader, raw_requests, RawConn, RawWebSocket, ws_responses } from "./rawws.ts";

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const STATUS: Record<number, string> = {
    200: "OK", 201: "Created", 204: "No Content", 206: "Partial Content", 301: "Moved Permanently", 302: "Found",
    304: "Not Modified", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed",
    406: "Not Acceptable", 413: "Payload Too Large", 429: "Too Many Requests", 431: "Request Header Fields Too Large",
    500: "Internal Server Error", 501: "Not Implemented", 503: "Service Unavailable",
}

async function write_all(conn: RawConn, data: Uint8Array) {
    let off = 0
    while (off < data.length) off += await conn.write(data.subarray(off))
}

function front_worker() {
    const write = async (c: Deno.Conn, d: Uint8Array) => {
        let o = 0
        while (o < d.length) o += await c.write(d.subarray(o))
    }
    const pipe = async (a: Deno.Conn, b: Deno.Conn) => {
        const buf = new Uint8Array(65536)
        try {
            for (;;) {
                const n = await a.read(buf)
                if (n === null) break
                await write(b, buf.subarray(0, n))
            }
        } catch {/**/}
        try {
            a.close()
        } catch {/**/}
        try {
            b.close()
        } catch {/**/}
    }
    const scope = self as unknown as Worker
    scope.onmessage = async (e) => {
        const { hostname, port, plain, tls, timeout } = e.data
        let listener: Deno.Listener
        try {
            listener = Deno.listen({ hostname, port })
        } catch (err) {
            scope.postMessage({ error: String(err) })
            return
        }
        scope.postMessage({ ready: true })
        for await (const c of listener) {
            (async () => {
                const timer = setTimeout(() => c.close(), timeout)
                try {
                    ;(c as Deno.TcpConn).setNoDelay(true)
                    const buf = new Uint8Array(16384)
                    const n = await c.read(buf)
                    clearTimeout(timer)
                    if (n === null) return c.close()
                    const inner = await Deno.connect({ hostname: "127.0.0.1", port: buf[0] === 0x16 ? tls : plain })
                    inner.setNoDelay(true)
                    const r = c.remoteAddr as Deno.NetAddr
                    scope.postMessage({ local: (inner.localAddr as Deno.NetAddr).port, hostname: r.hostname, port: r.port })
                    await write(inner, buf.subarray(0, n))
                    pipe(c, inner)
                    pipe(inner, c)
                } catch {
                    clearTimeout(timer)
                    try {
                        c.close()
                    } catch {/**/}
                }
            })()
        }
    }
}

function pem(v: string) {
    return v.includes("-----BEGIN") ? v : Deno.readTextFileSync(v)
}

export interface RawTlsOptions {
    cert: string
    key: string
}

export class RawHttpServer extends DenoRouter implements Server {
    port: number
    hostname = "0.0.0.0"
    ssl: boolean
    certFile: string
    keyFile: string
    default_handlers: typeof default_handlers = default_handlers

    max_head = 16384
    max_body = 8 << 20
    head_timeout = 15000
    keep_alive_timeout = 30000

    private listeners: Deno.Listener[] = []
    private conns = new Set<RawConn>()
    private front?: Worker
    private peers = new Map<number, Deno.NetAddr>()
    private peer_waiters = new Map<number, (a: Deno.NetAddr) => void>()

    constructor(port: number = 5000, ssl: boolean = false, certFile: string = "", keyFile: string = "") {
        super()
        this.port = port
        this.ssl = ssl
        this.certFile = certFile
        this.keyFile = keyFile
    }

    run() {
        return this.start(this.hostname, this.port, this.ssl ? { cert: this.certFile, key: this.keyFile } : undefined)
    }

    async start(hostname: string = this.hostname, port: number = this.port, tls?: RawTlsOptions) {
        this.hostname = hostname
        this.port = port
        this.ssl = !!tls
        if (!tls) {
            const listener = Deno.listen({ hostname, port, transport: "tcp" })
            this.port = (listener.addr as Deno.NetAddr).port
            this.accept(listener, false)
            return
        }
        const plain = Deno.listen({ hostname: "127.0.0.1", port: 0 })
        const secure = Deno.listenTls({ hostname: "127.0.0.1", port: 0, cert: pem(tls.cert), key: pem(tls.key) })
        this.accept(plain, false)
        this.accept(secure, true)
        const front = new Worker(URL.createObjectURL(new Blob([`(${front_worker.toString()})()`], { type: "application/javascript" })), { type: "module" })
        this.front = front
        await new Promise<void>((resolve, reject) => {
            front.onmessage = (e) => {
                const d = e.data
                if (d.ready) return resolve()
                if (d.error) return reject(new Error(d.error))
                const addr: Deno.NetAddr = { transport: "tcp", hostname: d.hostname, port: d.port }
                const waiter = this.peer_waiters.get(d.local)
                if (waiter) {
                    this.peer_waiters.delete(d.local)
                    waiter(addr)
                } else {
                    this.peers.set(d.local, addr)
                    setTimeout(() => {
                        if (this.peers.get(d.local) === addr) this.peers.delete(d.local)
                    }, this.head_timeout + 1000)
                }
            }
            front.postMessage({
                hostname, port, timeout: this.head_timeout,
                plain: (plain.addr as Deno.NetAddr).port,
                tls: (secure.addr as Deno.NetAddr).port,
            })
        })
    }

    stop() {
        this.front?.terminate()
        this.front = undefined
        for (const l of this.listeners) {
            try {
                l.close()
            } catch {/**/}
        }
        this.listeners = []
        for (const c of this.conns) {
            try {
                c.close()
            } catch {/**/}
        }
        this.conns.clear()
    }

    private peer(conn: RawConn): Promise<Deno.NetAddr> {
        const addr = conn.remoteAddr as Deno.NetAddr
        if (!this.front) return Promise.resolve(addr)
        const known = this.peers.get(addr.port)
        if (known) {
            this.peers.delete(addr.port)
            return Promise.resolve(known)
        }
        return new Promise((resolve) => {
            this.peer_waiters.set(addr.port, resolve)
            setTimeout(() => {
                if (this.peer_waiters.get(addr.port) !== resolve) return
                this.peer_waiters.delete(addr.port)
                resolve(addr)
            }, 1000)
        })
    }

    private async accept(listener: Deno.Listener, secure: boolean) {
        this.listeners.push(listener)
        try {
            for await (const conn of listener) {
                this.conns.add(conn)
                ;(conn as Deno.TcpConn).setNoDelay?.(true)
                this.serve(conn, new ConnReader(conn), secure).catch(() => {}).finally(() => {
                    this.conns.delete(conn)
                    this.peers.delete((conn.remoteAddr as Deno.NetAddr).port)
                    try {
                        conn.close()
                    } catch {/**/}
                })
            }
        } catch {/**/}
    }

    private async serve(conn: RawConn, reader: ConnReader, secure: boolean) {
        let first = true
        let addr: Deno.NetAddr | undefined
        for (;;) {
            const timer = setTimeout(() => conn.close(), first ? this.head_timeout : this.keep_alive_timeout)
            let idx: number
            try {
                while ((idx = reader.index_of(13, 10, 13, 10)) < 0) {
                    if (reader.size > this.max_head) return await this.simple(conn, 431)
                    if (!await reader.fill()) return
                }
            } finally {
                clearTimeout(timer)
            }
            first = false
            addr ??= await this.peer(conn)

            const lines = decoder.decode(reader.take(idx + 4).subarray(0, idx)).split("\r\n")
            const [method, target, version] = lines[0].split(" ")
            if (!method || !target || !version?.startsWith("HTTP/1.")) return await this.simple(conn, 400)
            const headers = new Headers()
            for (let i = 1; i < lines.length; i++) {
                const c = lines[i].indexOf(":")
                if (c <= 0) return await this.simple(conn, 400)
                try {
                    headers.append(lines[i].slice(0, c).trim(), lines[i].slice(c + 1).trim())
                } catch {
                    return await this.simple(conn, 400)
                }
            }
            const conn_header = (headers.get("connection") ?? "").toLowerCase()
            let keep = version === "HTTP/1.1" ? !conn_header.includes("close") : conn_header.includes("keep-alive")

            const te = headers.get("transfer-encoding")
            const cl = headers.get("content-length")
            if (te && cl) return await this.simple(conn, 400)
            if (headers.get("expect")?.toLowerCase() === "100-continue") await write_all(conn, encoder.encode("HTTP/1.1 100 Continue\r\n\r\n"))
            let body: Uint8Array | null = null
            if (te) {
                if (te.toLowerCase() !== "chunked") return await this.simple(conn, 501)
                body = await this.read_chunked(reader)
                if (!body) return await this.simple(conn, 413)
            } else if (cl) {
                if (!/^\d+$/.test(cl)) return await this.simple(conn, 400)
                const len = Number(cl)
                if (len > this.max_body) return await this.simple(conn, 413)
                while (reader.size < len) if (!await reader.fill()) return
                body = reader.take(len)
            }

            const host = headers.get("host") ?? `${this.hostname}:${this.port}`
            const url = target.startsWith("/") ? `${secure ? "https" : "http"}://${host}${target}` : target === "*" ? `${secure ? "https" : "http"}://${host}/` : target
            let req: Request
            try {
                req = new Request(url, { method, headers, body: body && body.length > 0 && method !== "GET" && method !== "HEAD" ? body as Uint8Array<ArrayBuffer> : undefined })
            } catch {
                return await this.simple(conn, 400)
            }
            raw_requests.add(req)
            const info = { remoteAddr: { transport: "tcp" as const, hostname: addr.hostname, port: addr.port }, completed: Promise.resolve() }

            let res: Response
            try {
                res = await this.handle_request(req, info)
            } catch (e) {
                console.error(e)
                res = new Response("Internal Server Error", { status: 500 })
            }

            const socket = ws_responses.get(res)
            if (socket) {
                const accept = await RawWebSocket.accept_key(socket.key)
                let head = "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n"
                if (socket.protocol) head += "Sec-WebSocket-Protocol: " + socket.protocol + "\r\n"
                for (const [k, v] of res.headers) head += k + ": " + v + "\r\n"
                await write_all(conn, encoder.encode(head + "\r\n"))
                socket.remoteAddr = info.remoteAddr
                await socket._open(conn, reader)
                return
            }
            if (headers.get("upgrade")) keep = false
            await this.respond(conn, res, method, keep)
            if (!keep) return
        }
    }

    private async handle_request(req: Request, info: unknown): Promise<Response> {
        const path = [""]
        path.push(...Path.split(new URL(req.url).pathname))
        let response = await this._handler()(req, path, info)
        if (!response) {
            response = await this.failCallback(req, path, info) ?? new Response("fail")
        }
        return response
    }

    private async read_line(reader: ConnReader) {
        let e: number
        while ((e = this.line_end(reader)) < 0) {
            if (reader.size > this.max_head || !await reader.fill()) return null
        }
        return decoder.decode(reader.take(e + 2).subarray(0, e))
    }

    private async read_chunked(reader: ConnReader): Promise<Uint8Array | null> {
        const parts: Uint8Array[] = []
        let total = 0
        for (;;) {
            const line = await this.read_line(reader)
            if (line === null) return null
            const size = parseInt(line.split(";")[0], 16)
            if (isNaN(size)) return null
            if (size === 0) {
                for (;;) {
                    const t = await this.read_line(reader)
                    if (t === null) return null
                    if (t === "") break
                }
                break
            }
            total += size
            if (total > this.max_body) return null
            while (reader.size < size + 2) if (!await reader.fill()) return null
            parts.push(reader.take(size))
            reader.take(2)
        }
        const out = new Uint8Array(total)
        let o = 0
        for (const p of parts) {
            out.set(p, o)
            o += p.length
        }
        return out
    }

    private line_end(reader: ConnReader) {
        for (let i = reader.start; i + 1 < reader.end; i++) {
            if (reader.buf[i] === 13 && reader.buf[i + 1] === 10) return i - reader.start
        }
        return -1
    }

    private async simple(conn: RawConn, status: number) {
        await write_all(conn, encoder.encode(`HTTP/1.1 ${status} ${STATUS[status] ?? ""}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`))
    }

    private async respond(conn: RawConn, res: Response, method: string, keep: boolean) {
        const no_body = method === "HEAD" || res.status === 204 || res.status === 304 || res.status < 200
        let head = `HTTP/1.1 ${res.status} ${res.statusText || STATUS[res.status] || ""}\r\n`
        let length: string | null = null
        for (const [k, v] of res.headers) {
            if (k === "content-length") length = v
            else if (k !== "connection" && k !== "transfer-encoding" && k !== "keep-alive") head += k + ": " + v + "\r\n"
        }
        head += keep ? "Connection: keep-alive\r\n" : "Connection: close\r\n"

        if (!res.body || no_body) {
            res.body?.cancel().catch(() => {})
            if (!res.body && !no_body) length = "0"
            if (length !== null) head += "Content-Length: " + length + "\r\n"
            return await write_all(conn, encoder.encode(head + "\r\n"))
        }

        const reader = res.body.getReader()
        try {
            if (length !== null) {
                await write_all(conn, encoder.encode(head + "Content-Length: " + length + "\r\n\r\n"))
                for (;;) {
                    const { done, value } = await reader.read()
                    if (done) break
                    await write_all(conn, value)
                }
                return
            }
            const parts: Uint8Array[] = []
            let total = 0
            for (;;) {
                const { done, value } = await reader.read()
                if (done) {
                    const h = encoder.encode(head + "Content-Length: " + total + "\r\n\r\n")
                    const out = new Uint8Array(h.length + total)
                    out.set(h)
                    let o = h.length
                    for (const p of parts) {
                        out.set(p, o)
                        o += p.length
                    }
                    return await write_all(conn, out)
                }
                parts.push(value)
                total += value.length
                if (total > 1 << 20) break
            }
            await write_all(conn, encoder.encode(head + "Transfer-Encoding: chunked\r\n\r\n"))
            const chunk = async (v: Uint8Array) => {
                await write_all(conn, encoder.encode(v.length.toString(16) + "\r\n"))
                await write_all(conn, v)
                await write_all(conn, encoder.encode("\r\n"))
            }
            for (const p of parts) await chunk(p)
            for (;;) {
                const { done, value } = await reader.read()
                if (done) break
                if (value.length > 0) await chunk(value)
            }
            await write_all(conn, encoder.encode("0\r\n\r\n"))
        } finally {
            reader.releaseLock()
        }
    }
}