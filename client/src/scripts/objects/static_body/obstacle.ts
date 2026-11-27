import { Vec2, v2, RotationMode, Angle, Orientation, ColorM, Numeric, GELComponent, Stream, random, GELMethod } from "common/engine/core.ts";
import { ABParticle2D, Container2D, Shadow2D, Sprite2D } from "common/engine/web.ts";
import { ObstacleBehaviorTransformInto, ObstacleDef } from "common/scripts/definitions/objects/obstacles.ts";
import { object_instance_type, zIndexes } from "common/scripts/others/constants.ts";
import { StaticBody } from "./static_body.ts";

export function GetObstacleBaseFrame(def:ObstacleDef,variation:number):string{
    let spr=def.assets?.frame?.base??def.id_string
    if(def.assets?.frame?.variations&&(def.assets.frame.sprite_variations===undefined?true:def.assets.frame.sprite_variations))spr+=`_${variation}`
    return spr
}
export class Obstacle extends StaticBody{
    def!:ObstacleDef

    scale:number
    rotation:number

    variation:number

    health?:{
        dead:boolean
        value:number
    }
    container:Container2D
    sprite:Sprite2D
    shadow?:Shadow2D
    aditional_sprite:Sprite2D[]

    transform_into_data?:{
        activated:boolean
    }

    constructor(){
        super()

        this.instance_type=object_instance_type.obstacle
        this.rotation=0
        this.scale=1
        this.variation=0

        this.aditional_sprite=[]

        this.container=new Container2D()
        this.container.visible=false

        this.sprite=new Sprite2D()

        this.container.add_child(this.sprite)
    }

    on_create(){
        this.shadow=this.scene.camera.lighting.create_shadow(this.sprite)
        this.scene.camera.add_object(this.container)
    }
    on_destroy(){
        this.container.destroy()
    }
    on_layer_set(){
        this.container.layer=this.layer
    }

    set_definition(def:ObstacleDef):void{
        this.def=def
        if(this.def.health!==undefined&&!this.def.imortal){
            this.health={
                value:0,
                dead:true
            }
        }
        this.physical.no_collision=this.def.no_collision??false
        this.physical.no_projectiles_collision=this.def.no_projectiles_collision??false
        this.physical.reflect_projectiles=this.def.reflect_bullets??false
        this.physical.passable_by_projectiles=this.def.passable_by_bullets??false

        if(this.def.expanded_behavior){
            switch(this.def.expanded_behavior.type){
                case 3:
                    this.transform_into_data={
                        activated:false
                    }
                    break
            }
        }
        this.assets={
            particles:{images:[]},
            sounds:{}
        }
        if(def.assets?.sounds)this.set_hit_sounds_def(def.assets.sounds)
        if(def.assets?.particles)this.set_hit_particles_def(def.id_string,this.variation,def.assets.particles)
        for(const d of this.def.assets?.aditional_sprites??[]){
            const s=new Sprite2D()
            s.set_frame(d,this.app.resources)
            this.container.add_child(s)
            this.aditional_sprite.push(s)
        }
        this.update_frame()
    }
    die():void{
        if(!this.health||this.health.dead)return
        this.health.dead=true
        if(this.assets.sounds.break){
            this.app.sounds.play(this.assets.sounds.break,{
                position:this.position,
                max_distance:15,
                bus:"obstacles",
            })
        }
        const ac=random.int(8,10)
        for(let i=0;i<ac;i++){
            this.add_own_particle(this.collider.random_point(),2,false)
        }
        this.update_frame()
    }
    update_frame():void{
        this.sprite.transform_frame({
            visible:true,
            tint:0xffffff,
            alpha:255,
            scale:2,
            hotspot:v2.half_one
        })
        if(this.def.assets?.frame?.transform)this.sprite.transform_frame(this.def.assets.frame.transform)
        this.sprite.matrix=undefined
        if(this.health?.dead){
            const frame=this.def.assets?.frame?.dead??this.def.id_string+"_dead"
            if(frame)this.sprite.frame=this.app.resources.get_frame(frame)
            this.container.zIndex=this.def.zIndex?.dead===undefined?zIndexes.DeadObstacles:this.def.zIndex?.dead
            for(const spr of this.aditional_sprite){
                spr.visible=false
            }
            if(this.def.assets?.frame?.dead_transform)this.sprite.transform_frame(this.def.assets?.frame.dead_transform)
            if(this.shadow)this.shadow.visible=false
        }else{
            this.sprite.frame=this.app.resources.get_frame(GetObstacleBaseFrame(this.def,this.variation))
            this.container.zIndex=this.def.zIndex?.base===undefined?zIndexes.Obstacles1:this.def.zIndex?.base
            for(const spr of this.aditional_sprite){
                spr.visible=true
            }
            if(this.shadow)this.shadow.visible=true
        }
        const tid=this.def.assets?.frame?.tint_variations
        if(tid){
            const a=this.sprite.tint.a
            const color=ColorM.number(tid[Numeric.clamp(this.variation-1,0,tid.length)])
            if(this.assets.particles)this.assets.particles.tint=color
            this.sprite.tint=color
            this.sprite.tint.a=a
        }
        this.container.visible=true
    }


    transform_into_update(def:number){
        if(this.transform_into_data?.activated)return
        this.transform_into_data!.activated=true

        if((this.def.expanded_behavior as ObstacleBehaviorTransformInto).sound)this.app.sounds.play(this.app.resources.get_sound((this.def.expanded_behavior as ObstacleBehaviorTransformInto).sound!),{
            max_distance:30,
            bus:"obstacles"
        })
        for(const p of (this.def.expanded_behavior as ObstacleBehaviorTransformInto).first_particles??[]){
            this.app.clock.add_timeout(()=>{
                for(let c=0;c<p.count;c++){
                    this.scene.particles.add_particle(new ABParticle2D({
                        frame:{layer:this.layer,...p.frame},
                        position:this.position,
                        speed:random.float(1,2),
                        angle:this.rotation,
                        direction:random.rad(),
                        life_time:2,
                        zIndex:zIndexes.Particles,
                        to:{
                            speed:random.float(0.1,1),
                            angle:this.rotation+random.rad(),
                        }
                    }))
                }
            },p.delay)
        }
        if((this.def.expanded_behavior as ObstacleBehaviorTransformInto).sprites&&(this.def.expanded_behavior as ObstacleBehaviorTransformInto).sprites![def]){
            this.sprite.set_frame((this.def.expanded_behavior as ObstacleBehaviorTransformInto).sprites![def],this.app.resources)
        }
        if((this.def.expanded_behavior as ObstacleBehaviorTransformInto).delay){
            this.app.clock.add_timeout(()=>{
                for(const p of (this.def.expanded_behavior as ObstacleBehaviorTransformInto).transform_particles??[]){
                    this.app.clock.add_timeout(()=>{
                        for(let c=0;c<p.count;c++){
                            this.scene.particles.add_particle(new ABParticle2D({
                                frame:{layer:this.layer,...p.frame},
                                position:this.collider.random_point(),
                                speed:random.float(1,4),
                                angle:this.rotation,
                                direction:random.rad(),
                                life_time:3,
                                zIndex:zIndexes.Particles,
                                tint:ColorM.default.white,
                                to:{
                                    speed:random.float(0.1,1),
                                    angle:this.rotation+random.rad(),
                                    tint:ColorM.default.transparent
                                }
                            }))
                        }
                    },p.delay)
                }
            },(this.def.expanded_behavior as ObstacleBehaviorTransformInto).delay!)
        }
    }

    on_decode_net(stream:Stream,full:boolean){
        const [dead,physical_dirty_part,physical_dirty,transform_into_active]=stream.read_boolean_group()

        if(full){
            this.set_definition(this.app.definitions.obstacles.getFromNumber(stream.read_uint16()))
            this.update_frame()
        }
        if(dead){
            if(!this.def.keep_collision_on_die){
                this.physical.no_collision=true
                this.physical.no_projectiles_collision=true
            }
        }
        if(physical_dirty||full){
            this.variation=stream.read_uint8()
            this.rotation=stream.read_float32()
            this.position=stream.read_pos2()
            this.container.position=this.position
            if(this.def.rotation_mode===RotationMode.full){
                this.container.rotation=this.rotation
            }else if(this.def.rotation_mode===RotationMode.limited){
                this.container.rotation=Angle.side2rad(this.rotation as Orientation)
            }
            if(this.def.collider)this.physical.collider=this.def.collider.transform(undefined,undefined,undefined,this.rotation)
        }
        if(physical_dirty||physical_dirty_part||full){
            this.scale=stream.read_float32()
            this.container.scale=v2(this.scale,this.scale)
            this.base_collider=this.physical.collider.transform(undefined,this.scale)
        }

        /*if(this.transform_into_data){
            if(this.transform_into_data.activated&&!transform_into_active){
                this.transform_into_data.activated=false
            }else if(transform_into_active){
                this.transform_into_update(stream.read_uint8())
            }
        }*/
        if(this.health){
            if(dead&&!this.health.dead){
                this.die()
            }else if(!dead&&this.health.dead){
                this.health.dead=false
                this.update_frame()
                this.physical.no_collision=this.def.no_collision
                this.physical.no_projectiles_collision=this.def.no_projectiles_collision
            }
            this.health.value=stream.read_float(0,1,1)
        }
    }
}