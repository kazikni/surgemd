/*import { c_walls, C_Walls } from "common/scripts/game/objects/static_body/walls.ts"
import { Angle, ColorM, gel_events, Orientation, Vec2 } from "common/engine/core.ts"
import { WallShape2D } from "common/engine/web.ts"
import { StaticBody } from "./static_body.ts"
import { HitParticlesDef, HitSoundsDef } from "common/scripts/definitions/utils.ts"
import { zIndexes } from "common/scripts/others/constants.ts";
import { WallsDef } from "common/scripts/definitions/objects/walls.ts";

export class Walls extends StaticBody implements C_Walls{
    side!: number

    walls:WallShape2D

    constructor(){
        super()
        this.walls=new WallShape2D()

        this.add_component(c_walls,false)

        this.son(gel_events.create,"on_create")
        this.son(gel_events.destroy,"on_destroy")
        this.son(gel_events.layer_set,"on_layer_set")
    }
    on_create(){
        this.scene.camera.add_object(this.walls)
    }
    on_destroy(){
        this.walls.destroy()
    }
    on_layer_set(){
        this.walls.layer=this.layer
    }

    set_def!:(def:WallsDef)=>void
    set_walls(pos:Vec2[][],width:number,stroke_width:number,tint:number,hit_sounds?:HitSoundsDef,hit_particles?:HitParticlesDef){
        c_walls.methods!["set_walls"].call(this,pos,width)

        this.walls.position=this.position
        this.walls.rotation=Angle.side2rad((this.side??0) as Orientation)
        this.walls.fill_color=ColorM.number(tint)
        this.walls.stroke_color=ColorM.mult_hsv(this.walls.fill_color,1.05,undefined,0.55)
        this.walls.zIndex=zIndexes.BuildingsWalls1
        this.walls.set_wall(pos,width,stroke_width)

        if(hit_sounds)this.set_hit_sounds_def(hit_sounds)
        if(hit_particles)this.set_hit_particles_def("wall",0,hit_particles)
    }
}*/