import { type Game } from "../others/game.ts"
import { zIndexes } from "common/scripts/others/constants.ts"
import { DeadZoneUpdate } from "common/scripts/packets/general_update.ts"
import { CircleHitbox2D, Color, ColorM, ease, model2d, Numeric, ParticlesEmitter2D, v2, Vec2 } from "common/engine/core.ts"
import { ClientParticle2D, Graphics2D } from "common/engine/client.ts";
export class DeadZoneManager{
    radius:number=-1
    position:Vec2=v2(0,0)
    sprite:Graphics2D=new Graphics2D()
    game:Game
    pa!:ParticlesEmitter2D<ClientParticle2D>

    dest_position:Vec2=v2.zero
    dest_radius:number=0

    deadzone_sound_offset:number=0

    hitbox:CircleHitbox2D=new CircleHitbox2D(v2(0,0),1)
    color:Color=ColorM.hex("#21f2")
    constructor(game:Game){
        this.game=game

        this.sprite.zIndex=zIndexes.DeadZone
    }
    append(){
        this.sprite.initialize(this.game.cam2d.ctx)

        this.game.cam2d.add_object(this.sprite)
    }
    tick(dt:number){
        if(this.game.active_entity){
            if(this.hitbox.point_inside(this.game.active_entity.position)){
                if(this.game.ambient.deadzone_ambience.running){
                    this.deadzone_sound_offset=this.game.ambient.deadzone_ambience.offset
                }
                this.game.ambient.deadzone_ambience.set(null)
            }else{
                if(!this.game.ambient.deadzone_ambience.running){
                        this.game.ambient.deadzone_ambience.set(this.game.ambient.deadzone_ambience_sound,{
                        loop:true,
                        offset:this.deadzone_sound_offset
                    })
                }
            }
        }
    }
    update_from_data(data:DeadZoneUpdate){
        this.set_current(data.position,data.radius,this.game.minimap.map_size.x)

        this.dest_position=data.new_position
        this.dest_radius=data.new_radius
    }
    set_current(position:Vec2,radius:number,map_size:number){
        if(this.position.x===position.x&&this.position.y===position.y&&radius===this.radius)return
        this.position=position
        this.radius=radius

        this.sprite.position=position

        this.hitbox.position=position
        this.hitbox.radius=radius

        const rm=ease.quadraticIn(Numeric.clamp(1-((radius*1.4)/map_size),0,1))
        const color=ColorM.lerp(ColorM.hex("#00a2ff"),ColorM.hex("#ff0055"),rm)

        const model=model2d.outlineCircle(this.radius,1000*this.game.cam2d.meter_size,200)

        const col=ColorM.clone(color)
        col.a=76+102*rm
        this.color=col

        this.sprite.ctx.clear()
        this.sprite.ctx.model(model)

        this.sprite.ctx.fill_color=col
        this.sprite.ctx.fill()

        if(radius>0){
            const model2=model2d.outlineCircle(radius,0.2,200)
            this.sprite.ctx.model(model2)
            this.sprite.ctx.fill_color=col
            this.sprite.ctx.fill()
        }
    }
}