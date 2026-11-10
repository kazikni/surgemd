import { Angle, gel_events, GELComponent, Numeric, Orientation, random, RotationMode, Vec2 } from "../../../../engine/core.ts";
import { ObstacleDef } from "../../../definitions/objects/obstacles.ts";
import { DamageParams, object_instance_type } from "../../../others/constants.ts";
import { static_body_events, SI_StaticBody, type C_StaticBody, c_static_body, si_static_body } from "./static_body.ts";
export const obstacle_events={
    set_definition:static_body_events.last,
    initialized:static_body_events.last+1,
    reset_scale:static_body_events.last+2,
    die:static_body_events.last+3,
    last:static_body_events.last+4,
}

export type C_Obstacle=C_StaticBody&{
    def:ObstacleDef

    scale:number
    rotation:number

    variation:number

    health?:{
        dead:boolean
        value:number
    }

    set_definition(def:ObstacleDef):void
    set_physical(position?:Vec2,scale?:number,rotation?:number):void
    die():void
}

export const c_obstacle:GELComponent<C_Obstacle>={
    id_string:"c_obstacle",
    extensions:[c_static_body],
    events:{
        [gel_events.bind]:function(){
            this.instance_type=object_instance_type.obstacle

            this.rotation=0
            this.scale=1

            this.variation=0
        },
        [gel_events.create]:function(args:{def:ObstacleDef}){
            if(args){
                if(args.def)this.set_definition(args.def)
            }
        },
    },
    methods:{
        set_definition(def:ObstacleDef){
            this.def=def
            if(this.def.health!==undefined&&!this.def.imortal){
                this.health={
                    value:this.def.health??1,
                    dead:false
                }
            }
            this.emit_event(obstacle_events.set_definition,def)
        },
        die(){
            if(!this.health||this.health.dead)return
            this.health.dead=true
            this.emit_event(obstacle_events.die)
        },
    },
}

export type SI_Obstacle=C_Obstacle&SI_StaticBody&{
    physical:{
        dirty:boolean
        dirty_part:boolean
    }
    max_scale:number
    damage(damage:DamageParams):void
    init(rotation?:number,scale?:number,variation?:number,parent_side?:number):void
    set_position(position:Vec2):void
    reset_scale():void
}
export const si_obstacle:GELComponent<SI_Obstacle>={
    id_string:"si_obstacle",
    extensions:[c_obstacle,si_static_body],
    events:{
    },
    methods:{
        init(rotation?:number,scale?:number,variation?:number,parent_side:Orientation=0):void{
            if(this.def.rotation_mode===RotationMode.limited){
                this.rotation=rotation===undefined?random.int(0,3):Angle.add_orientation(rotation as Orientation,parent_side)
                if(this.def.collider)this.physical.collider=this.def.collider.transform(undefined,undefined,undefined,this.rotation)
            }else{
                this.rotation=rotation??random.rad()
                if(this.def.collider)this.physical.collider=this.def.collider
            }

            if(variation){
                this.variation=variation
            }else if(this.def.assets?.frame?.variations){
                this.variation=Numeric.clamp(random.int(1,this.def.assets.frame.variations+1),1,this.def.assets.frame.variations)
            }

            this.max_scale=scale??(this.def.scale?.min&&this.def.scale.max?random.float(this.def.scale.min,this.def.scale.max):1)

            this.base_collider=this.physical.collider
            this.physical.interaction_collider=this.physical.collider.transform(undefined,1.1)
            
            this.reset_scale()
            this.emit_event(obstacle_events.initialized)
        },
        set_position(position:Vec2){
            this.position=position
            this.reset_scale()
        },
        reset_scale(){
            let scale=this.max_scale
            if(this.physical.collider&&this.def.scale&&this.health){
                const destroyScale = (this.def.scale.destroy ?? 1)*this.max_scale;
                scale=Math.max(this.health.value/this.def.health!*(this.max_scale-destroyScale)+destroyScale,0)
                this.set_dirty_part()
                this.physical.dirty_part=true
            }
            
            this.scale=scale

            this.base_collider=this.physical.collider.transform(undefined,this.scale)
            if(this.def.spawnCollider){
                this.physical.spawn_collider=this.def.rotation_mode===RotationMode.limited?this.def.spawnCollider.transform(undefined,undefined,undefined,this.rotation):this.def.spawnCollider
                this.physical.spawn_collider=this.physical.spawn_collider.transform(undefined,scale)
            }
            this.emit_event(obstacle_events.reset_scale)
            this.set_physical(this.position,scale,this.rotation)
            this.update_collider()
        }
    }
}