import { c_deadzone, si_deadzone, C_Deadzone, SI_Deadzone, DeadzoneState } from "common/scripts/game/gelo/deadzone.ts";
import { CircleCollider2D, Color, ColorM, ease, gel_events, GELComponent, model2d, Numeric, v2, Vec2 } from "common/engine/core.ts";
import { Graphics2D, Sound, SoundController } from "common/engine/web.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { GameGELO } from "../main/gel.ts";

export type CC_Deadzone = GameGELO & C_Deadzone & {
    collider: CircleCollider2D
    state: DeadzoneState
    position: Vec2
    radius: number
    new_position: Vec2
    new_radius: number
    timer: number
    aspect: number

    sprite: Graphics2D
    color: Color

    ambience_controller: SoundController
    ambience_sound: Sound
    ambience_sound_offset: number

    v_old_radius?: number
    v_old_position?: Vec2
    v_old_state?: DeadzoneState
}

export const cc_deadzone: GELComponent<CC_Deadzone> = {
    id_string: "cc_deadzone",
    extensions: [c_deadzone],

    events: {
        [gel_events.bind]: function () {
            this.sprite = new Graphics2D()
            this.sprite.zIndex = zIndexes.Deadzone

            this.color = ColorM.hex("#21f2")
        },

        [gel_events.registry]: function () {
            this.sprite.initialize(this.scene.camera.ctx)
            this.scene.camera.add_object(this.sprite)

            this.ambience_controller = this.app.sounds.create_controller("ambience")
            this.ambience_sound = this.app.resources.get_sound("deadzone_ambience")

            this.set_current(DeadzoneState.Deenabled, v2(0, 0), 10)
        },

        [gel_events.unregistry]: function () {
            this.sprite.destroy()
            this.ambience_controller.destroyed = true
        },

        [gel_events.tick]: function (_dt: number) {
            this.sprite.position = this.position

            const position = this.sprite.position

            if (
                this.v_old_state !== this.state ||
                !this.v_old_position ||
                this.v_old_position.x !== position.x ||
                this.v_old_position.y !== position.y ||
                this.v_old_radius !== this.radius
            ) {
                this.v_old_state = this.state
                this.v_old_position = v2.clone(position)
                this.v_old_radius = this.radius

                if (this.state === DeadzoneState.Deenabled) {
                    this.sprite.visible = false
                } else {
                    this.sprite.visible = true

                    const rm = ease.quadraticIn(
                        Numeric.clamp(
                            1 - ((this.radius * 1.4) / (this.aspect * 100)),
                            0,
                            1
                        )
                    )

                    const color = ColorM.lerp(
                        ColorM.hex("#00a2ff"),
                        ColorM.hex("#ff0055"),
                        rm
                    )

                    const model = model2d.outlineCircle(
                        this.radius,
                        100000,
                        200
                    )

                    const col = ColorM.clone(color)
                    col.a = 76 + 102 * rm
                    this.color = col

                    this.sprite.ctx.clear()
                    this.sprite.ctx.fill_color = col
                    this.sprite.ctx.fill_model(model)

                    if (this.radius > 0) {
                        const model2 = model2d.outlineCircle(
                            this.radius,
                            0.2,
                            200
                        )

                        this.sprite.ctx.fill_color = col
                        this.sprite.ctx.fill_model(model2)
                    }
                }
            }
        },
    },
}
export const ccn_deadzone:GELComponent<CC_Deadzone>={
    id_string:"ccn_deadzone",
    events:{
        [gel_events.tick]:function(_dt){
            this.sprite.position=this.position
        },
    },
    extensions:[cc_deadzone]
}
export const ccs_deadzone:GELComponent<SI_Deadzone&CC_Deadzone>={
    id_string:"ccs_deadzone",
    events:{
        [gel_events.registry]:function(_dt){
        },
        [gel_events.tick]:function(_dt){
            this.sprite.position=this.position
        },
    },
    extensions:[cc_deadzone,si_deadzone]
}