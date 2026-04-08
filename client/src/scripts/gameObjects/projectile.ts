import { ProjectileDef, Projectiles } from "common/scripts/definitions/items/grenades.ts"
import { GameObject } from "../others/gameObject.ts"
import { CenterHotspot, CircleHitbox2D, NetStream, Sprite2D, v2 } from "common/engine/client.ts";
export class Projectile extends GameObject{
    string_type:string="projectile"
    number_type: number=6

    rotation:number=0
    zpos:number=0

    sprite:Sprite2D=new Sprite2D

    def!:ProjectileDef

    create(_args: Record<string, void>): void {
        this.game.cam2d.addObject(this.sprite)
    }
    override on_destroy(): void {
        this.sprite.destroy()
    }

    update(_dt:number): void {
        this.sprite.position=this.position
        this.sprite.rotation=this.rotation
        const s=(this.def.zBaseScale+(this.def.zScaleAdd*this.zpos))*2
        this.sprite.scale=v2.new(s,s)
    }
    constructor(){
        super()
    }
    set_definition(def:ProjectileDef){
        if(this.def)return
        this.def=def
        this.base_hitbox=new CircleHitbox2D(v2.new(0,0),this.def.radius)
        this.sprite.set_frame({
            image:this.def.frames.world,
            hotspot:CenterHotspot,
            scale:1
        },this.game.resources)
    }
    override decode(stream: NetStream, full: boolean): void {
        this.position=stream.readPos2()
        this.rotation=stream.readRad()
        this.zpos=stream.readFloat(0,1,1)
        if(full){
            this.set_definition(Projectiles.getFromNumber(stream.readID()))
        }
    }
}