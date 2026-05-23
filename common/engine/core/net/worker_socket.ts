import { BasicSocket } from "./client.ts";

export class WorkerSocket extends BasicSocket {
    private port: Worker;

    constructor(port: Worker) {
        super()
        this.port = port

        this.port.addEventListener("message", (ev: MessageEvent) => {
            this.onmessage?.(ev)
        });

        this.send = (data) => {
            if (!this.port) return;
            if (data instanceof Uint8Array) {
                try {
                    const val=data.buffer.slice(0,data.byteLength)
                    this.port.postMessage(val)
                } catch {
                    this.port.postMessage(data)
                }
            } else if (data instanceof ArrayBuffer) {
                try {
                    this.port.postMessage(data, [data])
                } catch {
                    this.port.postMessage(data)
                }
            } else {
                this.port.postMessage(data)
            }
        };

        this.close = (code, reason) => {
            this.readyState = this.CLOSED
            this.onclose?.(code, reason)
            if (this.port instanceof Worker) this.port.terminate()
        };

        this.readyState = this.OPEN
        this.onopen?.()
    }
}