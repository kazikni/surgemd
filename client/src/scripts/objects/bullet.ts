import { Camera2D, Sprite2D } from "common/engine/web.ts";
import { GameObjectType, ObjectsComponentEvent, zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../others/gameObject.ts";
import { type Human } from "./human.ts";
import { type StaticBody } from "./static_body.ts";
import { CircleHitbox2D, ColorM, DefaultObjectEvents, ObjectComponent, random, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
export const bullet_nc={
    number_name:1,
    string_name:"bullet_nc", // Bullet Network Client
    events:{
        [DefaultObjectEvents.create]:[
            (obj,args)=>{
            }
        ],
        [DefaultObjectEvents.tick]:[
            (obj,_dt:number)=>{
            }
        ],
        [DefaultObjectEvents.net_encode]:[
            (obj,stream,full)=>{
                obj.position=stream.read_pos2()
                obj.old_position=v2.clone(obj.position)
                obj.tticks=stream.read_float(0,60,2)
                if(full){
                    obj.initialPosition=stream.read_pos2()
                    obj.max_distance=stream.read_float32()
                    obj.speed=stream.read_float32()
                    obj.sprite_trail.rotation=stream.read_rad()

                    obj.max_length=stream.read_float32()
                    obj.sprite_trail.scale!.y=stream.read_float32()
                    const col=ColorM.number(stream.read_uint32())
                    col.a=stream.read_uint8()
                    obj.sprite_trail.tint=col

                    //this.particles=stream.read_uint8()
                    obj.sprite_trail.visible=true
                    const bg=stream.read_boolean_group()
                    obj.hit_owner=bg[0]
                    obj._critical=bg[1]
                    obj.pass_through_humans=bg[2]
                    obj.pass_through_everthing=bg[3]
                    obj.owner_id=stream.read_id()
                    
                    obj.velocity=v2.from_RadAngle(obj.sprite_trail.rotation,obj.speed)
                }
            }
        ],
        [ObjectsComponentEvent.collided]:[
            (tobj,other:GameObject)=>{
                switch(other.number_type){
                    case GameObjectType.Human:{
                        if((other as Human).dead||(other as Human).parachute||tobj.collided_with.has(other)||(other.id===tobj.owner_id&&!tobj.hit_owner))break
                        const colBody=other.hitbox.overlap_line(tobj.old_position,tobj.position)
                        const reflectSeg = (other as Human).get_reflect_segment()
                        let colReflect = null
                        let isReflect = false
                        let chosen: typeof colBody | typeof colReflect = null
                        if (reflectSeg) {
                            colReflect = reflectSeg.overlap_line(tobj.old_position,tobj.position)
                        }
                        if (colBody || colReflect) {
                            const distBody = colBody ? v2.distance(tobj.old_position, colBody.point) : Infinity
                            const distPan = colReflect ? v2.distance(tobj.old_position, colReflect.point) : Infinity
                            if (distPan < distBody) {
                                chosen = colReflect
                                isReflect = true
                            } else {
                                chosen = colBody
                            }
                        }
                        if(chosen){
                            tobj.collided_with.add(other);
                            (other as Human).on_hitted(tobj.position,tobj._critical,undefined,isReflect)
                            if(!(tobj.pass_through_humans||tobj.pass_through_everthing)||isReflect)tobj.die()
                        }
                        break
                    }
                    case GameObjectType.StaticBody:
                    case GameObjectType.Walls:
                    case GameObjectType.Building:
                    case GameObjectType.Obstacle:
                        if(!tobj.collided_with.has(other)&&!(other as StaticBody).physical_data.no_bullets_collision){
                            const col=other.hitbox.overlap_line(tobj.old_position,tobj.position)
                            if(col){
                                tobj.collided_with.add(other);
                                (other as StaticBody).on_hitted(tobj.position,tobj._critical)
                                if(!((other as StaticBody).physical_data.passable_by_bullets||tobj.pass_through_everthing))tobj.die()
                            }
                        }
                        break
                }
            }
        ]
    }
} as ObjectComponent<Bullet>
export const bullet_c={
    number_name:1,
    string_name:"bullet_c", // Bullet Client
    events:{
        [DefaultObjectEvents.bind]:[
            (obj)=>{
                obj.allow_tick=true
                obj.sprite_trail=new Sprite2D()
                obj.sprite_trail.hotspot=v2(1,.5)
                obj.sprite_trail.zIndex=1
                obj.sprite_trail.position.x=0
                obj.sprite_trail.position.y=0
                obj.sprite_trail.visible=false
                obj.sprite_trail.zIndex=zIndexes.Bullets
            }
        ],
        [DefaultObjectEvents.create]:[
            (obj,_args)=>{
                obj.sprite_trail.frame=obj.game.resources.get_frame("base_trail")
                obj.sprite_trail.size=v2(200,17) // Metter Size * 2
                obj.scene.camera.add_object(obj.sprite_trail)
                obj.base_hitbox=new CircleHitbox2D(v2(0,0),0.2)
            }
        ],
        [DefaultObjectEvents.layer_set]:[
            (obj,_dt:number)=>{
                obj.sprite_trail.layer=obj.layer
            }
        ],
        [DefaultObjectEvents.destroy]:[
            (obj,_dt:number)=>{
                obj.sprite_trail.destroy()
            }
        ],
        [DefaultObjectEvents.net_encode]:[
            (obj,stream,full)=>{
                obj.position=stream.read_pos2()
                obj.old_position=v2.clone(obj.position)
                obj.tticks=stream.read_float(0,60,2)
                if(full){
                    obj.initialPosition=stream.read_pos2()
                    obj.max_distance=stream.read_float32()
                    obj.speed=stream.read_float32()
                    obj.sprite_trail.rotation=stream.read_rad()

                    obj.max_length=stream.read_float32()
                    obj.sprite_trail.scale!.y=stream.read_float32()
                    const col=ColorM.number(stream.read_uint32())
                    col.a=stream.read_uint8()
                    obj.sprite_trail.tint=col

                    //this.particles=stream.read_uint8()
                    obj.sprite_trail.visible=true
                    const bg=stream.read_boolean_group()
                    obj.hit_owner=bg[0]
                    obj._critical=bg[1]
                    obj.pass_through_humans=bg[2]
                    obj.pass_through_everthing=bg[3]
                    obj.owner_id=stream.read_id()
                    
                    obj.velocity=v2.from_RadAngle(obj.sprite_trail.rotation,obj.speed)
                }
            }
        ],
        [ObjectsComponentEvent.collided]:[
            (tobj,other:GameObject)=>{
                switch(other.number_type){
                    case GameObjectType.Human:{
                        if((other as Human).dead||(other as Human).parachute||tobj.collided_with.has(other)||(other.id===tobj.owner_id&&!tobj.hit_owner))break
                        const colBody=other.hitbox.overlap_line(tobj.old_position,tobj.position)
                        const reflectSeg = (other as Human).get_reflect_segment()
                        let colReflect = null
                        let isReflect = false
                        let chosen: typeof colBody | typeof colReflect = null
                        if (reflectSeg) {
                            colReflect = reflectSeg.overlap_line(tobj.old_position,tobj.position)
                        }
                        if (colBody || colReflect) {
                            const distBody = colBody ? v2.distance(tobj.old_position, colBody.point) : Infinity
                            const distPan = colReflect ? v2.distance(tobj.old_position, colReflect.point) : Infinity
                            if (distPan < distBody) {
                                chosen = colReflect
                                isReflect = true
                            } else {
                                chosen = colBody
                            }
                        }
                        if(chosen){
                            tobj.collided_with.add(other);
                            (other as Human).on_hitted(tobj.position,tobj._critical,undefined,isReflect)
                            if(!(tobj.pass_through_humans||tobj.pass_through_everthing)||isReflect)tobj.die()
                        }
                        break
                    }
                    case GameObjectType.StaticBody:
                    case GameObjectType.Walls:
                    case GameObjectType.Building:
                    case GameObjectType.Obstacle:
                        if(!tobj.collided_with.has(other)&&!(other as StaticBody).physical_data.no_bullets_collision){
                            const col=other.hitbox.overlap_line(tobj.old_position,tobj.position)
                            if(col){
                                tobj.collided_with.add(other);
                                (other as StaticBody).on_hitted(tobj.position,tobj._critical)
                                if(!((other as StaticBody).physical_data.passable_by_bullets||tobj.pass_through_everthing))tobj.die()
                            }
                        }
                        break
                }
            }
        ]
    }
} as ObjectComponent<Bullet>
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
    max_distance:number=1
    max_length:number=0.3

    ////////////////////////////
    // Visual                 //
    ////////////////////////////
    sprite_trail!:Sprite2D

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
    tticks:number=0

    ////////////////////////////
    // Misc                   //
    ////////////////////////////
    owner_id:number=0

    collided_with:Set<GameObject>=new Set()

    hit_owner:boolean=false
    pass_through_humans:boolean=false
    pass_through_everthing:boolean=false
    constructor(){
        super()

        this.add_component(bullet_c)
        this.add_component(bullet_nc)
    }
    override on_layer_set(): void {
    }
    override on_create(_args: Record<string, void>) {
    }
    override on_destroy(): void {
        this.sprite_trail.destroy()
    }
    override render(_camera: Camera2D, _dt: number): void {

    }
    override on_tick(dt:number): void {
        if(v2.distance(this.initialPosition,this.position)>this.max_distance)this.die()
        //dt*=0.01
        if(this.dying){
            this.dying=true
            this.tticks-=dt
            if(this.tticks<=0){
                this.destroy()
            }
        }else{
            this.old_position=v2.clone(this.position)
            if(this.sprite_trail.scale.x<this.max_length)this.tticks+=dt
            // Collisions
            const dst=v2.scale(this.velocity,dt)
            v2m.add(this._position,this._position,dst)
            // Bullet Whiz Sound
            if(this._play_bullet_whiz&&!(this.owner_id===this.game.active_entity_id&&!this.hit_owner)){
                const dist=v2.distance(this.position,this.scene.camera.position)
                if(dist<7){
                    this.game.sounds.play(this.game.resources.get_sound("bullet_whiz_"+random.int(1,3).toString()),{
                        position: this.position,
                        max_distance: 7,
                        volume:0.6
                    })
                    this._play_bullet_whiz=false
                }
            }

            // Collisions with objects
            const objs:GameObject[]=this.manager.cells.get_objects(this.hitbox,this.layer)
            for(const obj of objs){
                if(this.dying)break
                this.emit_event(ObjectsComponentEvent.collided,obj)
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
            this.max_length
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
            this.max_distance=stream.read_float32()
            this.speed=stream.read_float32()
            this.sprite_trail.rotation=stream.read_rad()

            this.max_length=stream.read_float32()
            this.sprite_trail.scale!.y=stream.read_float32()
            const col=ColorM.number(stream.read_uint32())
            col.a=stream.read_uint8()
            this.sprite_trail.tint=col

            //this.particles=stream.read_uint8()
            this.sprite_trail.visible=true
            const bg=stream.read_boolean_group()
            this.hit_owner=bg[0]
            this._critical=bg[1]
            this.pass_through_humans=bg[2]
            this.pass_through_everthing=bg[3]
            this.owner_id=stream.read_id()
            
            this.velocity=v2.from_RadAngle(this.sprite_trail.rotation,this.speed)
        }
    }
}