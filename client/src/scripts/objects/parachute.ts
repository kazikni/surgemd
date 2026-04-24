import { CenterHotspot, CircleHitbox2D, NetStream, Sprite2D, v2, v2m } from "common/engine/client.ts"
import { GameObject } from "../others/gameObject.ts"
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts"

export class Parachute extends GameObject{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    string_type:string="parachute"
    number_type: number=GameObjectType.Parachute

    time:number=0
    parachute_data:{
        lifetime:number
    }={
        lifetime:15
    }
    sprite:Sprite2D=new Sprite2D()

    override on_layer_set(layer: number): void {
        this.sprite.layer=layer
    }
    // deno-lint-ignore no-explicit-any
    create(_args: Record<string,any>): void {
        this.base_hitbox=new CircleHitbox2D(v2.zero(),3)
        this.sprite.set_frame({
            image:"parachute",
            scale:2,
            hotspot:CenterHotspot,
            zIndex:zIndexes.Parachute
        },this.game.resources)
        this.game.cam2d.addObject(this.sprite)
    }

    override on_destroy(): void {
        this.sprite.destroy()
    }
    constructor(){
        super()
    }
    override update(dt: number): void {
        this.time+=dt
        if(this.time>=this.parachute_data.lifetime){
            this.time=this.parachute_data.lifetime
            this.destroy()
        }
        const s=v2(1,1)
        v2m.scale(s,s,1-this.time/this.parachute_data.lifetime)

        v2m.add(this.sprite.scale,s,v2(1,1))
        this.sprite.position=this.position
    }
    override decode(stream:NetStream,full: boolean):void{
        this.time=stream.readFloat(0,30,2)
        if(full){
            this.position=stream.readPos2()
            this.parachute_data.lifetime=stream.readFloat(0,30,2)
        }
    }
}