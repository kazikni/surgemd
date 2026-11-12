import { gel_events,  Vec2, v2, RotationMode, Angle, Orientation, ColorM, Numeric, GELComponent, Stream, random } from "common/engine/core.ts";
import { Container2D, Sprite2D } from "common/engine/web.ts";
import { ObstacleDef } from "common/scripts/definitions/objects/obstacles.ts";
import { obstacle_events, c_obstacle, C_Obstacle, SI_Obstacle, si_obstacle } from "common/scripts/game/objects/static_body/obstacle.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { cc_static_body, CC_StaticBody } from "./static_body.ts";

export function GetObstacleBaseFrame(def:ObstacleDef,variation:number):string{
    let spr=def.assets?.frame?.base??def.id_string
    if(def.assets?.frame?.variations&&(def.assets.frame.sprite_variations===undefined?true:def.assets.frame.sprite_variations))spr+=`_${variation}`
    return spr
}

export type CC_Obstacle=C_Obstacle&CC_StaticBody&{
    container:Container2D
    sprite:Sprite2D
    aditional_sprite:Sprite2D[]
    update_frame():void
    on_die():void
}
export const cc_obstacle:GELComponent<CC_Obstacle>={
    id_string:"cc_obstacle",
    extensions:[c_obstacle,cc_static_body],
    events:{
        [gel_events.bind]:function(){
            this.aditional_sprite=[]

            this.container=new Container2D()
            this.container.visible=false

            this.sprite=new Sprite2D()

            this.container.add_child(this.sprite)

        },
        [gel_events.create]:function(){
            this.scene.camera.add_object(this.container)
        },
        [gel_events.destroy]:function(){
            this.container.destroy()
        },
        [gel_events.layer_set]:function(){
            this.container.layer=this.layer
        },
        [obstacle_events.set_definition](def:ObstacleDef){
            this.assets={
                particles:{images:[]},
                sounds:{}
            }
            if(def.assets?.sounds)this.set_hit_sounds_def(def.assets?.sounds)
            if(def.assets?.particles)this.set_hit_particles_def(def.id_string,this.variation,this.def.assets!.particles!)
            this.update_frame()
        },
        [obstacle_events.die](){
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
        },
    },
    methods:{
        update_frame(){
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
            }else{
                this.sprite.frame=this.app.resources.get_frame(GetObstacleBaseFrame(this.def,this.variation))
                this.container.zIndex=this.def.zIndex?.base===undefined?zIndexes.Obstacles1:this.def.zIndex?.base
                for(const spr of this.aditional_sprite){
                    spr.visible=true
                }
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
        },
        set_physical(position?:Vec2,scale?:number,rotation?:number){
            if(position)this.container.position=position
            if(rotation!==undefined){
                if(this.def.rotation_mode===RotationMode.full)this.container.rotation=rotation
                else if(this.def.rotation_mode===RotationMode.limited)this.container.rotation=Angle.side2rad(rotation as Orientation)
            }
            if(scale!==undefined)this.container.scale=v2(scale,scale)
        },
    }
}
export const ccs_obstacle:GELComponent<CC_Obstacle&SI_Obstacle>={
    extensions:[cc_obstacle,si_obstacle],
    id_string:"ccs_obstacle", // Loot Self
    events:{
        [obstacle_events.initialized]:function(){
            this.update_frame()
        },
    },
}
export const ccn_obstacle:GELComponent<CC_Obstacle>={
    extensions:[cc_obstacle],
    id_string:"ccn_obstacle",
    events:{
        [gel_events.net_decode]:function(stream:Stream,full:boolean){
            const [dead,physical_dirty_part,physical_dirty]=stream.read_boolean_group()

            if(full){
                this.set_definition(this.app.definitions.obstacles.getFromNumber(stream.read_uint16()))
                this.update_frame()
            }
            if(physical_dirty||physical_dirty_part||full){
                this.scale=stream.read_float32()
                this.set_physical(undefined,this.scale)
            }
            if(physical_dirty||full){
                this.variation=stream.read_uint8()
                this.rotation=stream.read_rad()
                this.position=stream.read_pos2()
                this.set_physical(this.position,undefined,this.rotation)
            }

            if(this.health){
                if(dead&&!this.health.dead){
                    this.die()
                }else if(!dead&&this.health.dead){
                    this.health.dead=false
                    this.update_frame()
                }
                this.health.value=stream.read_float(0,1,1)
            }
        },
    },
}
