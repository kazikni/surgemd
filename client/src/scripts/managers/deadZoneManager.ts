import { type Game } from "../others/game.ts"
import { zIndexes } from "common/scripts/others/constants.ts"
import { DeadZoneUpdate } from "common/scripts/packets/general_update.ts"
import { ABParticle2D, CircleHitbox2D, ClientParticle2D, Color, ColorM, Graphics2D, model2d, Numeric, ParticlesEmitter2D, random, v2, Vec2 } from "common/engine/client.ts";
export class DeadZoneManager{
    radius:number=5
    position:Vec2=v2.new(0,0)
    sprite:Graphics2D=new Graphics2D()
    map_sprite:Graphics2D=new Graphics2D()
    game:Game
    pa!:ParticlesEmitter2D<ClientParticle2D>

    dest_position:Vec2=v2.zero
    dest_radius:number=0
    constructor(game:Game){
        this.game=game
        this.sprite.zIndex=zIndexes.DeadZone
        this.sprite.scale=v2.new(1,1)
        this.sprite.layer=100
        this.game.cam2d.addObject(this.sprite)
    }
    hitbox:CircleHitbox2D=new CircleHitbox2D(v2.new(0,0),1)
    append(){
        const model=model2d.outlineCircle(1,100*1000,200)
        this.sprite.fill_color(this.color)
        this.sprite.drawModel(model)
        const model2=model2d.outlineCircle(0.997,0.003,200)
        this.sprite.fill_color(ColorM.rgba(255,255,255,40))
        this.sprite.drawModel(model2)
        this.set_current(v2.new(20,20),10)
        this.pa=this.game.particles.add_emiter({
            delay:0.3,
            particle:()=>{
                const pos=v2.random2(this.game.cam2d.visual_position,v2.add(this.game.cam2d.visual_position,v2.new(this.game.cam2d.width,this.game.cam2d.height)))
                if(this.hitbox.pointInside(pos))return undefined
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
    }
    update_from_data(data:DeadZoneUpdate){
        this.set_current(data.position,data.radius)

        this.dest_position=data.new_position
        this.dest_radius=data.new_radius
    }
    set_current(position:Vec2,radius:number){
        this.position=position
        this.radius=radius

        if(radius===0)radius=0.01
        this.sprite.scale=v2.new(radius,radius)
        this.sprite.position=position

        this.hitbox.position=position
        this.hitbox.radius=radius

        if(!this.game.terrain.map)return
        const rm=Numeric.clamp(radius/this.game.terrain.map.size.x,0,1)
        const dd=ColorM.lerp(ColorM.hex("#f125"),ColorM.hex("#21f4"),rm)
        this.color.r=dd.r
        this.color.g=dd.g
        this.color.b=dd.b
        this.color.a=dd.a
    }
}