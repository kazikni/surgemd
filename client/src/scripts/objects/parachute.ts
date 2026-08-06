import { CenterHotspot, Sprite2D, ABParticle2D } from "common/engine/web.ts"
import { GameObject } from "../others/gameObject.ts"
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts"
import { FloorKind, Floors, FloorType } from "common/scripts/others/terrain.ts";
import { CircleHitbox2D, ColorM, random, Stream, v2, v2m } from "common/engine/core.ts";

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

    constructor(){
        super()

        this.allow_tick=true
    }
    override on_create(_args: void): void {
        this.base_hitbox=new CircleHitbox2D(v2.zero(),3)
        this.sprite.set_frame({
            image:"parachute",
            scale:2,
            hotspot:CenterHotspot,
            zIndex:zIndexes.Parachute
        },this.game.resources)
        this.game.cam2d.add_object(this.sprite)
    }
    override on_layer_set(): void {
        this.sprite.layer=this.layer
    }
    override on_destroy(): void {
        this.sprite.destroy()
    }
    on_landed(){
        const floor=this.game.terrain.get_floor_type(this.position,this.layer,FloorType.Void) as FloorType
        const floor_def=Floors[floor]
        if(floor_def.floor_kind===FloorKind.Liquid){
            this.game.sounds.play(this.game.resources.get_sound("airdrop_landed_liquid"))
            for(let i=0;i<7;i++){
                const pos=random.random_in_circle(2)
                v2m.add(pos,pos,this.position)
                this.game.particles.add_particle(new ABParticle2D({
                    frame:{
                        image:"riple",
                        hotspot:CenterHotspot,
                        zIndex:zIndexes.Decals,
                        layer:this.layer,
                        scale:0,
                    },
                    life_time:0.75,
                    position:pos,
                    speed:0,
                    direction:0,
                    to:{
                        tint:ColorM.default.transparent,
                        scale:6
                    }
                }))
            }
        }else{
            this.game.sounds.play(this.game.resources.get_sound("airdrop_landed"),{
                position:this.position,
                max_distance:30,
            })
        }
    }
    override on_tick(dt: number): void {
        this.time+=dt
        if(this.time>=this.parachute_data.lifetime){
            this.time=this.parachute_data.lifetime
            this.on_landed()
            this.destroy()
        }
        const s=v2(1.2,1.2)
        v2m.scale(s,s,1-this.time/this.parachute_data.lifetime)
        v2m.add(this.sprite.scale,s,v2(1.35,1.35))
        this.sprite.position=this.position
    }
    override on_decode_net(stream:Stream,full:boolean):void{
        this.time=stream.read_float(0,30,2)
        if(full){
            this.position=stream.read_pos2()
            this.parachute_data.lifetime=stream.read_float(0,30,2)
        }
    }
}