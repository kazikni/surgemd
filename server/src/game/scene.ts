import { BaseGELO, BaseSceneObject2D, CheckpointSettings, gel_component, GELComponent, Scene2D, Stream } from "common/engine/core.ts";
import { type CommonApplication, type SimulatedScene } from "common/scripts/game/base.ts";
import { si_deadzone, type SI_Deadzone } from "common/scripts/game/gelo/deadzone.ts";
import { si_gamemap, type SI_GameMap } from "common/scripts/game/gelo/map.ts";
import { type SI_Mode } from "common/scripts/game/gelo/mode.ts";
import { get_game_mode } from "common/scripts/game/modes/modes.ts";
import { si_loot } from "common/scripts/game/objects/loot.ts";
import { si_human } from "common/scripts/game/objects/moving_body/human.ts";
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

/**
 * Objetos da simulacao "pura" (servidor e worker): so componentes si_ (simulacao + net_encode).
 * Para adicionar um objeto novo no servidor, registre ele aqui.
 */
export const simulation_defs:SimulationDefs={
    objects:{
        [object_instance_type.human]:obj(si_human),
        [object_instance_type.loot]:obj(si_loot),
        [object_instance_type.obstacle]:obj(si_obstacle),
    },
    gelo:{
        [gelo_instance_type.map]:gelo(si_gamemap),
        [gelo_instance_type.deadzone]:gelo(si_deadzone),
        // O modo e escolhido pelo nome (config.mode), ver common/scripts/game/modes/modes.ts
        [gelo_instance_type.mode]:(name?:string)=>{
            const g=new ServerGELO()
            g.add_component(gel_component.merge_deep(get_game_mode(name)))
            return g
        },
    },
}

/**
 * Cena de simulacao usada pelo servidor e pelo worker.
 * Nao tem nada de render: so objetos, gelos, mapa, deadzone e modo.
 */
export class SimulationScene extends Scene2D<ServerObject,ServerGELO> implements SimulatedScene{
    declare app:CommonApplication
    map!:SI_GameMap&ServerGELO
    mode!:SI_Mode&ServerGELO
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

    /**
     * A simulacao nao limpa os dirty a cada tick: isso so acontece no net tick (Game.net_tick),
     * depois que os pacotes foram mandados.
     */
    override update(dt:number):void{
        super.update(dt,false,false)
    }

    /** Salva objetos (com ids) + dados do modo (times, vidas, dinheiro...) */
    override make_checkpoint(stream:Stream,settings:CheckpointSettings={}){
        this.objects.encode_checkpoint(stream,{save_id:true,...settings})
        this.mode.encode_mode_checkpoint(stream)
    }
    override load_checkpoint(stream:Stream){
        this.objects.proccess_checkpoint(stream)
        this.mode.decode_mode_checkpoint(stream)
    }
}
