import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { BasicSocket, Client, Clock, PolarMovement, random, sleep, Vec2 } from "common/engine/core.ts";
import { GameOverPacket } from "common/scripts/packets/gameOver.ts";
import { UpdatePacket } from "common/scripts/packets/update_packet.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";
import { InputPacket } from "common/scripts/packets/input_packet.ts";

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
const BOT_COUNT=400
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

    game_vars:{
        move_timer:number
        rotation_speed:number
    }={
        move_timer:0,
        rotation_speed:0
    }
    game_status:{
        angle:number
        movement:PolarMovement
    }={
        angle:0,
        movement:{dir:0,scale:0}
    }

    start() {
        if(!this.client)return
        const jp=new JoinPacket()
        jp.player_name=`BOT-${this.id}`
        this.client.emit_packet(jp)

        this.game_vars={
            move_timer:0,
            rotation_speed:random.neg_float(0.3,1)
        }
        this.game_status={
            angle:random.rad(),
            movement:{dir:0,scale:0}
        }
    }
    tick(dt:number){
        if(this.client?.opened){
            this.game_vars.move_timer-=dt
            if(this.game_vars.move_timer<=0){
                this.game_vars.move_timer=5
                if(Math.random()<=0.3) this.game_status.movement={scale:random.choose([0.5,1]),dir:random.rad()}
                else this.game_status.movement={scale:0,dir:0}
            }
            if(this.game_status.movement.scale>0){
                this.game_status.angle+=this.game_vars.rotation_speed*dt
            }

            const msg=new InputPacket()
            msg.angle=this.game_status.angle
            msg.movement=this.game_status.movement
            msg.use_weapon=Math.random()<=0.05
            msg.interact=Math.random()<=0.05
            this.client.emit_packet(msg)
        }

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
    for(const bot of bots){
        bot.tick(dt)
    }
}

const clock=new Clock(TICK_RATE,1,tick)
clock.start()