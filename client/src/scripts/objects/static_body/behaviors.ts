import { Angle, ColorM, gel_events, GELComponent, Orientation, random, RotationMode, Stream, type Tween } from "common/engine/core.ts";
import { ABParticle2D } from "common/engine/web.ts";
import { ObstacleBehaviorDoor, ObstacleBehaviorPlaySound, ObstacleBehaviorPress, ObstacleBehaviorTransformInto } from "common/scripts/definitions/objects/obstacles.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { CalculateDoorCollider } from "common/scripts/others/functions.ts";
import { type Obstacle } from "./obstacle.ts";

function obstacle_rad(o:Obstacle){
    return o.def.rotation_mode===RotationMode.limited?Angle.side2rad(o.rotation as Orientation):o.rotation
}
function play(o:Obstacle,sound:string|undefined,max_distance:number){
    if(!sound)return
    o.app.sounds.play(o.app.resources.get_sound(sound),{position:o.position,max_distance,bus:"obstacles"})
}

export type DoorObstacle=Obstacle&{door:{open:number,tween?:Tween<any>}}
export const cc_door:GELComponent<DoorObstacle>={
    id_string:"cc_door",
    events:{
        [gel_events.bind](){
            this.door={open:0}
        },
        [gel_events.net_decode](stream:Stream,full:boolean){
            const b=this.def.expanded_behavior as ObstacleBehaviorDoor
            const open=stream.read_int8()
            const base=this.def.collider?this.def.collider.transform(undefined,undefined,undefined,this.rotation):this.physical.collider
            this.physical.collider=CalculateDoorCollider(base,b)[open as -1|0|1]
            this.base_collider=this.physical.collider.transform(undefined,this.scale)
            const rotation=obstacle_rad(this)+(open===1?-Math.PI/2:open===-1?Math.PI/2:0)
            if(open!==this.door.open&&!full){
                play(this,open===0?b.close_sound:b.open_sound,30)
                this.door.tween?.kill()
                this.door.tween=this.app.clock.add_tween({
                    target:this.container,
                    to:{rotation},
                    duration:b.open_duration,
                    onComplete:()=>this.door.tween=undefined
                })
            }else if(!this.door.tween){
                this.container.rotation=rotation
            }
            this.door.open=open
        },
        [gel_events.destroy](){
            this.door.tween?.kill()
        },
    }
}

export type PlaySoundObstacle=Obstacle&{playing:boolean}
export const cc_play_sound:GELComponent<PlaySoundObstacle>={
    id_string:"cc_play_sound",
    events:{
        [gel_events.bind](){
            this.playing=false
        },
        [gel_events.net_decode](stream:Stream,full:boolean){
            const [playing]=stream.read_boolean_group()
            if(playing&&!this.playing&&!full)play(this,(this.def.expanded_behavior as ObstacleBehaviorPlaySound).click_sound,30)
            this.playing=playing
        },
    }
}

function spawn_particles(o:Obstacle,list:ObstacleBehaviorTransformInto["first_particles"],spread:boolean){
    for(const p of list??[]){
        o.app.clock.add_timeout(()=>{
            for(let c=0;c<p.count;c++){
                o.scene.particles.add_particle(new ABParticle2D({
                    frame:{layer:o.layer,...p.frame},
                    position:spread?o.collider.random_point():o.position,
                    speed:spread?random.float(1,4):random.float(1,2),
                    angle:o.rotation,
                    direction:random.rad(),
                    life_time:spread?3:2,
                    zIndex:zIndexes.Particles,
                    tint:spread?ColorM.default.white:undefined,
                    to:{
                        speed:random.float(0.1,1),
                        angle:o.rotation+random.rad(),
                        tint:spread?ColorM.default.transparent:undefined
                    }
                }))
            }
        },p.delay)
    }
}
export type TransformIntoObstacle=Obstacle&{transform_into:number}
export const cc_transform_into:GELComponent<TransformIntoObstacle>={
    id_string:"cc_transform_into",
    events:{
        [gel_events.bind](){
            this.transform_into=-1
        },
        [gel_events.net_decode](stream:Stream){
            const val=stream.read_int8()
            if(val===-1||this.transform_into!==-1){
                this.transform_into=val
                return
            }
            this.transform_into=val
            const b=this.def.expanded_behavior as ObstacleBehaviorTransformInto
            play(this,b.sound,30)
            spawn_particles(this,b.first_particles,false)
            if(b.sprites?.[val])this.sprite.set_frame(b.sprites[val],this.app.resources)
            if(b.delay)this.app.clock.add_timeout(()=>spawn_particles(this,b.transform_particles,true),b.delay)
        },
    }
}

export type PressObstacle=Obstacle&{press?:{activated:boolean,locked:boolean,allow_switch:boolean}}
export const cc_press:GELComponent<PressObstacle>={
    id_string:"cc_press",
    events:{
        [gel_events.net_decode](stream:Stream){
            const [activated,locked,allow_switch]=stream.read_boolean_group()
            const old=this.press
            this.press={activated,locked,allow_switch}
            if(old?.activated===activated)return
            const b=this.def.expanded_behavior as ObstacleBehaviorPress
            if(old)play(this,b.press_sound,20)
            if(activated)this.sprite.set_frame(b.pressed_frame??{},this.app.resources)
            else this.update_frame()
        },
    }
}

export const obstacle_behaviors:Record<number,GELComponent<any>>={
    0:cc_door,
    1:cc_play_sound,
    3:cc_transform_into,
    4:cc_press,
}
