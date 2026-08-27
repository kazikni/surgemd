import { CircleHitbox2D, ColorM, Stream, v2, } from "common/engine/core.ts";
import { GameObject } from "../others/gameObject.ts"
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts"
import { DecalDef } from "common/scripts/definitions/objects/decals.ts";
import { AnimatedSprite2D, Sprite2D } from "common/engine/web.ts";
export class Decal extends GameObject{
    string_type:string="decal"
    number_type: number=GameObjectType.Decal

    sprite?:Sprite2D|AnimatedSprite2D

    def!:DecalDef
    rotation:number=0

    constructor(){
        super()
        this.allow_tick=true
    }
    override on_create(_args: any): void {
        this.base_hitbox=new CircleHitbox2D(v2.zero(),0.5)
    }
    override on_layer_set(): void {
        if(this.sprite)this.sprite.layer=this.layer
    }
    override on_tick(dt: number): void {}
    set_definition(def:DecalDef){
        if(this.def||this.sprite)return
        this.def=def
        if(def.assets?.frames){
            this.sprite=new AnimatedSprite2D()
            ;(this.sprite as AnimatedSprite2D).frames=[]
        }else{
            this.sprite=new Sprite2D()
        }
        this.game.scene_2d.camera.add_object(this.sprite)
        this.sprite.set_frame({
            image:def.idString,
            zIndex:zIndexes.Decals,
            position:this.position,
            rotation:this.rotation,
            hotspot:v2.half_one,
            layer:this.layer,
            scale:2,
        },this.game.resources)
        if(def.assets){
            if(def.assets.main)this.sprite.set_frame(def.assets.main,this.game.resources)
            if(def.assets.frames)(this.sprite as AnimatedSprite2D).frames=def.assets.frames
        }
        if(def.hitbox)this.base_hitbox=def.hitbox
    }
    override on_destroy(): void {
        if(this.sprite)this.sprite.destroy()
    }
    override on_decode_net(stream: Stream, full: boolean): void {
        const [
            tint_dirty,
            scale
        ]=stream.read_boolean_group()
        if(full){
            this.position=stream.read_pos2()
            this.rotation=stream.read_rad()
            this.set_definition(this.game.definitions.decals.getFromNumber(stream.read_uint16()))
            if(tint_dirty){
                if(this.sprite){
                    this.sprite.tint=ColorM.number(stream.read_uint32())
                    this.sprite.tint.a=stream.read_uint8()
                }
            }
            if(scale){
                const scale=stream.read_float32()
                this.sprite?._scale.set(scale,scale)
            }
        }
    }
}