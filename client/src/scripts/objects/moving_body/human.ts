import { c_human, SI_Human, si_human, type C_Human } from "common/scripts/game/objects/moving_body/human.ts"
import { cc_humanoid_visual,CC_Humanoid_Visual } from "./humanoid.ts"
import { cc_moving_body, type CC_MovingBody } from "./moving_body.ts"
import { gel_events, GELComponent, Numeric, v2 } from "common/engine/core.ts";
import { InputEventType } from "common/engine/web.ts";

export type CC_Human=CC_MovingBody&C_Human&CC_Humanoid_Visual&{
    distance_since_last_footstep:number
    physical:{
        movement_locked?:boolean
    }
    animation:{
        walk_animation?:number
    },
    tick_footsteps(on_ground:boolean,footstep_distance?:number):void
}

export const cc_human:GELComponent<CC_Human>={
    id_string:"cc_human",
    extensions:[c_human,cc_moving_body,cc_humanoid_visual],
    events:{
        [gel_events.tick](dt:number){

        }
    },
    methods:{
        /*tick_footsteps(on_ground:boolean,footstep_distance:number=2){
            const floor=(this.scene.map as CC_GameMap).terrain.get_floor_type(this.position,this.layer,(this.scene.map as CC_GameMap).default_floor)
            const f=this.scene.map.terrain.get_floor_type(this.position,this.layer)
            if(this.distance_walked>0.001&&on_ground){
                this.distance_since_last_footstep+=this.distance_walked
                // Play Footstep Sound And Do Water Riple
                if(this.distance_since_last_footstep>=footstep_distance){
                    this.distance_since_last_footstep=0
                    if(this.assets.footstep_sounds){
                        if(this.animation.footsteps)this.animation.footsteps.stop()
                        this.animation.footsteps=this.game.sounds.play(this.game.resources.get_sound(random.choose(this.assets.footstep_sounds)),{
                            position:this.position,
                            max_distance: 15,
                            volume:0.3,
                            bus:"humans",
                            on_complete:()=>{
                                this.animation.footsteps=undefined
                            }
                        })
                    }
                    if(Floors[f as FloorType].footstep_decal&&!this.downed){
                        const d=new ClientDecal()
                        d.sprite.frame=this.game.resources.get_frame("human_footstep")
                        d.sprite.rotation=walk_dir
                        d.lifetime=30

                        const pos=v2(0,(this.footstep_alternate?0.3:-0.3)*this.scale)
                        v2m.rotate_RadAngle(pos,this.rotation)
                        d.sprite.position=v2.add(this.position,pos)
                        this.scene.objects.add_object(d,this.layer)

                        this.footstep_alternate=!this.footstep_alternate
                    }
                    if(Floors[f as FloorType].floor_kind===FloorKind.Liquid){
                        this.scene.particles.add_particle(new ABParticle2D({
                            direction:0,
                            frame:{
                                image:"riple",
                                hotspot:v2.half_one,
                                zIndex:zIndexes.Decals,
                                layer:this.layer,
                                scale:0,
                            },
                            life_time:0.5,
                            position:this.position,
                            speed:0,
                            to:{
                                scale:3,
                                tint:ColorM.default.transparent
                            }
                        }))
                    }
                }
                this.animation.walk_speed=this.distance_walked
                if(this.animation.walk_cycle===0){
                    this.animation.walk_cycle=1
                    this.animation.walk_time=0
                }
            }else{
                if(this.animation.walk_cycle!==0){
                    this.animation.walk_cycle=0
                    this.animation.walk_time=0
                }
            }
        }*/
    }
}

export const ccs_human:GELComponent<CC_Human>={
    id_string:"ccs_human",
    extensions:[cc_human,si_human],
    events:{
        [gel_events.tick](dt){
            this.container.position=this.position
        }
    }
}

export const cc_active_human:GELComponent<CC_Human>={
    id_string:"cc_active_human",
    events:{
        [gel_events.tick](){
            //this.scene.camera.zoom=Numeric.lerp(this.scene.camera.zoom,this.scope_zoom,1/(1+dt*1300))
            this.scene.camera.position=v2.clone(this.position)
        }
    }
}