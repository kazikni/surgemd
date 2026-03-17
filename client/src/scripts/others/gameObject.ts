import { ClientGameObject2D, type Sound, type SoundInstance, type SoundOptions } from "common/engine/client.ts";
import { type Game } from "./game.ts";
import { type Human } from "../objects/human.ts";

export abstract class GameObject extends ClientGameObject2D{
    declare game:Game
    can_interact(human:Human):boolean{return false}
    interact(human:Human):void{}
    get_interact_hint(human:Human): string{return ""}
    auto_interact(human:Human):boolean{return false}

    play_sound(sound: Sound, params: SoundOptions = {},audio_group:string="players"): SoundInstance | undefined {
        if (!sound||!this.game.play_sounds) return

        const {
            position = this.position,
            volume = 1,
            max_distance = 60,
            rolloffFactor = 0.5,
            delay,
            on_complete,
        } = params

        return this.game.sounds.play(
            sound,
            {
                position,
                volume,
                max_distance,
                rolloffFactor,
                delay,
                on_complete,
            },
            audio_group
        )
    }
}