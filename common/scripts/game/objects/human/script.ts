import { Angle, astar_path2d, BaseObject2D, Collider2D, Numeric, ObjectManager2D, random, Random1, v2, Vec2 } from "../../../../engine/core.ts";
import { type DamageParams, ObjectType } from "../../../others/constants.ts";
import { mode_events } from "../../modes/mode_manager.ts";
import { type MomentaryPlayOptions } from "../../../definitions/objects/humanoid_animations.ts";
import { type SI_StaticBody } from "../static_body/static_body.ts";
import { type Human } from "./human.ts";

export interface HumanScriptWait{
    update(dt:number):boolean
    resolve(value:boolean):void
    cancel?():void
}

export type HumanScriptMoveState={
    type:"random_walk"
    speed:Random1
    rot_speed:Random1
    time:number
    timer:number
    look_to:boolean
}|{
    type:"follow"
    target:{position:Vec2,destroyed?:boolean,dead?:boolean}
    distance:number
    speed:number
    look_to:boolean
}

export interface HumanScriptPathOptions{
    speed?:number
    look_to?:boolean
    cell_size?:number
    four_dirs?:boolean
    tolerance?:number
}

export function human_path_blocked(manager:ObjectManager2D<BaseObject2D>,collider:Collider2D,_x:number,_y:number,layer:number):boolean{
    for(const obj of manager.cells.get_objects(collider,layer)){
        if(obj.object_type!==ObjectType.StaticBody)continue
        const sb=obj as unknown as SI_StaticBody
        if(sb.physical.no_collision||sb.physical.no_pathfinding_collision)continue
        if(collider.colliding_with(obj.collider))return true
    }
    return false
}

export class HumanScript{
    human!:Human
    take_control:boolean=false
    interactable:boolean=false
    keep_alive:boolean=false
    enabled:boolean=true

    running:boolean=false
    stopped:boolean=false

    move_state?:HumanScriptMoveState
    waits:HumanScriptWait[]=[]

    private _human_die_cb?:(h:Human,params:DamageParams)=>void

    constructor(take_control:boolean=false){
        this.take_control=take_control
    }

    get alive():boolean{
        return !this.stopped&&this.human!==undefined&&!this.human.dead&&!this.human.destroyed
    }

    async run():Promise<unknown>{
        return
    }

    on_start(){}
    on_stop(){}
    on_tick(_dt:number){}
    on_damaged(_params:DamageParams,_health_damage:number){}
    on_knocked(_params:DamageParams){}
    on_die(_params:DamageParams){}
    on_interact(_user:Human){}
    on_human_die(_human:Human,_params:DamageParams){}

    start(human:Human){
        this.human=human
        this.stopped=false
        this.running=true
        this._human_die_cb=(h:Human,params:DamageParams)=>{
            if(h!==this.human&&this.alive)this.on_human_die(h,params)
        }
        human.scene.mode?.signals.on(mode_events.human_die,this._human_die_cb)
        if(this.take_control)human.clear_input()
        this.on_start()
        this.run().then(()=>{
            this.running=false
            if(!this.keep_alive&&this.human?.script===this)this.human.set_script(undefined)
        },(err)=>{
            this.running=false
            console.error(err)
            if(this.human?.script===this)this.human.set_script(undefined)
        })
    }
    stop(){
        if(this.stopped)return
        this.stopped=true
        this.running=false
        if(this._human_die_cb)this.human?.scene.mode?.signals.off(mode_events.human_die,this._human_die_cb)
        this._human_die_cb=undefined
        for(const w of this.waits)w.cancel?.()
        this.waits.length=0
        this.move_state=undefined
        if(this.take_control&&this.human)this.human.clear_input()
        this.on_stop()
    }

    tick(dt:number){
        if(!this.enabled||this.stopped)return
        this.on_tick(dt)
        if(this.move_state)this.tick_move(dt,this.move_state)
        for(let i=0;i<this.waits.length;i++){
            const w=this.waits[i]
            if(w.update(dt)){
                this.waits.splice(i,1)
                i--
                w.resolve(true)
            }
        }
    }
    private tick_move(dt:number,state:HumanScriptMoveState){
        const input=this.human.input
        switch(state.type){
            case "random_walk":
                state.timer-=dt
                if(state.timer<=0){
                    state.timer+=state.time
                    input.movement.dir=random.rad()
                    input.movement.scale=random.random1(state.speed)
                }
                if(state.look_to){
                    input.rotation=Numeric.lerp_rad(input.rotation,input.movement.dir,Numeric.dt_expo_inter(random.random1(state.rot_speed),dt))
                }else{
                    input.rotation+=random.random1(state.rot_speed)*dt
                }
                break
            case "follow":{
                if(state.target.destroyed||state.target.dead){
                    this.idle()
                    break
                }
                const dist=v2.distance(this.human.position,state.target.position)
                const dir=v2.lookTo(this.human.position,state.target.position)
                if(dist>state.distance){
                    input.movement.dir=dir
                    input.movement.scale=state.speed
                }else{
                    input.movement.scale=0
                }
                if(state.look_to)input.rotation=dir
                break
            }
        }
    }

    wait(update:(dt:number)=>boolean,cancel?:()=>void):Promise<boolean>{
        return new Promise<boolean>((resolve)=>{
            if(this.stopped){
                resolve(false)
                return
            }
            this.waits.push({update,resolve,cancel:()=>{
                cancel?.()
                resolve(false)
            }})
        })
    }
    sleep(time:number):Promise<boolean>{
        let t=time
        return this.wait((dt)=>{
            t-=dt
            return t<=0
        })
    }
    wait_until(condition:()=>boolean,timeout?:number):Promise<boolean>{
        let t=timeout
        let result=true
        return this.wait((dt)=>{
            if(condition())return true
            if(t!==undefined){
                t-=dt
                if(t<=0){
                    result=false
                    return true
                }
            }
            return false
        }).then((v)=>v&&result)
    }

    say(text:string,time:number=3,wait:boolean=true):Promise<boolean>{
        this.human.input.message=text
        if(!wait)return Promise.resolve(true)
        return this.sleep(time)
    }
    look_at(target:Vec2|number|{position:Vec2},speed:number=10,tolerance:number=0.02):Promise<boolean>{
        const angle=()=>typeof target==="number"?target:v2.lookTo(this.human.position,(target as {position?:Vec2}).position??target as Vec2)
        return this.wait((dt)=>{
            const a=angle()
            const input=this.human.input
            input.rotation=Numeric.lerp_rad(input.rotation,a,Numeric.dt_expo_inter(speed,dt))
            if(Math.abs(Angle.delta_rad(input.rotation,a))<=tolerance){
                input.rotation=a
                return true
            }
            return false
        })
    }
    move_to(position:Vec2,speed:number=1,look_to:boolean=true,tolerance:number=0.1,timeout?:number):Promise<boolean>{
        const dest=v2.clone(position)
        let t=timeout
        this.move_state=undefined
        return this.wait((dt)=>{
            const input=this.human.input
            const dist=v2.distance(this.human.position,dest)
            if(dist<=tolerance){
                input.movement.scale=0
                return true
            }
            if(t!==undefined){
                t-=dt
                if(t<=0){
                    input.movement.scale=0
                    return true
                }
            }
            const dir=v2.lookTo(this.human.position,dest)
            input.movement.dir=dir
            input.movement.scale=Math.min(speed,dist*4)
            if(look_to)input.rotation=dir
            return false
        },()=>{
            this.human.input.movement.scale=0
        })
    }
    async path_to(position:Vec2,options:HumanScriptPathOptions={}):Promise<boolean>{
        const cell=options.cell_size??0.5
        const path=astar_path2d(this.human as unknown as BaseObject2D,this.human.base_collider,position,human_path_blocked,{
            cellSize:cell,
            dirs:options.four_dirs?[[1,0],[0,1],[-1,0],[0,-1]]:[[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,-1],[-1,1]],
        })
        if(!path||path.length===0)return false
        for(const node of path){
            if(!this.alive)return false
            const ok=await this.move_to(node,options.speed??1,options.look_to??true,options.tolerance??Math.max(cell*0.4,0.1))
            if(!ok)return false
        }
        return true
    }
    follow(target:{position:Vec2,destroyed?:boolean,dead?:boolean},distance:number=1.5,speed:number=1,look_to:boolean=true){
        this.move_state={type:"follow",target,distance,speed,look_to}
    }
    random_walk(speed:Random1=1,rot_speed:Random1=10,time:number=2,look_to:boolean=true){
        this.move_state={type:"random_walk",speed,rot_speed,time,timer:0,look_to}
    }
    idle(){
        this.move_state=undefined
        this.human.input.movement.scale=0
        this.human.input.movement.dir=0
    }

    play_animation(id:string,options:MomentaryPlayOptions={}):Promise<boolean>{
        return new Promise<boolean>((resolve)=>{
            const end=options.on_end
            const ok=this.human.play_momentary(id,{
                item:this.human.inventory.hand_def,
                ...options,
                on_end:(completed)=>{
                    end?.(completed)
                    resolve(completed)
                },
            })
            if(!ok)resolve(false)
        })
    }
    stop_animation(){
        this.human.stop_momentary(false)
    }
    async fire(time:number=0):Promise<boolean>{
        const input=this.human.input
        input.use_weapon=true
        input.using_item_down=true
        const ok=await this.sleep(time)
        input.use_weapon=false
        return ok
    }
    set_hand(slot:number){
        this.human.inventory.set_hand_slot(slot)
    }
    nearby_humans(radius:number,filter?:(h:Human)=>boolean):Human[]{
        const ret:Human[]=[]
        for(const id in this.human.scene.objects.objects){
            const o=this.human.scene.objects.objects[id] as unknown as Human
            if(o===this.human||o.object_type!==ObjectType.Human||o.dead||o.destroyed||o.layer!==this.human.layer)continue
            if(v2.distance(o.position,this.human.position)>radius)continue
            if(filter&&!filter(o))continue
            ret.push(o)
        }
        ret.sort((a,b)=>v2.distanceSquared(a.position,this.human.position)-v2.distanceSquared(b.position,this.human.position))
        return ret
    }
    distance_to(target:{position:Vec2}):number{
        return v2.distance(this.human.position,target.position)
    }
}

export class HumanFunctionScript extends HumanScript{
    callback:(s:HumanFunctionScript)=>Promise<unknown>
    constructor(callback:(s:HumanFunctionScript)=>Promise<unknown>,take_control:boolean=false){
        super(take_control)
        this.callback=callback
    }
    override async run():Promise<unknown>{
        return await this.callback(this)
    }
}
