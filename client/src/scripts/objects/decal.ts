import { CircleCollider2D, ColorM, Stream, v2 } from "common/engine/core.ts";
import { AnimatedSprite2D, Sprite2D } from "common/engine/web.ts";
import { type DecalDef } from "common/scripts/definitions/objects/decals.ts";
import { object_instance_type, ObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../main/gel.ts";

export class Decal extends GameObject{
    def!:DecalDef
    sprite!:Sprite2D
    rotation:number=0

    constructor(){
        super()
        this.object_type=ObjectType.Decal
        this.instance_type=object_instance_type.decal
        this.base_collider=new CircleCollider2D(v2.zero(),0.5)
    }

    on_layer_set(){
        if(this.sprite)this.sprite.layer=this.layer
    }
    on_destroy(){
        this.sprite?.destroy()
    }

    on_decode_net(stream:Stream,full:boolean){
        const [has_tint,has_scale]=stream.read_boolean_group()
        if(!full)return
        this.position=stream.read_pos2()
        this.rotation=stream.read_rad()
        this.def=this.app.definitions.decals.getFromNumber(stream.read_uint16())
        if(this.def.collider)this.base_collider=this.def.collider
        const animated=this.def.assets?.frames!==undefined
        this.sprite=animated?new AnimatedSprite2D():new Sprite2D()
        this.scene.camera.add_object(this.sprite)
        this.sprite.set_frame({
            image:this.def.id_string,
            zIndex:zIndexes.Decals,
            position:this.position,
            rotation:this.rotation,
            hotspot:v2.half_one,
            layer:this.layer,
            scale:2,
        },this.app.resources)
        if(this.def.assets?.main)this.sprite.set_frame(this.def.assets.main,this.app.resources)
        if(animated)(this.sprite as AnimatedSprite2D).frames=this.def.assets!.frames
        if(has_tint){
            this.sprite.tint=ColorM.number(stream.read_uint32())
            this.sprite.tint.a=stream.read_uint8()
        }
        if(has_scale){
            const scale=stream.read_float32()
            this.sprite.scale=v2(scale,scale)
        }
    }
}
