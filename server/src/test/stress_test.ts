import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { BasicSocket, Client, Clock, sleep } from "common/engine/core.ts";
import { GameOverPacket } from "common/scripts/packets/gameOver.ts";
import { UpdatePacket } from "common/scripts/packets/update_packet.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";

const definitions=new GameDefinition()
definitions.reset()
PacketManager.pre_packet=(p)=>{
    if(p.Name==="update")(p as UpdatePacket).definition=definitions
}

const SERVER_URL = "http://localhost:8000"
const JOIN_ARGS=JSON.stringify({
    region:"local",
    mode:0,
    token:undefined
})
const BOT_COUNT=250
const TICK_RATE=60
const CONNECTION_DELAY=0.01

class Bot {
    ws?: WebSocket
    client?:Client
    id: number
    active = true

    constructor(id: number) {
        this.id = id
    }

    async connect():Promise<boolean>{
        if(this.client)this.client.disconnect()
        const txt=await(await fetch(`${SERVER_URL}/find-game`,{
            method:"post",
            body:JOIN_ARGS
        })).text()
        let con:any
        try{
            con=JSON.parse(txt)
        }catch(e:any){
            return false
        }
        if(con.success){
            this.ws=new WebSocket(con.address)
            this.client=new Client(this.ws as BasicSocket,PacketManager)
            this.client.onopen=()=>{
                setTimeout(()=>this.start(),1000)
            }
            this.client.on("gameover",this.on_game_over.bind(this))
            return true
        }else{
            return false
        }
    }

    start() {
        if(!this.client)return
        const jp=new JoinPacket()
        jp.player_name=`BOT-${this.id}`
        this.client.emit_packet(jp)
    }
    tick(){

    }

    on_game_over(p:GameOverPacket){
        this.connect()
    }
}

// ---------------------------

console.log(`Starting ${BOT_COUNT} bots...`)
const bots: Bot[] = []
for (let i = 0; i < BOT_COUNT; i++){
    const b=new Bot(i)
    const connected=await b.connect()
    bots.push(b)

    if(!connected)break
    await sleep(CONNECTION_DELAY)
}

function tick(dt:number){
}

const clock=new Clock(TICK_RATE,1,tick)
clock.start()