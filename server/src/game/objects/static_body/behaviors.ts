import { Angle, Collider2D, gel_events, GELComponent, Orientation, random, RotationMode, Stream, v2, Vec2 } from "common/engine/core.ts";
import { ObstacleBehaviorDoor, ObstacleBehaviorPlaySound, ObstacleBehaviorScalable, ObstacleBehaviorTransformInto } from "common/scripts/definitions/objects/obstacles.ts";
import { object_instance_type } from "common/scripts/others/constants.ts";
import { CalculateDoorCollider } from "common/scripts/others/functions.ts";
import { type Human } from "../human/human.ts";
import { type Obstacle } from "./obstacle.ts";

export const obstacle_events={
    init:"obstacle_init",
    interact:"obstacle_interact",
}

function obstacle_rad(o:Obstacle){
    return o.def.rotation_mode===RotationMode.limited?Angle.side2rad(o.rotation as Orientation):o.rotation
}

export type DoorObstacle=Obstacle&{
    door:{
        open:-1|0|1
        colliders:Record<number,Collider2D>
        locked:boolean
        opening:boolean
        only_side?:-1|1
    }
}
function door_set(o:DoorObstacle,val:-1|0|1){
    o.door.open=val
    o.door.opening=false
    o.physical.collider=o.door.colliders[val]
    o.reset_scale()
    o.set_dirty_part()
}
export const si_door:GELComponent<DoorObstacle>={
    id_string:"si_door",
    events:{
        [gel_events.bind](){
            this.interactable=true
            this.door={open:0,colliders:{},locked:false,opening:false}
        },
        [obstacle_events.init](){
            this.door.colliders=CalculateDoorCollider(this.physical.collider,this.def.expanded_behavior as ObstacleBehaviorDoor)
            door_set(this,this.door.open)
        },
        [obstacle_events.interact](user:Human){
            const b=this.def.expanded_behavior as ObstacleBehaviorDoor
            if(this.door.locked||this.door.opening||(b.cant_close&&this.door.open!==0))return
            let val:-1|0|1=0
            if(this.door.open===0){
                const local=v2.rotate_RadAngle(v2.sub(user.position,this.position),-obstacle_rad(this))
                val=this.door.only_side??(local.y>=0?1:-1)
            }
            if(b.open_delay){
                this.door.opening=true
                this.app.clock.add_timeout(()=>{
                    if(!this.destroyed)door_set(this,val)
                },b.open_delay)
            }else{
                door_set(this,val)
            }
        },
        [gel_events.net_encode](stream:Stream){
            stream.write_int8(this.door.open)
        },
        [gel_events.checkpoint_encode](stream:Stream){
            stream.write_int8(this.door.open)
            stream.write_boolean_group(this.door.locked,this.door.only_side!==undefined)
            if(this.door.only_side!==undefined)stream.write_int8(this.door.only_side)
        },
        [gel_events.checkpoint_decode](stream:Stream){
            const open=stream.read_int8() as -1|0|1
            const [locked,has_side]=stream.read_boolean_group()
            this.door.locked=locked
            if(has_side)this.door.only_side=stream.read_int8() as -1|1
            door_set(this,open)
        },
    }
}

export type PlaySoundObstacle=Obstacle&{playing:boolean}
export const si_play_sound:GELComponent<PlaySoundObstacle>={
    id_string:"si_play_sound",
    events:{
        [gel_events.bind](){
            this.interactable=true
            this.playing=false
        },
        [obstacle_events.interact](){
            if(this.playing)return
            this.playing=true
            this.set_dirty_part()
            this.app.clock.add_timeout(()=>{
                this.playing=false
                this.set_dirty_part()
            },(this.def.expanded_behavior as ObstacleBehaviorPlaySound).duration)
        },
        [gel_events.net_encode](stream:Stream){
            stream.write_boolean_group(this.playing)
        },
    }
}

export const si_scalable:GELComponent<Obstacle>={
    id_string:"si_scalable",
    events:{
        [gel_events.bind](){
            this.interactable=true
        },
        [obstacle_events.interact](user:Human){
            const b=this.def.expanded_behavior as ObstacleBehaviorScalable
            const rad=obstacle_rad(this)
            let side:ObstacleBehaviorScalable["interact_side"][number]|undefined
            let dist=Infinity
            for(const s of b.interact_side){
                const d=v2.distanceSquared(v2.add(this.position,v2.rotate_RadAngle(s.pos,rad)),user.position)
                if(d<dist){
                    dist=d
                    side=s
                }
            }
            if(!side)return
            user.manager.set_layer(user,user.layer+b.floor_walk)
            if(side.dest_pos)user.position=v2.add(this.position,v2.rotate_RadAngle(side.dest_pos,rad))
            if(side.dest_rot!==undefined)user.rotation=Angle.deg2rad(side.dest_rot)+rad
        },
    }
}

export type TransformIntoObstacle=Obstacle&{transform_into:number}
function transform_into(o:TransformIntoObstacle){
    if(o.destroyed)return
    const b=o.def.expanded_behavior as ObstacleBehaviorTransformInto
    const def=o.app.definitions.obstacles.getFromString(b.obstacles[o.transform_into].id)
    const position:Vec2=v2.clone(o.position)
    const rotation=o.rotation
    const layer=o.layer
    o.destroy()
    const obs=o.scene.add_object(o.scene.make_object(object_instance_type.obstacle),layer,undefined,{def}) as Obstacle
    obs.init(rotation)
    obs.set_position(position)
}
export const si_transform_into:GELComponent<TransformIntoObstacle>={
    id_string:"si_transform_into",
    events:{
        [gel_events.bind](){
            this.interactable=true
            this.transform_into=-1
        },
        [obstacle_events.interact](user:Human){
            if(this.transform_into!==-1)return
            const b=this.def.expanded_behavior as ObstacleBehaviorTransformInto
            this.transform_into=b.obstacles.indexOf(random.weight2(b.obstacles)!)
            this.interactable=false
            this.set_dirty_part()
            if(b.give_item){
                for(const l of this.scene.mode.get_loot(b.give_item))user.inventory.give_loot(l,true,user.position,user.layer)
            }
            if(b.delay)this.app.clock.add_timeout(()=>transform_into(this),b.delay)
            else transform_into(this)
        },
        [gel_events.net_encode](stream:Stream){
            stream.write_int8(this.transform_into)
        },
        [gel_events.checkpoint_encode](stream:Stream){
            stream.write_int8(this.transform_into)
        },
        [gel_events.checkpoint_decode](stream:Stream){
            this.transform_into=stream.read_int8()
            if(this.transform_into!==-1)this.app.clock.add_timeout(()=>transform_into(this),0)
        },
    }
}

export type PressObstacle=Obstacle&{
    press:{
        activated:boolean
        locked:boolean
        allow_switch:boolean
    }
}
export const si_press:GELComponent<PressObstacle>={
    id_string:"si_press",
    events:{
        [gel_events.bind](){
            this.interactable=true
            this.press={activated:false,locked:false,allow_switch:true}
        },
        [obstacle_events.interact](){
            if(this.press.locked)return
            if(this.press.allow_switch)this.press.activated=!this.press.activated
            else if(!this.press.activated)this.press.activated=true
            else return
            this.set_dirty_part()
        },
        [gel_events.net_encode](stream:Stream){
            stream.write_boolean_group(this.press.activated,this.press.locked,this.press.allow_switch)
        },
        [gel_events.checkpoint_encode](stream:Stream){
            stream.write_boolean_group(this.press.activated,this.press.locked,this.press.allow_switch)
        },
        [gel_events.checkpoint_decode](stream:Stream){
            const [activated,locked,allow_switch]=stream.read_boolean_group()
            this.press={activated,locked,allow_switch}
        },
    }
}

export const obstacle_behaviors:Record<number,GELComponent<any>>={
    0:si_door,
    1:si_play_sound,
    2:si_scalable,
    3:si_transform_into,
    4:si_press,
}
