import { CircleHitbox2D, cloneDeep, Hitbox2D, Numeric, random, SeededRandom, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { Game } from "./game.ts";
import { DeadZoneStage, DeadZoneState, DeadZoneUpdate } from "common/scripts/packets/general_update.ts";
import { Layers, Spawn, SpawnMode, SpawnModeType } from "common/scripts/others/constants.ts";
import { FloorType } from "common/scripts/others/terrain.ts";
import { MakeDeadZoneStages } from "common/scripts/others/functions.ts";
import { type GameMap } from "./map.ts";

export const DeadZoneDefinition: DeadZoneStage[]=MakeDeadZoneStages({
    count:9,
    radius:{
        decay:0.61,
        initial:35
    },
    damage:{
        advancing_scale:2,
        waiting_scale:1,
        limit:10,
        initial:1
    },
    wait_time:{
        initial:80,
        decay:0.88,
        min:40,
    },
    advancing_time:{
        initial:60,
        decay:0.88,
        min:20,
    },
})

export enum DeadZoneMode {
    Disabled,
    Staged,
    Procedural
}

export interface DeadZoneConfig {
    mode?: DeadZoneMode
    deenabled?:boolean
    stages?: DeadZoneStage[]
    timeSpeed?: number
    damage?: number
    randomPosAttempts?: number
}
export const DefaultDeadzone:DeadZoneConfig={
    mode:DeadZoneMode.Staged,
    stages:DeadZoneDefinition,
    timeSpeed: 1,
    damage: 1
}
export class DeadZoneManager {
    readonly game: Game
    readonly hitbox: CircleHitbox2D

    config!:DeadZoneConfig

    state:DeadZoneUpdate&{old_radius:number,old_position:Vec2}={
        new_position:v2.zero(),
        new_radius:100,
        old_position:v2.zero(),
        old_radius:100,
        position:v2.zero(),
        radius:100,
        timer:0,
        state:DeadZoneState.Deenabled
    }
    stages: DeadZoneStage[] = []
    stageIndex = 0

    radius_size:number=1

    timer = 0
    duration = 0

    damage = 0
    do_damage:boolean=false
    do_damage_timer=1

    running = false

    constructor(game:Game){
        this.game = game
        this.hitbox = new CircleHitbox2D(v2(0,0),1)
    }

    set_config(config:DeadZoneConfig){
        this.config=cloneDeep(config)
        this.stages = config.stages ?? DeadZoneDefinition
        this.reset()
    }

    start(){
        this.stageIndex = 0
        this.running = true
        this.advance()
    }

    reset(){
        this.radius_size=Math.min(this.game.map.size.x,this.game.map.size.y)/100

        this.state.position=v2.scale(this.game.map.size, 0.5)
        this.state.new_position=v2.scale(this.game.map.size, 0.5)

        this.state.radius=this.radius_size*80*(this.game.map.size.x/this.game.map.size.y)
        this.state.new_radius=this.state.radius
        this.state.old_radius=this.state.radius

        this.hitbox.radius = this.state.radius
        this.hitbox.position = this.state.position

        this.running = false
        this.stageIndex = 0
        this.timer = 0
        this.damage = 0
        this.state.state = DeadZoneState.Deenabled
    }

    advance(){
        const stage = this.stages[this.stageIndex]
        if(!stage){
            this.state.state = DeadZoneState.Finished
            return
        }

        this.state.state = stage.state

        this.timer = 0
        this.duration = stage.time
        this.damage = stage.damage

        this.state.old_radius = this.state.radius
        this.state.new_radius = stage.radius * this.radius_size

        if(this.stageIndex === 0){
            const center = v2.scale(this.game.map.size, 0.5)
            this.state.old_position = center
            this.state.position = center
            this.state.new_position = this.next_position()
        }else if(stage.state === DeadZoneState.Waiting){
            this.state.old_position = this.state.new_position
            this.state.position = this.state.new_position
            this.state.new_position = this.next_position()
        }else if(stage.state === DeadZoneState.Advancing){
            this.state.old_position = this.state.position
        }

        this.hitbox.radius = this.state.radius
        this.hitbox.position = this.state.position

        this.stageIndex++
    }
    jump_stages(targetStage: number){
        if(targetStage <= 0) return
        targetStage = Math.min(targetStage, this.stages.length)
        for(let i = 0; i < targetStage-1; i++){
            this.advance()

            this.timer=0
            if(this.state.state===DeadZoneState.Waiting){
                this.state.radius = this.state.old_radius
                this.state.position = v2.clone(this.state.old_position)
            }else{
                this.state.radius = this.state.new_radius
                this.state.position = v2.clone(this.state.new_position)
            }

            this.hitbox.radius = this.state.radius
            this.hitbox.position = this.state.position
        }
    }
    tick(dt:number){
        if(!this.running||this.state.state===DeadZoneState.Deenabled){
            this.running=false
            return
        }

        if(this.state.state!==DeadZoneState.Finished){
            this.state.timer=Math.max(Math.floor(this.duration-this.timer),0)
            this.timer += dt*(this.config.timeSpeed ?? 1)
            const t = Numeric.clamp(this.timer / this.duration,0,1)
            if(this.state.state === DeadZoneState.Advancing){
                this.state.radius = Numeric.lerp(
                    this.state.old_radius,
                    this.state.new_radius,
                    t
                )

                this.state.position = v2.lerp(
                    this.state.old_position,
                    this.state.new_position,
                    t
                )

                this.hitbox.radius = this.state.radius
                this.hitbox.position = this.state.position
            }
            if(this.timer >= this.duration){
                this.advance()
            }
        }
        if(this.do_damage_timer>0){
            this.do_damage_timer-=dt
            this.do_damage=false
        }else{
            this.do_damage_timer=1
            this.do_damage=true
        }
    }
    next_position(radius:number=this.state.new_radius,mode:SpawnMode=Spawn.ground,attempts:number = 30):Vec2{
        for(let i = 0; i < attempts; i++){
            let pos:Vec2
            if(this.stageIndex===0){
                pos=this.random_point_in_map(radius)
            }else{
                const angle = random.rad()
                const maxLen=Math.max(this.state.radius - radius, 0)
                const len=random.float(0, maxLen)
                pos=v2.from_RadAngle(angle, len)
                v2m.add(pos,pos,this.state.position)
            }
            const floor=this.game.map.terrain.get_floor_type(pos,Layers.Normal,FloorType.Void)
            let valid = true
            switch(mode.type){
                case SpawnModeType.any:
                    break
                case SpawnModeType.blacklist:{
                    valid = !mode.list.includes(floor)
                    break
                }
                case SpawnModeType.whitelist:{
                    valid = mode.list.includes(floor)
                    break
                }
            }
            if(valid){
                return pos
            }
        }
        const angle=random.rad()
        const maxLen=Math.max(this.state.radius - radius, 0)
        const len=random.float(0, maxLen)
        const pos=v2.from_RadAngle(angle, len)
        v2m.add(pos,pos,this.state.position)
        return pos
    }
    random_point_in_map(radius:number):Vec2{
        return v2(random.float(radius, this.game.map.size.x - radius),random.float(radius, this.game.map.size.y - radius))
    }
    random_point_inside(radius:number):Vec2{
        const angle = random.rad()
        const maxLen = Math.max(this.state.radius - radius, 0)
        const len = random.float(0, maxLen)

        const pos = v2(angle,len)

        v2m.add(pos,pos,this.state.position)

        return pos
    }
    random_point_inside_new():Vec2{
        const angle = random.rad()
        const maxLen = Math.max(this.state.new_radius, 0)
        const len = random.float(0, maxLen)

        const pos = v2.from_RadAngle(angle,len)

        v2m.add(pos,pos,this.state.position)

        return pos
    }

    is_on_deadzone(position:Vec2){
        const dist2 = v2.distanceSquared(position,this.state.position)
        return dist2 > this.state.radius*this.state.radius
    }

    damageAt(position:Vec2){
        if(!this.is_on_deadzone(position))return 0
        return this.damage*(this.config.damage??1)
    }

    random_point_inside_cb(hitbox:Hitbox2D,map:GameMap,random:SeededRandom):Vec2{
        if(this.stageIndex===0)return this.random_point_in_map(this.state.new_radius)
        const angle = random.rad()
        const maxLen = Math.max(this.state.radius, 0)
        const len = random.float(0, maxLen)
        const pos = v2(angle,len)
        v2m.add(pos,pos,this.state.position)

        return pos
    }
    write_checkpoint(stream:Stream){
        stream.write_uint8(this.state.state)

        .write_pos2(this.state.position)
        .write_float32(this.state.radius)

        .write_pos2(this.state.new_position)
        .write_float32(this.state.new_radius)

        .write_pos2(this.state.old_position)
        .write_float32(this.state.old_radius)

        .write_float32(this.timer)
        .write_float32(this.duration)
    }
    decode_checkpoint(stream:Stream){
        this.state.state=stream.read_uint8()

        this.state.position=stream.read_pos2()
        this.state.radius=stream.read_float32()

        this.state.new_position=stream.read_pos2()
        this.state.new_radius=stream.read_float32()

        this.state.old_position=stream.read_pos2()
        this.state.old_radius=stream.read_float32()

        this.timer=stream.read_float32()
        this.duration=stream.read_float32()
    }
}