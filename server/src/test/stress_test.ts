import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { delay } from "https://deno.land/std@0.204.0/async/delay.ts"
import { BasicSocket, Client } from "common/engine/core.ts";
const SERVER_URL = "http://localhost:8080"
const BOT_COUNT = 199
const TICK_RATE = 60
const CONNECTION_DELAY=0.05

class Bot {
    ws?: WebSocket
    client?:Client
    id: number
    messagesSent = 0
    messagesRecv = 0
    pingSum = 0
    pings = 0
    active = true

    constructor(id: number) {
        this.id = id
    }

    async connect():Promise<boolean>{
        const con=await(await fetch(`${SERVER_URL}/api/get-game`)).json()
        if(con.status===0){
            console.log(con.address)
            this.ws=new WebSocket(con.address)
            this.client=new Client(this.ws as BasicSocket,PacketManager)
            this.ws.onopen = () => this.start()
            this.ws.onmessage = (ev) => this.onMessage(ev)
            this.ws.onclose = () => (this.active = false)
            return true
        }else{
            return false
        }
    }

    start() {
        if(!this.client)return
        const interval = 1000 / TICK_RATE
        
        const jp=new JoinPacket()
        jp.player_name=`BOT-${this.id}`
        jp.is_mobile=false
        this.client.emit(jp)

        /*const loop = async () => {
            while (this.active) {
                const ts = performance.now()
                const msg = JSON.stringify({ type: "ping", id: this.id, t: ts })
                this.ws.send(msg)
                this.messagesSent++
                await delay(interval)
            }
        }
        loop()*/
    }

    onMessage(ev: MessageEvent) {
        this.messagesRecv++
        try {
            const data = JSON.parse(ev.data)
            if (data.type === "pong" && typeof data.t === "number") {
                const latency = performance.now() - data.t
                this.pingSum += latency
                this.pings++
            }
        } catch {}
    }

    stats() {
        return {
            id: this.id,
            sent: this.messagesSent,
            recv: this.messagesRecv,
            avgPing: this.pings ? (this.pingSum / this.pings).toFixed(2) : "N/A",
        }
    }
}

// ---------------------------

console.log(`🚀 Starting ${BOT_COUNT} bots...`)
const bots: Bot[] = []
for (let i = 0; i < BOT_COUNT; i++){
    const b=new Bot(i)
    const connected=await b.connect()
    bots.push(b)

    if(!connected)break
    await delay(CONNECTION_DELAY*1000)
}

/*await delay(TEST_DURATION)

console.log("🧮 Collecting results...")
let totalSent = 0, totalRecv = 0, totalPing = 0, countPing = 0

for (const b of bots) {
  const s = b.stats()
  totalSent += s.sent
  totalRecv += s.recv
  if (s.avgPing !== "N/A") {
    totalPing += Number(s.avgPing)
    countPing++
  }
}

console.log(`✅ Test finished with ${BOT_COUNT} bots`)
console.log(`Sent: ${totalSent}  |  Received: ${totalRecv}`)
console.log(`Avg ping: ${countPing ? (totalPing / countPing).toFixed(2) : "N/A"} ms`)*/
