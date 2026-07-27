import { Container2D, Sprite2D } from "common/engine/client.ts";
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../others/gameObject.ts";
import { ColorM, NullHitbox2D, Stream, v2 } from "common/engine/core.ts";
export class HumanBody extends GameObject{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    string_type:string="human_body"
    number_type: number=GameObjectType.HumanBody

    ////////////////////////////
    // Visual                 //
    ////////////////////////////
    container:Container2D=new Container2D()
    sprite_text:Sprite2D=new Sprite2D()
    sprite_badge:Sprite2D=new Sprite2D()
    sprite:Sprite2D=new Sprite2D()

    name:string=""

    constructor(){
        super()
        this.sprite_text.hotspot=v2(0.5,0)
        this.sprite_text.position.y=0.65
        this.sprite_badge.position.y=0.78
        this.sprite_badge.hotspot=v2(1,0.5)
        this.sprite_badge.scale=v2(2,2)
        this.sprite.hotspot=v2(0.5,0.5)
        this.container.zIndex=zIndexes.PlayersBody
        this.container.add_child(this.sprite_text)
        this.container.add_child(this.sprite_badge)
        this.container.add_child(this.sprite)
        this.container.visible=false

        //this.allow_tick=true
    }
    override on_create(_args: any) {
        this.base_hitbox=new NullHitbox2D(v2(0,0))
        this.game.cam2d.add_object(this.container)
        this.sprite.frame=this.game.resources.get_frame("human_body")
    }
    override on_layer_set(): void {
        this.container.layer=this.layer
    }
    override on_destroy(): void {
        this.container.destroy()
        this.sprite_text.frame?.free?.()
    }
    async set_name(name:string,badge:number){
        if(this.sprite_text.frame)this.sprite_text.frame.free()
        const color=this.game.get_theme_color("tertiary")
        this.sprite_text.frame=await this.game.resources.render_text(name,60,color,"Russo-One")
        if(badge){
            this.sprite_badge.visible=true
            this.sprite_badge.frame=this.game.resources.get_frame(`badge_${this.game.definitions.badges.getFromNumber(badge-1).idString}`)
            this.sprite_badge.position.x=(-this.sprite_text.frame.frame_size!.x!/(this.game.cam2d.meter_size*4))-0.05
        }else{
            this.sprite_badge.visible=false
        }
        this.sprite.tint=ColorM.hex(color)
        this.container.visible=true
    }
    override on_decode_net(stream: Stream, full: boolean): void {
        const pos=stream.read_pos2()
        if(full){
            const name=stream.read_string_sized(30)
            const badge=stream.read_uint8()
            this.set_name(name,badge)
        }
        this.position=pos
        this.container.position=pos
    }
}