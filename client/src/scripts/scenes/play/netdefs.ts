import { gel_component, GELComponent } from "common/engine/core.ts";
import { gelo_instance_type, object_instance_type } from "common/scripts/others/constants.ts";
import { c_draw_collider } from "../../components/draw.ts";
import { ccn_deadzone } from "../../gelo/deadzone.ts";
import { ccn_gamemap } from "../../gelo/map.ts";
import { Debug_Colliders } from "../../main/config.ts";
import { GameGELO, GameObject } from "../../main/gel.ts";
import { Loot } from "../../objects/loot.ts";
import { Human } from "../../objects/human.ts";
import { ccn_obstacle } from "../../objects/static_body/obstacle.ts";
import { Bullet } from "../../objects/projectile/bullet.ts";
import { Explosion } from "../../objects/projectile/explosion.ts";
import { Grenade } from "../../objects/projectile/grenade.ts";
import { type PlaySceneDefs } from "./scene.ts";

function obj(component:GELComponent<any>){
    const merged=gel_component.merge_deep(component)
    return ()=>{
        const o=new GameObject()
        o.add_component(merged)
        if(Debug_Colliders)o.add_component(c_draw_collider)
        return o
    }
}
function gelo(component:GELComponent<any>){
    const merged=gel_component.merge_deep(component)
    return ()=>{
        const v=new GameGELO()
        v.add_component(merged)
        return v
    }
}

export const net_scene_defs:PlaySceneDefs={
    gelo:{
        [gelo_instance_type.map]:gelo(ccn_gamemap),
        [gelo_instance_type.deadzone]:gelo(ccn_deadzone),
    },
    objects:{
        [object_instance_type.loot]:()=>new Loot(),
        [object_instance_type.obstacle]:obj(ccn_obstacle),
        [object_instance_type.human]:()=>new Human(),
        [object_instance_type.bullet]:()=>new Bullet(),
        [object_instance_type.explosion]:()=>new Explosion(),
        [object_instance_type.grenade]:()=>new Grenade(),
    }
}
