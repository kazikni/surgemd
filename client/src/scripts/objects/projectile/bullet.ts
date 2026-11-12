import { CircleCollider2D, ColorM, random, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { Sprite2D } from "common/engine/web.ts";
import { type C_StaticBody } from "common/scripts/game/objects/static_body/static_body.ts";
import { object_instance_type, ObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../../main/gel.ts";
import { type Human } from "../human.ts";

type Hittable=GameObject&{
    on_hitted(position:Vec2,critical?:boolean,sound?:string,reflected?:boolean,weight?:number):void
}

export class Bullet extends GameObject{
    speed:number=0
    max_distance:number=1
    angle:number=0
    weight:number=0
    critical:boolean=false
    hit_owner:boolean=false
    pass_through_humans:boolean=false
    pass_through_everthing:boolean=false
    owner_id:number=0

    initial_position:Vec2=v2.zero()
    old_position:Vec2=v2.zero()
    velocity:Vec2=v2.zero()
    tticks:number=0
    max_length:number=0.3
    collided_with=new Set<number>()
    dying:boolean=false
    whiz:boolean=false
    sprite_trail=new Sprite2D()

    constructor(){
        super()
        this.object_type=ObjectType.Bullet
        this.instance_type=object_instance_type.bullet
        this.allow_tick=true
        this.base_collider=new CircleCollider2D(v2(0,0),0.2)
        this.sprite_trail.hotspot=v2(1,0.5)
        this.sprite_trail.visible=false
        this.sprite_trail.zIndex=zIndexes.Bullets
    }

    on_create(){
        this.sprite_trail.frame=this.app.resources.get_frame("base_trail")
        this.sprite_trail.size=v2(200,17)
        this.scene.camera.add_object(this.sprite_trail)
    }
    on_layer_set(){
        this.sprite_trail.layer=this.layer
    }
    on_destroy(){
        this.sprite_trail.destroy()
    }

    on_decode_net(stream:Stream,full:boolean){
        this.position=stream.read_pos2()
        this.old_position=v2.clone(this.position)
        this.tticks=stream.read_float(0,100,2)
        if(!full)return
        this.initial_position=stream.read_pos2()
        this.max_distance=stream.read_float32()
        this.speed=stream.read_float32()
        this.angle=stream.read_rad()
        this.weight=stream.read_uint8()
        this.max_length=stream.read_float32()
        this.sprite_trail.scale.y=stream.read_float32()
        const color=ColorM.number(stream.read_uint32())
        color.a=stream.read_uint8()
        this.sprite_trail.tint=color
        const [hit_owner,critical,pass_through_humans,pass_through_everthing]=stream.read_boolean_group()
        this.hit_owner=hit_owner
        this.critical=critical
        this.pass_through_humans=pass_through_humans
        this.pass_through_everthing=pass_through_everthing
        this.owner_id=stream.read_id()
        this.velocity=v2.from_RadAngle(this.angle,this.speed)
        this.sprite_trail.rotation=this.angle
        this.sprite_trail.visible=true
    }

    on_tick(dt:number){
        if(v2.distance(this.initial_position,this.position)>this.max_distance)this.die()
        if(this.dying){
            this.tticks-=dt
            if(this.tticks<=0)this.destroy()
        }else{
            this.old_position=v2.clone(this.position)
            if(this.sprite_trail.scale.x<this.max_length)this.tticks+=dt
            v2m.add_component(this._position,this.velocity.x*dt,this.velocity.y*dt)
            if(!this.whiz&&!(this.owner_id===(this.scene as {active_id?:number}).active_id&&!this.hit_owner)&&v2.distance(this.position,this.scene.camera.position)<7){
                this.whiz=true
                this.app.sounds.play(this.app.resources.get_sound("bullet_whiz_"+random.int(1,3)),{
                    position:v2.clone(this.position),
                    max_distance:20,
                    volume:0.6,
                    bus:"objects",
                })
            }
            for(const obj of this.manager.cells.get_objects(this.collider,this.layer) as GameObject[]){
                if(this.dying)break
                if(obj.id!==this.id&&!this.collided_with.has(obj.id))this.collide(obj)
            }
            this.sprite_trail.position=this.position
        }
        this.sprite_trail.scale.x=Math.min(this.speed*this.tticks,v2.distance(this.initial_position,this.position),this.max_length)
    }

    collide(obj:GameObject){
        if(obj.object_type===ObjectType.Human){
            const human=obj as unknown as Human
            if(human.dead||(obj.id===this.owner_id&&!this.hit_owner))return
            const col_body=obj.collider.overlap_line(this.old_position,this.position)
            const col_reflect=human.get_reflect_collider()?.overlap_line(this.old_position,this.position)
            if(!col_body&&!col_reflect)return
            const is_reflect=(col_reflect?v2.distance(this.old_position,col_reflect.point):Infinity)<(col_body?v2.distance(this.old_position,col_body.point):Infinity)
            this.collided_with.add(obj.id)
            human.on_hitted((is_reflect?col_reflect:col_body)!.point,this.critical,undefined,is_reflect,this.weight)
            if(!(this.pass_through_humans||this.pass_through_everthing)||is_reflect)this.die()
        }else if(obj.object_type===ObjectType.StaticBody){
            const body=obj as Hittable&C_StaticBody
            if(body.physical.no_projectiles_collision||!obj.collider.overlap_line(this.old_position,this.position))return
            this.collided_with.add(obj.id)
            body.on_hitted(this.position,this.critical)
            if(!(body.physical.passable_by_projectiles||this.pass_through_everthing))this.die()
        }
    }
    die(){
        this.dying=true
        this.velocity=v2.zero()
    }
}
