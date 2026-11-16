import { CircleCollider2D, ColorM, ease, Numeric, random, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { ABParticle2D, type AnimatedContainerModeCallback, AnimatedContainer2D, AnimatedSprite2D, Container2D, type Frame, Shape2D, Sprite2D } from "common/engine/web.ts";
import { HumanoidAnimations, type HumanoidMomentaryDef } from "common/scripts/definitions/objects/humanoid_animations.ts";
import { type LoadoutBodyDef, type LoadoutLegDef, type LoadoutShirtDef } from "common/scripts/definitions/loadout/skins.ts";
import { decode_visual, type HumanVisual } from "common/scripts/game/objects/human/codec.ts";
import { GameConstants, zIndexes } from "common/scripts/others/constants.ts";
import { DefaultDownedWalkFistRig, DefaultFistRig, type FistRig } from "common/scripts/others/item.ts";
import { FloorKind, Floors, FloorType } from "common/scripts/others/terrain.ts";
import { GameObject } from "../main/gel.ts";

export interface HumanoidWalk{
    cycle:number
    time:number
    speed:number
    idle:number
    footstep_distance:number
    footstep_alternate:boolean
    footstep_sound?:{stop():void}
    last_position?:Vec2
}
export interface HumanoidSprites{
    hair:Sprite2D
    body:Sprite2D
    eyes:AnimatedSprite2D
    mounth:AnimatedSprite2D
    left_arm:Container2D
    right_arm:Container2D
    left_shirt_arm:Sprite2D
    left_hand:Sprite2D
    right_shirt_arm:Sprite2D
    right_hand:Sprite2D
    chest:Sprite2D
    left_leg:Container2D
    right_leg:Container2D
    left_leg_l:Sprite2D
    right_leg_l:Sprite2D
    left_leg_foot:Sprite2D
    right_leg_foot:Sprite2D
    shadow?:Shape2D
    accessorys:Sprite2D[]
}

export const HumanoidModes:Record<string,AnimatedContainerModeCallback>={
    eyes:(h:Humanoid,state:number=0,animated:boolean=true)=>h.set_eyes(state,animated),
    mounth:(h:Humanoid,state:number=0,enabled:boolean=true)=>h.set_mounth(state,enabled),
    reset:(h:Humanoid)=>h.reset_pose(),
}

export class Humanoid extends GameObject{
    name:string=""
    dead:boolean=false
    downed:boolean=false
    swimming:boolean=false
    scale:number=1
    rotation:number=0

    visual!:HumanVisual
    momentary?:{
        def:HumanoidMomentaryDef
        time:number
    }

    container!:AnimatedContainer2D
    sprites!:HumanoidSprites
    assets:{
        eyes?:Frame[]
        mounth?:Frame[]
        arm_frame_small?:Frame
        arm_frame_medium?:Frame
    }={}
    walk:HumanoidWalk={cycle:0,time:0,speed:0,idle:0,footstep_distance:0,footstep_alternate:false}
    arms_rig?:FistRig
    downed_pose:boolean=false

    _rotation_set:boolean=true
    _net_first:boolean=true

    constructor(){
        super()
        this.allow_tick=true
        this.base_collider=new CircleCollider2D(v2(0,0),GameConstants.humanoid.radius)
    }

    on_create(){
        this.visual={
            accessorys:[],
            body:{def:this.app.definitions.loadout.getFromString("body_1") as LoadoutBodyDef,tint:0x000000},
            legs:this.app.definitions.loadout.getFromString("blue_jeans_pants") as LoadoutLegDef,
            shirt:this.app.definitions.loadout.getFromString("red_shirt") as LoadoutShirtDef,
        }
        this.container=new AnimatedContainer2D(this.app)
        this.container.animation_parent=this
        this.container.modes={...HumanoidModes}
        this.container.zIndex=zIndexes.Humans
        this.sprites={
            body:this.container.add_animated_sprite("body",{scale:1.5,zIndex:4,hotspot:v2.half_one}),
            eyes:this.container.add_animated_sprite("eyes",{scale:1.5,zIndex:5,hotspot:v2.half_one}),
            hair:this.container.add_sprite("hair",{scale:1.5,zIndex:6,hotspot:v2.half_one}),

            mounth:this.container.add_animated_sprite("mounth",{hotspot:v2(0.4,0.5),scale:1.5,zIndex:5}),

            left_arm:this.container.add_container("left_arm"),
            right_arm:this.container.add_container("right_arm"),

            left_shirt_arm:new Sprite2D(),
            left_hand:new Sprite2D(),
            right_shirt_arm:new Sprite2D(),
            right_hand:new Sprite2D(),

            left_leg:this.container.add_container("left_leg"),
            right_leg:this.container.add_container("right_leg"),

            left_leg_l:this.container.registry(new Sprite2D,"left_leg_l",{hotspot:v2(0,0.5),zIndex:1}),
            left_leg_foot:this.container.registry(new Sprite2D,"left_leg_foot",{hotspot:v2.half_one,zIndex:0}),
            right_leg_l:this.container.registry(new Sprite2D,"right_leg_l",{hotspot:v2(0,0.5),zIndex:1}),
            right_leg_foot:this.container.registry(new Sprite2D,"right_leg_foot",{hotspot:v2.half_one,zIndex:0}),

            chest:this.container.add_sprite("chest",{scale:1.4,hotspot:v2.half_one,zIndex:1}),

            accessorys:[]
        } as unknown as HumanoidSprites

        this.sprites.left_shirt_arm.transform_frame({
            hotspot:v2(1,0.5),
            zIndex:1,
            scale:1.2,
        })
        this.sprites.left_hand.transform_frame({
            hotspot:v2.half_one,
            zIndex:0,
            scale:1.2,
        })
        this.sprites.right_shirt_arm.transform_frame({
            hotspot:v2(1,0.5),
            zIndex:1,
            scale:1.2,
        })
        this.sprites.right_hand.transform_frame({
            hotspot:v2.half_one,
            zIndex:0,
            scale:1.2,
        })

        this.sprites.left_arm.add_child(this.sprites.left_hand)
        this.sprites.left_arm.add_child(this.sprites.left_shirt_arm)
        this.sprites.right_arm.add_child(this.sprites.right_hand)
        this.sprites.right_arm.add_child(this.sprites.right_shirt_arm)

        this.sprites.left_leg.add_child(this.sprites.left_leg_l)
        this.sprites.left_leg.add_child(this.sprites.left_leg_foot)
        this.sprites.right_leg.add_child(this.sprites.right_leg_l)
        this.sprites.right_leg.add_child(this.sprites.right_leg_foot)

        this.scene.camera.add_object(this.container)
        this.scene.camera.add_object(this.container)
    }
    on_layer_set(){
        this.container.layer=this.layer
    }
    on_destroy(){
        this.container.destroy()
    }

    on_tick(dt:number){
        const pos=this.container.position
        if(this.app.save.settings.get_var("game_interpolation")){
            const t=Numeric.clamp(dt*20,0,1)
            v2m.lerp(pos,this.position,t)
            if(this._rotation_set)this.container.rotation=Numeric.lerp_rad(this.container.rotation,this.rotation,t)
        }else{
            this.container.position=v2.clone(this.position)
            if(this._rotation_set)this.container.rotation=this.rotation
        }
        const last=this.walk.last_position
        const distance=last?v2.distance(last,pos):0
        this.walk.last_position=v2.clone(pos)
        if(!this.momentary)this.tick_walk(dt,distance)
        for(const side of ["left","right"] as const){
            const arm=this.sprites[`${side}_arm`]
            this.sprites[`${side}_shirt_arm`].frame=v2.len(arm.position)<=0.6?this.assets.arm_frame_small:this.assets.arm_frame_medium
        }
        if(this.dead)return
        const map=this.scene.map
        const floor=map?map.terrain.get_floor_type(pos,this.layer,map.default_floor) as FloorType:FloorType.Void
        this.tick_footsteps(distance,floor,!this.swimming)
    }

    on_decode_net(stream:Stream,full:boolean){
        const [visual,momentary,dead,downed,swimming,has_name]=stream.read_boolean_group()
        const state_changed=dead!==this.dead||downed!==this.downed||swimming!==this.swimming
        this.dead=dead
        this.downed=downed
        this.swimming=swimming
        this.position=stream.read_pos2()
        this.rotation=stream.read_rad()
        if(full)this.scale=stream.read_float32()
        if(visual){
            decode_visual(stream,this.app.definitions,this.visual)
            this.update_visual()
        }
        if(momentary){
            const [has]=stream.read_boolean_group()
            let changed=this.momentary!==undefined&&!has
            if(has){
                const def=HumanoidAnimations.getFromNumber(stream.read_uint16())
                const time=stream.read_float32()
                changed=this.momentary?.def!==def||time<this.momentary.time
                this.momentary={def,time}
            }else{
                this.momentary=undefined
            }
            if(changed)this.apply_momentary()
        }
        if(has_name)this.name=stream.read_string(1)
        if(state_changed||this._net_first)this.update_pose()
        if(full||this._net_first||!this.app.save.settings.get_var("game_interpolation")){
            this.container.position=v2.clone(this.position)
            if(this._rotation_set)this.container.rotation=this.rotation
        }
        this._net_first=false
    }

    reset_pose(){
        v2m.set(this.sprites.left_leg.scale,1.4,1.4)
        v2m.set(this.sprites.right_leg.scale,1.4,1.4)

        this.sprites.left_leg.rotation=0.05
        this.sprites.left_leg.position=v2(-0.6,-0.2)
        this.sprites.left_leg.zIndex=1
        this.sprites.left_leg_foot.position=v2(0.05,0)

        this.sprites.right_leg.rotation=3.19
        this.sprites.right_leg.position=v2(0.6,0.2)
        this.sprites.right_leg.zIndex=1
        this.sprites.right_leg_foot.position=v2(0.05,0)

        this.sprites.chest.position=v2(-0.25,0)
        this.sprites.chest.visible=false

        this.container.stop_all_animations()
        this.set_eyes()
        this.set_mounth()
        if(this.downed_pose){
            this.set_downed_pose(true)
        }else{
            this.set_arms_rig(this.arms_rig??DefaultFistRig)
            this.sprites.left_leg.visible=false
            this.sprites.right_leg.visible=false
            this.sprites.left_leg.position=v2(-0.3,-0.2)
            this.sprites.right_leg.position=v2(0.3,0.2)
            this.sprites.left_leg.rotation=0
            this.sprites.right_leg.rotation=Math.PI

            this.walk.cycle=0
            this.walk.time=0
        }
    }
    set_downed_pose(downed:boolean){
        this.downed_pose=downed
        this.sprites.chest.visible=downed
        this.sprites.left_leg.visible=downed
        this.sprites.right_leg.visible=downed
        if(downed){
            this.sprites.left_leg.position=v2(-0.8,-0.22)
            this.sprites.right_leg.position=v2(-0.8,0.22)
            this.sprites.left_leg.rotation=Math.PI
            this.sprites.right_leg.rotation=Math.PI
            const normal=this.arms_rig
            this.set_arms_rig(DefaultDownedWalkFistRig)
            this.arms_rig=normal
        }else{
            this.set_arms_rig(this.arms_rig??DefaultFistRig)
        }
    }
    apply_momentary(){
        const m=this.momentary
        if(!m){
            this.reset_pose()
            return
        }
        this.container.stop_all_animations()
        const keyframes=m.def.keyframes
        if(keyframes&&keyframes.length>0)this.container.play_animation(keyframes,undefined,m.def.loop===true)
    }
    update_pose(){
        const downed=this.downed||this.swimming
        if(downed!==this.downed_pose){
            this.set_downed_pose(downed)
            this.container.zIndex=downed?zIndexes.DownedHumans:zIndexes.Humans
        }
        this.container.visible=!this.dead
    }
    update_visual(){
        const body_t=ColorM.number(this.visual.body.tint)

        const body_f=this.visual.body.def.frame?.base??"human_"+this.visual.body.def.id_string
        const hand_f=this.visual.body.def.frame?.hand??"human_"+this.visual.body.def.id_string+"_hand"

        if(this.visual.hair){
            this.sprites.hair.tint=ColorM.number(this.visual.hair.tint)
            this.sprites.hair.child_sprites=undefined
            if(this.visual.hair.def.frame?.front){
                const sub_sprites=[]
                if(this.visual.hair.paint&&this.visual.hair.def.frame.front.paint)sub_sprites.push({image:this.visual.hair.def.frame.front.paint,tint:this.visual.hair.paint.tint})
                this.sprites.hair.set_frame(Object.assign({
                    image:"human_"+this.visual.hair.def.id_string+"_front",
                    sub_sprites
                },this.visual.hair.def.frame?.front),this.app.resources)
            }
        }
        if(this.visual.eyes){
            this.assets.eyes=[
                this.app.resources.get_frame(this.visual.eyes.frame?.base??"human_"+this.visual.eyes.id_string+"_1"),
                this.app.resources.get_frame(this.visual.eyes.frame?.blink??"human_"+this.visual.eyes.id_string+"_2")
            ]
            this.sprites.eyes.position=this.visual.eyes.position
        }else{
            delete this.assets.eyes
        }
        this.set_eyes()

        const arm_f=this.visual.shirt.frame?.arm??("human_"+this.visual.shirt.id_string+"_arm")

        this.sprites.body.frame=this.app.resources.get_frame(body_f)

        this.sprites.body.tint=body_t

        this.assets.arm_frame_small=this.app.resources.get_frame(arm_f+"_1")
        this.assets.arm_frame_medium=this.app.resources.get_frame(arm_f+"_2")

        this.sprites.left_hand.frame=this.app.resources.get_frame(hand_f)
        this.sprites.right_hand.frame=this.app.resources.get_frame(hand_f)
        this.sprites.left_hand.tint=body_t
        this.sprites.right_hand.tint=body_t

        if(this.visual.shirt.frame?.arm_tint)this.sprites.left_shirt_arm.tint=ColorM.number(this.visual.shirt.frame?.arm_tint)
        if(this.visual.shirt.frame?.arm_tint)this.sprites.right_shirt_arm.tint=ColorM.number(this.visual.shirt.frame?.arm_tint)

        if(this.visual.legs.frame){
            this.sprites.left_leg_l.set_frame(this.visual.legs.frame,this.app.resources)
            this.sprites.right_leg_l.set_frame(this.visual.legs.frame,this.app.resources)
        }
        this.sprites.left_leg_foot.set_frame({
            image:"human_foot_1_1",
            tint:this.visual.body.tint
        },this.app.resources)
        this.sprites.right_leg_foot.set_frame({
            image:"human_foot_1_1",
            position:v2(0.05,0),
            tint:this.visual.body.tint
        },this.app.resources)
        if(this.visual.foot?.frame){
            this.sprites.left_leg_foot.set_frame(this.visual.foot.frame,this.app.resources)
            this.sprites.right_leg_foot.set_frame(this.visual.foot.frame,this.app.resources)
        }

        if(this.visual.shirt.frame?.chest)this.sprites.chest.set_frame(this.visual.shirt.frame.chest,this.app.resources)

        if(this.visual.body.def.mounth){
            this.sprites.mounth.visible=true
            this.sprites.mounth.tint=body_t
            this.sprites.mounth.scale.x=1.4
            this.sprites.mounth.position=this.visual.body.def.mounth.position
            this.sprites.mounth.frame=this.app.resources.get_frame(this.visual.body.def.mounth.normal)
            this.assets.mounth=[
                this.app.resources.get_frame(this.visual.body.def.mounth.normal),
                this.app.resources.get_frame(this.visual.body.def.mounth.open)
            ]
            /*this.assets.mounth=[
                {image:this.visual.body.def.mounth.normal,delay:0.15},
                {image:this.visual.body.def.mounth.open,delay:0.15},
            ]*/
        }else{
            delete this.assets.mounth
            this.sprites.mounth.visible=false
        }

        for(const a of this.sprites.accessorys){
            a.destroy()
        }
        this.sprites.accessorys.length=0
        for(const a of this.visual.accessorys){
            const spr=new Sprite2D()
            spr.set_frame({
                image:a.frame?.image??a.id_string,
                hotspot:v2.half_one,
                scale:2,
                zIndex:6
            },this.app.resources)
            if(a.frame)spr.transform_frame(a.frame)
            this.container.add_child(spr)
            this.sprites.accessorys.push(spr)
        }

        this.reset_pose()
    }
    set_mounth(state:number=0,enabled:boolean=true){
        if(!enabled||!this.assets.mounth){
            this.sprites.mounth.visible=false
        }else{
            this.sprites.mounth.visible=true
            this.sprites.mounth.frame=this.assets.mounth[state]
        }
    }
    set_eyes(state:number=0,animated:boolean=true,enabled:boolean=true){
        if(this.assets.eyes&&this.assets.eyes.length>0&&enabled){
            this.sprites.eyes.visible=true
            if(animated)this.sprites.eyes.frames=[{delay:random.float(3.4,3.6),image:this.assets.eyes[0].id},{delay:0.3,image:this.assets.eyes[1].id}]
            else this.sprites.eyes.frames=undefined

            this.sprites.eyes.frame=this.assets.eyes[state]
        }else{
            this.sprites.eyes.visible=false
            this.sprites.eyes.frames=undefined
        }
    }
    tick_walk(dt:number,distance:number){
        const w=this.walk
        if(distance>0.001){
            w.speed=distance
            w.idle=0
            if(w.cycle===0){
                w.cycle=1
                w.time=0
            }
        }else{
            w.idle+=dt
            if(w.idle>0.12&&w.cycle!==0){
                w.cycle=0
                w.time=0
                w.speed=0
            }
        }
        if(this.downed_pose){
            if(w.cycle===0||w.speed<=0)return
            w.time+=dt*1.8
            const t=ease.sineIn(Math.min(w.time,1))
            const rig=this.arms_rig??DefaultFistRig
            switch(w.cycle){
                case 1:
                    this.sprites.right_arm.position=v2.lerp(rig.right!.position,DefaultDownedWalkFistRig.right!.position,t)
                    this.sprites.right_arm.rotation=Numeric.lerp_rad(rig.right!.rotation,DefaultDownedWalkFistRig.right!.rotation,t)
                    this.sprites.left_leg.position=v2.lerp(v2(-0.8,-0.22),v2(-0.7,-0.2),t)
                    this.sprites.left_arm.position=rig.left!.position
                    this.sprites.left_arm.rotation=rig.left!.rotation
                    this.sprites.right_leg.position=v2(-0.8,0.22)
                    break
                case 2:
                    this.sprites.right_arm.position=v2.lerp(DefaultDownedWalkFistRig.right!.position,rig.right!.position,t)
                    this.sprites.right_arm.rotation=Numeric.lerp_rad(DefaultDownedWalkFistRig.right!.rotation,rig.right!.rotation,t)
                    this.sprites.left_leg.position=v2.lerp(v2(-0.7,-0.2),v2(-0.8,-0.22),t)
                    break
                case 3:
                    this.sprites.left_arm.position=v2.lerp(rig.left!.position,DefaultDownedWalkFistRig.left!.position,t)
                    this.sprites.left_arm.rotation=Numeric.lerp_rad(rig.left!.rotation,DefaultDownedWalkFistRig.left!.rotation,t)
                    this.sprites.right_leg.position=v2.lerp(v2(-0.8,0.22),v2(-0.7,0.2),t)
                    break
                case 4:
                    this.sprites.left_arm.position=v2.lerp(DefaultDownedWalkFistRig.left!.position,rig.left!.position,t)
                    this.sprites.left_arm.rotation=Numeric.lerp_rad(DefaultDownedWalkFistRig.left!.rotation,rig.left!.rotation,t)
                    this.sprites.right_leg.position=v2.lerp(v2(-0.7,0.2),v2(-0.8,0.22),t)
                    break
            }
            if(w.time>=1){
                w.time-=1
                w.cycle=Numeric.loop(w.cycle+1,1,5)
            }
            return
        }
        if(w.cycle===0){
            this.sprites.left_leg.visible=false
            this.sprites.right_leg.visible=false
            return
        }
        w.time+=w.speed
        const t=Math.min(w.time,1)
        this.sprites.left_leg.visible=true
        this.sprites.right_leg.visible=true
        this.sprites.left_leg.position.y=-0.2
        this.sprites.right_leg.position.y=0.2
        switch(w.cycle){
            case 1:
                this.sprites.left_leg.rotation=Numeric.lerp_rad(0,0.1,t)
                this.sprites.right_leg.rotation=Numeric.lerp_rad(Math.PI,Math.PI+0.1,t)
                this.sprites.left_leg.position.x=Numeric.lerp(-0.3,-0.45,t)
                this.sprites.right_leg.position.x=Numeric.lerp(0.3,0.45,t)
                this.sprites.left_leg_foot.position.x=Numeric.lerp(0.05,0.04,t)
                this.sprites.right_leg_foot.position.x=Numeric.lerp(0.05,0,t)
                break
            case 2:
                this.sprites.left_leg.rotation=Numeric.lerp_rad(0.1,0,t)
                this.sprites.right_leg.rotation=Numeric.lerp_rad(Math.PI+0.1,Math.PI,t)
                this.sprites.left_leg.position.x=Numeric.lerp(-0.45,-0.3,t)
                this.sprites.right_leg.position.x=Numeric.lerp(0.45,0.3,t)
                this.sprites.left_leg_foot.position.x=Numeric.lerp(0.04,0.05,t)
                this.sprites.right_leg_foot.position.x=Numeric.lerp(0,0.05,t)
                break
            case 3:
                this.sprites.left_leg.rotation=Numeric.lerp_rad(Math.PI,Math.PI-0.1,t)
                this.sprites.right_leg.rotation=Numeric.lerp_rad(0,-0.1,t)
                this.sprites.left_leg.position.x=Numeric.lerp(0.3,0.45,t)
                this.sprites.right_leg.position.x=Numeric.lerp(-0.3,-0.45,t)
                this.sprites.left_leg_foot.position.x=Numeric.lerp(0.05,0,t)
                this.sprites.right_leg_foot.position.x=Numeric.lerp(0.05,0.04,t)
                break
            case 4:
                this.sprites.left_leg.rotation=Numeric.lerp_rad(Math.PI-0.1,Math.PI,t)
                this.sprites.right_leg.rotation=Numeric.lerp_rad(-0.2,0,t)
                this.sprites.left_leg.position.x=Numeric.lerp(0.45,0.3,t)
                this.sprites.right_leg.position.x=Numeric.lerp(-0.45,-0.3,t)
                this.sprites.left_leg_foot.position.x=Numeric.lerp(0,0.05,t)
                this.sprites.right_leg_foot.position.x=Numeric.lerp(0.04,0.05,t)
                break
        }
        if(w.time>=1){
            w.time=0
            w.cycle=Numeric.loop(w.cycle+1,1,5)
        }
    }
    tick_footsteps(distance:number,floor:FloorType,on_ground:boolean=true,footstep_distance:number=2){
        const w=this.walk
        if(distance<=0.001||!on_ground)return
        w.footstep_distance+=distance
        if(w.footstep_distance<footstep_distance)return
        w.footstep_distance=0
        const def=Floors[floor]
        if(!def)return
        const sounds=def.footstep_sounds
        if(sounds&&sounds.length>0){
            w.footstep_sound?.stop()
            w.footstep_sound=this.app.sounds.play(this.app.resources.get_sound(random.choose(sounds)),{
                position:v2.clone(this.position),
                max_distance:15,
                volume:0.3,
                bus:"objects",
            })
        }
        if(def.floor_kind===FloorKind.Liquid){
            this.scene.particles.add_particle(new ABParticle2D({
                direction:0,
                frame:{
                    image:"riple",
                    hotspot:v2.half_one,
                    zIndex:zIndexes.Decals,
                    layer:this.layer,
                    scale:0,
                },
                life_time:0.5,
                position:v2.clone(this.container.position),
                speed:0,
                to:{
                    scale:3,
                    tint:ColorM.default.transparent,
                },
            }))
        }
        w.footstep_alternate=!w.footstep_alternate
    }
    set_arms_rig(rig?:FistRig){
        this.arms_rig=rig
        if(rig){
            if(rig.left){
                this.sprites.left_arm.visible=rig.left.visible===undefined?true:rig.left.visible
                this.sprites.left_arm.position=rig.left.position
                this.sprites.left_arm.rotation=rig.left.rotation
                this.sprites.left_arm.zIndex=rig.left.zIndex??2
            }else{
                this.sprites.left_arm.visible=false
            }
            if(rig.right){
                this.sprites.right_arm.visible=rig.right.visible===undefined?true:rig.right.visible
                this.sprites.right_arm.position=rig.right.position
                this.sprites.right_arm.rotation=rig.right.rotation
                this.sprites.right_arm.zIndex=rig.right.zIndex??2
            }else{
                this.sprites.right_arm.visible=false
            }
        }else{
            this.sprites.left_arm.visible=false
            this.sprites.right_arm.visible=false
        }
    }
}
