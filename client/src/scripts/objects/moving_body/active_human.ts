import { gel_events, GELComponent, Numeric, v2 } from "common/engine/core.ts";
import { InputEvent, InputEventType } from "common/engine/web.ts";
import { type SI_Human } from "common/scripts/game/objects/human/human.ts";
import { InputAction, InputActionType, InputPacket, type InputData } from "common/scripts/net/input_packet.ts";
import { type CC_Human } from "./human.ts";

export type CC_ActiveHuman=CC_Human&{
    active:{
        zoom:number
        input_listener?:(e:InputEvent)=>void
    }
    read_input():InputData
    release_active():void
}

export const cc_active_human:GELComponent<CC_ActiveHuman>={
    id_string:"cc_active_human",
    events:{
        [gel_events.bind](){
            this.active={
                zoom:1,
            }
        },
        [gel_events.create](){
            if(this.active.input_listener)return
            this.active.input_listener=(_e:InputEvent)=>{
            }
            this.app.input.listener.on(InputEventType.ActionDown,this.active.input_listener)
            this.scene.camera.position=v2.clone(this.position)
        },
        [gel_events.tick](dt:number){
            const cam=this.scene.camera
            const t=Numeric.clamp(dt*12,0,1)
            cam.position=this.container?this.container.position:this.position
            cam.zoom=Numeric.lerp(cam.zoom,this.active.zoom,t)
        },
        [gel_events.destroy](){
            this.release_active()
        },
    },
    methods:{
        read_input():InputData{
            const input=this.app.input
            const actions:InputAction[]=[]

            if(input.adown.has("weapon1")){
                actions.push({type:InputActionType.set_hand,hand:0})
            }
            if(input.adown.has("weapon2")){
                actions.push({type:InputActionType.set_hand,hand:1})
            }
            if(input.adown.has("weapon3")){
                actions.push({type:InputActionType.set_hand,hand:2})
            }

            const axis=input.axis["movement"]?.old??v2.zero()
            const len=Numeric.clamp(v2.len(axis),0,1)

            const canvas_rect=this.app.renderer.canvas.getBoundingClientRect()
            const cam_s=v2(canvas_rect.width/2,canvas_rect.height/2)

            return {
                actions,
                movement:{
                    dir:len>0?Math.atan2(axis.y,axis.x):0,
                    scale:len,
                },
                rotation:v2.lookTo(cam_s,input.real_mouse_position),
                distance_to_aim:Numeric.clamp(v2.distance(cam_s,input.real_mouse_position)/Math.min(cam_s.x,cam_s.y),0,1),
                use_weapon:input.active_actions.has("fire"),
                alt_use_weapon:input.active_actions.has("alt_fire"),
                interact:input.adown.has("interact"),
                reload:input.adown.has("reload"),
                cancel:input.adown.has("cancel"),
                swap_guns:input.adown.has("swap_guns"),
                auto_fire:false,
            }
        },
        release_active(){
            if(this.active?.input_listener){
                this.app.input.listener.off(InputEventType.ActionDown,this.active.input_listener)
                this.active.input_listener=undefined
            }
        },
    }
}

export const ccs_active_human:GELComponent<CC_ActiveHuman&SI_Human>={
    id_string:"ccs_active_human",
    extensions:[cc_active_human],
    events:{
        [gel_events.tick](){
            if(this.dead)return
            this.process_input(this.read_input())
        },
    },
}

export type CCN_ActiveHuman=CC_ActiveHuman&{
    scene:{client?:{emit_packet(p:InputPacket):void}}
}
export const ccn_active_human:GELComponent<CCN_ActiveHuman>={
    id_string:"ccn_active_human",
    extensions:[cc_active_human],
    events:{
        [gel_events.tick](){
            if(this.dead)return
            const input=this.read_input()
            this._rotation_set=!this.app.save.settings.get_var("game_client_rot")
            if(!this._rotation_set){
                this.rotation=input.rotation
                this.container.rotation=input.rotation
            }
            this.scene.client?.emit_packet(new InputPacket(input))
        },
    },
}
