import { GameObjectType } from "common/scripts/others/constants.ts"
import { Stream, v2 } from "common/engine/core.ts";
import { AirBody } from "./airbody.ts";
import { type Sprite2D } from "common/engine/web.ts";

export class Plane extends AirBody {
    override number_type: number=GameObjectType.Plane;
    override string_type: string="plane";

    plane_type:number=0
    declare shadow:Sprite2D

    constructor() {
        super()
    }
    override on_initial(): void {
        switch (this.plane_type) {
            case 0:
                this.shadow.set_frame({
                    image: "airdrop_plane",
                    scale: 20,
                    hotspot: v2.half_one
                },this.game.resources)
                this.sound = this.game.sounds.play(this.game.resources.get_sound("airdrop_plane_sfx"),{
                    max_distance: 200,
                    position: this.position,
                    loop: true,
                    volume: 0.7
                })
                break
            case 1:
                this.shadow.set_frame({
                    image: "airstrike_plane",
                    scale: 8,
                    hotspot: v2.half_one
                }, this.game.resources)
                this.sound = this.game.sounds.play(this.game.resources.get_sound("airstrike_plane_sfx"),{
                    max_distance: 400,
                    position: this.position,
                    loop: false,
                    volume: 0.7
                })
                break
        }
    }
    override on_decode_net(stream:Stream,full:boolean): void {
        if(full)this.plane_type=stream.read_uint8()
        super.on_decode_net(stream,full)
    }
}