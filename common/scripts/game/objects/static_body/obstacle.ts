import { Angle, gel_events, GELComponent, Numeric, Orientation, random, RotationMode, Stream, v2, Vec2 } from "../../../../engine/core.ts";
import { ObstacleDef } from "../../../definitions/objects/obstacles.ts";
import { DamageParams, LootData, object_instance_type } from "../../../others/constants.ts";
import { type SI_Interactor } from "../interaction.ts";
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

    decode_obstacle(stream:Stream,full:boolean):boolean
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
                    value:0,
                    dead:true
                }
            }
            this.physical.no_collision=this.def.no_collision??false
            this.physical.no_projectiles_collision=this.def.no_projectiles_collision??false

            this.emit_event(obstacle_events.set_definition,def)
        },
        set_physical(_position?:Vec2,_scale?:number,_rotation?:number){
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
    loot:LootData[]
    damage(damage:DamageParams):void
    load_loot():void
    can_interact(user:SI_Interactor):boolean
    on_interact(user:SI_Interactor):void
    init(rotation?:number,scale?:number,variation?:number,parent_side?:number):void
    set_position(position:Vec2):void
    reset_scale():void
}
export const si_obstacle:GELComponent<SI_Obstacle>={
    id_string:"si_obstacle",
    extensions:[c_obstacle,si_static_body],
    events:{
        [gel_events.bind]:function(){
            this.loot=[]
        },
        [gel_events.net_encode](stream:Stream,full:boolean){
            stream.write_boolean_group(this.health?.dead??false,this.physical.dirty_part,this.physical.dirty)
            if(full){
                stream.write_uint16(this.def.id_number!)
            }
            if(full||this.physical.dirty||this.physical.dirty_part){
                stream.write_float32(this.scale)
            }
            if(full||this.physical.dirty){
                stream.write_uint8(this.variation)
                stream.write_rad(this.rotation)
                stream.write_pos2(this.position)
            }
            if(this.health){
                stream.write_float(this.health.value/this.def.health!,0,1,1)
            }
        },
        [obstacle_events.die]:function(){
            const pos=v2.clone(this.position)
            for(const l of this.loot){
                const loot=this.scene.add_object(this.scene.make_object(object_instance_type.loot),this.layer,undefined,{data:l,position:v2.add(pos,v2.random(-0.5,0.5))})
                ;(loot as {push?:(speed:number,angle:number)=>void}).push?.(random.float(0.5,2),random.rad())
            }
            this.loot.length=0
            if(!this.def.keep_collision_on_die){
                this.physical.no_collision=true
                this.physical.no_projectiles_collision=true
            }
            this.reset_scale()
            this.set_dirty_part()
        },
        [gel_events.checkpoint_encode]:function(stream:Stream){
            stream.write_string(this.def.id_string,1)
            stream.write_uint8(this.variation)
            stream.write_float32(this.rotation)
            stream.write_float32(this.max_scale)
            stream.write_pos2(this.position)
            stream.write_boolean_group(this.health!==undefined,this.health?.dead??false)
            if(this.health)stream.write_float32(this.health.value)
        },
        [gel_events.checkpoint_decode]:function(stream:Stream){
            this.set_definition(this.app.definitions.obstacles.getFromString(stream.read_string(1)))
            const variation=stream.read_uint8()
            const rotation=stream.read_float32()
            const max_scale=stream.read_float32()
            const position=stream.read_pos2()
            const [has_health,dead]=stream.read_boolean_group()
            const health=has_health?stream.read_float32():undefined
            this.init(rotation,max_scale,variation)
            if(this.health&&health!==undefined)this.health.value=health
            this.set_position(position)
            if(dead)this.die()
        },
        [obstacle_events.set_definition]:function(def:ObstacleDef){
            this.physical.no_spawn_collision=this.def.no_spawn_collision
            this.physical.no_pathfinding_collision=this.def.no_pathfinding_collision
            this.physical.passable_by_projectiles=def.passable_by_bullets
        }
    },
    methods:{
        load_loot(){
            this.loot.length=0
            if(this.def.loot_table)this.loot.push(...this.scene.mode.get_loot(this.def.loot_table))
        }, 
        damage(params:DamageParams){
            if(!this.health||this.health.dead||this.def.imortal)return
            if((this.def.resistence??0)>(params.resistence??0))return
            this.health.value=Math.max(this.health.value-params.amount,0)
            if(this.health.value<=0){
                this.die()
            }else{
                this.reset_scale()
            }
            this.set_dirty_part()
        },
        can_interact(user:SI_Interactor):boolean{
            if(this.destroyed||!this.def.interactDestroy||!this.health||this.health.dead)return false
            return user.collider.colliding_with(this.interaction_collider??this.collider)||user.collider.colliding_with(this.collider)
        },
        on_interact(user:SI_Interactor){
            if(this.def.interactDestroy){
                this.die()
            }
        },
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

            if(this.health){
                this.health.dead=false
                this.health.value=this.def.health!
            }

            this.reset_scale()
            this.load_loot()
            this.emit_event(obstacle_events.initialized)
        },
        set_position(position:Vec2){
            this.position=position
            this.reset_scale()
            this.physical.dirty=true
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