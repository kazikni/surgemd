const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export type RawConn = Deno.Conn

export class ConnReader {
    buf = new Uint8Array(65536)
    start = 0
    end = 0
    constructor(readonly conn: RawConn) {}

    get size() {
        return this.end - this.start
    }
    async fill(): Promise<boolean> {
        if (this.start === this.end) {
            this.start = 0
            this.end = 0
        } else if (this.end === this.buf.length) {
            if (this.start > 0) {
                this.buf.copyWithin(0, this.start, this.end)
            } else {
                const next = new Uint8Array(this.buf.length * 2)
                next.set(this.buf)
                this.buf = next
            }
            this.end -= this.start
            this.start = 0
        }
        const n = await this.conn.read(this.buf.subarray(this.end))
        if (n === null) return false
        this.end += n
        return true
    }
    push(data: Uint8Array) {
        if (this.end + data.length > this.buf.length) {
            const next = new Uint8Array(Math.max(this.buf.length * 2, this.size + data.length))
            next.set(this.buf.subarray(this.start, this.end))
            this.end -= this.start
            this.start = 0
            this.buf = next
        }
        this.buf.set(data, this.end)
        this.end += data.length
    }
    index_of(a: number, b: number, c: number, d: number, from = 0) {
        const buf = this.buf
        for (let i = this.start + from; i + 3 < this.end; i++) {
            if (buf[i] === a && buf[i + 1] === b && buf[i + 2] === c && buf[i + 3] === d) return i - this.start
        }
        return -1
    }
    take(n: number) {
        const out = this.buf.slice(this.start, this.start + n)
        this.start += n
        return out
    }
}

type Listener = (ev: any) => void

export interface RawUpgradeOptions {
    protocol?: string
    idleTimeout?: number
    maxMessage?: number
    maxBuffered?: number
}

export class RawWebSocket {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSING = 2
    static readonly CLOSED = 3
    readonly CONNECTING = 0
    readonly OPEN = 1
    readonly CLOSING = 2
    readonly CLOSED = 3

    readyState = 0
    binaryType: "arraybuffer" | "blob" = "arraybuffer"
    bufferedAmount = 0
    protocol = ""
    extensions = ""
    url: string
    remoteAddr?: Deno.NetAddr

    onopen: Listener | null = null
    onmessage: Listener | null = null
    onclose: Listener | null = null
    onerror: Listener | null = null

    private listeners: Record<string, Set<Listener>> = {}
    private conn?: RawConn
    private queue: Uint8Array[] = []
    private writing = false
    private close_timer?: ReturnType<typeof setTimeout>
    private idle_timer?: ReturnType<typeof setTimeout>
    private idle_strikes = 0

    constructor(readonly key: string, url: string, readonly options: RawUpgradeOptions = {}) {
        this.url = url
        this.protocol = options.protocol ?? ""
    }

    addEventListener(type: string, fn: Listener) {
        (this.listeners[type] ??= new Set()).add(fn)
    }
    removeEventListener(type: string, fn: Listener) {
        this.listeners[type]?.delete(fn)
    }
    private emit(type: "open" | "message" | "close" | "error", ev: any) {
        const prop = this["on" + type as "onopen"]
        try {
            if (prop) prop.call(this, ev)
            const set = this.listeners[type]
            if (set) for (const fn of set) fn.call(this, ev)
        } catch (e) {
            console.error(e)
        }
    }

    send(data: string | ArrayBuffer | ArrayBufferView | Blob) {
        if (this.readyState !== 1) return
        if (typeof data === "string") return this.frame(0x81, encoder.encode(data))
        if (data instanceof Blob) {
            data.arrayBuffer().then((b) => this.frame(0x82, new Uint8Array(b)))
            return
        }
        if (data instanceof ArrayBuffer || data instanceof SharedArrayBuffer) return this.frame(0x82, new Uint8Array(data))
        this.frame(0x82, new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
    }

    private frame(first: number, payload: Uint8Array) {
        const len = payload.length
        const head = len < 126 ? 2 : len < 65536 ? 4 : 10
        const out = new Uint8Array(head + len)
        out[0] = first
        if (len < 126) {
            out[1] = len
        } else if (len < 65536) {
            out[1] = 126
            out[2] = len >> 8
            out[3] = len & 0xff
        } else {
            out[1] = 127
            new DataView(out.buffer).setBigUint64(2, BigInt(len))
        }
        out.set(payload, head)
        this.write(out)
    }

    private write(data: Uint8Array) {
        this.bufferedAmount += data.length
        if (this.bufferedAmount > (this.options.maxBuffered ?? 8 << 20)) {
            this.terminate(1009)
            return
        }
        this.queue.push(data)
        if (!this.writing) this.drain()
    }

    private async drain() {
        this.writing = true
        try {
            while (this.queue.length > 0 && this.conn) {
                let buf: Uint8Array
                if (this.queue.length === 1) {
                    buf = this.queue[0]
                } else {
                    let total = 0
                    for (const q of this.queue) total += q.length
                    buf = new Uint8Array(total)
                    let off = 0
                    for (const q of this.queue) {
                        buf.set(q, off)
                        off += q.length
                    }
                }
                this.queue.length = 0
                let off = 0
                while (off < buf.length) off += await this.conn.write(buf.subarray(off))
                this.bufferedAmount -= buf.length
            }
        } catch {
            this.terminate(1006)
        } finally {
            this.writing = false
            const cb = this.on_drain
            this.on_drain = undefined
            cb?.()
        }
    }
    private on_drain?: () => void
    private drained() {
        return this.writing ? new Promise<void>((r) => this.on_drain = r) : Promise.resolve()
    }

    close(code = 1000, reason = "") {
        if (this.readyState >= 2) return
        if (this.readyState === 0) {
            this.readyState = 3
            return
        }
        this.readyState = 2
        const r = encoder.encode(reason).subarray(0, 123)
        const body = new Uint8Array(2 + r.length)
        body[0] = code >> 8
        body[1] = code & 0xff
        body.set(r, 2)
        this.frame(0x88, body)
        this.close_timer = setTimeout(() => this.terminate(code, reason), 1000)
    }

    terminate(code = 1006, reason = "") {
        if (this.readyState === 3) return
        const clean = this.readyState === 2
        this.readyState = 3
        clearTimeout(this.close_timer)
        clearTimeout(this.idle_timer)
        this.queue.length = 0
        try {
            this.conn?.close()
        } catch {/**/}
        this.emit("close", { type: "close", code, reason, wasClean: clean || code === 1000, target: this })
    }

    private idle_reset() {
        this.idle_strikes = 0
    }
    private idle_check = () => {
        if (this.readyState !== 1) return
        if (++this.idle_strikes > 1) return this.terminate(1001, "idle")
        this.frame(0x89, new Uint8Array(0))
        this.idle_timer = setTimeout(this.idle_check, this.options.idleTimeout! * 1000)
    }

    async _open(conn: RawConn, reader: ConnReader) {
        if (this.readyState === 3) {
            try {
                conn.close()
            } catch {/**/}
            return
        }
        this.conn = conn
        this.readyState = 1
        if (this.options.idleTimeout) this.idle_timer = setTimeout(this.idle_check, this.options.idleTimeout * 1000)
        this.emit("open", { type: "open", target: this })
        try {
            await this.read_loop(reader)
        } catch (e) {
            if (this.readyState < 2) this.emit("error", { type: "error", error: e, message: String(e), target: this })
        }
        this.terminate(1006)
    }

    private async read_loop(reader: ConnReader) {
        const max = this.options.maxMessage ?? 1 << 20
        let frag: Uint8Array[] = []
        let frag_size = 0
        let frag_op = 0
        while (this.readyState === 1 || this.readyState === 2) {
            while (reader.size >= 2) {
                const buf = reader.buf
                const s = reader.start
                const b0 = buf[s]
                const b1 = buf[s + 1]
                const fin = (b0 & 0x80) !== 0
                const op = b0 & 0x0f
                if ((b1 & 0x80) === 0) return this.terminate(1002)
                let len = b1 & 0x7f
                let off = 2
                if (len === 126) {
                    if (reader.size < 4) break
                    len = (buf[s + 2] << 8) | buf[s + 3]
                    off = 4
                } else if (len === 127) {
                    if (reader.size < 10) break
                    len = Number(new DataView(buf.buffer, buf.byteOffset + s + 2, 8).getBigUint64(0))
                    off = 10
                }
                if (len > max || frag_size + len > max) return this.terminate(1009)
                if (reader.size < off + 4 + len) break
                const m0 = buf[s + off], m1 = buf[s + off + 1], m2 = buf[s + off + 2], m3 = buf[s + off + 3]
                const p = s + off + 4
                const payload: Uint8Array<ArrayBuffer> = new Uint8Array(len)
                let i = 0
                for (; i + 3 < len; i += 4) {
                    payload[i] = buf[p + i] ^ m0
                    payload[i + 1] = buf[p + i + 1] ^ m1
                    payload[i + 2] = buf[p + i + 2] ^ m2
                    payload[i + 3] = buf[p + i + 3] ^ m3
                }
                for (; i < len; i++) payload[i] = buf[p + i] ^ buf[s + off + (i & 3)]
                reader.start = p + len
                this.idle_reset()

                if (op === 0x8) {
                    const code = len >= 2 ? (payload[0] << 8) | payload[1] : 1005
                    const reason = len > 2 ? decoder.decode(payload.subarray(2)) : ""
                    if (this.readyState === 1) {
                        this.readyState = 2
                        this.frame(0x88, payload.subarray(0, 2))
                        await this.drained()
                    }
                    return this.terminate(code, reason)
                } else if (op === 0x9) {
                    this.frame(0x8a, payload)
                } else if (op === 0xa) {
                    continue
                } else if (op === 0x1 || op === 0x2 || op === 0x0) {
                    if (op !== 0) frag_op = op
                    if (fin && frag.length === 0) {
                        this.deliver(frag_op, payload)
                    } else {
                        frag.push(payload)
                        frag_size += len
                        if (fin) {
                            const all = new Uint8Array(frag_size)
                            let o = 0
                            for (const f of frag) {
                                all.set(f, o)
                                o += f.length
                            }
                            frag = []
                            frag_size = 0
                            this.deliver(frag_op, all)
                        }
                    }
                } else {
                    return this.terminate(1002)
                }
            }
            if (!await reader.fill()) return
        }
    }

    private deliver(op: number, payload: Uint8Array<ArrayBuffer>) {
        if (this.readyState !== 1) return
        const data = op === 0x1 ? decoder.decode(payload) : this.binaryType === "blob" ? new Blob([payload]) : payload.buffer
        this.emit("message", { type: "message", data, target: this })
    }

    static async accept_key(key: string) {
        const hash = await crypto.subtle.digest("SHA-1", encoder.encode(key + GUID))
        return btoa(String.fromCharCode(...new Uint8Array(hash)))
    }
}

export const raw_requests = new WeakSet<Request>()
export const ws_responses = new WeakMap<Response, RawWebSocket>()

export function upgradeWebSocket(req: Request, options: RawUpgradeOptions = {}): { socket: WebSocket, response: Response } {
    if (!raw_requests.has(req)) return Deno.upgradeWebSocket(req, options)
    const key = req.headers.get("sec-websocket-key")
    if ((req.headers.get("upgrade") ?? "").toLowerCase() !== "websocket" || !key) {
        throw new TypeError("Invalid Header: 'upgrade' header must contain 'websocket'")
    }
    const socket = new RawWebSocket(key, req.url.replace(/^http/, "ws"), options)
    const response = new Response(null, { status: 200 })
    ws_responses.set(response, socket)
    return { socket: socket as unknown as WebSocket, response }
}