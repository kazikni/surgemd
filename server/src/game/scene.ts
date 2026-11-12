import { BaseGELO, BaseSceneObject2D, CheckpointSettings, gel_component, GELComponent, Scene2D, Stream } from "common/engine/core.ts";
import { type CommonApplication, type SimulatedScene } from "common/scripts/game/base.ts";
import { si_deadzone, type SI_Deadzone } from "common/scripts/game/gelo/deadzone.ts";
import { si_gamemap, type SI_GameMap } from "common/scripts/game/gelo/map.ts";
import { type ModeManager } from "common/scripts/game/modes/mode_manager.ts";
import { si_loot } from "common/scripts/game/objects/loot.ts";
import { si_human } from "common/scripts/game/objects/human/human.ts";
import { si_obstacle } from "common/scripts/game/objects/static_body/obstacle.ts";
import { gelo_instance_type, object_instance_type } from "common/scripts/others/constants.ts";

export class ServerObject extends BaseSceneObject2D{
    declare app:CommonApplication
    declare scene:SimulationScene
}
export class ServerGELO extends BaseGELO{
    declare app:CommonApplication
    declare scene:SimulationScene
}

export interface SimulationDefs{
    objects:Record<number|string,(...args:any[])=>ServerObject>
    gelo:Record<number|string,(...args:any[])=>ServerGELO>
}

function obj(component:GELComponent<any>){
    const merged=gel_component.merge_deep(component)
    return ()=>{
        const o=new ServerObject()
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
        [object_instance_type.human]:obj(si_human),
        [object_instance_type.loot]:obj(si_loot),
        [object_instance_type.obstacle]:obj(si_obstacle),
    },
    gelo:{
        [gelo_instance_type.map]:gelo(si_gamemap),
        [gelo_instance_type.deadzone]:gelo(si_deadzone),
    },
}

export class SimulationScene extends Scene2D<ServerObject,ServerGELO> implements SimulatedScene{
    declare app:CommonApplication
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