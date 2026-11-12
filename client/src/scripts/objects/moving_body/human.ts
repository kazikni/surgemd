import { c_human, SI_Human, si_human, type C_Human, type HumanMessage, type HumanNetExtra } from "common/scripts/game/objects/human/human.ts"
import { cc_humanoid_visual,CC_Humanoid_Visual } from "./humanoid.ts"
import { cc_moving_body, type CC_MovingBody } from "./moving_body.ts"
import { type AKeyFrame, CircleCollider2D, ColorM, ease, gel_events, GELComponent, matrix4, Numeric, type Particle2D, type ParticlesEmitter2D, random, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { ABParticle2D, type AudioInstance, Container2D, type Sound, Sprite2D } from "common/engine/web.ts";
import { humanoid_events, type HumanoidMomentaryState } from "common/scripts/game/objects/human/humanoid.ts";
import { DefaultFistRig } from "common/scripts/others/item.ts";
import { FloorType } from "common/scripts/others/terrain.ts";
import { human_events } from "common/scripts/game/objects/human/events.ts";
import { HumanAnimationType, type HumanAnimation, zIndexes } from "common/scripts/others/constants.ts";
import { type GameItem, type WeaponDef } from "common/scripts/definitions/game_defs.ts";
import { GameItemType } from "common/scripts/definitions/utils.ts";
import { type GunDef } from "common/scripts/definitions/items/guns.ts";
import { type MeleeDef } from "common/scripts/definitions/items/melees.ts";
import { type ConsumibleDef, type ConsumingAction } from "common/scripts/definitions/items/consumibles.ts";
import { GraphicsDConfig } from "../../main/config.ts";
import { type GameObject } from "../../main/gel.ts";

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
export interface HumanActionAnimationState{
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
    message_time:number
    message_tween?:{kill():void}
    message_frame?:{free():void}
}

export type CC_Human=CC_MovingBody&C_Human&CC_Humanoid_Visual&{
    _rotation_set:boolean
    physical:{
        movement_locked?:boolean
    }
    hand_sprites:{
        weapon:Sprite2D
        weapon2:Sprite2D
        item3:Sprite2D
        muzzle_flash:Sprite2D
        message:Container2D
        message_bg:Sprite2D
        message_text:Sprite2D
    }
    weapon_assets:HumanWeaponAssets
    action:HumanActionAnimationState
    consumible_particles:ParticlesEmitter2D<Particle2D>

    update_pose():void
    tick_visual(dt:number):void
    set_hand_visual(def?:GameItem):void
    update_weapon(def?:GameItem):void
    hide_weapon():void
    play_action_animation(animation:HumanAnimation):void
    play_fire_animation(def:GunDef,alt:boolean,last:boolean,alt_func:boolean):void
    play_melee_animation(def:MeleeDef):void
    play_casing_particle(def:GunDef,barrel_offset?:number,position?:Vec2):void
    tick_action_animations(dt:number):void
    reset_action_animation(hard?:boolean):void
    show_message(message:HumanMessage):void
    on_hitted(position:Vec2,critical?:boolean,sound?:string,reflected?:boolean,weight?:number):void
    apply_net_extra(extra:HumanNetExtra):void
}

const cook_animation:AKeyFrame[]=[
    {
        time:0.075,
        actions:[
            {type:"tween",fuser:"left_arm",to:{position:v2(DefaultFistRig.left!.position.x+0.1,-0.05),rotation:0.3},ease:ease.quadraticInOut},
            {type:"tween",fuser:"right_arm",to:{position:v2(DefaultFistRig.right!.position.x+0.1,0.05),rotation:0.3},ease:ease.quadraticInOut},
            {type:"tween",fuser:"weapon",to:{position:v2(DefaultFistRig.right!.position.x+0.1,0.05),rotation:0.3},ease:ease.quadraticInOut},
        ],
    },
    {
        time:0.025,
        actions:[
            {type:"tween",fuser:"left_arm",to:{position:v2(DefaultFistRig.left!.position.x+0.15,-0.1),rotation:0.3},ease:ease.quadraticInOut},
        ],
    },
    {
        time:0.1,
        actions:[
            {type:"tween",fuser:"left_arm",to:{position:v2(DefaultFistRig.left!.position.x,DefaultFistRig.left!.position.y-0.1),rotation:DefaultFistRig.left!.rotation-0.3},ease:ease.quadraticInOut},
            {type:"tween",fuser:"right_arm",to:{position:v2(0.15,0.6),rotation:1.2},ease:ease.quadraticInOut},
            {type:"tween",fuser:"weapon",to:{position:v2(0.15,0.6),rotation:0.3},ease:ease.quadraticInOut},
        ],
    },
]
const throw_animation:AKeyFrame[]=[
    {
        time:0.075,
        actions:[
            {type:"tween",fuser:"left_arm",to:{position:DefaultFistRig.left!.position,rotation:DefaultFistRig.left!.rotation}},
            {type:"tween",fuser:"right_arm",to:{position:DefaultFistRig.right!.position,rotation:DefaultFistRig.right!.rotation}},
            {type:"tween",fuser:"weapon",to:{position:DefaultFistRig.right!.position,rotation:DefaultFistRig.right!.rotation}},
        ],
    },
]

export const cc_human:GELComponent<CC_Human>={
    id_string:"cc_human",
    extensions:[c_human,cc_moving_body,cc_humanoid_visual],
    events:{
        [gel_events.bind](){
            this.allow_tick=true
            this._rotation_set=true
            this.weapon_assets={consumible_particle:"healing_particle"}
            this.action={
                weapon_time:0,
                recoil_state:-1,
                recoil_time:0,
                recoil_time_scale:1,
                recoil_walk:0,
                recoil_type:0,
                muzzle_flash_time:-1,
                melee_alt:false,
                message_time:0,
            }
        },
        [gel_events.create](){
            const message=new Container2D()
            this.hand_sprites={
                weapon:this.container.add_sprite("weapon"),
                weapon2:this.container.add_sprite("weapon2"),
                item3:this.container.add_sprite("item3"),
                muzzle_flash:this.container.add_sprite("muzzle_flash",{visible:false,zIndex:6,hotspot:v2(0,0.5)}),
                message,
                message_bg:new Sprite2D(),
                message_text:new Sprite2D(),
            }
            this.hand_sprites.weapon.visible=false
            this.hand_sprites.weapon2.visible=false
            message.zIndex=zIndexes.DamageSplashs
            message.visible=false
            this.hand_sprites.message_bg.hotspot=v2.half_one
            this.hand_sprites.message_text.hotspot=v2.half_one
            message.add_child(this.hand_sprites.message_bg)
            message.add_child(this.hand_sprites.message_text)
            this.scene.camera.add_object(message)

            this.container.modes.fire=(h:CC_Human)=>{
                if(h.hand?.item_type===GameItemType.gun)h.play_fire_animation(h.hand as unknown as GunDef,false,true,false)
            }
            this.container.modes.update_weapon=(h:CC_Human)=>h.update_weapon(h.hand)

            this.consumible_particles=this.scene.particles.add_emiter({
                delay:0.2,
                particle:()=>new ABParticle2D({
                    direction:-3.141592/2,
                    frame:{
                        image:this.weapon_assets.consumible_particle,
                    },
                    position:this.collider.random_point(),
                    life_time:random.float(1,2.5),
                    layer:this.layer,
                    zIndex:zIndexes.Particles,
                    speed:1,
                    scale:2,
                    to:{
                        tint:ColorM.default.transparent,
                    },
                }),
                enabled:false,
            }) as ParticlesEmitter2D<Particle2D>

            this.set_arms_rig(DefaultFistRig)
            this.update_visual()
            this.set_hand_visual(this.hand)
        },
        [gel_events.layer_set](){
            if(this.hand_sprites)this.hand_sprites.message.layer=this.layer
        },
        [gel_events.destroy](){
            this.consumible_particles.destroyed=true
            this.action.sound?.stop()
            this.action.message_frame?.free()
            this.hand_sprites.message.destroy()
        },
        [human_events.state_changed](){
            this.update_pose()
        },
        [human_events.hand_changed](def?:GameItem){
            this.set_hand_visual(def)
        },
        [human_events.animation](animation:HumanAnimation){
            this.play_action_animation(animation)
        },
        [human_events.message](message:HumanMessage){
            this.show_message(message)
        },
        [humanoid_events.momentary_changed](state?:HumanoidMomentaryState){
            this.reset_action_animation(false)
            if(state?.def.hide_hand)this.hide_weapon()
        },
        [humanoid_events.pose_reset](){
            if(!this.downed_pose)this.update_weapon(this.hand)
        },
    },
    methods:{
        update_pose(){
            const downed=this.downed||this.swimming
            if(downed!==this.downed_pose){
                this.reset_action_animation(false)
                this.set_downed_pose(downed)
                if(downed){
                    this.container.zIndex=zIndexes.DownedHumans
                    this.hide_weapon()
                }else{
                    this.container.zIndex=zIndexes.Humans
                    this.set_hand_visual(this.hand)
                }
            }
            this.container.visible=!this.dead
            if(this.dead){
                this.hand_sprites.message.visible=false
                this.consumible_particles.enabled=false
            }
        },
        tick_visual(dt:number){
            const pos=this.container.position
            const last=this.walk.last_position
            const distance=last?v2.distance(last,pos):0
            this.walk.last_position=v2.clone(pos)
            if(!this.momentary)this.tick_walk(dt,distance)
            this.tick_action_animations(dt)
            const msg=this.hand_sprites.message
            if(msg.visible){
                msg.position=v2.add(this.container.position,v2(0,-1.5))
                this.action.message_time-=dt
                if(this.action.message_time<=0&&!this.action.message_tween){
                    this.action.message_tween=this.app.clock.add_tween({
                        target:msg.scale,
                        duration:0.5,
                        to:v2(0,0),
                        ease:ease.quadraticIn,
                        onComplete:()=>{
                            this.action.message_tween=undefined
                            if(this.action.message_time>0)return
                            msg.visible=false
                            this.action.message_frame?.free()
                            this.action.message_frame=undefined
                            this.hand_sprites.message_text.frame=undefined
                            this.sprites.mounth.frames=undefined
                            this.set_mounth()
                        },
                    })
                }
            }
            if(this.dead)return
            const map=this.scene.map
            const floor=map?map.terrain.get_floor_type(pos,this.layer,map.default_floor) as FloorType:FloorType.Void
            this.tick_footsteps(distance,floor,!this.swimming)
        },
        hide_weapon(){
            this.hand_sprites.weapon.visible=false
            this.hand_sprites.weapon2.visible=false
            this.hand_sprites.muzzle_flash.visible=false
        },
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
                    this.hand_sprites.weapon2.set_frame({image:frame,rotation:0,hotspot:v2.half_one,zIndex:2,scale:2},res)
                }else{
                    frame=gun.assets?.world??gun.id_string+"_world"
                    if(gun.rig_image2)this.hand_sprites.weapon2.transform_frame({rotation:0,hotspot:v2.half_one,zIndex:1.9,scale:2})
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
            this.hand_sprites.weapon.set_frame({image:frame,rotation:0,hotspot:v2.half_one,scale:2,zIndex:2},res)
            this.update_weapon(weapon)
        },
        update_weapon(def?:GameItem){
            const s=this.hand_sprites
            s.weapon.visible=false
            s.weapon2.visible=false
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
        },
        reset_action_animation(hard:boolean=true){
            if(this.action.sound){
                this.action.sound.stop()
                this.action.sound=undefined
            }
            this.hand_sprites.muzzle_flash.visible=false
            this.action.cycle_sound_time=undefined
            this.action.recoil_state=-1
            this.action.recoil_time=0
            this.sprites.left_arm.matrix=undefined
            this.sprites.right_arm.matrix=undefined
            this.hand_sprites.weapon.matrix=undefined
            this.hand_sprites.weapon2.matrix=undefined
            this.hand_sprites.muzzle_flash.matrix=undefined
            this.consumible_particles.enabled=false
            if(hard){
                this.container.stop_all_animations()
                this.set_mounth()
                this.set_eyes()
                if(!this.downed_pose)this.set_hand_visual(this.hand)
            }else if(!this.downed_pose&&!this.momentary){
                this.update_weapon(this.hand)
            }
        },
        tick_action_animations(dt:number){
            const a=this.action
            if(a.weapon_time>0)a.weapon_time-=dt
            if(a.cycle_sound_time!==undefined){
                a.cycle_sound_time-=dt
                if(a.cycle_sound_time<=0){
                    a.sound?.stop()
                    if(this.weapon_assets.cycle)a.sound=this.app.sounds.play(this.weapon_assets.cycle,{
                        position:v2.clone(this.position),
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
                    this.hand_sprites.muzzle_flash.visible=false
                    a.muzzle_flash_time=-1
                }
            }
            if(this.downed_pose||a.recoil_state===-1)return
            const pos=v2(Numeric.lerp(0,-a.recoil_walk,a.recoil_time),0)
            v2m.rotate_RadAngle(pos,this.container.rotation)
            const matrix=matrix4.translation_2d(pos)

            this.hand_sprites.muzzle_flash.matrix=matrix
            switch(a.recoil_type){
                case 0:
                    this.hand_sprites.weapon.matrix=matrix
                    this.hand_sprites.weapon2.matrix=matrix
                    this.sprites.left_arm.matrix=matrix
                    this.sprites.right_arm.matrix=matrix
                    break
                case 1:
                    this.hand_sprites.weapon.matrix=matrix
                    this.sprites.right_arm.matrix=matrix
                    break
                case 2:
                    this.hand_sprites.weapon2.matrix=matrix
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
                    this.hand_sprites.weapon.matrix=undefined
                    this.hand_sprites.weapon2.matrix=undefined
                    this.hand_sprites.muzzle_flash.matrix=undefined
                }
            }
        },
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
        },
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
            if(def.muzzle_flash&&!this.hand_sprites.muzzle_flash.visible){
                const m=this.hand_sprites.muzzle_flash
                m.visible=true
                m.frame=this.app.resources.get_frame(def.muzzle_flash.sprite)
                m.position=v2(def.barrel_length,barrel_offset)
                a.muzzle_flash_time=Math.min((def.fire_delay??0)*0.9,0.2)
            }
        },
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
                const objs:GameObject[]=this.manager.cells.get_objects(hb,this.layer)
                for(const c of objs){
                    if(c.id===this.id||!hb.colliding_with(c.collider))continue
                    if(c.__components.has("c_static_body")){
                        if((c as unknown as {physical:{no_projectiles_collision?:boolean}}).physical.no_projectiles_collision)continue
                        ;(c as unknown as CC_Human).on_hitted?.(hb.position,true)
                        break
                    }
                    if(c.__components.has("c_human")){
                        if((c as unknown as CC_Human).dead)continue
                        ;(c as unknown as CC_Human).on_hitted?.(hb.position,false,def.assets?.hit_sound)
                        break
                    }
                }
            }
            for(const delay of def.damage_delays??[]){
                this.app.clock.add_timeout(attack,delay)
            }
        },
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
                            position:v2.clone(this.position),
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
                case HumanAnimationType.Switch:
                    this.reset_action_animation()
                    if(this.weapon_assets.switch){
                        this.action.sound=this.app.sounds.play(this.weapon_assets.switch,{
                            position:v2.clone(this.position),
                            max_distance:9,
                            bus:"humans",
                            delay:0.4,
                            on_complete:()=>{
                                this.action.sound=undefined
                            },
                        })
                    }
                    if(this.action.recoil_state===-1&&this.action.weapon_time<=0){
                        const w=hand as WeaponDef|undefined
                        if(w?.assets?.load_animation)this.container.play_animation(w.assets.load_animation)
                    }
                    break
            }
        },
        show_message(message:HumanMessage){
            const s=this.hand_sprites
            this.app.sounds.play(this.app.resources.get_sound("emote_play"),{
                position:v2.clone(this.position),
                max_distance:50,
                volume:0.7,
                bus:"humans",
            })
            this.action.message_time=message.time
            this.action.message_tween?.kill()
            s.message.visible=true
            s.message.scale=v2(0,0)
            s.message.position=v2.add(this.container.position,v2(0,-1.5))
            s.message_bg.set_frame({image:"dialog_background_1",scale:2},this.app.resources)
            s.message_text.rotation=0
            v2m.single(s.message_text.scale,1)
            this.app.resources.render_text(message.text,40,"#ffffff","Russo-One",620).then((frame)=>{
                if(this.destroyed){
                    frame.free()
                    return
                }
                this.action.message_frame?.free()
                this.action.message_frame=frame
                s.message_text.frame=frame
            })
            this.action.message_tween=this.app.clock.add_tween({
                target:s.message.scale,
                duration:1,
                to:v2(1,1),
                ease:ease.elasticOut,
                onComplete:()=>{
                    this.action.message_tween=undefined
                },
            })
            if(this.assets.mounth?.[0]&&this.assets.mounth[1])this.sprites.mounth.frames=[
                {delay:0.15,image:this.assets.mounth[0].id},
                {delay:0.15,image:this.assets.mounth[1].id},
            ]
        },
        on_hitted(position:Vec2,critical:boolean=false,sound?:string,reflected:boolean=false,_weight:number=0){
            if(reflected){
                this.app.sounds.play(this.app.resources.get_sound(sound??"human_metal_hit"),{
                    position:v2.clone(this.position),
                    max_distance:10,
                    bus:"humans",
                })
                return
            }
            const tint=random.choose([ColorM.rgba(170,10,40),ColorM.rgba(255,10,40)])
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
        },
        apply_net_extra(extra:HumanNetExtra){
            if(extra.hand)this.emit_event(human_events.hand_changed,this.hand)
            if(extra.momentary)this.emit_event(humanoid_events.momentary_changed,this.momentary)
            for(const a of extra.animations)this.emit_event(human_events.animation,a)
            if(extra.message)this.emit_event(human_events.message,extra.message)
        },
    }
}

export const ccs_human:GELComponent<CC_Human&SI_Human>={
    id_string:"ccs_human",
    extensions:[cc_human,si_human],
    events:{
        [gel_events.tick](dt:number){
            this.container.position=v2.clone(this.position)
            this.container.rotation=this.rotation
            this.tick_visual(dt)
        }
    }
}

export type CCN_Human=CC_Human&{
    _net_first:boolean
}
export const ccn_human:GELComponent<CCN_Human>={
    id_string:"ccn_human",
    extensions:[cc_human],
    events:{
        [gel_events.bind](){
            this._net_first=true
        },
        [gel_events.tick](dt:number){
            if(this.app.save.settings.get_var("game_interpolation")){
                const t=Numeric.clamp(dt*20,0,1)
                v2m.lerp(this.container.position,this.position,t)
                if(this._rotation_set)this.container.rotation=Numeric.lerp_rad(this.container.rotation,this.rotation,t)
            }else{
                this.container.position=v2.clone(this.position)
                if(this._rotation_set)this.container.rotation=this.rotation
            }
            this.tick_visual(dt)
        },
        [gel_events.net_decode](stream:Stream,full:boolean){
            const changed=this.decode_human_net(stream,full)
            const extra=this.decode_human_extra(stream,full)
            if(changed.visual)this.emit_event(humanoid_events.visual_changed)
            if(changed.state||this._net_first)this.emit_event(human_events.state_changed)
            this.apply_net_extra(extra)
            if(full||this._net_first||!this.app.save.settings.get_var("game_interpolation")){
                this.container.position=v2.clone(this.position)
                if(this._rotation_set)this.container.rotation=this.rotation
            }
            this._net_first=false
        },
    }
}
