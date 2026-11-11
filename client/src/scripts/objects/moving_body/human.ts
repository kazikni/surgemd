import { c_human, human_events, SI_Human, si_human, type C_Human } from "common/scripts/game/objects/moving_body/human.ts"
import { cc_humanoid_visual,CC_Humanoid_Visual } from "./humanoid.ts"
import { cc_moving_body, type CC_MovingBody } from "./moving_body.ts"
import { gel_events, GELComponent, Numeric, Stream, v2, v2m } from "common/engine/core.ts";
import { humanoid_events } from "common/scripts/game/objects/moving_body/humanoid.ts";
import { DefaultFistRig } from "common/scripts/others/item.ts";
import { FloorType } from "common/scripts/others/terrain.ts";

export type CC_Human=CC_MovingBody&C_Human&CC_Humanoid_Visual&{
    physical:{
        movement_locked?:boolean
    }
    update_pose():void
    tick_visual(dt:number):void
}

export const cc_human:GELComponent<CC_Human>={
    id_string:"cc_human",
    extensions:[c_human,cc_moving_body,cc_humanoid_visual],
    events:{
        [gel_events.bind](){
            this.allow_tick=true
        },
        [gel_events.create](){
            this.set_arms_rig(DefaultFistRig)
            this.update_visual()
        },
        [human_events.state_changed](){
            this.update_pose()
        },
    },
    methods:{
        update_pose(){
            const downed=this.downed||this.swimming
            if(downed!==this.downed_pose)this.set_downed_pose(downed)
            this.container.visible=!this.dead
        },
        tick_visual(dt:number){
            const pos=this.container.position
            const last=this.walk.last_position
            const distance=last?v2.distance(last,pos):0
            this.walk.last_position=v2.clone(pos)
            this.tick_walk(dt,distance)
            if(this.dead)return
            const map=this.scene.map
            const floor=map?map.terrain.get_floor_type(pos,this.layer,map.default_floor) as FloorType:FloorType.Void
            this.tick_footsteps(distance,floor,!this.swimming)
        },
    }
}

export const ccs_human:GELComponent<CC_Human&SI_Human>={
    id_string:"ccs_human",
    extensions:[cc_human,si_human],
    events:{
        [gel_events.tick](dt:number){
            this.container.position=v2.clone(this.position)
            this.container.rotation=this.rotation
            this.tick_visual(dt)
        }
    }
}

export type CCN_Human=CC_Human&{
    _net_first:boolean
}
export const ccn_human:GELComponent<CCN_Human>={
    id_string:"ccn_human",
    extensions:[cc_human],
    events:{
        [gel_events.bind](){
            this._net_first=true
        },
        [gel_events.net_decode](stream:Stream,full:boolean){
            const changed=this.decode_human_net(stream,full)
            if(changed.visual)this.emit_event(humanoid_events.visual_changed)
            if(changed.state||this._net_first)this.emit_event(human_events.state_changed)
            if(full||this._net_first||!this.app.save.settings.get_var("game_interpolation")){
                this.container.position=v2.clone(this.position)
                this.container.rotation=this.rotation
            }
            this._net_first=false
        },
        [gel_events.tick](dt:number){
            if(this.app.save.settings.get_var("game_interpolation")){
                const t=Numeric.clamp(dt*20,0,1)
                v2m.lerp(this.container.position,this.position,t)
                this.container.rotation=Numeric.lerp_rad(this.container.rotation,this.rotation,t)
            }else{
                this.container.position=v2.clone(this.position)
                this.container.rotation=this.rotation
            }
            this.tick_visual(dt)
        },
    }
}
