import { zIndexes } from "common/scripts/others/constants.ts"
import { DeadZoneUpdate, GeneralUpdate } from "common/scripts/packets/general_update.ts"
import { CircleHitbox2D, Color, ColorM, ease, model2d, Numeric, ParticlesEmitter2D, v2, Vec2 } from "common/engine/core.ts"
import { ClientParticle2D, Graphics2D, Sound, SoundController } from "common/engine/web.ts";
import { GComponent } from "../others/component.ts";
import { GameState } from "../others/constants.ts";
export class DeadZoneManager extends GComponent{
    radius:number=-1
    position:Vec2=v2(0,0)
    enabled:boolean=false
    sprite:Graphics2D=new Graphics2D()
    pa!:ParticlesEmitter2D<ClientParticle2D>

    dest_position:Vec2=v2.zero
    dest_radius:number=0

    deadzone_sound_offset:number=0

    hitbox:CircleHitbox2D=new CircleHitbox2D(v2(0,0),1)
    color:Color=ColorM.hex("#21f2")

    ambience_controller!:SoundController
    ambience_sound!:Sound

    aspect:number=0

    constructor(){
        super()
        this.sprite.zIndex=zIndexes.DeadZone
    }
    override on_bind(){
        this.sprite.initialize(this.game.scene_2d.camera.ctx)
        this.game.scene_2d.camera.add_object(this.sprite)
        this.ambience_controller=this.game.sounds.create_controller("ambience")
    }
    on_load(){
        this.ambience_sound=this.game.resources.get_sound("deadzone_ambience")
    }
    override on_tick(dt:number){
        if(this.game.state===GameState.Playing&&this.hitbox.point_inside(this.game.scene_2d.camera.position)){
            if(this.ambience_controller.running){
                this.deadzone_sound_offset=this.ambience_controller.offset
            }
            this.ambience_controller.set(null)
        }else{
            if(!this.ambience_controller.running){
                    this.ambience_controller.set(this.ambience_sound,{
                    loop:true,
                    offset:this.deadzone_sound_offset
                })
            }
        }
    }
    override on_general_update(general_update:GeneralUpdate){
        this.update_from_data(general_update.deadzone)
    }
    
    update_from_data(data?:DeadZoneUpdate){
        if(!data){
            this.set_current(v2.zero,0,false)
            return
        }
        this.aspect=this.game.minimap.map_size.x
        this.set_current(data.position,data.radius,true)
        this.dest_position=data.new_position
        this.dest_radius=data.new_radius
    }
    set_current(position:Vec2,radius:number,enabled:boolean=true){
        if(this.position.x===position.x&&this.position.y===position.y&&radius===this.radius&&this.enabled===enabled)return
        this.sprite.visible=enabled
        this.enabled=enabled
        this.position=position
        this.radius=radius

        this.sprite.position=position

        this.hitbox.position=position
        this.hitbox.radius=radius

        const rm=ease.quadraticIn(Numeric.clamp(1-((radius*1.4)/this.aspect),0,1))
        const color=ColorM.lerp(ColorM.hex("#00a2ff"),ColorM.hex("#ff0055"),rm)

        const model=model2d.outlineCircle(this.radius,100000,200)

        const col=ColorM.clone(color)
        col.a=76+102*rm
        this.color=col

        this.sprite.ctx.clear()
        this.sprite.ctx.fill_color=col
        this.sprite.ctx.fill_model(model)
        if(radius>0){
            const model2=model2d.outlineCircle(radius,0.2,200)
            this.sprite.ctx.fill_color=col
            this.sprite.ctx.fill_model(model2)
        }
    }
}