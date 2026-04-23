import { type Game } from "./game.ts";
import { Layers, zIndexes } from "common/scripts/others/constants.ts";
import { PlaneData } from "common/scripts/packets/general_update.ts";
import { CenterHotspot, Container2D, SoundInstance, Sprite2D, v2, v2m, Vec2 } from "common/engine/client.ts";

export class Plane{
    container:Container2D=new Container2D()
    sprite:Sprite2D=new Sprite2D()
    destroyed:boolean=false

    sound?:SoundInstance
    free(){
        this.container.destroy()
        this.sprite.destroy()
        this.destroyed=false
        if(this.sound)this.sound.stop()

        if(this.game.planes[this.id]){
            delete this.game.planes[this.id]
        }
    }
    game:Game
    id:number=0
    constructor(game:Game){
        this.game=game
        this.container.add_child(this.sprite)
        this.game.cam2d.addObject(this.container)
        this.container.zIndex=zIndexes.Planes
        this.container.layer=Layers.Normal*1000
    }
    dest_pos?:Vec2
    initial=true
    update(dt:number){
        if(this.dest_pos){
            v2m.lerp(this.container.position,this.dest_pos,this.game.global_interpolation)
        }
    }
    update_data(data:PlaneData){
        this.dest_pos=data.pos
        if(data.complete){
            this.free()
        }
        this.container.rotation=data.direction
        if(!this.sound){
            switch(data.type){
                case 0:
                    this.sound=this.game.sounds.play(this.game.resources.get_audio("airdrop_plane_sfx"),{
                        max_distance:60,
                        position:v2.clone(this.container.position),
                        loop:true,
                        volume:0.5
                    })
                    break
                case 1:
                    this.sound=this.game.sounds.play(this.game.resources.get_audio("airstrike_plane_sfx"),{
                        max_distance:60,
                        position:v2.clone(this.container.position),
                        loop:false,
                        volume:0.5
                    })
                    break
            }
        }
        if(this.sound)this.sound.position=v2.clone(this.container.position)
        if(!this.sprite.frame){
            switch(data.type){
                case 0:
                    this.sprite.set_frame({
                        image:"airdrop_plane",
                        scale:11,
                        hotspot:CenterHotspot
                    },this.game.resources)
                    break
                case 1:
                    this.sprite.set_frame({
                        image:"airstrike_plane",
                        scale:8,
                        hotspot:CenterHotspot
                    },this.game.resources)
                    break
            }
        }
        if(this.initial){
            this.id=data.id
            this.container.position=this.dest_pos!
            this.initial=false
        }
    }
}