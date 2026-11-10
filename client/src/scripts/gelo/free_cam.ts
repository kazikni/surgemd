import { gel_events, Numeric, v2, v2m, Vec2, GELComponent } from "common/engine/core.ts";
import { InputEvent, InputEventType } from "common/engine/web.ts";
import { GameGELO } from "../main/gel.ts";

export type CC_FreeCam = GameGELO & {
    _input_f: any
    _move_dir: Vec2

    _dest_pos: Vec2
    _dest_zoom: number

    speed: number
    zoom_speed: number
}

export const cc_freecam: GELComponent<CC_FreeCam> = {
    id_string: "cc_freecam",
    events: {
        [gel_events.bind]: function(){
            this._move_dir = v2.zero()
            this._dest_pos = v2.zero()
            this._dest_zoom = 1

            this.speed = 5
            this.zoom_speed = 0.06
        },
        [gel_events.registry]: function () {
            this._input_f = this.app.input.listener.on("input_event", (e: InputEvent) => {
                switch (e.type) {
                    case InputEventType.Axis: {
                        this._move_dir = v2.normalizeSafe(e.value, v2.zero)
                        break
                    }
                    case InputEventType.ActionDown:{
                        switch(e.action){
                            case "previous_scope":
                                this._dest_zoom*=1+this.zoom_speed
                                break
                            case "next_scope":
                                this._dest_zoom*=1-this.zoom_speed
                                break
                        }
                        break
                    }
                }
            })
        },
        [gel_events.unregistry]: function () {
            this.app.input.listener.off("input_event", this._input_f)
        },
        [gel_events.tick]: function (dt: number) {
            this.scene.camera.zoom = Numeric.lerp(this.scene.camera.zoom,this._dest_zoom,1 / (1 + dt * 1300))

            v2m.add(this._dest_pos,this._dest_pos,v2.scale(this._move_dir,dt * this.speed / this.scene.camera.zoom))
            v2m.lerp(this.scene.camera.position,this._dest_pos,1 / (1 + dt * 1300))
        },
    },
}