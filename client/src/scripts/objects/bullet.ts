import { ABParticle2D, Camera2D, Sprite2D } from "common/engine/web.ts";
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../others/gameObject.ts";
import { type Human } from "./human.ts";
import { type StaticBody } from "./static_body.ts";
import { BaseGameObject2D, CircleHitbox2D, ColorM, random, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
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
    private tticks:number=0

    ////////////////////////////
    // Misc                   //
    ////////////////////////////
    owner_id:number=0

    particles=0
    par_time=0

    collided_with:Set<GameObject>=new Set()

    hit_owner:boolean=false
    pass_through_humans:boolean=false
    pass_through_everthing:boolean=false
    constructor(){
        super()

        this.sprite_trail.hotspot=v2(1,.5)
        this.sprite_trail.zIndex=1
        this.sprite_trail.position.x=0
        this.sprite_trail.position.y=0
        this.sprite_trail.visible=false
        this.sprite_trail.zIndex=zIndexes.Bullets

        this.allow_tick=true
    }
    override on_layer_set(): void {
        this.sprite_trail.layer=this.layer
    }
    override on_create(_args: Record<string, void>) {
        this.sprite_trail.frame=this.game.resources.get_frame("base_trail")
        this.sprite_trail.size=v2(this.game.cam2d.meter_size*2,18) // Metter Size * 2
        this.game.cam2d.add_object(this.sprite_trail)
        this.base_hitbox=new CircleHitbox2D(v2(0,0),0.2)
    }
    override on_destroy(): void {
        this.sprite_trail.destroy()
    }
    override render(_camera: Camera2D, _dt: number): void {

    }
    override on_tick(dt:number): void {
        if(v2.distance(this.initialPosition,this.position)>this.maxDistance)this.die()
        //dt*=0.01
        if(this.dying){
            this.dying=true
            this.tticks-=dt
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
            if(this._play_bullet_whiz&&!(this.owner_id===this.game.active_entity_id&&!this.hit_owner)){
                if(this.game.ambient.bullet_whiz_hitbox&&this.game.ambient.bullet_whiz_hitbox.colliding_with(this.hitbox)){
                    this.game.sounds.play(this.game.resources.get_sound("bullet_whiz_"+random.int(1,3).toString()),{
                        position: this.position,
                        max_distance: 7,
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
                    case GameObjectType.Human:{
                        if((obj as Human).dead||(obj as Human).parachute||this.collided_with.has(obj)||(obj.id===this.owner_id&&!this.hit_owner))break
                        const colBody=obj.hitbox.overlap_line(this.old_position,this.position)
                        const reflectSeg = (obj as Human).get_reflect_segment()
                        let colReflect = null
                        let isReflect = false
                        let chosen: typeof colBody | typeof colReflect = null
                        if (reflectSeg) {
                            colReflect = reflectSeg.overlap_line(this.old_position,this.position)
                        }
                        if (colBody || colReflect) {
                            const distBody = colBody ? v2.distance(this.old_position, colBody.point) : Infinity
                            const distPan = colReflect ? v2.distance(this.old_position, colReflect.point) : Infinity
                            if (distPan < distBody) {
                                chosen = colReflect
                                isReflect = true
                            } else {
                                chosen = colBody
                            }
                        }
                        if(chosen){
                            this.collided_with.add(obj);
                            (obj as Human).on_hitted(this.position,this._critical,undefined,isReflect)
                            if(!(this.pass_through_humans||this.pass_through_everthing)||isReflect)this.die()
                        }
                        break
                    }
                    case GameObjectType.Building:
                    case GameObjectType.Obstacle:
                        if(!this.collided_with.has(obj)&&!(obj as StaticBody).physical_data.no_bullets_collision){
                            const col=obj.hitbox.overlap_line(this.old_position,this.position)
                            if(col){
                                this.collided_with.add(obj);
                                (obj as StaticBody).on_hitted(this.position,this._critical)
                                if(!((obj as StaticBody).physical_data.passable_by_bullets||this.pass_through_everthing))this.die()
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
                            hotspot:v2.half_one
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
            this.sprite_trail.position=this.position
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
    die(){
        this.dying=true
        this.velocity.x=0
        this.velocity.y=0
    }
    override on_decode_net(stream: Stream, full: boolean): void {
        this.position=stream.read_pos2()
        this.old_position=v2.clone(this.position)
        this.tticks=stream.read_float(0,60,2)
        if(full){
            this.initialPosition=stream.read_pos2()
            this.maxDistance=stream.read_float32()

            this.speed=stream.read_float32()
            this.sprite_trail.rotation=stream.read_rad()

            this.velocity=v2.from_RadAngle(this.sprite_trail.rotation,this.speed)

            this.maxLength=stream.read_float(0,100,3)
            this.sprite_trail.scale!.y=stream.read_float(0,6,2)
            const col=ColorM.number(stream.read_uint32())
            col.a=stream.read_uint8()
            this.sprite_trail.tint=col

            this.particles=stream.read_uint8()
            this.sprite_trail.visible=true
            const bg=stream.read_boolean_group()
            this.hit_owner=bg[0]
            this._critical=bg[1]
            this.pass_through_humans=bg[2]
            this.pass_through_everthing=bg[3]
            this.owner_id=stream.read_id()
        }
    }
}