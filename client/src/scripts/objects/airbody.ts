import { zIndexes } from "common/scripts/others/constants.ts"
import { MovingBody } from "./moving_body.ts";
import { AudioInstance, Container2D, Sprite2D } from "common/engine/web.ts";
import { Stream } from "common/engine/core.ts";

export abstract class AirBody extends MovingBody {
    container:Container2D=new Container2D()
    shadow!:Sprite2D|Container2D
    sound?:AudioInstance
    initial = true

    constructor() {
        super()
        this.container.zIndex = zIndexes.Airbodys
    }

    override on_create(args: Record<string, any>): void {
        this.shadow=new Sprite2D()
        this.container.add_child(this.shadow)

        this.scene.camera.add_object(this.container)
    }
    override on_layer_set(){
        this.container.layer = this.layer
    }
    override on_tick(dt: number) {
        super.on_tick(dt)
        this.container.position=this.position
        this.container.rotation=this.rotation
        if(this.sound){
            this.sound.position=this.position
        }
    }
    override on_destroy() {
        this.container.destroy()
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