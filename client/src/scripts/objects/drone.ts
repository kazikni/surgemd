import { GameObjectType } from "common/scripts/others/constants.ts"
import { Color, Hitbox2D, matrix4, Stream, v2, v2m } from "common/engine/core.ts";
import { AirBody } from "./airbody.ts";
import { Container2D, Sprite2D, Tween } from "common/engine/web.ts";

export class Drone extends AirBody {
    override number_type: number=GameObjectType.Drone
    override string_type: string="drone"

    z:number=1

    declare shadow:Container2D
    shadow_sprite!:Sprite2D

    visual!:Container2D
    visual_sprite!:Sprite2D

    propellers:Sprite2D[]=[]

    hidden:boolean=false
    alpha_tween?:Tween<Color>
    hidden_hitbox?:Hitbox2D
    
    can_hide(scope_zoom:number=1):boolean{
        return Math.max(1.2-this.z,0)/(scope_zoom*2.7)<0.7
    }
    set_hidden(hide:boolean){
        if(this.hidden===hide)return
        if(this.alpha_tween)this.alpha_tween.kill()
        this.hidden=hide
        this.alpha_tween=this.game.add_tween({
            duration:0.25,
            target:this.visual.tint,
            to:{
                a:hide?0:255
            }
        })
    }

    constructor() {
        super()
    }

    override on_create(args: Record<string, any>): void {
        this.shadow=new Container2D()
        this.shadow_sprite=new Sprite2D()
        this.shadow.add_child(this.shadow_sprite)
        this.container.add_child(this.shadow)

        this.visual=new Container2D()
        this.visual_sprite=new Sprite2D()
        this.visual.add_child(this.visual_sprite)
        this.container.add_child(this.visual)

        this.game.cam2d.add_object(this.container)
    }
    override on_tick(dt:number){
        super.on_tick(dt)
        this.container.scale.x=1.5+3*this.z
        this.container.scale.y=1.5+3*this.z

        for(const s of this.propellers){
            s.rotation+=6*dt
        }

        const paralax=1+(this.z*0.5)
        this.visual.scale=v2(1/paralax,1/paralax)
        this.visual.matrix=matrix4.parallax_2d(this.game.cam2d.position,paralax)
        this.set_hidden(this.can_hide(this.game.scope_zoom))
    }
    override on_initial(): void {
        this.shadow.transform_frame({
            position: v2(0.05,0.05),
            scale:2,
            zIndex:0
        })
        this.shadow_sprite.set_frame({
            hotspot: v2.half_one,
            zIndex:0,
            image:"air_drone_shadow_1"
        },this.game.resources)

        let propellers:Sprite2D[]=[new Sprite2D(),new Sprite2D(),new Sprite2D(),new Sprite2D()]
        for(let i=0;i<propellers.length;i++){
            propellers[i].set_frame({
                image:"air_drone_shadow_2",
                zIndex:1,
                hotspot:v2.half_one
            },this.game.resources)
            this.propellers.push(propellers[i])
            this.shadow.add_child(propellers[i])
        }
        propellers[0].position=v2(-0.3,-0.3)
        propellers[1].position=v2(0.3,-0.3)
        propellers[2].position=v2(0.3,0.3)
        propellers[3].position=v2(-0.3,0.3)

        propellers=[new Sprite2D(),new Sprite2D(),new Sprite2D(),new Sprite2D()]
        for(let i=0;i<propellers.length;i++){
            propellers[i].set_frame({
                image:"air_drone_2",
                scale:1,
                zIndex:1,
                hotspot:v2.half_one
            },this.game.resources)
            this.propellers.push(propellers[i])
            this.visual.add_child(propellers[i])
        }
        propellers[0].position=v2(-0.6,-0.6)
        propellers[1].position=v2(0.6,-0.6)
        propellers[2].position=v2(0.6,0.6)
        propellers[3].position=v2(-0.6,0.6)

        this.visual_sprite.set_frame({
            hotspot:v2.half_one,
            zIndex:0,
            image:"air_drone_1"
        },this.game.resources)

        this.sound = this.game.sounds.play(this.game.resources.get_sound("quadcopter_sfx"),{
            max_distance: 60,
            position: this.position,
            loop: true,
            volume: 0.7
        })
    }
    override on_decode_net(stream:Stream,full:boolean): void {
        this.z=stream.read_float32()
        super.on_decode_net(stream,full)
    }
}