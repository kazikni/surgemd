import { Angle, astar_path2d, Numeric, random, Random1, v2, Vec2 } from "common/engine/core.ts";
import { Human } from "../../objects/human.ts";
export interface HumanScriptMoveStateRandomWalk{
    type:"random_walk"
    rot_speed:Random1
    speed:Random1
    timer:number
    time:number
    look_to:boolean
}
export interface HumanScriptMoveStatePathfinding{
    type:"pathfinding"
    dest:Vec2
    path?:Vec2[]
    path_index:number

    repath:boolean
    repath_timer:number
    repath_delay:number

    rot_speed:Random1
    speed:Random1
    look_to:boolean

    cell_size:number
    dirs:[number,number][]

    resolve?:(value:void|PromiseLike<void>)=>void
}
export interface HumanScriptMoveStateGoto{
    type:"goto"
    position_dest?:Vec2
    rotation_dest?:number

    position_speed?:number
    rotation_speed?:number

    resolve?:(value:void|PromiseLike<void>)=>void
}
export type HumanScriptMoveState=HumanScriptMoveStateRandomWalk|HumanScriptMoveStatePathfinding|HumanScriptMoveStateGoto
export type HumanScriptState={
    type:"sleep"
    timer:number
    resolve?:(value:void|PromiseLike<void>)=>void
}|HumanScriptMoveStateGoto
export abstract class HumanScript<MoveState extends HumanScriptMoveState=HumanScriptMoveState,State extends HumanScriptState=HumanScriptState>{
    human!:Human
    enabled:boolean=true
    _running:boolean=false
    get running(){
        return this._running&&!this.human.dead&&!this.human.destroyed
    }
    move_state?:MoveState
    state?:State

    constructor(){
    }
    abstract run():Promise<any>

    tick_random_walk(dt:number,state:HumanScriptMoveStateRandomWalk){
        state.timer-=dt
        if(state.timer<=0){
            state.timer+=state.time
            this.human.input.movement.dir=random.rad()
            this.human.input.movement.scale=random.random1(state.speed)
        }
        if(state.look_to){
            this.human.input.rotation=Numeric.lerp_rad(this.human.input.rotation,this.human.input.movement.dir,Numeric.dt_expo_inter(random.random1(state.rot_speed),dt))
        }else{
            this.human.input.rotation+=random.random1(state.rot_speed)*dt
        }
    }
    tick_pathfinding(dt:number,state:HumanScriptMoveStatePathfinding){
        if(state.repath){
            state.repath_timer-=dt
            if(state.repath_timer<=0||!state.path||state.path.length===0){
                state.repath_timer=state.repath_delay
                state.path=astar_path2d(this.human,this.human.base_hitbox,state.dest,this.human.isBlockedForPath.bind(this.human),{
                    cellSize:state.cell_size,
                    dirs:state.dirs
                })
                state.path_index=0
            }
        }
        if(!state.path){
            state.path=astar_path2d(this.human,this.human.base_hitbox,state.dest,this.human.isBlockedForPath.bind(this.human),{
                cellSize:state.cell_size,
                dirs:state.dirs
            })
            state.path_index=0
        }
        if(!state.path||state.path_index>=state.path.length){
            this.set_idle()
            state.resolve?.()
            return
        }
        const node=state.path[state.path_index]
        if(v2.distance(this.human.position,node)<0.15){
            state.path_index++
        }else{
            const dir=v2.lookTo(this.human.position,node)
            this.human.input.movement.dir=dir
            this.human.input.movement.scale=random.random1(state.speed)
            if(state.look_to){
                this.human.input.rotation=Numeric.lerp_rad(this.human.input.rotation,dir,Numeric.dt_expo_inter(random.random1(state.rot_speed),dt))
            }
        }
    }
    tick_goto(dt:number,state:HumanScriptMoveStateGoto):boolean{
        if(state.position_dest!==undefined){
            this.human.input.movement.dir=v2.lookTo(this.human.position,state.position_dest)
            this.human.input.movement.dir=state.position_speed??1
            if(v2.distance(this.human.position,state.position_dest)<=0.08)return true
            else return false
        }
        if(state.rotation_dest!==undefined&&state.rotation_speed!==undefined){
            this.human.physical_data.rotation=Numeric.lerp_rad(this.human.input.rotation,state.rotation_speed,Numeric.dt_expo_inter(random.random1(state.rotation_speed),dt))
            if(Angle.delta_rad(this.human.physical_data.rotation,state.rotation_dest)<=0.01)return true
            else return false
        }
        return true
    }
    tick(dt:number){
        if(!this.enabled)return
        if(this.move_state){
            switch(this.move_state.type){
                case "random_walk":
                    this.tick_random_walk(dt,this.move_state as HumanScriptMoveStateRandomWalk)
                    break
                case "pathfinding":
                    this.tick_pathfinding(dt,this.move_state as HumanScriptMoveStatePathfinding)
                    break
                case "goto":
                    this.tick_goto(dt,this.state as HumanScriptMoveStateGoto)
                    break
            }
        }
        if(this.state){
            switch(this.state.type){
                case "sleep":{
                    this.state.timer-=dt
                    if(this.state.timer<=0){
                        this.state.resolve?.()
                        this.state=undefined
                    }
                    break
                }
                case "goto":{
                    if(this.tick_goto(dt,this.state as HumanScriptMoveStateGoto)){
                        this.state.resolve?.()
                        this.state=undefined
                    }
                    break
                }
            }
        }
    }
    set_random_walk(speed:Random1=1,rot_speed:Random1=10,time:number=2,look_to:boolean=true){
        this.move_state={
            type:"random_walk",
            time:time,
            timer:0,
            speed:speed,
            look_to:look_to,
            rot_speed:rot_speed
        } as MoveState
    }
    set_idle(){
        this.move_state=undefined
        this.human.input.movement.scale=0
        this.human.input.movement.dir=0
    }
    set_pathfinding(dest:Vec2,speed:Random1=1,rot_speed:Random1=10,look_to=true,four_dirs:boolean=false,repath:boolean=false,repath_delay:number=5,cell_size:number=0.05):Promise<void>{
        return new Promise(resolve=>{
            this.move_state={
                type:"pathfinding",

                dest,
                path_index:0,

                repath,
                repath_timer:repath_delay,
                repath_delay:repath_delay,

                speed,
                rot_speed,
                look_to,

                cell_size,
                dirs:four_dirs?[
                    [1,0],[0,1],[-1,0],[0,-1],
                ]:[
                    [1,0],[0,1],[-1,0],[0,-1],
                    [1,1],[1,-1],[-1,-1],[-1,1]
                ],

                resolve
            } as MoveState
        })
    }
    set_move_goto(dest_position?:Vec2,dest_rotation?:number,position_speed?:number,angle_speed?:number){
        this.move_state={
            type:"goto",
            position_dest:dest_position,
            position_speed:position_speed,
            rotation_dest:dest_rotation,
            rotation_speed:angle_speed,
        } as MoveState
    }
    set_goto(dest_position?:Vec2,dest_rotation?:number,position_speed?:number,angle_speed?:number){
        return new Promise<void>((resolve) => {
            this.state={
                type:"goto",
                position_dest:dest_position,
                position_speed:position_speed,
                rotation_dest:dest_rotation,
                rotation_speed:angle_speed,
                resolve,
            } as State
        })
    }
    sleep(time:number):Promise<void>{
        return new Promise<void>((resolve) => {
            this.state={
                type:"sleep",
                timer:time,
                resolve:resolve
            } as State
        })
    }
}
export class HumanFunctionScript<MoveState extends HumanScriptMoveState=HumanScriptMoveState,State extends HumanScriptState=HumanScriptState> extends HumanScript<MoveState,State>{
    callback:(s:HumanFunctionScript<MoveState,State>)=>Promise<any>
    constructor(callback:(s:HumanFunctionScript<MoveState,State>)=>Promise<any>){
        super()
        this.callback=callback
    }
    override async run(): Promise<any> {
        return await this.callback(this)
    }
}