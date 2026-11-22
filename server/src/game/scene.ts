import { BaseGELO, CheckpointSettings, gel_component, GELComponent, Scene2D, Stream } from "common/engine/core.ts";
import { type SimApplication, GELONet, SimObject, type SimulatedScene } from "./base.ts";
import { si_deadzone, type SI_Deadzone } from "./gelo/deadzone.ts";
import { si_gamemap, type SI_GameMap } from "./gelo/map.ts";
import { type ModeManager } from "./modes/mode_manager.ts";
import { Loot } from "./objects/loot.ts";
import { Human } from "./objects/human/human.ts";
import { si_obstacle } from "./objects/static_body/obstacle.ts";
import { Bullet } from "./objects/projectile/bullet.ts";
import { Explosion } from "./objects/projectile/explosion.ts";
import { Grenade } from "./objects/projectile/grenade.ts";
import { Decal } from "./objects/decal.ts";
import { SyncedParticle } from "./objects/synced_particle.ts";
import { gelo_instance_type, object_instance_type } from "common/scripts/others/constants.ts";

export type ServerObject=SimObject
export class ServerGELO extends BaseGELO{
    declare app:SimApplication
    declare scene:SimulationScene
    net:GELONet=GELONet.None
    net_dirty:boolean=true
}

export interface SimulationDefs{
    objects:Record<number|string,(...args:any[])=>ServerObject>
    gelo:Record<number|string,(...args:any[])=>ServerGELO>
}

function obj(component:GELComponent<any>){
    const merged=gel_component.merge_deep(component)
    return ()=>{
        const o=new SimObject()
        o.add_component(merged)
        return o
    }
}
function gelo(component:GELComponent<any>){
    const merged=gel_component.merge_deep(component)
    return ()=>{
        const g=new ServerGELO()
        g.add_component(merged)
        return g
    }
}

export const simulation_defs:SimulationDefs={
    objects:{
        [object_instance_type.human]:()=>new Human(),
        [object_instance_type.loot]:()=>new Loot(),
        [object_instance_type.obstacle]:obj(si_obstacle),
        [object_instance_type.bullet]:()=>new Bullet(),
        [object_instance_type.explosion]:()=>new Explosion(),
        [object_instance_type.grenade]:()=>new Grenade(),
        [object_instance_type.decal]:()=>new Decal(),
        [object_instance_type.synced_particle]:()=>new SyncedParticle(),
    },
    gelo:{
        [gelo_instance_type.map]:gelo(si_gamemap),
        [gelo_instance_type.deadzone]:gelo(si_deadzone),
    },
}

export class SimulationScene extends Scene2D<ServerObject,ServerGELO> implements SimulatedScene{
    declare app:SimApplication
    map!:SI_GameMap&ServerGELO
    mode!:ModeManager<any,any>
    deadzone?:SI_Deadzone&ServerGELO

    defs:SimulationDefs

    constructor(defs:SimulationDefs=simulation_defs){
        super()
        this.defs=defs
        this.gelo.make_gelo_net_cb=(tp)=>this.make_gelo(tp)
    }

    override make_object(type:number|string,...args:any[]):ServerObject|undefined{
        return this.defs.objects[type]?.(...args)
    }
    override make_gelo(type:number|string,...args:any[]):ServerGELO|undefined{
        return this.defs.gelo[type]?.(...args)
    }

    override update(dt:number):void{
        super.update(dt,false,false)
        this.mode?.tick(dt)
    }

    override make_checkpoint(stream:Stream,settings:CheckpointSettings={}){
        this.objects.encode_checkpoint(stream,{save_id:true,...settings})
        this.mode.encode_checkpoint(stream)
    }
    override load_checkpoint(stream:Stream){
        this.objects.proccess_checkpoint(stream)
        this.mode.decode_checkpoint(stream)
    }
}