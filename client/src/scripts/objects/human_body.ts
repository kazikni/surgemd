import { ColorM, Container2D, NetStream, NullHitbox2D, Sprite2D, v2 } from "common/engine/client.ts";
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../others/gameObject.ts";
//import { Badges } from "common/scripts/definitions/loadout/badges.ts";
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

    override on_layer_set(layer: number): void {
        this.container.layer=layer
    }
    // deno-lint-ignore no-explicit-any
    create(_args: any) {
        this.base_hitbox=new NullHitbox2D(v2(0,0))
        this.game.cam2d.addObject(this.container)
        this.sprite.frame=this.game.resources.get_frame("human_body")
        this.updatable=false
    }
    override on_destroy(): void {
        this.container.destroy()
        this.sprite_text.frame?.free()
    }
    update(_dt:number): void {
    }
    constructor(){
        super()
        this.sprite_text.hotspot=v2(0.5,0)
        this.sprite_text.position.y=0.65
        this.sprite_badge.position.y=0.65
        this.sprite_badge.hotspot=v2(1,0)
        this.sprite.hotspot=v2(0.5,0.5)
        this.container.zIndex=zIndexes.PlayersBody
        this.container.add_child(this.sprite_text)
        this.container.add_child(this.sprite_badge)
        this.container.add_child(this.sprite)
        this.container.visible=false
    }
    override async decode(stream: NetStream, full: boolean): Promise<void> {
        const pos=stream.readPos2()
        if(full){
            const name=stream.readStringSized(30)
            const badge=stream.readUint8()
            const color=this.game.save.get_variable("sv_ui_tertiary_color")
            this.sprite_text.frame=await this.game.resources.render_text(`${name}`,60,color)
            if(badge){
                this.sprite_badge.visible=true
                this.sprite_badge.frame=this.game.resources.get_frame(`${this.game.definitions.badges.getFromNumber(badge-1).idString}`)
                this.sprite_badge.position.x=(-this.sprite_text.frame.frame_size!.x!/(this.game.cam2d.meter_size*4))-0.1
            }else{
                this.sprite_badge.visible=false
            }
            this.sprite.tint=ColorM.hex(color)
            this.container.visible=true
        }
        this.position=pos
        this.container.position=pos
    }
}