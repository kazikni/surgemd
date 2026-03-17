import { NetStream, Numeric, random, RectHitbox2D, v2 } from "common/engine/core.ts";
import { BotAi } from "./simple_bot_ai.ts";
import { PlayerConnManager } from "../objects/player.ts";
import { ServerGameObject } from "../others/gameObject.ts";

class NeuralLayer {

    input:number
    output:number

    weights:Float32Array
    bias:Float32Array

    constructor(i:number,o:number){

        this.input=i
        this.output=o

        this.weights=new Float32Array(i*o)
        this.bias=new Float32Array(o)

        for(let k=0;k<this.weights.length;k++){
            this.weights[k]=random.float(-1,1)
        }

        for(let k=0;k<this.bias.length;k++){
            this.bias[k]=random.float(-0.5,0.5)
        }
    }

    forward(input:Float32Array,out:Float32Array){

        for(let o=0;o<this.output;o++){

            let sum=this.bias[o]
            const w=o*this.input

            for(let i=0;i<this.input;i++){
                sum += input[i] * this.weights[w+i]
            }

            out[o] = Math.tanh(sum)
        }
    }
}

class NeuralNetwork {
    layers:NeuralLayer[]=[]
    buffers:Float32Array[]=[]

    constructor(struct:number[]){
        for(let i=0;i<struct.length-1;i++){
            this.layers.push(new NeuralLayer(struct[i],struct[i+1]))
        }

        for(let i=1;i<struct.length;i++){
            this.buffers.push(new Float32Array(struct[i]))
        }
    }

    forward(input:Float32Array){

        let cur=input

        for(let i=0;i<this.layers.length;i++){

            const out=this.buffers[i]

            this.layers[i].forward(cur,out)

            cur=out
        }

        return cur
    }
}
export function computeGenomeSize(playerSensorCount:number = 10,packetCompressed:number = 32,memorySize:number=64): number {
    const sensorSize = playerSensorCount + packetCompressed
    const input = sensorSize + memorySize

    const structure = [
        input,
        48,
        24,
        12,
        4 + memorySize
    ]

    let size = 0

    for (let i = 0; i < structure.length - 1; i++) {

        const a = structure[i]
        const b = structure[i+1]

        size += a * b
        size += b
    }

    return size
}
export function generateGenome(): Float32Array {
    const size = computeGenomeSize()

    const g = new Float32Array(size)

    for (let i = 0; i < size; i++) {
        g[i] = random.float(-1,1)
    }

    return g
}
export function applyGenome(ai:NeuralBotAi, genome:Float32Array){
    let offset = 0

    for(const layer of ai.brain.layers){
        for(let i=0;i<layer.weights.length;i++){
            layer.weights[i] = genome[offset++]
        }

        for(let i=0;i<layer.bias.length;i++){
            layer.bias[i] = genome[offset++]
        }
    }
}
export class NeuralBotAi extends BotAi {
    brain:NeuralNetwork

    sensors:Float32Array
    packetEncoded:Float32Array
    memory:Float32Array
    inputBuffer:Float32Array

    ai_timer=0

    constructor(conn:PlayerConnManager){
        super(conn)

        const playerSensorCount = 10
        const packetCompressed = 32
        const memorySize = 64

        const sensorSize = playerSensorCount + packetCompressed

        this.sensors = new Float32Array(sensorSize)
        this.packetEncoded = new Float32Array(packetCompressed)

        this.memory = new Float32Array(memorySize)

        this.inputBuffer = new Float32Array(sensorSize + memorySize)

        this.brain=new NeuralNetwork([
            sensorSize + memorySize,
            48,
            24,
            12,
            4 + memorySize
        ])
    }

    general_update:NetStream=new NetStream(new ArrayBuffer(1))
    update:NetStream=new NetStream(new ArrayBuffer(1024*5))
    view_objects:ServerGameObject[]=[]

    override net_update(general_update:NetStream){

        if(!this.conn.human) return

        this.general_update=general_update

        const scope=this.conn.human.equipment_data.scope.scope_view ?? 0.75

        const cam=RectHitbox2D.centered(
            v2.clone(this.conn.human.position),
            v2.new(40/scope,20/scope)
        )

        this.update.clear()

        const objs=this.conn.get_update_packet_objects(cam,this.conn.human.layer)

        const o=this.conn.human.game.scene_2d.objects.encode_list(
            objs,
            this.view_objects,
            undefined,
            undefined,
            this.update
        )

        this.view_objects=o.last
    }

    encodePacket(){
        const buf = new Uint8Array(this.update.buffer,0,this.update.length)

        const groups = this.packetEncoded.length
        const groupSize = Math.max(1, Math.floor(512/groups))

        for(let g=0; g<groups; g++){

            let sum=0
            const start=g*groupSize

            for(let i=0;i<groupSize;i++){

                const idx=start+i

                if(idx>=buf.length) break

                sum += buf[idx]
            }

            this.packetEncoded[g] = (sum / groupSize) / 255
        }
    }

    readSensors(){

        let i=0

        const h=this.conn.human!

        this.sensors[i++] = h.position.x * 0.01
        this.sensors[i++] = h.position.y * 0.01

        this.sensors[i++] = h.health_data.health
        this.sensors[i++] = h.health_data.boost

        this.sensors[i++] = h.health_data.health / h.health_data.max_health
        this.sensors[i++] = h.health_data.boost / h.health_data.max_boost

        this.sensors[i++] = Math.sin(h.physical_data.rotation)
        this.sensors[i++] = Math.cos(h.physical_data.rotation)

        this.sensors[i++] = h.input.movement.scale
        this.sensors[i++] = h.input.movement.dir

        this.encodePacket()

        for(let k=0;k<this.packetEncoded.length;k++){
            this.sensors[i++] = this.packetEncoded[k]
        }
    }

    applyInput(reg:number,value:number){

        if(!this.conn.human) return

        const input=this.conn.human.input

        switch(reg%4){

            case 0:
                input.movement.dir = value
            break

            case 1:
                input.movement.scale = Numeric.clamp(Math.abs(value),0,1)
            break

            case 2:
                input.rotation = value
            break

            case 3:
                input.using_item = value>0
                input.using_item_down=input.using_item
            break
        }
    }

    override AI(dt:number){

        this.ai_timer+=dt

        if(this.ai_timer<0.1) return

        this.ai_timer=0

        this.readSensors()

        this.inputBuffer.set(this.sensors,0)
        this.inputBuffer.set(this.memory,this.sensors.length)

        const out=this.brain.forward(this.inputBuffer)

        this.applyInput(0,out[0])
        this.applyInput(1,out[1])
        this.applyInput(2,out[2])
        this.applyInput(3,out[3])

        for(let i=0;i<this.memory.length;i++){
            this.memory[i] = out[4+i]
        }
    }
}