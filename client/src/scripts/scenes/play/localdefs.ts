import { gelo_instance_type, object_instance_type } from "common/scripts/others/constants.ts";
import { type PlaySceneDefs } from "./scene.ts";
import { ccs_deadzone } from "../../gelo/deadzone.ts";
import { ccs_loot } from "../../objects/loot.ts";
import { si_gamemap } from "common/scripts/game/gelo/map.ts";
import { ccs_obstacle } from "../../objects/static_body/obstacle.ts";
import { Debug_Colliders } from "../../main/config.ts";
import { c_draw_collider } from "../../components/draw.ts";
import { GameGELO, GameObject } from "../../main/gel.ts";
import { gel_component, GELComponent } from "common/engine/core.ts";
import { cc_gamemap } from "../../gelo/map.ts";
import { ccs_human } from "../../objects/moving_body/human.ts";
import { get_game_mode } from "common/scripts/game/modes/modes.ts";

/**
 * Modo local (self): os objetos tem visual (cc_) + simulacao (si_) = ccs_.
 * A simulacao inteira roda no cliente, sem servidor e sem worker.
 */
const map=gel_component.merge_deep(cc_gamemap,si_gamemap)
const deadzone=gel_component.merge_deep(ccs_deadzone)

const loot=gel_component.merge_deep(ccs_loot)
const obstacle=gel_component.merge_deep(ccs_obstacle)
const human=gel_component.merge_deep(ccs_human)

function obj(component:GELComponent<any>){
    return ()=>{
        const o=new GameObject()
        o.add_component(component)
        if(Debug_Colliders)o.add_component(c_draw_collider)
        return o
    }
}
function gelo(component:GELComponent<any>){
    return ()=>{
        const v=new GameGELO()
        v.add_component(component)
        return v
    }
}

export const local_scene_defs:PlaySceneDefs={
    gelo:{
        [gelo_instance_type.map]:gelo(map),
        [gelo_instance_type.deadzone]:gelo(deadzone),
        [gelo_instance_type.mode]:(name?:string)=>{
            const v=new GameGELO()
            v.add_component(gel_component.merge_deep(get_game_mode(name)))
            return v
        },
    },
    objects:{
        [object_instance_type.loot]:obj(loot),
        [object_instance_type.obstacle]:obj(obstacle),
        [object_instance_type.human]:obj(human),
    }
}
