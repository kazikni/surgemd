import { CircleCollider2D, gel_events, GELComponent, Numeric, v2, v2m, Vec2 } from "../../../engine/core.ts";
import { gelo_instance_type, Layers, Spawn } from "../../others/constants.ts";
import { CommonGELO, SimulatedGELO } from "../base.ts";

export enum DeadzoneState{
    Deenabled,
    Advancing,
    Waiting,
    Finished
}
export type C_Deadzone={
    collider:CircleCollider2D

    state:DeadzoneState
    position:Vec2
    radius:number
    new_position:Vec2
    new_radius:number
    timer:number

    aspect:number

    set_current(state:DeadzoneState,position:Vec2,radius:number):void
}&CommonGELO
export const c_deadzone:GELComponent<C_Deadzone>={
    id_string:"c_deadzone",
    events:{
        [gel_events.bind]:function(){
            this.state=DeadzoneState.Deenabled
            this.position=v2.zero()
            this.radius=100
            this.new_position=v2.zero()
            this.new_radius=100
            this.timer=0
            this.collider=new CircleCollider2D(this.position,this.radius)
        },
        [gel_events.registry]:function(){
            this.aspect=Math.max(this.scene.map.size.x,this.scene.map.size.y)/100
        }
    },
    methods:{
        set_current(state:DeadzoneState,position:Vec2,radius:number){
            this.collider.position=position
            this.collider.radius=radius

            this.state=state
            this.position=position
            this.radius=radius
        }
    }
}

export function MakeDeadzoneStages(settings: MakeDeadzoneSettings): DeadzoneStage[] {
    const stages: DeadzoneStage[] = []
    let radius = settings.radius.initial
    let wait_time = settings.wait_time.initial
    let adv_time = settings.advancing_time.initial
    let damage=0
    for (let i = 0; i < settings.count-1; i++){
        stages.push({
            state: DeadzoneState.Waiting,
            damage: damage,
            radius: radius,
            time: wait_time
        })
        damage=Numeric.clamp(damage*settings.damage.advancing_scale,settings.damage.initial,settings.damage.limit)
        stages.push({
            state: DeadzoneState.Advancing,
            damage: damage,
            radius: radius,
            time: adv_time
        })
        damage=Numeric.clamp(damage*settings.damage.waiting_scale,settings.damage.initial,settings.damage.limit)

        radius*=settings.radius.decay
        wait_time=Math.max(wait_time*settings.wait_time.decay,settings.wait_time.min)
        adv_time=Math.max(adv_time*settings.advancing_time.decay,settings.advancing_time.min)
    }
    stages.push({
        state: DeadzoneState.Waiting,
        damage: damage,
        radius: 0,
        time: settings.wait_time.min
    })
    stages.push({
        state: DeadzoneState.Advancing,
        damage: damage,
        radius: 0,
        time: settings.advancing_time.min
    })

    return stages
}
export interface MakeDeadzoneSettings{
    wait_time:{
        initial:number
        min:number
        decay:number
    }
    advancing_time:{
        initial:number
        min:number
        decay:number
    }
    radius:{
        initial:number
        decay:number
    }
    damage:{
        advancing_scale:number
        waiting_scale:number
        initial:number
        limit:number
    }
    count:number
}
export interface DeadzoneStage {
    state: DeadzoneState
    radius: number
    time: number
    damage: number
}
export interface DeadzoneConfig {
    stages?: DeadzoneStage[]
    timeSpeed?: number
    damage?: number
    randomPosAttempts?: number
}

export const DefaultDeadzone: DeadzoneConfig = {
    stages: MakeDeadzoneStages({
        count: 9,

        radius: {
            decay: 0.61,
            initial: 35
        },

        damage: {
            advancing_scale: 2,
            waiting_scale: 1.2,
            limit: 15,
            initial: 1
        },

        wait_time: {
            initial: 70,
            decay: 0.88,
            min: 30,
        },

        advancing_time: {
            initial: 70,
            decay: 0.88,
            min: 30,
        },
    }),
    timeSpeed: 1,
    damage: 1,
    randomPosAttempts: 100,
}

export type SI_Deadzone=C_Deadzone&SimulatedGELO&{
    duration: number

    damage: number
    do_damage: boolean
    do_damage_timer: number

    timer: number
    stage_index: number
    stages: DeadzoneStage[]

    old_position:Vec2
    old_radius:number

    config: DeadzoneConfig

    start(): void
    reset(): void
    advance(): void
    jump_stages(target: number): void

    next_position(radius?: number): Vec2

    is_on_deadzone(position: Vec2): boolean
    damage_at(position: Vec2): number
}
export const si_deadzone: GELComponent<SI_Deadzone> = {
    id_string:"si_deadzone",
    extensions:[c_deadzone],
    events: {
        [gel_events.bind]: function () {
            this.instance_type=gelo_instance_type.deadzone
            this.duration = 0

            this.damage = 0
            this.do_damage = false
            this.do_damage_timer = 0

            this.timer = 0
            this.stage_index = 0
            this.stages = DefaultDeadzone.stages!

            this.config = DefaultDeadzone
        },
        [gel_events.registry]: function () {
            this.reset()
        },
        [gel_events.tick]: function (dt: number) {
            if(this.state===DeadzoneState.Deenabled)return
            if(this.state!==DeadzoneState.Finished){
                this.timer+=dt*(this.config.timeSpeed??1)

                const t=this.duration>0?Numeric.clamp(this.timer/this.duration,0,1):1

                if(this.state===DeadzoneState.Advancing){
                    const radius=Numeric.lerp(this.old_radius,this.new_radius,t)
                    const position=v2.lerp(this.old_position,this.new_position,t)
                    this.set_current(this.state,position,radius)
                }

                if(this.timer>=this.duration){
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
    },
    methods:{
        reset(){
            const center=v2.scale(this.scene.map.size,0.5)
            const initial_radius=this.aspect*80

            this.old_position=v2.clone(center)
            this.old_radius=initial_radius

            this.set_current(DeadzoneState.Deenabled,center,initial_radius)

            this.new_position=v2.clone(center)
            this.new_radius=initial_radius

            this.timer=0
            this.duration=0
            this.stage_index=0
            this.damage=0
            this.do_damage=false
            this.do_damage_timer=1
        },
        start(){
            this.reset()
            this.stage_index=0
            this.advance()
        },
        advance(){
            const stage=this.stages[this.stage_index]

            if(!stage){
                this.state=DeadzoneState.Finished
                return
            }

            this.state=stage.state
            this.timer=0
            this.duration=stage.time
            this.damage=stage.damage

            this.old_radius=this.radius
            this.new_radius=stage.radius*this.aspect

            if(this.stage_index===0){
                const center=v2.scale(this.scene.map.size,0.5)
                this.old_position=v2.clone(center)
                this.position=v2.clone(center)
                this.new_position=this.next_position()
            }else if(stage.state===DeadzoneState.Waiting){
                this.old_position=v2.clone(this.new_position)
                this.position=v2.clone(this.new_position)
                this.new_position=this.next_position()
            }else if(stage.state===DeadzoneState.Advancing){
                this.old_position=v2.clone(this.position)
            }

            this.collider.position=this.position
            this.collider.radius=this.radius

            this.stage_index++
        },
        jump_stages(target:number){
            if(target<=0)return

            target=Math.min(target,this.stages.length)

            for(let i=0;i<target-1;i++){
                this.advance()
                this.timer=0

                if(this.state===DeadzoneState.Waiting){
                    this.set_current(this.state,this.old_position,this.old_radius)
                }else{
                    this.set_current(this.state,this.new_position,this.new_radius)
                }
            }
        },
        next_position(radius?:number):Vec2{
            if(radius===undefined)radius=this.new_radius

            const map=this.scene.map
            const collider=new CircleCollider2D(v2.zero(),radius)

            const position=map.get_random_position(
                collider,
                -1,
                Layers.Normal,
                Spawn.ground,
                (_collider,map)=>{
                    if(this.stage_index===0){
                        const hr=Math.min(this.new_radius,this.aspect*50)
                        return v2.random2_s(v2(map.bounds.min.x+hr,map.bounds.min.x+hr),v2(map.bounds.max.x-hr,map.bounds.max.x-hr),map.random)
                    }

                    const angle=map.random.rad()
                    const maxLen=Math.max(this.radius-radius,0)
                    const len=map.random.float(0,maxLen)
                    const pos=v2.from_RadAngle(angle,len)

                    v2m.add(pos,pos,this.position)
                    return pos
                },
                undefined,
                this.config.randomPosAttempts??30
            )

            return position??v2.clone(this.position)
        },

        is_on_deadzone(position:Vec2):boolean{
            const dist2=v2.distanceSquared(position,this.position)
            return dist2>this.radius*this.radius
        },

        damage_at(position:Vec2):number{
            if(!this.is_on_deadzone(position))return 0
            return this.damage*(this.config.damage??1)
        }
    }
}