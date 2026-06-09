import { GameObjectType, Layers, zIndexes } from "common/scripts/others/constants.ts"
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts";
import { AudioVoice, Container2D, NetStream, Sprite2D, v2 } from "common/engine/client.ts";

export interface PlanePhysicalData extends MovingBodyPhysicalData {}

export class Plane extends MovingBody {
    override number_type: number=GameObjectType.Plane;
    override string_type: string="plane";
    container: Container2D = new Container2D()
    sprite: Sprite2D = new Sprite2D()
    sound?: AudioVoice
    override physical_data: PlanePhysicalData = {
        rotation: 0
    }
    initial = true

    plane_type:number=0

    constructor() {
        super()
    }

    override on_create(args: Record<string, any>): void {
        this.container.add_child(this.sprite)
        this.game.cam2d.addObject(this.container)
        this.container.zIndex = zIndexes.Planes
        this.position = this.container.position
    }
    override on_layer_set(){
        this.container.layer = this.layer
    }
    override on_tick(dt: number) {
        super.on_tick(dt)
        this.container.position=this.position
        this.container.rotation = this.physical_data.rotation
        if (this.sound) {
            this.sound.position = this.position
        }
    }
    override on_destroy() {
        this.container.destroy()
        this.sprite.destroy()
        this.destroyed = true
        this.sound?.stop()
    }
    override on_decode(stream: NetStream, full: boolean): void {
        this.decode_physical_data(stream, full)
        const type = stream.readUint8()
        if (this.initial) {
            this.plane_type = type
            switch (this.plane_type) {
                case 0:
                    this.sprite.set_frame(
                        {
                            image: "airdrop_plane",
                            scale: 20,
                            hotspot: v2.half_one
                        },
                        this.game.resources
                    )
                    this.sound = this.game.sounds.play(
                        this.game.resources.get_sound("airdrop_plane_sfx"),
                        {
                            max_distance: 40,
                            position: this.position,
                            loop: true,
                            volume: 0.7
                        }
                    )
                    break
                case 1:
                    this.sprite.set_frame(
                        {
                            image: "airstrike_plane",
                            scale: 8,
                            hotspot: v2.half_one
                        },
                        this.game.resources
                    )
                    this.sound = this.game.sounds.play(
                        this.game.resources.get_sound("airstrike_plane_sfx"),
                        {
                            max_distance: 300,
                            position: this.position,
                            loop: false,
                            volume: 0.7
                        }
                    )
                    break
            }
            this.initial = false
        }
    }
}