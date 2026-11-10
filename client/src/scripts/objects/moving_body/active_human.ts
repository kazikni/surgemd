import { gel_events, GELComponent, Numeric, v2 } from "common/engine/core.ts";
import { InputEvent, InputEventType } from "common/engine/web.ts";
import { type SI_Human } from "common/scripts/game/objects/moving_body/human.ts";
import { EmptyInputData, InputActionType, InputPacket, type InputData } from "common/scripts/net/input_packet.ts";
import { type CC_Human } from "./human.ts";

/**
 * Humano ativo = o humano que o cliente controla.
 *
 * - cc_active_human: marca o humano como ativo (camera segue, le o input do teclado/mouse/controle).
 * - ccs_active_human: modo local. Aplica o input direto no humano (que tem si_human).
 * - ccn_active_human: modos online/worker. Manda o input pelo InputPacket para o servidor.
 *
 * Exemplo (modo local):
 *   human.add_component(cc_active_human)
 *   human.add_component(ccs_active_human)
 */
export type CC_ActiveHuman=CC_Human&{
    active:{
        zoom:number
        /** Acoes de um clique (interact, reload...) acumuladas ate o proximo envio */
        pending:InputData
        input_listener?:(e:InputEvent)=>void
    }
    /** Le o input atual do app e monta um InputData */
    read_input():InputData
    release_active():void
}

const one_shot_actions:Record<string,(d:InputData)=>void>={
    interact:(d)=>{d.interact=true},
    reload:(d)=>{d.reload=true},
    swap_guns:(d)=>{d.swap_guns=true},
    cancel:(d)=>{d.cancel=true},
    weapon1:(d)=>{d.actions.push({type:InputActionType.set_hand,hand:0})},
    weapon2:(d)=>{d.actions.push({type:InputActionType.set_hand,hand:1})},
    weapon3:(d)=>{d.actions.push({type:InputActionType.set_hand,hand:2})},
}

export const cc_active_human:GELComponent<CC_ActiveHuman>={
    id_string:"cc_active_human",
    events:{
        [gel_events.bind](){
            this.active={
                zoom:1,
                pending:EmptyInputData(),
            }
        },
        // O cc_active_human e adicionado num humano que ja esta na cena (add_component chama o create na hora)
        [gel_events.create](){
            if(this.active.input_listener)return
            this.active.input_listener=(e:InputEvent)=>{
                if(e.type!==InputEventType.ActionDown)return
                one_shot_actions[e.action]?.(this.active.pending)
            }
            this.app.input.listener.on(InputEventType.ActionDown,this.active.input_listener)
            this.scene.camera.position=v2.clone(this.position)
        },
        [gel_events.tick](dt:number){
            const cam=this.scene.camera
            const t=Numeric.clamp(dt*12,0,1)
            const target=this.container?this.container.position:this.position
            cam.position=v2.lerp(cam.position,target,t)
            cam.zoom=Numeric.lerp(cam.zoom,this.active.zoom,t)
        },
        [gel_events.destroy](){
            this.release_active()
        },
    },
    methods:{
        read_input():InputData{
            const input=this.app.input
            const pending=this.active.pending
            this.active.pending=EmptyInputData()

            const axis=input.axis["movement"]?.old??v2.zero()
            const len=Numeric.clamp(v2.len(axis),0,1)

            const mouse=this.scene.camera.to_world_camera(input.mouse_position)
            const origin=this.container?this.container.position:this.position
            const aim_dist=v2.distance(origin,mouse)

            return {
                ...pending,
                movement:{
                    dir:len>0?Math.atan2(axis.y,axis.x):0,
                    scale:len,
                },
                rotation:v2.lookTo(origin,mouse),
                distance_to_aim:Numeric.clamp(aim_dist/Math.max(this.scene.camera.width*0.5,0.001),0,1),
                use_weapon:input.active_actions.has("fire"),
                alt_use_weapon:input.active_actions.has("alt_fire"),
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

/**
 * Modo local: o input vai direto para a simulacao do humano.
 */
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

/**
 * Modo online/worker: o input e mandado para o servidor (o NetPlayerConn aplica no humano de la).
 */
export type CCN_ActiveHuman=CC_ActiveHuman&{
    scene:{client?:{emit_packet(p:InputPacket):void}}
}
export const ccn_active_human:GELComponent<CCN_ActiveHuman>={
    id_string:"ccn_active_human",
    extensions:[cc_active_human],
    events:{
        [gel_events.tick](){
            if(this.dead)return
            this.scene.client?.emit_packet(new InputPacket(this.read_input()))
        },
    },
}
