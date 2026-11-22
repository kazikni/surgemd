import { Angle, CircleCollider2D, ColorM, ease, matrix4, Numeric, random, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { ABParticle2D, type AnimatedContainerModeCallback, AnimatedContainer2D, AnimatedSprite2D, type AudioInstance, Container2D, Container2DObject, type Frame, type Sound, Sprite2D } from "common/engine/web.ts";
import { type GameItem, type WeaponDef } from "common/scripts/definitions/game_defs.ts";
import { type BackpackDef } from "common/scripts/definitions/items/backpacks.ts";
import { type HelmetDef, type VestDef } from "common/scripts/definitions/items/equipaments.ts";
import { type GunDef } from "common/scripts/definitions/items/guns.ts";
import { type MeleeDef } from "common/scripts/definitions/items/melees.ts";
import { type ConsumibleDef, type ConsumingAction } from "common/scripts/definitions/items/consumibles.ts";
import { type BadgeDef } from "common/scripts/definitions/loadout/badges.ts";
import { type EmoteDef } from "common/scripts/definitions/loadout/emotes.ts";
import { type LoadoutBodyDef, type LoadoutLegDef, type LoadoutShirtDef } from "common/scripts/definitions/loadout/skins.ts";
import { HumanoidAnimations, type HumanoidMomentaryDef } from "common/scripts/definitions/objects/humanoid_animations.ts";
import { type EffectDef } from "common/scripts/definitions/player/effects.ts";
import { GameItemType, GameObjectDefinitionType, ItemQualitySettings } from "common/scripts/definitions/utils.ts";
import { decode_visual, type HumanVisual } from "common/scripts/net/visual.ts";
import { GameConstants, type HumanAnimation, HumanAnimationType, object_instance_type, ObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { DefaultDownedWalkFistRig, DefaultFistRig, type FistRig } from "common/scripts/others/item.ts";
import { FloorKind, Floors, FloorType } from "common/scripts/others/terrain.ts";
import { cook_animation,throw_animation } from "common/scripts/others/animations.ts"
import { GraphicsDConfig } from "../main/config.ts";
import { GameObject } from "../main/gel.ts";
import { ClientDecal } from "./client_decal.ts";


export interface HumanWalk{
    cycle:number
    time:number
    speed:number
    idle:number
    footstep_distance:number
    footstep_alternate:boolean
    footstep_sound?:{stop():void}
    last_position?:Vec2
}

export const HumanModes:Record<string,AnimatedContainerModeCallback>={
    eyes:(h:Human,state:number=0,animated:boolean=true)=>h.set_eyes(state,animated),
    mounth:(h:Human,state:number=0,enabled:boolean=true)=>h.set_mounth(state,enabled),
    reset:(h:Human)=>h.reset_pose(),
    fire:(h:Human)=>{
        if(h.hand?.item_type===GameItemType.gun)h.play_fire_animation(h.hand as unknown as GunDef,false,true,false)
    },
}

export type HumanParticleAnim={lifetime:number,sprite:Container2DObject}
export const blood_decal_chances:number[]=[0.05,0.1,0.15,0.75,1]
export interface HumanWeaponAssets{
    fire?:Sound
    fire_last?:Sound
    fire_alt_func?:Sound
    reload?:Sound
    reload_alt?:Sound
    switch?:Sound
    cycle?:Sound
    consumible_particle:string
}
export interface HumanActionState{
    weapon_time:number
    recoil_state:number
    recoil_time:number
    recoil_time_scale:number
    recoil_walk:number
    recoil_type:number
    muzzle_flash_time:number
    cycle_sound_time?:number
    sound?:AudioInstance
    melee_alt:boolean
    emote_time:number
    emote_tween?:{kill():void}
    emote_sound?:AudioInstance
    emote_is_message:boolean
}
export interface HumanSprites{
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
    accessorys:Sprite2D[]
    helmet:Sprite2D
    backpack:Sprite2D
    vest:Sprite2D
    melee_world:Sprite2D
    weapon:Sprite2D
    weapon2:Sprite2D
    item3:Sprite2D
    muzzle_flash:Sprite2D
    emote_container:Container2D
    emote_bg:Sprite2D
    emote_sprite:Sprite2D
}

export class Human extends GameObject{
    name:string=""
    dead:boolean=true
    dead_timer:number=0
    downed:boolean=false
    swimming:boolean=false
    scale:number=1
    rotation:number=0

    knocked:boolean=false
    controlled:boolean=false

    shield:boolean=false
    effects:{def:EffectDef,lifetime:number}[]=[]
    particles:HumanParticleAnim[]=[]

    visual!:HumanVisual
    momentary?:{
        def:HumanoidMomentaryDef
        time:number
    }

    hand?:GameItem
    melee?:MeleeDef
    helmet?:HelmetDef
    helmet_skin?:number
    vest?:VestDef
    backpack?:BackpackDef

    container!:AnimatedContainer2D
    sprites!:HumanSprites
    assets:{
        eyes?:Frame[]
        mounth?:Frame[]
        arm_shirt_frame_small?:Frame
        arm_shirt_frame_medium?:Frame
        arm_frame_small?:Frame
        arm_frame_medium?:Frame
    }={}
    walk:HumanWalk={cycle:0,time:0,speed:0,idle:0,footstep_distance:0,footstep_alternate:false}
    arms_rig?:FistRig
    downed_pose:boolean=false

    _rotation_set:boolean=true
    _net_first:boolean=true

    weapon_assets:HumanWeaponAssets={consumible_particle:"healing_particle"}
    action:HumanActionState={
        weapon_time:0,
        recoil_state:-1,
        recoil_time:0,
        recoil_time_scale:1,
        recoil_walk:0,
        recoil_type:0,
        muzzle_flash_time:-1,
        melee_alt:false,
        emote_time:0,
        emote_is_message:false,
    }
    consumible_particles!:{enabled:boolean,destroyed:boolean}

    constructor(){
        super()
        this.object_type=ObjectType.Human
        this.instance_type=object_instance_type.human
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
        this.container.modes={...HumanModes}
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
        } as unknown as HumanSprites

        this.sprites.left_shirt_arm.transform_frame({
            hotspot:v2(1,0.5),
            zIndex:1,
            scale:1.2,
        })
        this.sprites.left_hand.transform_frame({
            zIndex:0,
            scale:1.2,
        })
        this.sprites.right_shirt_arm.transform_frame({
            hotspot:v2(1,0.5),
            zIndex:1,
            scale:1.2,
        })
        this.sprites.right_hand.transform_frame({
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
        this.container.visible=false
        this.sprites.helmet=this.container.add_sprite("helmet",{zIndex:8,scale:1.5,hotspot:v2.half_one})
        this.sprites.backpack=this.container.add_sprite("backpack",{position:v2(-0.27,0),hotspot:v2(1,0.5),scale:1.5,zIndex:3})
        this.sprites.vest=this.container.add_sprite("vest",{scale:1.45,hotspot:v2.half_one,visible:false})
        this.sprites.vest.sync_rotation=false
        this.sprites.vest.frame=this.app.resources.get_frame("human_vest")
        this.sprites.melee_world=this.container.add_sprite("melee_world",{zIndex:2,hotspot:v2.half_one})
        this.sprites.weapon=this.container.add_sprite("weapon",{visible:false})
        this.sprites.weapon2=this.container.add_sprite("weapon2",{visible:false})
        this.sprites.item3=this.container.add_sprite("item3",{visible:false})
        this.sprites.muzzle_flash=this.container.add_sprite("muzzle_flash",{visible:false,zIndex:6,hotspot:v2(0,0.5)})
        this.sprites.emote_container=new Container2D()
        this.sprites.emote_container.transform_frame({zIndex:zIndexes.DamageSplashs,visible:false})
        this.sprites.emote_bg=new Sprite2D()
        this.sprites.emote_sprite=new Sprite2D()
        this.sprites.emote_bg.hotspot=v2.half_one
        this.sprites.emote_sprite.hotspot=v2.half_one
        this.sprites.emote_container.add_child(this.sprites.emote_bg)
        this.sprites.emote_container.add_child(this.sprites.emote_sprite)
        this.scene.camera.add_object(this.sprites.emote_container)

        this.consumible_particles=this.scene.particles.add_emiter({
            delay:0.2,
            particle:()=>new ABParticle2D({
                direction:-3.141592/2,
                frame:{image:this.weapon_assets.consumible_particle},
                position:this.collider.random_point(),
                life_time:random.float(1,2.5),
                layer:this.layer,
                zIndex:zIndexes.Particles,
                speed:1,
                scale:2,
                to:{tint:ColorM.default.transparent},
            }),
            enabled:false,
        })

        this.update_visual()
        this.reset_pose()
    }
    on_layer_set(){
        this.container.layer=this.layer
        this.sprites.emote_container.layer=this.layer
    }
    on_destroy(){
        this.container.destroy()
        for(const p of this.particles)p.sprite.destroy()
        this.consumible_particles.destroyed=true
        this.action.sound?.stop()
        this.sprites.emote_container.destroy()
    }
    on_tick(dt:number){
        if(this.dead){
            this.dead_timer+=dt
            if(this.dead_timer>=5)this.destroy()
        }else{
            if(this.app.save.settings.get_var("game_interpolation")){
                v2m.lerp(this.container.position,this.position,this.scene.global_interpolation)
                if(this._rotation_set)this.container.rotation=Numeric.lerp_rad(this.container.rotation,this.rotation,this.scene.global_interpolation)
            }else{
                this.container.position=this.position
                if(this._rotation_set)this.container.rotation=this.rotation
            }
            const last=this.walk.last_position
            const distance=last?v2.distance(last,this.position):0
            this.walk.last_position=v2.clone(this.position)
            if(!this.momentary)this.tick_walk(dt,distance)
            for(const side of ["left","right"] as const){
                const arm=this.sprites[`${side}_arm`]
                this.sprites[`${side}_shirt_arm`].frame=v2.len(arm.position)<=0.6?this.assets.arm_shirt_frame_small:this.assets.arm_shirt_frame_medium
                if(v2.len(arm.position)<=0.6){
                    this.sprites[`${side}_hand`].frame=this.assets.arm_frame_small
                    this.sprites[`${side}_hand`].hotspot=v2(0.7,0.5)
                }else{
                    this.sprites[`${side}_hand`].hotspot=v2(0.84,0.5)
                    this.sprites[`${side}_hand`].frame=this.assets.arm_frame_medium
                }
            }
            const map=this.scene.map
            const floor=map?map.terrain.get_floor_type(this.position,this.layer,map.default_floor) as FloorType:FloorType.Void
            this.tick_footsteps(distance,floor,!this.swimming)
        }
        this.tick_particles(dt)
        const pos=this.container.position
        if(this.sprites.vest.visible)this.sprites.vest.rotation=Angle.loop_rad(this.sprites.vest.rotation+1*dt)
        this.tick_action_animations(dt)
        const s=this.sprites
        if(s.emote_container.visible){
            s.emote_container.position=v2.add(pos,v2(0,-1.5))
            if(this.action.emote_time>0){
                this.action.emote_time-=dt
            }else if(!this.action.emote_tween){
                this.action.emote_tween=this.app.clock.add_tween({
                    target:s.emote_container.scale,
                    duration:0.5,
                    to:v2(0,0),
                    ease:ease.quadraticIn,
                    onComplete:()=>{
                        this.action.emote_tween=undefined
                        if(this.action.emote_time>0)return
                        s.emote_container.visible=false
                        if(this.action.emote_is_message)s.emote_sprite.frame?.free()
                        s.emote_sprite.frame=undefined
                        this.action.emote_is_message=false
                        s.mounth.frames=undefined
                        this.set_mounth()
                    },
                })
            }
        }
    }
    on_decode_net(stream:Stream,full:boolean){
        const [visual,momentary,dead,downed,swimming,has_name]=stream.read_boolean_group()
        const state_changed=dead!==this.dead||downed!==this.downed||swimming!==this.swimming
        if(this.dead&&!dead){
            this.container.visible=true
        }else if(!this.dead&&dead){
            this.on_die()
            this.dead_timer=0
        }
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
        const [hand,equipment,has_animations,has_message,has_emote,controlled,knocked,shield,has_effects]=stream.read_boolean_group2()
        this.controlled=controlled
        this.knocked=knocked
        if(this.shield&&!shield&&!this.dead)this.break_shield()
        this.shield=shield
        if(hand){
            const id=stream.read_int16()
            this.hand=id>=0?this.app.definitions.game_items.valueNumber[id]:undefined
            this.set_hand_visual(this.hand)
            this.update_melee()
        }
        if(equipment){
            const [has_skin]=stream.read_boolean_group()

            this.helmet=this.app.definitions.helmets.getFromNumberSafe(stream.read_uint8()-1)
            this.helmet_skin=has_skin?stream.read_uint8():undefined
            this.sprites.helmet.position=this.helmet?.position?v2(this.helmet.position.x,this.helmet.position.y):v2(0,0)
            this.sprites.helmet.frame=this.helmet?this.app.resources.get_frame((this.helmet_skin!==undefined&&this.helmet.skins?.[this.helmet_skin]?this.helmet.skins[this.helmet_skin]:this.helmet.id_string)+"_world"):undefined

            this.vest=this.app.definitions.vests.getFromNumberSafe(stream.read_uint8()-1)
            this.sprites.vest.visible=this.vest!==undefined
            if(this.vest)this.sprites.vest.tint=ColorM.number(this.vest.tint)
    
            this.backpack=this.app.definitions.backpacks.getFromNumberSafe(stream.read_uint8()-1)
            this.sprites.backpack.frame=this.backpack&&!this.backpack.no_world_image?this.app.resources.get_frame(this.backpack.id_string+"_world"):undefined

            this.melee=this.app.definitions.melees.getFromNumberSafe(stream.read_uint16()-1)

            this.update_melee()
        }
        if(has_animations){
            for(const a of stream.read_array(()=>{
                const type=stream.read_uint8() as HumanAnimationType
                switch(type){
                    case HumanAnimationType.Fire:{
                        const [alt,last,alt_func]=stream.read_boolean_group()
                        return {type,alt,last,alt_func}
                    }
                    case HumanAnimationType.Reloading:
                        return {type,alt_reload:stream.read_boolean_group()[0]}
                    case HumanAnimationType.Consuming:
                    case HumanAnimationType.Switch:
                        return {type,item:stream.read_uint16()}
                    default:
                        return {type} as HumanAnimation
                }
            },1))
            this.play_action_animation(a)
        }
        if(has_message)this.add_message(stream.read_string_sized(50))
        if(has_emote)this.add_emote(this.app.definitions.game_objects.valueNumber[stream.read_uint16()] as GameItem|EmoteDef)
        if(has_effects)this.update_effects(stream.read_array(()=>this.app.definitions.effects.getFromNumber(stream.read_uint16()),1))
    }
    reset_pose(){
        this.container.stop_all_animations()
        this.set_eyes()
        this.set_mounth()

        v2m.set(this.sprites.left_leg.scale,1.4,1.4)
        v2m.set(this.sprites.right_leg.scale,1.4,1.4)

        this.sprites.left_leg.rotation=0.1
        this.sprites.left_leg.position=v2(-0.6,-0.2)
        this.sprites.left_leg_foot.position=v2(0.05,0)

        this.sprites.right_leg.rotation=-0.1
        this.sprites.right_leg.position=v2(0.6,0.2)
        this.sprites.right_leg_foot.position=v2(0.05,0)

        if(this.visual.foot?.frame){
            this.sprites.left_leg_foot.set_frame(this.visual.foot!.frame!,this.app.resources)
            this.sprites.right_leg_foot.set_frame(this.visual.foot!.frame!,this.app.resources)
        }

        this.sprites.chest.position=v2(-0.25,0)
        this.sprites.chest.visible=false

        if(this.downed_pose){
            this.set_downed_pose(true)
        }else{
            this.set_arms_rig(this.arms_rig??DefaultFistRig)
            this.sprites.left_leg.visible=false
            this.sprites.right_leg.visible=false
            this.sprites.left_leg.position=v2(-0.3,-0.2)
            this.sprites.right_leg.position=v2(0.3,0.2)

            this.walk.cycle=0
            this.walk.time=0
        }
        if(!this.downed_pose)this.update_weapon(this.hand)
    }
    apply_momentary(){
        this.reset_action_animation(false)
        const m=this.momentary
        if(!m){
            this.reset_pose()
            return
        }
        this.container.stop_all_animations()
        const keyframes=m.def.keyframes
        if(keyframes&&keyframes.length>0)this.container.play_animation(keyframes,undefined,m.def.loop===true)
        if(m.def.hide_hand)this.hide_weapon()
    }
    update_pose(){
        const downed=this.downed||this.swimming
        const changed=downed!==this.downed_pose
        if(changed){
            this.reset_action_animation(false)
            this.set_downed_pose(downed)
            this.container.zIndex=downed?zIndexes.DownedHumans:zIndexes.Humans
        }
        this.container.visible=!this.dead
        this.sprites.backpack.visible=!this.downed_pose
        if(changed){
            if(this.downed_pose)this.hide_weapon()
            else this.set_hand_visual(this.hand)
            this.update_melee()
        }
        if(this.dead){
            this.sprites.emote_container.visible=false
            this.consumible_particles.enabled=false
        }
    }
    set_downed_pose(downed:boolean){
        this.downed_pose=downed
        this.sprites.chest.visible=downed
        this.sprites.left_leg.visible=downed
        this.sprites.right_leg.visible=downed
        if(downed){
            if(this.visual.foot?.downed_frame){
                this.sprites.left_leg_foot.set_frame(this.visual.foot!.downed_frame!,this.app.resources)
                this.sprites.right_leg_foot.set_frame(this.visual.foot!.downed_frame!,this.app.resources)
            }
            this.sprites.left_leg.position=v2(-0.8,-0.22)
            this.sprites.right_leg.position=v2(-0.8,0.22)
            const normal=this.arms_rig
            this.set_arms_rig(DefaultDownedWalkFistRig)
            this.arms_rig=normal
        }else{
            this.set_arms_rig(this.arms_rig??DefaultFistRig)
        }
    }
    update_visual(){
        const body_t=ColorM.number(this.visual.body.tint)

        const body_f=this.visual.body.def.frame?.base??"human_"+this.visual.body.def.id_string

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

        this.assets.arm_shirt_frame_small=this.app.resources.get_frame(arm_f+"_1")
        this.assets.arm_shirt_frame_medium=this.app.resources.get_frame(arm_f+"_2")

        this.assets.arm_frame_small=this.app.resources.get_frame(this.visual.body.def.frame.arm1)
        this.assets.arm_frame_medium=this.app.resources.get_frame(this.visual.body.def.frame.arm2)
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
            w.speed=distance/2
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
            switch(w.cycle){
                case 1:
                    this.sprites.right_arm.position=v2.lerp(DefaultFistRig.right!.position,DefaultDownedWalkFistRig.right!.position,t)
                    this.sprites.right_arm.rotation=Numeric.lerp_rad(DefaultFistRig.right!.rotation,DefaultDownedWalkFistRig.right!.rotation,t)
                    this.sprites.left_leg.position=v2.lerp({x:-0.8,y:-0.22},{x:-0.7,y:-0.20},t)

                    this.sprites.left_arm.position=DefaultFistRig.left!.position
                    this.sprites.left_arm.rotation=DefaultFistRig.left!.rotation
                    this.sprites.right_leg.position={x:-0.8,y:0.22}
                    break
                case 2:
                    this.sprites.right_arm.position=v2.lerp(DefaultDownedWalkFistRig.right!.position,DefaultFistRig.right!.position,t)
                    this.sprites.right_arm.rotation=Numeric.lerp_rad(DefaultDownedWalkFistRig.right!.rotation,DefaultFistRig.right!.rotation,t)
                    this.sprites.left_leg.position=v2.lerp({x:-0.7,y:-0.20},{x:-0.8,y:-0.22},t)
                    break
                case 3:
                    this.sprites.left_arm.position=v2.lerp(DefaultFistRig.left!.position,DefaultDownedWalkFistRig.left!.position,t)
                    this.sprites.left_arm.rotation=Numeric.lerp_rad(DefaultFistRig.left!.rotation,DefaultDownedWalkFistRig.left!.rotation,t)
                    this.sprites.right_leg.position=v2.lerp({x:-0.8,y:0.22},{x:-0.7,y:0.20},t)
                    break
                case 4:
                    this.sprites.left_arm.position=v2.lerp(DefaultDownedWalkFistRig.left!.position,DefaultFistRig.left!.position,t)
                    this.sprites.left_arm.rotation=Numeric.lerp_rad(DefaultDownedWalkFistRig.left!.rotation,DefaultFistRig.left!.rotation,t)
                    this.sprites.right_leg.position=v2.lerp({x:-0.7,y:0.20},{x:-0.8,y:0.22},t)
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
                position:this.position,
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
                position:this.container.position,
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
    update_melee(){
        const def=this.melee
        const frame=def?.character_frame
        if(!frame){
            this.sprites.melee_world.visible=false
            return
        }
        this.sprites.melee_world.visible=true
        const target=this.downed_pose&&frame.downed?frame.downed:this.hand===def?frame.equipped_frame:frame.unequipped_frame
        this.sprites.melee_world.set_frame(target,this.app.resources)
    }
    hide_weapon(){
        this.sprites.weapon.visible=false
        this.sprites.weapon2.visible=false
        this.sprites.item3.visible=false
        this.sprites.muzzle_flash.visible=false
    }
    set_hand_visual(def?:GameItem){
        const a=this.weapon_assets
        a.fire=undefined
        a.fire_last=undefined
        a.fire_alt_func=undefined
        a.reload=undefined
        a.reload_alt=undefined
        a.switch=undefined
        a.cycle=undefined
        const res=this.app.resources
        const weapon=def as WeaponDef|undefined
        if(this.downed_pose){
            this.arms_rig=weapon?.rig_arms??DefaultFistRig
            this.hide_weapon()
            return
        }
        if(!weapon){
            this.set_arms_rig(DefaultFistRig)
            this.update_weapon(undefined)
            return
        }
        if(weapon.item_type===GameItemType.melee)this.action.weapon_time=0
        this.set_arms_rig(weapon.rig_arms??DefaultFistRig)
        let original=weapon.id_string
        let frame:string
        if(weapon.item_type===GameItemType.gun){
            const gun=weapon as GunDef
            a.reload=res.get_sound(gun.assets?.reload_sound??gun.id_string+"_reload")
            a.reload_alt=res.get_sound(gun.assets?.reload_sound_alt??gun.id_string+"_reload_alt")
            if(gun.dual_from){
                original=this.app.definitions.guns.getFromString(gun.dual_from).id_string
                frame=gun.assets?.world??original+"_world"
                this.sprites.weapon2.set_frame({image:frame,rotation:0,hotspot:v2.half_one,zIndex:2,scale:2},res)
            }else{
                frame=gun.assets?.world??gun.id_string+"_world"
                if(gun.rig_image2)this.sprites.weapon2.transform_frame({rotation:0,hotspot:v2.half_one,zIndex:1.9,scale:2})
            }
            if(gun.assets?.use_last)a.fire_last=res.get_sound(typeof gun.assets.use_last==="string"?gun.assets.use_last:gun.id_string+"_fire_last")
            if(gun.assets?.use_alt_func)a.fire_alt_func=res.get_sound(gun.assets.use_alt_func)
        }else{
            frame=weapon.assets?.world??weapon.id_string
        }
        a.fire=res.get_sound(weapon.assets?.use_sound??original+"_fire")
        a.switch=res.get_sound(weapon.assets?.switch_sound??original+"_switch")
        if(typeof weapon.assets?.cycle_sound==="string")a.cycle=res.get_sound(weapon.assets.cycle_sound)
        else if(weapon.assets?.cycle_sound)a.cycle=a.switch
        this.sprites.weapon.set_frame({image:frame,rotation:0,hotspot:v2.half_one,scale:2,zIndex:2},res)
        this.update_weapon(weapon)
    }
    update_weapon(def?:GameItem){
        const s=this.sprites
        s.weapon.visible=false
        s.weapon2.visible=false
        s.item3.visible=false
        if(this.momentary?.def.hide_hand||this.downed_pose)return
        const weapon=def as WeaponDef|undefined
        if(!weapon){
            this.set_arms_rig(DefaultFistRig)
            return
        }
        this.set_arms_rig(weapon.rig_arms??DefaultFistRig)
        const tint=weapon.assets?.world_tint!==undefined?ColorM.number(weapon.assets.world_tint):ColorM.default.white
        if(weapon.rig_image){
            s.weapon.visible=true
            s.weapon.rotation=0
            s.weapon.tint=tint
            s.weapon.transform_frame(weapon.rig_image)
            const gun=weapon as GunDef
            if(weapon.item_type===GameItemType.gun&&gun.dual_from){
                const xpos=weapon.rig_arms?.right?.position.x??0
                s.weapon2.visible=true
                s.weapon2.tint=tint
                s.weapon2.transform_frame(weapon.rig_image)
                s.weapon.position=v2(s.weapon.position.x,gun.dual_offset)
                s.weapon2.position=v2(s.weapon2.position.x,-gun.dual_offset)
                this.sprites.left_arm.visible=true
                this.sprites.left_arm.rotation=0.2
                this.sprites.left_arm.position=v2(xpos,-gun.dual_offset)
                this.sprites.right_arm.visible=true
                this.sprites.right_arm.rotation=-0.2
                this.sprites.right_arm.position=v2(xpos,gun.dual_offset)
            }
        }
        if(weapon.item_type===GameItemType.gun&&!(weapon as GunDef).dual_from&&(weapon as GunDef).rig_image2){
            s.weapon2.visible=true
            s.weapon2.set_frame((weapon as GunDef).rig_image2!,this.app.resources)
        }
    }
    reset_action_animation(hard:boolean=true){
        if(this.action.sound){
            this.action.sound.stop()
            this.action.sound=undefined
        }
        this.sprites.muzzle_flash.visible=false
        this.action.cycle_sound_time=undefined
        this.action.recoil_state=-1
        this.action.recoil_time=0
        this.sprites.left_arm.matrix=undefined
        this.sprites.right_arm.matrix=undefined
        this.sprites.weapon.matrix=undefined
        this.sprites.weapon2.matrix=undefined
        this.sprites.muzzle_flash.matrix=undefined
        this.consumible_particles.enabled=false
        if(hard){
            this.container.stop_all_animations()
            this.set_mounth()
            this.set_eyes()
            if(!this.downed_pose)this.set_hand_visual(this.hand)
        }else if(!this.downed_pose&&!this.momentary){
            this.update_weapon(this.hand)
        }
    }
    tick_action_animations(dt:number){
        const a=this.action
        if(a.weapon_time>0)a.weapon_time-=dt
        if(a.cycle_sound_time!==undefined){
            a.cycle_sound_time-=dt
            if(a.cycle_sound_time<=0){
                a.sound?.stop()
                if(this.weapon_assets.cycle)a.sound=this.app.sounds.play(this.weapon_assets.cycle,{
                    position:this.position,
                    max_distance:9,
                    bus:"humans",
                    on_complete:()=>{
                        a.sound=undefined
                    },
                })
                a.cycle_sound_time=undefined
            }
        }
        if(a.muzzle_flash_time!==-1){
            a.muzzle_flash_time-=dt
            if(a.muzzle_flash_time<=0){
                this.sprites.muzzle_flash.visible=false
                a.muzzle_flash_time=-1
            }
        }
        if(this.downed_pose||a.recoil_state===-1)return
        const pos=v2(Numeric.lerp(0,-a.recoil_walk,a.recoil_time),0)
        v2m.rotate_RadAngle(pos,this.container.rotation)
        const matrix=matrix4.translation_2d(pos)
        this.sprites.muzzle_flash.matrix=matrix
        switch(a.recoil_type){
            case 0:
                this.sprites.weapon.matrix=matrix
                this.sprites.weapon2.matrix=matrix
                this.sprites.left_arm.matrix=matrix
                this.sprites.right_arm.matrix=matrix
                break
            case 1:
                this.sprites.weapon.matrix=matrix
                this.sprites.right_arm.matrix=matrix
                break
            case 2:
                this.sprites.weapon2.matrix=matrix
                this.sprites.left_arm.matrix=matrix
                break
        }
        if(a.recoil_state===0){
            a.recoil_time+=dt*a.recoil_time_scale
            if(a.recoil_time>=1){
                a.recoil_state=1
                a.recoil_time=1
            }
        }else{
            a.recoil_time-=dt*a.recoil_time_scale
            if(a.recoil_time<=0){
                a.recoil_state=-1
                a.recoil_time=0
                this.sprites.left_arm.matrix=undefined
                this.sprites.right_arm.matrix=undefined
                this.sprites.weapon.matrix=undefined
                this.sprites.weapon2.matrix=undefined
                this.sprites.muzzle_flash.matrix=undefined
            }
        }
    }
    play_casing_particle(def:GunDef,barrel_offset:number=0,position?:Vec2){
        if(!def.case_particle)return
        const count=def.case_particle.count??1
        const smm=def.case_particle.speed??{min:1,max:2}
        const dmm=def.case_particle.direction??{min:0,max:1}
        const rotation=this.container.rotation
        for(let i=0;i<count;i++){
            const case_position=v2(this.action.recoil_state!==-1?-this.action.recoil_walk*this.action.recoil_time:0,barrel_offset)
            v2m.add(case_position,case_position,def.case_particle.position)
            if(position)v2m.add(case_position,case_position,position)
            v2m.rotate_RadAngle(case_position,rotation)
            v2m.add(case_position,case_position,this.container.position)
            let direction=(3.141592/2)+random.float(dmm.min,dmm.max)
            let rotation_dest=random.float(1,10)
            if(def.case_particle.all_direction&&(i%2!==0)){
                direction*=-1
                rotation_dest*=-1
            }
            this.scene.particles.add_particle(new ABParticle2D({
                direction:rotation+direction,
                life_time:1,
                position:case_position,
                frame:{
                    image:def.case_particle.frame??"casing_"+def.ammo_type,
                    hotspot:v2.half_one,
                    layer:this.layer,
                    zIndex:zIndexes.CaseParticles,
                },
                speed:random.float(smm.min,smm.max),
                angle:rotation,
                scale:2,
                to:{
                    angle:rotation+rotation_dest,
                    scale:1,
                    tint:ColorM.default.transparent,
                    tint_ease:ease.quarticIn,
                },
            }))
        }
        const audio=this.app.resources.get_sound(def.case_particle.sound??"casing_sound_"+def.ammo_type)
        if(audio)this.app.clock.add_timeout(()=>{
            this.app.sounds.play(audio,{
                position:v2.clone(this.position),
                max_distance:10,
                bus:"humans",
            })
        },0.75)
    }
    play_fire_animation(def:GunDef,alt:boolean,last:boolean,alt_func:boolean){
        const a=this.action
        let barrel_offset=def.barrel_offset??0
        a.weapon_time=2
        if(def.recoil_animation){
            a.recoil_time_scale=def.recoil_animation.time_scale
            a.recoil_walk=def.recoil_animation.walk
            if(def.dual_from){
                a.recoil_state=0
                a.recoil_time=0
                if(alt){
                    barrel_offset+=def.dual_offset
                    a.recoil_type=1
                }else{
                    barrel_offset-=def.dual_offset
                    a.recoil_type=2
                }
            }else{
                a.recoil_type=0
                if(a.recoil_state===-1){
                    a.recoil_state=0
                    a.recoil_time=0
                }else{
                    a.recoil_time+=0.1
                }
            }
        }
        const barrel_position=v2(def.barrel_length,barrel_offset)
        v2m.rotate_RadAngle(barrel_position,this.container.rotation)
        v2m.add(barrel_position,this.container.position,barrel_position)

        const cycle_time=(def.fire_delay??0)*0.4
        if(!def.case_particle?.at_begin){
            this.app.clock.add_timeout(()=>{
                if(!this.destroyed)this.play_casing_particle(def)
            },cycle_time*1.25)
        }
        if(def.assets?.cycle_animation)this.container.play_animation(def.assets.cycle_animation)

        let sound:Sound|undefined
        if(alt_func)sound=this.weapon_assets.fire_alt_func??this.weapon_assets.fire
        else if(last)sound=this.weapon_assets.fire_last??this.weapon_assets.fire
        else sound=this.weapon_assets.fire
        if(sound){
            this.app.sounds.play(sound,{
                position:barrel_position,
                max_distance:15,
                volume:0.7,
                bus:"humans",
            })
        }
        if(this.weapon_assets.cycle)a.cycle_sound_time=cycle_time
        if(def.muzzle_flash&&!this.sprites.muzzle_flash.visible){
            const m=this.sprites.muzzle_flash
            m.visible=true
            m.frame=this.app.resources.get_frame(def.muzzle_flash.sprite)
            m.position=v2(def.barrel_length,barrel_offset)
            a.muzzle_flash_time=Math.min((def.fire_delay??0)*0.9,0.2)
        }
    }
    get_reflect_collider():CircleCollider2D|undefined{
        const reflective=this.melee?.reflective
        const reflect=this.hand===this.melee?reflective?.equipped:reflective?.unequipped
        if(!reflect)return undefined
        return new CircleCollider2D(v2.add_rotate_RadAngle(this.position,reflect.offset,this.rotation),reflect.radius)
    }
    play_melee_animation(def:MeleeDef){
        const animation=def.alt_animation!==undefined?(this.action.melee_alt?def.alt_animation:def.animation):def.animation
        this.action.melee_alt=!this.action.melee_alt
        if(animation)this.container.play_animation(animation)
        const attack=()=>{
            if(this.destroyed||this.dead)return
            if(def.assets?.use_sound){
                this.app.sounds.play(this.app.resources.get_sound(def.assets.use_sound),{
                    position:this.position,
                    max_distance:12,
                    volume:0.7,
                    bus:"humans",
                })
            }
            const hb=new CircleCollider2D(v2.add_rotate_RadAngle(this.position,def.offset,this.rotation),def.radius)
            for(const o of this.manager.cells.get_objects(hb,this.layer) as GameObject[]){
                if(o.id===this.id||!hb.colliding_with(o.collider))continue
                if(o.object_type===ObjectType.StaticBody){
                    if((o as unknown as {physical:{no_projectiles_collision?:boolean}}).physical.no_projectiles_collision)continue
                    ;(o as unknown as {on_hitted(position:Vec2,critical:boolean):void}).on_hitted(hb.position,true)
                    break
                }
                if(o.object_type===ObjectType.Human&&!(o as Human).dead){
                    ;(o as Human).on_hitted(hb.position,false,def.assets?.hit_sound)
                    break
                }
            }
        }
        for(const delay of def.damage_delays??[])this.app.clock.add_timeout(attack,delay)
    }
    play_action_animation(animation:HumanAnimation){
        if(this.dead||this.momentary)return
        const hand=this.hand
        switch(animation.type){
            case HumanAnimationType.Fire:
                if(hand?.item_type===GameItemType.gun)this.play_fire_animation(hand as unknown as GunDef,animation.alt,animation.last,animation.alt_func)
                break
            case HumanAnimationType.Melee:
                if(hand?.item_type===GameItemType.melee)this.play_melee_animation(hand as unknown as MeleeDef)
                break
            case HumanAnimationType.Reloading:{
                if(hand?.item_type!==GameItemType.gun)break
                const d=hand as unknown as GunDef
                const reload_alt=d.reload?.reload_alt!==undefined&&animation.alt_reload
                const sound=reload_alt?this.weapon_assets.reload_alt:this.weapon_assets.reload
                if(sound){
                    this.action.sound?.stop()
                    this.action.sound=this.app.sounds.play(sound,{
                        position:this.position,
                        max_distance:10,
                        bus:"humans",
                        on_complete:()=>{
                            this.action.sound=undefined
                        },
                    })
                }
                if(reload_alt&&d.assets?.reload_alt_animation)this.container.play_animation(d.assets.reload_alt_animation)
                else if(!reload_alt&&d.assets?.reload_animation)this.container.play_animation(d.assets.reload_animation)
                if(d.case_particle?.at_begin){
                    if(d.dual_from){
                        this.play_casing_particle(d,undefined,v2(0,-d.dual_offset))
                        this.play_casing_particle(d,undefined,v2(0,d.dual_offset))
                    }else{
                        this.play_casing_particle(d)
                    }
                }
                break
            }
            case HumanAnimationType.Consuming:{
                this.action.recoil_state=-1
                const def=this.app.definitions.consumibles.getFromNumberSafe(animation.item) as ConsumibleDef|undefined
                if(!def)break
                const consuming=def.consuming as ConsumingAction&{type:0}
                const sound=this.app.resources.get_sound(def.assets?.using_sound??`using_${def.id_string}`)
                if(sound){
                    this.action.sound?.stop()
                    this.action.sound=this.app.sounds.play(sound,{
                        position:this.position,
                        max_distance:10,
                        bus:"humans",
                        on_complete:()=>{
                            this.action.sound=undefined
                        },
                    })
                }
                if(def.assets?.using_particle){
                    this.weapon_assets.consumible_particle=def.assets.using_particle
                }else if(consuming.boost_def===undefined){
                    this.weapon_assets.consumible_particle="healing_particle"
                }else{
                    this.weapon_assets.consumible_particle=this.app.definitions.boosts.getFromStringSafe(consuming.boost_def)?.particle??"healing_particle"
                }
                this.consumible_particles.enabled=true
                if(consuming.animation)this.container.play_animation(consuming.animation)
                break
            }
            case HumanAnimationType.Cook:
                this.container.play_animation(cook_animation)
                break
            case HumanAnimationType.Throw:
                this.container.play_animation(throw_animation,()=>{
                    if(!this.destroyed)this.update_weapon(this.hand)
                })
                break
            case HumanAnimationType.Reset:
                this.reset_action_animation()
                break
            case HumanAnimationType.Switch:{
                const def=this.app.definitions.game_items.valueNumber[animation.item]
                if(def!==this.hand){
                    this.hand=def
                    this.set_hand_visual(def)
                }
                this.reset_action_animation()
                if(this.weapon_assets.switch){
                    this.action.sound=this.app.sounds.play(this.weapon_assets.switch,{
                        position:this.position,
                        max_distance:9,
                        bus:"humans",
                        delay:0.4,
                        on_complete:()=>{
                            this.action.sound=undefined
                        },
                    })
                }
                const load=(def as WeaponDef|undefined)?.assets?.load_animation
                if(load&&this.action.recoil_state===-1&&this.action.weapon_time<=0)this.container.play_animation(load)
                this.update_melee()
                break
            }
        }
    }
    add_emote(emote:EmoteDef|BadgeDef|GameItem){
        const s=this.sprites
        const sound:AudioInstance|undefined=this.app.sounds.play(this.app.resources.get_sound((emote as EmoteDef).use_sound??"emote_play"),{
            position:this.position,
            max_distance:50,
            volume:0.7,
            bus:"humans",
            on_complete:()=>{
                if(this.action.emote_sound===sound)this.action.emote_sound=undefined
            },
        })
        if((emote as EmoteDef).block_old_sound){
            this.action.emote_sound?.stop()
            this.action.emote_sound=sound
        }
        this.action.emote_time=2.5
        s.emote_container.visible=true
        s.emote_container.scale=v2(0,0)
        v2m.single(s.emote_sprite.scale,1)
        s.emote_sprite.rotation=0
        s.emote_bg.set_frame({image:"emote_background",tint:0xffffff,scale:2},this.app.resources)
        let frame=emote.id_string
        switch(emote.def_type){
            case GameObjectDefinitionType.emote:
                frame="emote_"+frame
                v2m.single(s.emote_sprite.scale,2.6)
                break
            case GameObjectDefinitionType.item:
                v2m.single(s.emote_sprite.scale,emote.item_type===GameItemType.ammo?1:1.75)
                if(emote.item_type===GameItemType.gun||emote.item_type===GameItemType.melee)s.emote_sprite.rotation=-0.523599
                s.emote_bg.set_frame({image:"rarity_outline",tint:ItemQualitySettings[emote.rank].tint},this.app.resources)
                break
            case GameObjectDefinitionType.badge:
                s.emote_bg.frame=this.app.resources.get_frame("emote_badge_background")
                v2m.single(s.emote_bg.scale,1)
                v2m.single(s.emote_sprite.scale,2)
                break
        }
        s.emote_sprite.frame=this.app.resources.get_frame(frame)
        this.action.emote_is_message=false
        this.play_speak_animation()
    }
    add_message(message:string){
        const s=this.sprites
        this.app.sounds.play(this.app.resources.get_sound("emote_play"),{
            position:this.position,
            max_distance:50,
            volume:0.7,
            bus:"humans",
        })
        this.action.emote_time=5
        s.emote_container.visible=true
        s.emote_container.scale=v2(0,0)
        s.emote_bg.set_frame({image:"dialog_background_1",scale:2},this.app.resources)
        s.emote_sprite.rotation=0
        v2m.single(s.emote_sprite.scale,1)
        s.emote_sprite.frame=undefined
        this.app.resources.render_text(message,40,"#ffffff","Russo-One",620).then((frame)=>{
            if(this.destroyed){
                frame.free()
                return
            }
            if(this.action.emote_is_message)s.emote_sprite.frame?.free()
            s.emote_sprite.frame=frame
            this.action.emote_is_message=true
        })
        this.play_speak_animation()
    }
    play_speak_animation(){
        this.action.emote_tween?.kill()
        this.action.emote_tween=this.app.clock.add_tween({
            target:this.sprites.emote_container.scale,
            duration:1,
            to:v2.one,
            ease:ease.elasticOut,
            onComplete:()=>{
                this.action.emote_tween=undefined
            },
        })
        const mounth=this.assets.mounth
        if(mounth?.[0]&&mounth[1])this.sprites.mounth.frames=[{delay:0.15,image:mounth[0].id},{delay:0.15,image:mounth[1].id}]
    }
    on_die(){
        for(let i=0;i<5;i++){
            const angle=random.rad()
            this.scene.particles.add_particle(new ABParticle2D({
                frame:{
                    image:`blood_splash_${random.int(1,3)}`,
                    layer:this.layer,
                },

                scale:0.1,
                direction:angle,
                angle:angle,
                position:this.position,
                zIndex:zIndexes.Particles,

                life_time:random.float(2,4),
                speed:random.float(0.5,1),
                tint:ColorM.rgba(170,10,40),
                to:{
                    scale:random.float(2,5),
                    tint:ColorM.rgba(170,10,40,0),
                    angle:angle+random.neg_float(0.5,3)
                },
            }))
        }
        for(let i=0;i<4;i++){
            const angle=random.rad()
            this.scene.particles.add_particle(new ABParticle2D({
                frame:{
                    image:`human_gore_${random.int(1,2)}`,
                    layer:this.layer,
                },
                scale:0.1,
                direction:angle,
                angle:angle,
                position:this.position,
                zIndex:zIndexes.Particles,

                life_time:random.float(1,2),
                speed:random.float(1,3),
                tint:ColorM.default.white,
                to:{
                    scale:random.float(1.7,3),
                    tint:ColorM.default.transparent,
                    tint_ease:ease.quarticIn,
                    angle:angle+random.neg_float(0.5,3)
                },
            }))
        }
        ClientDecal.spawn(this.scene,this.layer,{
            image:`liquid_decal_${random.int(1,2)}`,
            tint:random.choose([0xaa0a28,0xff0a28]),
            alpha:210,
            scale:random.float(2,3),
            rotation:random.rad(),
            position:v2.clone(this.position),
        })
    }
    on_hitted(position:Vec2,critical:boolean=false,sound?:string,reflected:boolean=false,weight:number=0){
        if(reflected){
            this.app.sounds.play(this.app.resources.get_sound(sound??"human_metal_hit"),{
                position:v2.clone(this.position),
                max_distance:10,
                bus:"humans",
            })
        }else if(this.shield){
            let shield=this.particles.find((p)=>p.sprite instanceof Sprite2D&&p.sprite.frame?.id==="human_shield")
            if(shield){
                shield.lifetime=0.5
            }else{
                const sprite=new Sprite2D()
                sprite.set_frame({image:"human_shield",hotspot:v2.half_one,zIndex:10,scale:2},this.app.resources)
                this.container.add_child(sprite)
                shield={lifetime:0.5,sprite}
                this.particles.push(shield)
            }
            this.app.sounds.play(this.app.resources.get_sound("human_hit_shield"),{
                position:v2.clone(this.position),
                max_distance:15,
                bus:"humans",
            })
        }else{
            const tint=random.choose([ColorM.rgba(170,10,40),ColorM.rgba(255,10,40)])
            if(Math.random()<=(blood_decal_chances[weight]??blood_decal_chances[0])){
                ClientDecal.spawn(this.scene,this.layer,{
                    image:`liquid_decal_${random.int(1,2)}`,
                    tint:random.choose([0xaa0a28,0xff0a28]),
                    alpha:210,
                    scale:random.float(0.7,1.4),
                    rotation:random.rad(),
                    position:v2.clone(position),
                })
            }
            if(this.app.save.settings.get_var("graphics_particles")>=GraphicsDConfig.Normal){
                this.scene.particles.add_particle(new ABParticle2D({
                    scale:0.1,
                    frame:{
                        image:`blood_splash_${random.int(1,3)}`,
                        layer:this.layer,
                        zIndex:zIndexes.Particles,
                    },
                    direction:random.rad(),
                    life_time:random.float(0.7,0.8),
                    position,
                    speed:random.float(0.1,0.4),
                    angle:random.rad(),
                    tint,
                    to:{
                        scale:1.5,
                        tint:ColorM.mult_hsv(tint,undefined,undefined,undefined,0),
                        tint_ease:ease.quarticIn,
                    },
                    zIndex:zIndexes.Particles,
                }))
            }
            this.app.sounds.play(this.app.resources.get_sound(sound??(critical?"human_headshot":`human_hit_${random.int(1,2)}`)),{
                position:v2.clone(this.position),
                max_distance:15,
                bus:"humans",
            })
        }
    }

    break_shield(){
        const particles=this.app.save.settings.get_var("graphics_particles")
        if(particles>=GraphicsDConfig.Advanced){
            for(let i=0;i<14;i++){
                this.scene.particles.add_particle(new ABParticle2D({
                    direction:random.rad(),
                    life_time:0.5+(Math.random()*0.5),
                    position:v2.clone(this.position),
                    speed:7,
                    scale:random.float(2,3),
                    frame:{
                        layer:this.layer,
                        zIndex:zIndexes.Particles,
                        image:"shield_part",
                    },
                    angle:random.rad(),
                    tint:ColorM.default.white,
                    to:{
                        tint:ColorM.default.transparent,
                        tint_ease:ease.quarticIn,
                        scale:0.3,
                        angle:random.float(-10,10),
                        speed:5,
                    },
                }))
            }
        }
        if(particles>=GraphicsDConfig.Normal){
            this.scene.particles.add_particle(new ABParticle2D({
                direction:0,
                life_time:0.4,
                position:v2.clone(this.position),
                speed:0,
                scale:0.1,
                frame:{
                    image:"shockwave",
                    layer:this.layer,
                    zIndex:zIndexes.Particles,
                    hotspot:v2.half_one,
                },
                tint:ColorM.rgba(255,255,255,255),
                to:{
                    tint:ColorM.rgba(255,255,255,0),
                    scale:10,
                },
            }))
        }
        this.app.sounds.play(this.app.resources.get_sound("shield_break"),{
            position:v2.clone(this.position),
            max_distance:15,
            bus:"humans",
        })
        const shield=this.particles.find((p)=>p.sprite instanceof Sprite2D&&p.sprite.frame?.id==="human_shield")
        if(shield)shield.lifetime=0
    }

    update_effects(effects:EffectDef[]){
        const old=new Map(this.effects.map((e)=>[e.def.id_number,e]))
        const next=new Set(effects.map((e)=>e.id_number))
        let tint_changed=false
        let removed=false
        this.effects=effects.map((def)=>{
            const current=old.get(def.id_number)
            if(current)return current
            if(def.assets?.sounds?.when_take){
                this.app.sounds.play(this.app.resources.get_sound(def.assets.sounds.when_take),{
                    position:v2.clone(this.position),
                    max_distance:7,
                    volume:0.7,
                    bus:"humans",
                })
            }
            if(def.target?.tint!==undefined){
                this.container.tint=ColorM.number(def.target.tint)
                tint_changed=true
            }
            return {def,lifetime:0}
        })
        for(const [id,e] of old){
            if(next.has(id))continue
            removed=true
            if(e.def.target?.tint!==undefined)tint_changed=true
            if(e.def.assets?.sounds?.when_remove){
                this.app.sounds.play(this.app.resources.get_sound(e.def.assets.sounds.when_remove),{
                    position:v2.clone(this.position),
                    max_distance:7,
                    volume:0.7,
                    bus:"humans",
                })
            }
        }
        if(tint_changed&&removed)this.container.tint=ColorM.default.white
    }

    tick_particles(dt:number){
        for(let i=0;i<this.particles.length;i++){
            const p=this.particles[i]
            p.lifetime-=dt
            if(p.lifetime<=0){
                p.sprite.destroy()
                this.particles.splice(i--,1)
            }
        }
        for(const e of this.effects){
            const particle=e.def.particles
            if(!particle)continue
            e.lifetime+=dt
            if(e.lifetime<particle.delay)continue
            e.lifetime=0
            const angle=random.rad()
            this.scene.particles.add_particle(new ABParticle2D({
                frame:particle.frame,
                zIndex:zIndexes.Particles,
                position:this.collider.random_point(),
                direction:-Math.PI/2,
                angle,
                speed:random.float(1,3),
                layer:this.layer,
                life_time:random.float(1,3),
                tint:ColorM.default.white,
                to:{
                    angle:particle.angular_rotation?angle+random.neg_value(6):undefined,
                    tint:ColorM.default.transparent,
                    tint_ease:ease.quarticIn,
                },
            }))
        }
    }

}
