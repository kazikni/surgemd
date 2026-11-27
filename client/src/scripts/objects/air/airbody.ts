import { zIndexes } from "common/scripts/others/constants.ts"
import { AudioInstance, Container2DObject } from "common/engine/web.ts";
import { Numeric, Stream, v2, v2m} from "common/engine/core.ts";
import { GameObject } from "../../main/gel.ts";

export abstract class AirBody extends GameObject {
    shadow!:Container2DObject
    sound?:AudioInstance

    rotation!:number

    constructor() {
        super()
    }

    on_create(args: Record<string, any>): void {
        this.shadow.propertys={no_layer_parallax:true,all_layers:true}
        this.shadow.zIndex=zIndexes.Airbodys
        this.shadow.layer=99999
        this.scene.camera.add_object(this.shadow)
    }
    on_tick(dt: number) {
        this.shadow.position=v2(275,275)
        if(this.app.save.settings.get_var("game_interpolation")){
            v2m.lerp(this.shadow.position,this.position,this.scene.global_interpolation)
            this.shadow.rotation=Numeric.lerp_rad(this.shadow.rotation,this.rotation,this.scene.global_interpolation)
        }else{
            this.shadow.position=this.position
            this.shadow.rotation=this.rotation
        }
        if(this.sound)this.sound.position=this.shadow.position
    }
    on_destroy() {
        this.shadow.destroy()
        this.sound?.stop?.()
    }
    on_decode_net(stream:Stream,full:boolean): void {
        this.position=stream.read_pos2()
        this.rotation=stream.read_rad()
        if(full||!this.app.save.settings.get_var("game_interpolation")){
            this.shadow.position=this.position
            this.shadow.rotation=this.rotation
        }
    }
}