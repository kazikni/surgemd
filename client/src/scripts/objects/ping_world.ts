import { Sprite2D } from "common/engine/web.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { PingData } from "common/scripts/packets/update_packet.ts";
import { GameObject } from "../others/gameObject.ts";
import { v2 } from "common/engine/core.ts";
export class PingWorld extends GameObject{
    string_type:string="ping_world"
    number_type: number=90

    sprite:Sprite2D
    ping_id?:number

    constructor(){
        super()
        this.sprite=new Sprite2D()
        this.sprite.hotspot=v2.half_one
        this.sprite.zIndex=zIndexes.PingWorld

        this.allow_tick=true
    }
    override on_create(args:PingData): void {
        if(args.id){
            this.ping_id=args.id
            for(const p in this.scene.pings){
                if(this.scene.pings[p].ping_id===this.ping_id)this.scene.pings[p].destroy()
            }
        }
        const def=this.game.definitions.pings.getFromNumber(args.def)
        this.sprite.set_frame({
            image:def.idString+"_world",
            tint:args.color,
            scale:1.6,
            position:args.position,
        },this.game.resources)
        this.scene.camera.add_object(this.sprite)
        this.scene.pings[this.id]=this
    }
    override on_layer_set(): void {
        this.sprite.layer=this.layer
    }
    override on_destroy(): void {
        this.sprite.destroy()
        if(this.scene.pings[this.id]){
            delete this.scene.pings[this.id]
        }
    }
    override on_tick(dt:number): void {
        /*if(this.layer!==this.scene.camera.layer){
            this.manager.set_layer(this,this.scene.camera.layer)
        }*/
    }
}