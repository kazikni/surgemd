import { gel_component, GELComponent } from "common/engine/core.ts";
import { gelo_instance_type, object_instance_type } from "common/scripts/others/constants.ts";
import { ccn_deadzone } from "../../gelo/deadzone.ts";
import { GameGELO } from "../../main/gel.ts";
import { Loot } from "../../objects/loot.ts";
import { Human } from "../../objects/human/human.ts";
import { Bullet } from "../../objects/projectile/bullet.ts";
import { Explosion } from "../../objects/projectile/explosion.ts";
import { Grenade } from "../../objects/projectile/grenade.ts";
import { Decal } from "../../objects/decal.ts";
import { SyncedParticle } from "../../objects/synced_particle.ts";
import { type PlaySceneDefs } from "./scene.ts";
import { cc_gamemap } from "../../gelo/map.ts";
import { DamageSplash } from "../../objects/damage_splash.ts";
import { Plane } from "../../objects/air/plane.ts";
import { Parachute } from "../../objects/parachute.ts";
import { Obstacle } from "../../objects/static_body/obstacle.ts";

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
        [gelo_instance_type.map]:gelo(cc_gamemap),
        [gelo_instance_type.deadzone]:gelo(ccn_deadzone),
    },
    objects:{
        [object_instance_type.loot]:()=>new Loot(),
        [object_instance_type.obstacle]:()=>new Obstacle(),
        [object_instance_type.human]:()=>new Human(),
        [object_instance_type.bullet]:()=>new Bullet(),
        [object_instance_type.explosion]:()=>new Explosion(),
        [object_instance_type.grenade]:()=>new Grenade(),
        [object_instance_type.decal]:()=>new Decal(),
        [object_instance_type.damage_splash]:()=>new DamageSplash(),
        [object_instance_type.synced_particle]:()=>new SyncedParticle(),
        [object_instance_type.plane]:()=>new Plane(),
        [object_instance_type.parachute]:()=>new Parachute(),
    }
}
