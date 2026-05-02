import { ABParticle2D, BaseGameObject2D, Camera2D, CenterHotspot, CircleHitbox2D, ColorM, Container2D, NetStream, random, Sprite2D, v2, v2m, Vec2 } from "common/engine/client.ts";
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../others/gameObject.ts";
import { type Human } from "./human.ts";
import { StaticBody } from "./static_body.ts";
const images=[
    "bullet_normal",
    "bullet_rocket"
]
const particles=[
    "gas_smoke_particle"
]
export class Bullet extends GameObject{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    string_type:string="bullet"
    number_type: number=GameObjectType.Bullet
    name:string="bullet"

    ////////////////////////////
    // Movement               //
    ////////////////////////////
    velocity:Vec2=v2.zero()
    old_position:Vec2=v2.zero()
    speed:number=0

    ////////////////////////////
    // Distance And Length    //
    ////////////////////////////
    initialPosition!:Vec2
    maxDistance:number=1
    maxLength:number=0.3

    ////////////////////////////
    // Visual                 //
    ////////////////////////////
    sprite_trail:Sprite2D=new Sprite2D()
    sprite_projectile?:Sprite2D=new Sprite2D()
    container:Container2D=new Container2D()

    ////////////////////////////
    // Sound                  //
    ////////////////////////////
    _play_bullet_whiz = true
    _critical:boolean=false

    ////////////////////////////
    // Life                   //
    ////////////////////////////
    dying:boolean=false
    sendDelete: boolean=true;
    reflection_count:number=0;
    private tticks:number=0

    ////////////////////////////
    // Misc                   //
    ////////////////////////////
    owner_id:number=0

    particles=0
    par_time=0

    constructor(){
        super()

        this.sprite_trail.hotspot=v2(0.965,.5)
        this.sprite_trail.zIndex=1
        this.sprite_trail.position.x=0
        this.sprite_trail.position.y=0

        this.container.visible=false

        this.container.add_child(this.sprite_trail)
        this.container.update_zindex()
        this.container.zIndex=zIndexes.Bullets
    }
    override on_layer_set(layer: number): void {
        this.container.layer=layer
    }
    override create(_args: Record<string, void>) {
        this.sprite_trail.frame=this.game.resources.get_sprite("base_trail")
        this.sprite_trail.size=v2(this.game.cam2d.meter_size*2,55) // Metter Size * 2
        this.game.cam2d.addObject(this.container)
        this.base_hitbox=new CircleHitbox2D(v2(0,0),0.2)
    }
    override on_destroy(): void {
        this.container.destroy()
    }
    override render(_camera: Camera2D, _dt: number): void {

    }
    update(dt:number): void {
        if(this.dying||v2.distance(this.initialPosition,this.position)>this.maxDistance){
            this.dying=true
            this.tticks-=dt
            this.sprite_projectile?.destroy()
            if(this.tticks<=0){
                this.destroy()
            }
        }else{
            this.old_position=v2.clone(this.position)
            if(this.sprite_trail.scale.x<this.maxLength)this.tticks+=dt
            // Collisions
            const dst=v2.scale(this.velocity,dt)

            v2m.add(this._position,this._position,dst)

            // Bullet Whiz Sound
            if(this._play_bullet_whiz&&!(this.owner_id===this.game.active_entity_id&&this.reflection_count===0)){
                if(this.game.ambient.bullet_whiz_hitbox&&this.game.ambient.bullet_whiz_hitbox.colliding_with(this.hitbox)){
                    this.game.sounds.play(this.game.resources.get_audio("bullet_whiz_"+random.int(1,3).toString()),{
                        position: this.position,
                        max_distance: 60,
                        volume:0.5
                    })
                    this._play_bullet_whiz=false
                }
            }

            // Collisions with objects
            const objs:GameObject[]=this.manager.cells.get_objects(this.hitbox,this.layer)
            for(const obj of objs){
                if(this.dying)break
                switch((obj as BaseGameObject2D).number_type){
                    case GameObjectType.Human:
                        if(!(obj as Human).dead&&!(obj as Human).parachute){
                            const col=obj.hitbox.overlap_line(this.old_position,this.position)
                            if(col){
                                (obj as Human).on_hitted(this.position,this._critical)
                                this.dying=true
                            }
                        }
                        break
                    case GameObjectType.Building:
                    case GameObjectType.Obstacle:
                        if(!(obj as StaticBody).physical_data.no_bullets_collision){
                            const col=obj.hitbox.overlap_line(this.old_position,this.position)
                            if(col){
                                (obj as StaticBody).on_hitted(this.position,this._critical)
                                this.dying=true
                            }
                        }
                        break
                }
            }
            // Particles
            if(this.particles>0){
                this.par_time-=dt
                if(this.par_time<=0){
                    const p=new ABParticle2D({
                        direction:random.rad(),
                        life_time:0.9,
                        position:this.position,
                        frame:{
                            image:particles[this.particles-1],
                            hotspot:CenterHotspot
                        },
                        speed:random.float(0.5,1.2),
                        angle:0,
                        scale:0.1,
                        tint:ColorM.hex("#fff5"),
                        to:{
                            tint:ColorM.hex("#fff0"),
                            scale:1
                        }
                    })
                    this.game.particles.add_particle(p)
                    this.par_time=0.01
                }
            }

            // Update Visual Position
            this.container.position=this.position
        }

        // Update Visual
        const traveledDistance = v2.distance(this.initialPosition, this.position)
        this.sprite_trail.scale.x=Math.min(
            Math.min(
                this.speed * this.tticks,
                traveledDistance
            ),
            this.maxLength
        );
    }
    override decode(stream: NetStream, full: boolean): void {
        this.position=stream.readPos2()
        this.old_position=v2.clone(this.position)
        this.tticks=stream.readFloat(0,60,2)
        if(full){
            this.initialPosition=stream.readPos2()
            this.maxDistance=stream.readFloat32()

            this.speed=stream.readFloat32()
            this.container.rotation=stream.readRad()

            this.velocity=v2.from_RadAngle(this.container.rotation,this.speed)

            this.maxLength=stream.readFloat(0,100,3)
            this.sprite_trail.scale!.y=stream.readFloat(0,6,2)
            const col=ColorM.number(stream.readUint32())
            col.a=stream.readUint8()/255
            this.sprite_trail.tint=col

            const proj=stream.readUint8()
            if(proj>0){
                this.sprite_projectile=new Sprite2D()
                this.sprite_projectile.hotspot=CenterHotspot
                this.sprite_projectile.zIndex=2
                this.sprite_projectile.position.x=0
                this.sprite_projectile.position.y=0
                this.sprite_projectile.scale.x=stream.readFloat(0,6,2)
                this.sprite_projectile.scale.y=stream.readFloat(0,6,2)

                this.sprite_projectile.tint=ColorM.number(stream.readUint32())
                this.sprite_projectile.frame=this.game.resources.get_sprite(images[proj-1])

                this.container.add_child(this.sprite_projectile)
            }
            this.particles=stream.readUint8()
            this.container.visible=true
            this._critical=stream.readBooleanGroup()[0]
            this.owner_id=stream.readID()
            this.reflection_count=stream.readUint8()
        }
    }
}