import { CircleHitbox2D, Numeric, random, v2, v2m, Vec2 } from "common/engine/core.ts";
import { Game } from "./game.ts";
import { DeadZoneState, DeadZoneUpdate } from "common/scripts/packets/general_update.ts";
export const DeadZoneDefinition: DeadZoneStage[] = [
    // 1th Zone
    {
        state: DeadZoneState.Waiting,
        damage: 0,
        radius: 0.9,
        new_radius: 0.4,
        time: 80,
    },
    {
        state: DeadZoneState.Advancing,
        damage: 2,
        radius: 0.9,
        new_radius: 0.4,
        time: 60,
    },
    // 2th Zone
    {
        state: DeadZoneState.Waiting,
        damage: 2,
        radius: 0.4,
        new_radius: 0.3,
        time: 80,
    },
    {
        state: DeadZoneState.Advancing,
        damage: 4,
        radius: 0.4,
        new_radius: 0.3,
        time: 60,
    },
    // 3th Zone
    {
        state: DeadZoneState.Waiting,
        damage: 4,
        radius: 0.3,
        new_radius: 0.2,
        time: 80,
    },
    {
        state: DeadZoneState.Advancing,
        damage: 6,
        radius: 0.3,
        new_radius: 0.2,
        time: 60,
    },
    // 4th Zone
    {
        state: DeadZoneState.Waiting,
        damage: 8,
        radius: 0.2,
        new_radius: 0.1,
        time: 70,
    },
    {
        state: DeadZoneState.Advancing,
        damage: 10,
        radius: 0.2,
        new_radius: 0.1,
        time: 50,
    },
    // 5th Zone
    {
        state: DeadZoneState.Waiting,
        damage: 10,
        radius: 0.1,
        new_radius: 0.05,
        time: 40,
    },
    {
        state: DeadZoneState.Advancing,
        damage: 10,
        radius: 0.1,
        new_radius: 0.05,
        time: 30,
    },
    //6th zone
    {
        state: DeadZoneState.Waiting,
        damage: 10,
        radius: 0.1,
        new_radius: 0,
        time: 40,
    },
    {
        state: DeadZoneState.Advancing,
        damage: 10,
        radius: 0.1,
        new_radius: 0,
        time: 30,
    },
]

export interface DeadZoneStage {
    state: DeadZoneState
    radius: number
    new_radius: number
    time: number
    damage: number
}

export enum DeadZoneMode {
    Disabled,
    Staged,
    Procedural
}

export interface DeadZoneConfig {
    mode?: DeadZoneMode;
    deenabled?:boolean
    stages?: DeadZoneStage[];
    timeSpeed?: number;
    randomPosAttempts?: number;
}
export const DefaultDeadzone:DeadZoneConfig={
    mode:DeadZoneMode.Staged,
    stages:DeadZoneDefinition,
    timeSpeed: 1,
}
export class DeadZoneManager {
    readonly game: Game
    readonly hitbox: CircleHitbox2D

    config!:DeadZoneConfig

    state:DeadZoneUpdate&{
        old_radius:number
        old_position:Vec2
    }={
        new_position:v2.zero(),
        new_radius:1,
        old_position:v2.zero(),
        old_radius:1,
        position:v2.zero(),
        radius:1,
        state:DeadZoneState.Deenabled
    }
    stages: DeadZoneStage[] = []
    stageIndex = 0

    radius_size:number=1

    timer = 0
    duration = 0

    damage = 0
    do_damage:boolean=false
    do_damage_timer=2

    running = false
    dirty = true

    constructor(game:Game){
        this.game = game
        this.hitbox = new CircleHitbox2D(v2.new(0,0),1)
    }

    set_config(config:DeadZoneConfig){
        this.config=config
        this.stages = config.stages ?? DeadZoneDefinition
        this.reset()
    }

    start(){
        this.stageIndex = 0
        this.running = true
        this.advance()
    }

    reset(){
        this.dirty=true
        this.radius_size=this.game.map.size.x

        this.state.position=v2.dscale(this.game.map.size,2)
        this.state.new_position=v2.dscale(this.game.map.size,2)

        this.state.radius=1*this.radius_size
        this.state.new_radius=this.state.radius
        this.state.old_radius=this.state.radius

        this.running = false
        this.stageIndex = 0
        this.timer = 0
        this.damage = 0
        this.state.state = DeadZoneState.Deenabled
    }

    advance(){
        const stage = this.stages[this.stageIndex]
        if(!stage){
            this.running = false
            this.state.state = DeadZoneState.Finished
            return
        }

        this.state.state = stage.state

        this.timer = 0
        this.duration = stage.time
        this.damage = stage.damage

        this.state.old_radius = this.state.radius
        this.state.new_radius = stage.new_radius * this.radius_size

        if(this.stageIndex === 0){
            const center = v2.scale(this.game.map.size,0.5)

            this.state.old_position = center
            this.state.position = center
            this.state.new_position = this.random_point_inside(this.state.new_radius)
        }else if(stage.state === DeadZoneState.Waiting){
            this.state.old_position = this.state.new_position
            this.state.position = this.state.new_position
            this.state.new_position = this.random_point_inside(this.state.new_radius)
        }else if(stage.state === DeadZoneState.Advancing){
            this.state.old_position = this.state.position
        }

        this.hitbox.radius = this.state.radius
        this.hitbox.position = this.state.position

        this.stageIndex++
        this.dirty = true
    }
    jump_stages(targetStage: number){
        if(targetStage <= 0) return
        targetStage = Math.min(targetStage, this.stages.length)
        for(let i = 0; i < targetStage; i++){
            this.advance()

            this.state.radius = this.state.new_radius
            this.state.position = v2.clone(this.state.new_position)

            this.hitbox.radius = this.state.radius
            this.hitbox.position = this.state.position
        }
        this.dirty = true
    }
    tick(dt:number){
        if(!this.running) return

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

            this.dirty = true
        }

        if(this.do_damage_timer>0){
            this.do_damage_timer-=dt
            this.do_damage=false
        }else{
            this.do_damage_timer=2
            this.do_damage=true
        }

        if(this.timer >= this.duration){
            this.advance()
        }
    }

    random_point_in_map(radius:number):Vec2{
        return v2.new(
            random.float(radius, this.game.map.size.x - radius),
            random.float(radius, this.game.map.size.y - radius)
        )
    }
    random_point_inside(radius:number):Vec2{
        const angle = random.rad()
        const len = random.float(0, this.hitbox.radius - radius)

        const pos = v2(
            Math.cos(angle)*len,
            Math.sin(angle)*len
        )

        v2m.add(pos,pos,this.state.position)

        return pos
    }

    is_on_deadzone(position:Vec2){
        const dist2 = v2.distanceSquared(position,this.state.position)

        return dist2 > this.state.radius*this.state.radius
    }

    damageAt(position:Vec2){
        if(!this.is_on_deadzone(position)) return 0

        return this.damage
    }
}