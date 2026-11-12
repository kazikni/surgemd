import { ColliderGroup2D, gel_events, GELComponent, Vec2 } from "../../../../engine/core.ts";
import { WallsDef } from "../../../definitions/objects/walls.ts";
import { HitParticlesDef, HitSoundsDef } from "../../../definitions/utils.ts";
import { object_instance_type } from "../../../others/constants.ts";
import { SI_StaticBody, type C_StaticBody } from "./static_body.ts";

export interface C_Walls extends C_StaticBody{
    side:number
    set_def(def:WallsDef):void
    set_walls(pos:Vec2[][],width:number,stroke_width:number,tint:number,hit_sounds?:HitSoundsDef,hit_particles?:HitParticlesDef):void
}
export type Walls_SI=C_Walls&SI_StaticBody&{}

export const c_walls:GELComponent<C_Walls>={
    events:{
        [gel_events.bind]:function(){
            this.instance_type=object_instance_type.wall
            this.side=0
        }
    },
    methods:{
        set_def(def:WallsDef){
            this.set_walls(def.positions,def.width??0.4,def.stroke_width??0.15,def.tint??0,def.assets?.sounds??{},def.assets?.particles??{})
        },
        set_walls(pos:Vec2[][],width=0.3){
            const hitbox=new ColliderGroup2D(...ColliderGroup2D.walls(pos,width))
            this.physical.collider=hitbox
            this.base_collider=hitbox.transform(undefined,undefined,undefined,this.side)

            this.physical.no_collision=false
            this.physical.no_projectiles_collision=false
        },
    }
}