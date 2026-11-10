import { gelo_instance_type, object_instance_type } from "common/scripts/others/constants.ts";
import { type PlaySceneDefs } from "./scene.ts";
import { ccs_deadzone } from "../../gelo/deadzone.ts";
import { ccs_loot } from "../../objects/loot.ts";
import { si_gamemap } from "common/scripts/game/gelo/map.ts";
import { ccs_obstacle } from "../../objects/static_body/obstacle.ts";
import { Debug_Colliders } from "../../main/config.ts";
import { c_draw_collider } from "../../components/draw.ts";
import { GameGELO, GameObject } from "../../main/gel.ts";
import { gel_component } from "common/engine/core.ts";
import { cc_gamemap } from "../../gelo/map.ts";
import { ccs_human } from "../../objects/moving_body/human.ts";

const map=gel_component.merge_deep(cc_gamemap,si_gamemap)
const deadzone=gel_component.merge_deep(ccs_deadzone)

const loot=gel_component.merge_deep(ccs_loot)
//const wall=gel_component.merge_deep(cc_loot_s)
const obstacle=gel_component.merge_deep(ccs_obstacle)
const human=gel_component.merge_deep(ccs_human)

export const local_scene_defs:PlaySceneDefs={
    gelo:{
        [gelo_instance_type.map]:()=>{
            const v=new GameGELO()
            v.add_component(map)
            return v
        },
        [gelo_instance_type.deadzone]:()=>{
            const v=new GameGELO()
            v.add_component(deadzone)
            return v
        }
    },
    objects:{
        [object_instance_type.loot]:()=>{
            const o=new GameObject()
            o.add_component(loot)
            if(Debug_Colliders)o.add_component(c_draw_collider)
            return o
        },
        /*[object_instance_type.wall]:()=>{
            const o=new Walls()
            o.add_component(si_static_body)
            if(Debug_Colliders)o.add_component(c_draw_collider)
            return o
        },*/
        [object_instance_type.obstacle]:()=>{
            const o=new GameObject()
            o.add_component(obstacle)
            if(Debug_Colliders)o.add_component(c_draw_collider)
            return o
        },
        [object_instance_type.human]:()=>{
            const o=new GameObject()
            o.add_component(human)
            if(Debug_Colliders)o.add_component(c_draw_collider)
            return o
        }
    }
}