import { zIndexes } from "common/scripts/others/constants.ts"
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts";
import { AudioInstance, Sprite2D } from "common/engine/web.ts";
import { Stream } from "common/engine/core.ts";

export interface AirBodyPhysicalData extends MovingBodyPhysicalData {}

export abstract class AirBody extends MovingBody {
    sprite: Sprite2D = new Sprite2D()
    sound?: AudioInstance
    override physical_data: AirBodyPhysicalData = {
        rotation: 0
    }
    initial = true

    constructor() {
        super()
    }

    override on_create(args: Record<string, any>): void {
        this.game.cam2d.add_object(this.sprite)
        this.sprite.zIndex = zIndexes.Airbodys
        this.position = this.sprite.position
    }
    override on_layer_set(){
        this.sprite.layer = this.layer
    }
    override on_tick(dt: number) {
        super.on_tick(dt)
        this.sprite.position=this.position
        this.sprite.rotation=this.physical_data.rotation
        if(this.sound){
            this.sound.position=this.position
        }
    }
    override on_destroy() {
        this.sprite.destroy()
        this.sound?.stop?.()
    }
    on_initial(){

    }
    override on_decode_net(stream:Stream,full:boolean): void {
        this.decode_physical_data(stream,full)
        if (this.initial) {
            this.on_initial()
            this.initial = false
        }
    }
}