import { type Game } from "../others/game.ts"
import { zIndexes } from "common/scripts/others/constants.ts"
import { DeadZoneUpdate } from "common/scripts/packets/general_update.ts"
import { ABParticle2D, CircleHitbox2D, ClientParticle2D, Color, ColorM, Graphics2D, model2d, Numeric, ParticlesEmitter2D, random, v2, Vec2 } from "common/engine/client.ts";
export class DeadZoneManager{
    radius:number=-1
    position:Vec2=v2(0,0)
    sprite:Graphics2D=new Graphics2D()
    map_sprite:Graphics2D=new Graphics2D()
    game:Game
    pa!:ParticlesEmitter2D<ClientParticle2D>

    dest_position:Vec2=v2.zero
    dest_radius:number=0

    deadzone_sound_offset:number=0
    constructor(game:Game){
        this.game=game
        this.sprite.zIndex=zIndexes.DeadZone
        this.sprite.scale=v2(1,1)
        this.game.cam2d.addObject(this.sprite)
    }
    hitbox:CircleHitbox2D=new CircleHitbox2D(v2(0,0),1)
    append(){
        this.set_current(v2(20,20),10)
        this.pa=this.game.particles.add_emiter({
            delay:0.3,
            particle:()=>{
                const pos=v2.random2(this.game.cam2d.visual_position,v2.add(this.game.cam2d.visual_position,v2(this.game.cam2d.width,this.game.cam2d.height)))
                if(this.hitbox.point_inside(pos))return undefined
                return new ABParticle2D({
                    frame:{
                        image:"deadzone_particle"
                    },
                    position:pos,
                    tint:this.color,
                    speed:random.float(0.1,0.4),
                    angle:random.float(-3.1415,3.1415),
                    direction:random.float(-3.1415,3.1415),
                    life_time:random.float(5,6),
                    zIndex:zIndexes.DeadZone,
                    scale:random.float(2,4),
                    to:{
                        speed:random.float(0.1,0.6),
                        angle:random.float(-3.1415*2,3.1415*2),
                    }
                })
            },
            enabled:false//this.game.save.get_variable("sv_graphics_particles")>=GraphicsDConfig.Advanced
        })
    }
    color:Color=ColorM.hex("#21f2")
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
        this.set_current(data.position,data.radius)

        this.dest_position=data.new_position
        this.dest_radius=data.new_radius
    }
    set_current(position:Vec2,radius:number){
        if(this.position.x===position.x&&this.position.y===position.y&&radius===this.radius)return
        this.position=position
        this.radius=radius

        this.sprite.position=position

        this.hitbox.position=position
        this.hitbox.radius=radius

        if(!this.game.terrain.map)return
        const rm=Numeric.clamp(1-((radius*1.4)/this.game.terrain.map.size.x),0,1)
        const color=ColorM.lerp(ColorM.hex("#00a2ff"),ColorM.hex("#ff006a"),rm)

        this.sprite.clear()
        const model=model2d.outlineCircle(radius,1000*this.game.cam2d.meter_size,200)

        const col=ColorM.clone(color)
        col.a=0.4+0.4*rm
        this.color=col
        this.sprite.fill_color(col)
        this.sprite.drawModel(model)
        if(radius>0){
            const model2=model2d.outlineCircle(radius,0.2,200)
            this.sprite.fill_color(color)
            this.sprite.drawModel(model2)
        }
    }
}