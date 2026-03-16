import { type Game } from "./game.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { PlaneData } from "common/scripts/packets/general_update.ts";
import { CenterHotspot, Container2D, SoundInstance, Sprite2D, v2, Vec2 } from "common/engine/client.ts";

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
    }
    game:Game
    id:number=0
    constructor(game:Game){
        this.game=game
        this.container.add_child(this.sprite)
        this.game.cam2d.addObject(this.container)
        this.container.zIndex=zIndexes.Planes
    }
    dest_pos?:Vec2
    initial=true
    update(dt:number){
        if(this.dest_pos){
            this.container.position=v2.lerp(this.container.position,this.dest_pos,this.game.inter_global)
        }
    }
    updateData(data:PlaneData){
        if(this.game.save.get_variable("sv_game_interpolation")){
            this.dest_pos=data.pos
        }else{
            this.container.position=data.pos
        }
        if(data.complete){
            this.free()
        }
        this.container.rotation=data.direction
        if(!this.sound){
            this.sound=this.game.sounds.play(this.game.resources.get_audio("airdrop_plane_sfx"),{
                max_distance:80,
                position:v2.clone(this.container.position),
                loop:true,
                volume:0.5
            })
        }
        if(this.sound)this.sound.position=v2.clone(this.container.position)
        if(!this.sprite.frame){
            this.sprite.set_frame({
                image:"airdrop_plane",
                scale:14,
                hotspot:CenterHotspot
            },this.game.resources)
        }
        if(this.initial){
            this.id=data.id
            this.container.position=this.dest_pos!
            this.initial=false
        }
    }
}