
import { ABParticle2D, AudioInstance, ClientParticle2D, Container2D, Sound, Sprite2D, Tween } from "common/engine/web.ts";
import { GameObjectType, HumanAnimation, HumanAnimationType, HumanVisualData, zIndexes } from "common/scripts/others/constants.ts"
import { GameItemType } from "common/scripts/definitions/utils.ts"
import { DualAdditional, GunDef } from "common/scripts/definitions/items/guns.ts"
import { BackpackDef } from "common/scripts/definitions/items/backpacks.ts"
import { DefaultFistRig, FistRig } from "common/scripts/others/item.ts"
import { HelmetDef, VestDef } from "common/scripts/definitions/items/equipaments.ts"
import { GameItem, WeaponDef } from "common/scripts/definitions/game_defs.ts";
import { EffectDef, Effects } from "common/scripts/definitions/player/effects.ts";
import { LoadoutAccessoryDef, LoadoutBodyDef, LoadoutEyesDef, LoadoutFootDef, LoadoutHairDef, LoadoutLegDef, LoadoutShirtDef } from "common/scripts/definitions/loadout/skins.ts";
import { MeleeDef } from "common/scripts/definitions/items/melees.ts";
import { GameObject } from "../others/gameObject.ts";
import { StaticBody } from "./static_body.ts";
import { ConsumingAction } from "common/scripts/definitions/items/consumibles.ts";
import { EmoteDef } from "common/scripts/definitions/loadout/emotes.ts";
import { CircleHitbox2D, ColorM, ease, Hitbox2D, Numeric, ParticlesEmitter2D, random, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { DefaultHumanModes } from "../defs/human_animations.ts";
import { Humanoid, HumanoidAnimation, HumanoidAssets, HumanoidSprites } from "./humanoid.ts";
export class Human extends Humanoid{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    override string_type:string="human"
    override number_type:number=GameObjectType.Human

    declare visual:HumanVisualData

    ////////////////////////////
    // State                  //
    ////////////////////////////
    parachute:boolean=false
    controlling:boolean=false
    controlling_1:boolean=false
    controlling_2:boolean=false
    ////////////////////////////
    // Equipment              //
    ////////////////////////////
    helmet?:HelmetDef
    helmet_skin?:number
    helmet_health?:number

    vest?:VestDef
    vest_health?:number
    backpack?:BackpackDef
    ////////////////////////////
    // Visual                 //
    ////////////////////////////
    declare sprites:HumanoidSprites&{
        helmet:Sprite2D
        vest:Sprite2D
        backpack:Sprite2D

        weapon:Sprite2D
        weapon2:Sprite2D
        muzzle_flash:Sprite2D
        parachute:Sprite2D
        emote_container:Container2D
        emote_bg:Sprite2D
        emote_sprite:Sprite2D

        melee_world:Sprite2D

        name?:Sprite2D
    }
    consumible_particles!:ParticlesEmitter2D<ClientParticle2D>
    override animation:HumanoidAnimation&{
        emote_tween:Tween<Vec2>|undefined,
        emote_sound:AudioInstance|undefined,
        emote_time:number,
        emote_is_message:boolean,
        emote_mount_animation:boolean,
        is_emote_mount_animation:boolean,

        sound_animation:AudioInstance|undefined,

        recoil_time:number
        recoil_state:number
        recoil_time_scale:number
        recoil_walk:number
        recoil_type:number

        cycle_sound_time:number|undefined,

        muzzle_flash_time:number,

        base_muzzle_flash_position:Vec2
        base_weapon_position:Vec2
        base_left_arm_position:Vec2
        base_right_arm_position:Vec2
    }={
        emote_tween:undefined as Tween<Vec2>|undefined,
        emote_sound:undefined as AudioInstance|undefined,
        emote_time:0,
        emote_is_message:false,
        emote_mount_animation:true,
        is_emote_mount_animation:false,

        sound_animation:undefined as AudioInstance|undefined,

        recoil_time:0,
        recoil_state:-1,
        recoil_time_scale:1,
        recoil_walk:0,
        recoil_type:0,

        cycle_sound_time:undefined as (number|undefined),

        muzzle_flash_time:-1,

        base_muzzle_flash_position:v2.zero(),
        base_weapon_position:v2.zero(),
        base_left_arm_position:v2.zero(),
        base_right_arm_position:v2.zero(),

        walk_speed:1,
        walk_cycle:0,
        walk_time:0,

        mounth:[]
    }
    override assets:{
        weapon_switch_sound?:Sound
        weapon_cycle_sound?:Sound
        weapon_fire_sound?:Sound
        weapon_fire_last_sound?:Sound
        weapon_fire_alt_func_sound?:Sound
        weapon_reload_sound?:Sound
        weapon_reload_sound_alt?:Sound

        consumible_particles:string
        original_hand_frame:string
    }&HumanoidAssets={
        consumible_particles:"",
        original_hand_frame:"",
        eyes:[]
    }
    animation_sync:boolean=true

    melee?:MeleeDef
    current_weapon?:WeaponDef
    current_weapon_skin:number=0

    swimming:boolean=false

    shield:boolean=false
    effects:{def:EffectDef,lifetime:number}[]=[]

    melee_alt:boolean=false

    seat:boolean=false

    constructor(){
        super()
    }
    override on_create(args: void): void {
        super.on_create(args)
        this.sprites={
            ...this.sprites,

            helmet:this.container.add_sprite("helmet",{zIndex:8,scale:1.5,hotspot:v2.half_one}),
            backpack:this.container.add_sprite("backpack",{position:v2(-0.27,0),hotspot:v2(1,0.5),scale:1.5,zIndex:3}),
            vest:this.container.add_sprite("vest",{scale:1.45,hotspot:v2.half_one}),

            muzzle_flash:this.container.add_sprite("muzzle_flash",{visible:false,zIndex:6,hotspot:v2(0,.5)}),
            parachute:new Sprite2D(),//this.container.add_sprite("parachute",{zIndex:7,hotspot:v2.half_one,visible:false}),
            weapon:this.container.add_sprite("weapon"),
            weapon2:this.container.add_sprite("weapon2"),
            emote_container:new Container2D(),
            emote_bg:new Sprite2D(),
            emote_sprite:new Sprite2D(),
            melee_world:this.container.add_sprite("melee_world",{zIndex:2,hotspot:v2.half_one}),
        }
        this.container.animation_parent=this
        this.container.modes=DefaultHumanModes

        this.container.zIndex=zIndexes.Players

        this.game.scene_2d.camera.add_object(this.container)
        this.sprites.parachute.frame=this.game.resources.get_frame("parachute")
        this.sprites.vest._frame=this.game.resources.get_frame("human_vest")
        this.sprites.vest.sync_rotation=false
        this.consumible_particles=this.game.scene_2d.particles.add_emiter({
            delay:0.2,
            particle:()=>new ABParticle2D({
                direction:-3.141592/2,
                frame:{
                    image:this.assets.consumible_particles,
                },
                position:this.hitbox.random_point(),
                life_time:random.float(1,2.5),
                layer:this.layer,
                zIndex:zIndexes.Particles,
                speed:1,
                scale:2,
                to:{
                    tint:ColorM.default.transparent
                }
            }),
            enabled:false
        })

        // Emote
        this.sprites.emote_container.zIndex=zIndexes.DamageSplashs
        this.sprites.emote_container.position=v2(0,-1.5)
        this.sprites.emote_sprite.hotspot=v2.half_one
        this.sprites.emote_bg.hotspot=v2.half_one
        this.sprites.emote_container.add_child(this.sprites.emote_bg)
        this.sprites.emote_container.add_child(this.sprites.emote_sprite)
        this.game.scene_2d.camera.add_object(this.sprites.emote_container)
        this.sprites.emote_container.visible=false

        this.set_skin(this.game.definitions.loadout.getFromString("body_1") as LoadoutBodyDef,
            undefined,undefined,
            this.game.definitions.loadout.getFromString("white_shirt") as LoadoutShirtDef,
            this.game.definitions.loadout.getFromString("blue_jeans_pants") as LoadoutLegDef,
            undefined,
            0xffffff,
            []
        )
    }
    override on_destroy(): void {
        this.consumible_particles.destroyed=true
        this.container.destroy()
        this.sprites.emote_container.destroy()
        if(this.sprites.name)this.sprites.name.destroy()
        if(this.sprites.shadow)this.sprites.shadow.destroy()
    }
    override on_layer_set(): void {
        this.container.layer=this.layer
        this.sprites.emote_container.layer=this.layer
        if(this.sprites.shadow)this.sprites.shadow.layer=this.layer
    }

    on_hitted(position:Vec2,critical:boolean=false,sound?:string,reflected:boolean=false){
        this.container.callmode("hitted",position,critical,sound,reflected)
    }
    on_die(){
        if(this.dead&&this.container.destroyed)return
        this.dead=true
        if(this.sprites.shadow)this.sprites.shadow.destroy()
        this.container.callmode("die")
        this.game.clock.add_timeout(()=>{
            this.container.destroy()
            this.destroy()
        },5)
    }
    // Weapon And Arm Rig
    set_arms_rig(rig?:FistRig){
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
    update_weapon(def:WeaponDef|undefined){
        this.sprites.weapon.visible=false
        this.sprites.weapon2.visible=false
        if(def?.rig_image){
            const replace=this.visual.wrapping?.replace[this.assets.original_hand_frame]
            const tint=def.assets?.world_tint?ColorM.number(def.assets.world_tint):ColorM.default.white
            if(def.rig_image){
                this.sprites.weapon.visible=true
                this.sprites.weapon.rotation=0
                this.sprites.weapon.tint=tint
                this.sprites.weapon.transform_frame(def.rig_image)
            }
            if((def as GameItem).item_type===GameItemType.gun&&(def as GunDef).dual_from){
                //const original_def=this.game.definitions.guns.getFromString((def as GunDef).dual_from!)
                const xpos=def.rig_arms?.right?.position.x??this.animation.base_left_arm_position.x
                if(def.rig_image){
                    this.sprites.weapon2.visible=true
                    this.sprites.weapon2.tint=tint
                    this.sprites.weapon2.transform_frame(def.rig_image)
                    this.sprites.weapon.position.y=(def as GunDef&DualAdditional).dual_offset!
                    this.sprites.weapon2.position.y=-(def as GunDef&DualAdditional).dual_offset!
                    if(replace)this.sprites.weapon2.transform_frame(replace)
                }

                this.sprites.left_arm.visible=true
                this.sprites.left_arm.rotation=0
                this.sprites.left_arm.position.x=xpos
                this.sprites.left_arm.position.y=-(def as GunDef&DualAdditional).dual_offset!
    
                this.sprites.right_arm.visible=true
                this.sprites.right_arm.rotation=0
                this.sprites.right_arm.position.x=xpos
                this.sprites.right_arm.position.y=(def as GunDef&DualAdditional).dual_offset!
            }
            if(replace)this.sprites.weapon.transform_frame(replace)
        }
    }

    override on_render(_dt: number): void {
    }
    override on_tick(dt:number): void {
        super.on_tick(dt)
        if(this.sprites.emote_container.visible){
            this.sprites.emote_container.position=this.position
            v2m.add_component(this.sprites.emote_container.position,0,-1.5)
            if(this.animation.emote_time>0){
                this.animation.emote_time-=dt
            }else if(!this.animation.emote_tween){
                this.animation.emote_tween=this.game.add_tween({
                    target:this.sprites.emote_container.scale,
                    duration:0.8,
                    to:v2.zero,
                    onComplete:()=>{
                        if(this.animation.emote_time>0)return
                        this.sprites.emote_container.visible=false
                        this.animation.emote_tween=undefined
                        if(this.animation.emote_is_message)this.sprites.emote_sprite.frame?.free?.()

                        if(this.animation.is_emote_mount_animation){
                            this.sprites.mounth.frames=undefined
                            this.sprites.mounth.frame=this.game.resources.get_frame(this.animation.mounth[0].image as string)
                            this.animation.is_emote_mount_animation=false
                        }
                    },
                    ease:ease.circOut
                })
            }
        }
        if(this.dead)return
        if(this.sprites.name){
            this.sprites.name.position.x=this.position.x
            this.sprites.name.position.y=this.position.y+(1*this.physical_data.scale)
            this.sprites.name.layer=this.layer
        }
        this.tick_footsteps(!this.seat)
        this.sprites.vest.rotation=Numeric.loop(this.sprites.vest.rotation+(1*dt),-3.1415,3.1415)
        for(const f of this.effects){
            f.lifetime+=dt
            if(f.def.particles){
                if(f.lifetime>=f.def.particles.delay){
                    f.lifetime=0
                    const angle=random.rad()
                    this.game.scene_2d.particles.add_particle(new ABParticle2D({
                        frame:f.def.particles.frame,

                        zIndex:zIndexes.Particles,
                        position:this.hitbox.random_point(),
                        direction:-Math.PI/2,
                        angle:angle,
                        speed:random.float(1,3),
                        layer:this.layer,
    
                        life_time:random.float(1,3),
                        tint:ColorM.hex("#fff"),
                        to:{
                            angle:angle+random.neg_value(6),
                            tint:ColorM.hex("#fff0"),
                        }
                    }))
                }
            }
        }
        this.tick_animations(dt)
    }

    // Animation
    override reset_anim(hard:boolean=true){
        if(this.animation.sound_animation){
            this.animation.sound_animation.stop()
            this.animation.sound_animation=undefined
        }
        this.sprites.muzzle_flash.visible=false
        this.animation.cycle_sound_time=undefined
        this.consumible_particles.enabled=false

        super.reset_anim(hard)

        this.animation_sync=true
        if(hard){
            this.container.callmode("set_current_weapon",this.current_weapon)
        }else{
            this.update_weapon(this.current_weapon)
        }
    }
    override tick_animations(dt:number){
        super.tick_animations(dt)
        if(this.animation.cycle_sound_time!==undefined){
            this.animation.cycle_sound_time-=dt
            if(this.animation.cycle_sound_time<=0){
                if(this.animation.sound_animation)this.animation.sound_animation.stop()
                if(this.assets.weapon_cycle_sound)this.animation.sound_animation=this.game.sounds.play(this.assets.weapon_cycle_sound,{
                    position:this.position,
                    max_distance:9,
                    bus:"humans",
                    on_complete:()=>{
                        this.animation.sound_animation=undefined
                    }
                })
                this.animation.cycle_sound_time=undefined
            }
        }
        if(this.animation.muzzle_flash_time!==-1){
            this.animation.muzzle_flash_time-=dt
            if(this.animation.muzzle_flash_time<=0){
                this.sprites.muzzle_flash.visible=false
                this.animation.muzzle_flash_time=-1
            }
        }
        if(!this.downed){
            if(this.animation.recoil_state!==-1){
                const recoil_walk=this.animation.recoil_walk
                this.sprites.muzzle_flash.position.x=Numeric.lerp(this.animation.base_muzzle_flash_position.x,this.animation.base_muzzle_flash_position.x-recoil_walk,this.animation.recoil_time)
                switch(this.animation.recoil_type){
                    case 0:
                        this.sprites.weapon.position.x=Numeric.lerp(this.animation.base_weapon_position.x,this.animation.base_weapon_position.x-recoil_walk,this.animation.recoil_time)
                        this.sprites.left_arm.position.x=Numeric.lerp(this.animation.base_left_arm_position.x,this.animation.base_left_arm_position.x-recoil_walk,this.animation.recoil_time)
                        this.sprites.right_arm.position.x=Numeric.lerp(this.animation.base_right_arm_position.x,this.animation.base_right_arm_position.x-recoil_walk,this.animation.recoil_time)
                        break
                    case 1:
                        this.sprites.weapon.position.x=Numeric.lerp(this.animation.base_weapon_position.x,this.animation.base_weapon_position.x-recoil_walk,this.animation.recoil_time)
                        this.sprites.left_arm.position.x=Numeric.lerp(this.animation.base_right_arm_position.x,this.animation.base_right_arm_position.x-recoil_walk,this.animation.recoil_time)
                        break
                    case 2:
                        this.sprites.weapon2.position.x=Numeric.lerp(this.animation.base_weapon_position.x,this.animation.base_weapon_position.x-recoil_walk,this.animation.recoil_time)
                        this.sprites.right_arm.position.x=Numeric.lerp(this.animation.base_right_arm_position.x,this.animation.base_right_arm_position.x-recoil_walk,this.animation.recoil_time)
                        break
                }
                if(this.animation.recoil_state===0){
                    this.animation.recoil_time+=dt*this.animation.recoil_time_scale
                    if(this.animation.recoil_time>=1){
                        this.animation.recoil_state=1
                        this.animation.recoil_time=1
                    }
                }else{ 
                    this.animation.recoil_time-=dt*this.animation.recoil_time_scale
                    if(this.animation.recoil_time<=0){
                        this.animation.recoil_state=-1
                        this.animation.recoil_time=0
                    }
                }
            }
        }
    }
    play_melee_animation(def:MeleeDef){
        const animation=def.alt_animation!==undefined?(this.melee_alt?def.alt_animation:def.animation):def.animation
        this.melee_alt=!this.melee_alt
        if(animation){
            this.container.play_animation(animation)
        }
        const att=()=>{
            if(def.assets?.use_sound){
                this.game.sounds.play(this.game.resources.get_sound(def.assets.use_sound),{
                    position:this.position,
                    max_distance:12,
                    volume:0.7,
                    bus:"humans"
                })
            }
            const hb=new CircleHitbox2D(v2.add_rotate_RadAngle(this.position,def.offset,this.physical_data.rotation),def.radius)
            const collidibles:GameObject[]=this.manager.cells.get_objects(hb,this.layer)
            for(const c of collidibles){
                if(!hb.colliding_with(c.hitbox))continue
                switch(c.number_type){
                    case GameObjectType.Obstacle:
                    case GameObjectType.Building:{
                        if((c as StaticBody).physical_data.no_bullets_collision)continue
                        (c as StaticBody).on_hitted(hb.position,true)
                        break
                    }
                    case GameObjectType.Human:
                        if((c as Human).dead||c.id===this.id)continue
                        (c as Human).on_hitted(hb.position,false,def.assets?.hit_sound)
                }
            break
        }
    }
    for(const delay of def.damage_delays??[]){
        this.game.clock.add_timeout(att,delay)
    }
    }
    play_fire_animation(def:GunDef,alt:boolean,last:boolean,alt_func:boolean){
        let barrel_offset=def.barrel_offset??0

        if(def.recoil_animation){
            this.animation.recoil_time_scale=def.recoil_animation.time_scale
            this.animation.recoil_walk=def.recoil_animation.walk
            if(def.dual_from){
                this.animation.recoil_state=0
                this.animation.recoil_time=0
                if(alt){
                    barrel_offset+=def.dual_offset
                    this.animation.recoil_type=1
                }else{
                    barrel_offset-=def.dual_offset
                    this.animation.recoil_type=2
                }
            }else{
                this.animation.recoil_type=0
                if(this.animation.recoil_state===-1){
                    this.animation.recoil_state=0
                    this.animation.recoil_time=0
                }else{
                    this.animation.recoil_time+=0.1
                }
            }
        }
        const barrel_position=v2(def.barrel_length,barrel_offset)
        v2m.rotate_RadAngle(barrel_position,this.physical_data.rotation)
        v2m.add(barrel_position,this.position,barrel_position)

        if(def.gas_particles){
            for(let i=0;i<def.gas_particles.count;i++){
                const p=new ABParticle2D({
                    position:barrel_position,
                    direction:this.physical_data.rotation+random.float(-def.gas_particles.direction_variation,def.gas_particles.direction_variation),
                    life_time:def.gas_particles.life_time,
                    frame:{
                        image:"gas_smoke_particle",
                        hotspot:v2.half_one,
                        layer:this.layer,
                        zIndex:zIndexes.Particles
                    },
                    speed:random.float(def.gas_particles.speed.min,def.gas_particles.speed.max),
                    scale:0.03,
                    tint:ColorM.hex("#fff5"),
                    to:{
                        tint:ColorM.hex("#fff0"),
                        scale:random.float(def.gas_particles.size.min,def.gas_particles.size.max)
                    }
                })
                this.game.scene_2d.particles.add_particle(p)
            }
        }
        if(def.case_particle&&!def.case_particle.at_begin){
            const case_position=v2(this.animation.recoil_state!==-1?-this.animation.recoil_walk*this.animation.recoil_time:0,barrel_offset)
            v2m.add(case_position,case_position,def.case_particle.position)
            v2m.rotate_RadAngle(case_position,this.physical_data.rotation)
            v2m.add(case_position,case_position,this.position)
            const p=new ABParticle2D({
                direction:this.physical_data.rotation+(3.141592/2)+random.float(0,1),
                life_time:1,
                position:case_position,
                frame:{
                    image:def.case_particle.frame??"casing_"+def.ammo_type,
                    hotspot:v2.half_one,
                    layer:this.layer,
                    zIndex:zIndexes.Particles
                },
                speed:random.float(1,2),
                angle:this.physical_data.rotation,
                scale:1.5,
                to:{
                    angle:this.physical_data.rotation+random.float(10,15),
                    scale:0.5
                }
            })
            const audio=this.game.resources.get_sound(def.case_particle!.sound??"casing_sound_"+def.ammo_type)
            if(audio)this.game.clock.add_timeout(()=>{
                this.game.sounds.play(audio,{
                    position:this.position,
                    max_distance:10,
                    bus:"humans"
                })
            },0.75)
            this.game.scene_2d.particles.add_particle(p)
        }

        let sound:Sound|undefined
        if(alt_func){
            sound=this.assets.weapon_fire_alt_func_sound??this.assets.weapon_fire_sound
        }else{
            if(last){
                if(this.assets.weapon_fire_last_sound)sound=this.assets.weapon_fire_last_sound
                else sound=this.assets.weapon_fire_sound
            }else{
                sound=this.assets.weapon_fire_sound
            }
        }
        if(sound){
            this.game.sounds.play(sound,{
                position:barrel_position,
                max_distance: 15,
                volume:0.7,
                bus:"humans"
            })
        }
        if(this.assets.weapon_cycle_sound){
            this.animation.cycle_sound_time=(def.fire_delay??0)*0.4
        }
        if(def.muzzle_flash&&!this.sprites.muzzle_flash.visible){
            this.sprites.muzzle_flash.visible=true
            this.sprites.muzzle_flash.frame=this.game.resources.get_frame(def.muzzle_flash.sprite)
            this.sprites.muzzle_flash.position=v2(def.barrel_length,barrel_offset)
            this.animation.base_muzzle_flash_position=v2(def.barrel_length,barrel_offset)
            this.animation.muzzle_flash_time=Math.min((def.fire_delay??0)*0.9,0.2)
        }
    }
    set_animations(animations:HumanAnimation[]){
        for(const a of animations){
            switch(a.type){
                case HumanAnimationType.Fire:{
                    if(this.current_weapon?.item_type===GameItemType.gun)this.play_fire_animation(this.current_weapon!,a.alt,a.last,a.alt_func)
                    break
                }
                case HumanAnimationType.Melee:
                    if(this.current_weapon?.item_type===GameItemType.melee)this.play_melee_animation(this.current_weapon as MeleeDef)
                    break
                case HumanAnimationType.Reloading:{
                    if((this.current_weapon as unknown as GameItem).item_type!==GameItemType.gun)break
                    const d=this.current_weapon as GunDef
                    const sound=(d.reload?.reload_alt&&a.alt_reload)?this.assets.weapon_reload_sound_alt:this.assets.weapon_reload_sound
                    if(sound){
                        if(this.animation.sound_animation)this.animation.sound_animation.stop()
                        this.animation.sound_animation=this.game.sounds.play(sound,{
                            position:this.position,
                            max_distance:10,
                            bus:"humans",
                            on_complete:()=>{
                                this.animation.sound_animation=undefined
                            }
                        })
                    }
                    break
                }
                case HumanAnimationType.Consuming:{
                    this.animation.recoil_state=-1
                    const def=this.game.definitions.consumibles.getFromNumber(a.item)
                    const sound=this.game.resources.get_sound((def.assets?.using_sound)??`using_${def.idString}`)
                    const consuming=def.consuming as (ConsumingAction&{type:0})
                    if(sound){
                        this.animation.sound_animation=this.game.sounds.play(sound,{
                            position:this.position,
                            max_distance:10,
                            bus:"humans",
                            on_complete:()=>{
                                this.animation.sound_animation=undefined
                            }
                        })
                    }
                    if(def.assets?.using_particle){
                        this.assets.consumible_particles=def.assets.using_particle
                    }if(consuming.boost_def===undefined){
                        this.assets.consumible_particles="healing_particle"
                    }else{
                        this.assets.consumible_particles=this.game.definitions.boosts.getFromString(consuming.boost_def).particle
                    }
                    this.consumible_particles.enabled=true
                    if(consuming.animation){
                        this.container.play_animation(consuming.animation)
                    }
                    break
                }
                case HumanAnimationType.Cook:
                    this.container.play_animation([
                        {
                            time:0.075,
                            actions:[
                                {
                                    type:"tween",
                                    fuser:"left_arm",
                                    to:{
                                        position:v2(DefaultFistRig.left!.position.x+0.1,-0.05),
                                        rotation:0.3
                                    },
                                    ease:ease.quadraticInOut
                                },
                                {
                                    type:"tween",
                                    fuser:"right_arm",
                                    to:{
                                        position:v2(DefaultFistRig.right!.position.x+0.1,0.05),
                                        rotation:0.3
                                    },
                                    ease:ease.quadraticInOut
                                },
                                {
                                    type:"tween",
                                    fuser:"weapon",
                                    to:{
                                        position:v2(DefaultFistRig.right!.position.x+0.1,0.05),
                                        rotation:0.3
                                    },
                                    ease:ease.quadraticInOut
                                }
                            ],
                        },
                        {
                            time:0.025,
                            actions:[
                                {
                                    type:"tween",
                                    fuser:"left_arm",
                                    to:{
                                        position:v2(DefaultFistRig.left!.position.x+0.15,-0.1),
                                        rotation:0.3
                                    },
                                    ease:ease.quadraticInOut
                                },
                            ]
                        },
                        {
                            time:0.1,
                            actions:[
                                {
                                    type:"tween",
                                    fuser:"left_arm",
                                    to:{
                                        position:v2(DefaultFistRig.left!.position.x,DefaultFistRig.left!.position.y-0.1),
                                        rotation:DefaultFistRig.left!.rotation-0.3
                                    },
                                    ease:ease.quadraticInOut
                                },
                                {
                                    type:"tween",
                                    fuser:"right_arm",
                                    to:{
                                        position:v2(0.15,0.6),
                                        rotation:1.2
                                    },
                                    ease:ease.quadraticInOut
                                },
                                {
                                    type:"tween",
                                    fuser:"weapon",
                                    to:{
                                        position:v2(0.15,0.6),
                                        rotation:0.3
                                    },
                                    ease:ease.quadraticInOut
                                }
                            ]
                        },
                    ])
                    break
                case HumanAnimationType.Throw:
                    this.container.play_animation([
                        {
                            time:0.075,
                            actions:[
                                {
                                    type:"tween",
                                    fuser:"left_arm",
                                    to:{
                                        position:DefaultFistRig.left!.position,
                                        rotation:DefaultFistRig.left!.rotation
                                    }
                                },
                                {
                                    type:"tween",
                                    fuser:"right_arm",
                                    to:{
                                        position:DefaultFistRig.right!.position,
                                        rotation:DefaultFistRig.right!.rotation
                                    }
                                },
                                {
                                    type:"tween",
                                    fuser:"weapon",
                                    to:{
                                        position:DefaultFistRig.right!.position,
                                        rotation:DefaultFistRig.right!.rotation
                                    }
                                }
                            ]
                        },
                    ],()=>{
                        this.update_weapon(this.current_weapon)
                    })
                    break
                case HumanAnimationType.Reset:
                    this.reset_anim()
                    break
            }
        }
    }

    add_emote(emote:EmoteDef|GameItem){
        const sound=this.game.sounds.play(this.game.resources.get_sound((emote as EmoteDef).use_sound??"emote_play"),{
            position:this.position,
            max_distance: 50,
            volume: 0.7,
            bus:"humans",
            on_complete:()=>{
                if(this.animation.emote_sound===sound)this.animation.emote_sound=undefined
            }
        })
        if((emote as EmoteDef).block_old_sound){
            if(this.animation.emote_sound)this.animation.emote_sound.stop()
            this.animation.emote_sound=sound
        }
        this.animation.emote_time=2.5
        this.sprites.emote_container.visible=true
        this.sprites.emote_container.scale=v2(0,0)
        this.sprites.emote_bg.set_frame({
            image:"emote_background",
            scale:2
        },this.game.resources)
        v2m.single(this.sprites.emote_sprite.scale,1)
        let frame=emote.idString
        this.sprites.emote_sprite.rotation=0
        if((emote as GameItem).item_type!==undefined){
            const item=(emote as GameItem)
            if(item.item_type===GameItemType.ammo){
                v2m.single(this.sprites.emote_sprite.scale,1)
            }else{
                v2m.single(this.sprites.emote_sprite.scale,1.75)
            }
            if(item.item_type===GameItemType.gun||item.item_type===GameItemType.melee){
                this.sprites.emote_sprite.rotation=-0.523599
            }
        }else{
            frame="emote_"+frame
            v2m.single(this.sprites.emote_sprite.scale,2.6)
        }
        this.sprites.emote_sprite.frame=this.game.resources.get_frame(frame)
        if(this.animation.emote_tween)this.animation.emote_tween.kill()
        this.animation.emote_tween=this.game.add_tween({
            target:this.sprites.emote_container.scale,
            duration:1,
            to:v2.one,
            ease:ease.elasticOut,
            onComplete:()=>{
                this.animation.emote_tween=undefined
            }
        })
        this.animation.emote_is_message=false

        if(this.animation.emote_mount_animation){
            this.sprites.mounth.frames=this.animation.mounth
            this.animation.is_emote_mount_animation=true
        }
    }
    add_message(msg:string){
        this.game.sounds.play(this.game.resources.get_sound("emote_play"),{
            position:this.position,
            max_distance: 50,
            volume: 0.7,
            bus:"humans",
        })
        this.animation.emote_time=5
        this.sprites.emote_container.visible=true
        this.sprites.emote_container.scale=v2(0,0)
        this.sprites.emote_bg.set_frame({
            image:"dialog_background_1",
            scale:2
        },this.game.resources)
        this.sprites.emote_sprite.rotation=0
        v2m.single(this.sprites.emote_sprite.scale,1)

        this.sprites.emote_sprite.frame=undefined
        this.game.resources.render_text(msg,40,this.game.get_theme_color("tertiary"),"Russo-One",620).then((frame)=>{
            if(this.animation.emote_is_message&&this.sprites.emote_sprite.frame)this.sprites.emote_sprite.frame.free()
            this.sprites.emote_sprite!.frame=frame
            this.animation.emote_is_message=true
        })

        if(this.animation.emote_tween)this.animation.emote_tween.kill()
        this.animation.emote_tween=this.game.add_tween({
            target:this.sprites.emote_container.scale,
            duration:1,
            to:v2.one,
            ease:ease.elasticOut,
            onComplete:()=>{
                this.animation.emote_tween=undefined
            }
        })

        if(this.animation.emote_mount_animation){
            this.sprites.mounth.frames=this.animation.mounth
            this.animation.is_emote_mount_animation=true
        }
    }
    set_helmet(helmet:number,skin?:number){
        if(helmet-1===this.helmet?.idNumber!&&this.helmet_skin===skin)return
        this.helmet_skin=skin
        if(helmet>0){
            this.helmet=this.game.definitions.helmets.getFromNumber(helmet-1)
            const h=this.helmet

            if(h.position){
                this.sprites.helmet.position=v2(h.position.x,h.position.y)
            }else{
                this.sprites.helmet.position=v2(0,0)
            }
            this.sprites!.helmet.frame=this.game.resources.get_frame((skin!==undefined&&h.skins?.[skin]?h.skins![skin]:h.idString)+"_world")
        }else{
            this.helmet=undefined
            this.sprites.helmet.frame=undefined
        }
    }
    set_vest(vest:number){
        if(vest-1===this.vest?.idNumber!)return
        if(vest>0){
            this.sprites.vest.visible=true
            this.vest=this.game.definitions.vests.getFromNumber(vest-1)
            this.sprites!.vest.tint=ColorM.number(this.vest.tint)
        }else{
            this.vest=undefined
            this.sprites.vest.visible=false
        }
    }
    update_helmet_health(){
        if(!this.helmet){
            this.sprites.helmet.frame = undefined
            return
        }
        let frame = this.helmet.idString + "_world"
        /*if(this.helmet.health_frames&&this.helmet.health){
            const hp = this.helmet_health / this.helmet.health
            for(const h of this.helmet.health_frames){
                if(hp <= h.health){
                    frame = h.frame
                    break
                }
            }
        }*/

        this.sprites.helmet.frame = this.game.resources.get_frame(frame)
    }
    set_backpack(backpack:number){
        if(this.backpack&&backpack===this.backpack.idNumber!)return
        this.backpack=this.game.definitions.backpacks.getFromNumber(backpack)
        if(this.backpack.no_world_image){
            this.sprites.backpack.frame=undefined
        }else{
            this.sprites!.backpack.frame=this.game.resources.get_frame(this.backpack.idString+"_world")
        }
    }
    
    set_name(name:string){
        if(!this.sprites.name){
            this.sprites.name=new Sprite2D()
            this.sprites.name.zIndex=zIndexes.UI
            this.sprites.name.hotspot=v2.half_one()
            this.game.scene_2d.camera.add_object(this.sprites.name)
        }
        const color=this.game.get_theme_color("primary")
        this.game.resources.render_text(name,60,color,"Russo-One").then((frame)=>{
            if(this.sprites.name!.frame)this.sprites.name!.frame.free()
            this.sprites.name!.frame=frame
        })
        this.sprites.name!.tint=ColorM.hex(color)
    }
    update_effects(effects: EffectDef[]){
        const old = this.effects ?? []
        const oldMap = new Map(old.map(e => [e.def.idNumber, e]))
        const newMap = new Map(effects.map(e => [e.idNumber, e]))
        const result: {def: EffectDef, lifetime: number}[] = []
        for(const [id, newEffect] of newMap){
            const oldEffect = oldMap.get(id)
            if(oldEffect){
                result.push({
                    def: newEffect,
                    lifetime: oldEffect.lifetime
                })
            }else{
                this.container.callmode("effect_added",newEffect)
                result.push({
                    def: newEffect,
                    lifetime: 0
                })
            }
        }
        for(const [id, oldEffect] of oldMap){
            if(!newMap.has(id)){
                this.container.callmode("effect_removed",oldEffect)
            }
        }
        this.effects = result
    }
    get_reflect_segment():Hitbox2D|undefined{
        if(!this.melee?.reflective)return undefined
        const reflect=this.current_weapon===this.melee?this.melee.reflective!.equipped:this.melee.reflective!.unequipped
        if(!reflect)return undefined
        return new CircleHitbox2D(v2.add_rotate_RadAngle(this.position,reflect.offset,this.physical_data.rotation),reflect.radius)
    }
    override on_decode_net(stream:Stream,full:boolean): void {
        const [
            physical_dirty,
            equipment_dirty_part,equipment_dirty,
            loadout_dirty,
            animation_dirty,
            effects_dirty,
            shield,

            switching,

            hand_dirty,
            melee_wold_dirty,

            has_emote,
            has_message,
            controlling_1,
            controlling_2,
            seat,

            dead,downed,swimming,

            show_name

        ]=stream.read_boolean_group3()
        this.controlling=controlling_1&&controlling_2
        this.controlling_1=controlling_1
        this.paralized=!controlling_2
        this.seat=seat
        this.shield=shield
        if(!dead&&this.dead){
            this.dead=false
            this.container.visible=true
        }else if(dead){
            this.on_die()
            this.container.visible=false
        }
        this.swimming=swimming

        this.decode_physical_data(stream,full)
        if(full||physical_dirty){
            this.physical_data.scale=stream.read_float32()
            this.update_body()
        }

        if(full||equipment_dirty||equipment_dirty_part){
            const [
                has_helmet_skin,has_helmet_health,

                has_vest_health
            ]=stream.read_boolean_group()

            this.helmet_health=has_helmet_health?stream.read_uint16():undefined
            this.vest_health=has_vest_health?stream.read_uint16():undefined

            if(full||equipment_dirty){
                const skin=has_helmet_skin?stream.read_uint8():undefined
                this.set_helmet(stream.read_uint8(),skin)
                this.set_vest(stream.read_uint8())
                this.set_backpack(stream.read_uint8())
            }
            //this.update_helmet_health()
        }
        if(loadout_dirty||full){
            const body_def=this.game.definitions.loadout.getFromNumber(stream.read_uint16()) as LoadoutBodyDef
            const hair_def=this.game.definitions.loadout.getFromNumber(stream.read_uint16()) as LoadoutHairDef|undefined
            const eyes_def=this.game.definitions.loadout.getFromNumberSafe(stream.read_uint16()) as LoadoutEyesDef|undefined
            const shirt_def=this.game.definitions.loadout.getFromNumber(stream.read_uint16()) as LoadoutShirtDef
            const legs_def=this.game.definitions.loadout.getFromNumber(stream.read_uint16()) as LoadoutLegDef
            const foot_def=this.game.definitions.loadout.getFromNumberSafe(stream.read_uint16()) as LoadoutFootDef|undefined
            let hair_tint:number=0
            let hair_paint:{id:number,tint:number}|undefined
            if(hair_def){
                hair_tint=stream.read_uint32()
                const hair_paint_id=stream.read_uint8()
                if(hair_paint_id)hair_paint={id:hair_paint_id,tint:stream.read_uint32()}
            }
            const body_tint=stream.read_uint32()
            const accessorys:LoadoutAccessoryDef[]=stream.read_array(()=>{
                return this.game.definitions.loadout.getFromNumber(stream.read_uint16()) as LoadoutAccessoryDef
            },1)
            this.set_skin(body_def,hair_def?{def:hair_def,tint:hair_tint,paint:hair_paint}:undefined,eyes_def,shirt_def,legs_def,foot_def,body_tint,accessorys)
            const wrapping=stream.read_uint16()
            this.visual.wrapping=this.game.definitions.wrapping.getFromNumberSafe(wrapping)
        }
        if(has_emote){
            this.add_emote(this.game.definitions.game_objects.valueNumber[stream.read_uint16()] as GameItem|EmoteDef)
        }
        if(has_message){
            this.add_message(stream.read_string_sized(50))
        }
        if(full||effects_dirty){
            const effects=stream.read_array(()=>{
                return Effects.getFromNumber(stream.read_uint16())
            },1)
            this.update_effects(effects)
        }
        if(full||animation_dirty){
            this.decode_animation(stream)
            const animations:HumanAnimation[]=stream.read_array(()=>{
                let animation:HumanAnimation
                const tp=stream.read_uint8() as HumanAnimationType
                switch(tp){
                    case HumanAnimationType.Fire:{
                        const bg=stream.read_boolean_group()
                        animation={
                            type:tp,
                            alt:bg[0],
                            last:bg[1],
                            alt_func:bg[2]
                        }
                        break
                    }
                    case HumanAnimationType.Reloading:
                        animation={
                            type:tp,
                            alt_reload:!!stream.read_uint8()
                        }
                        break
                    case HumanAnimationType.Consuming:
                        animation={
                            type:tp,
                            item:stream.read_uint16()
                        }
                        break
                    default:{
                        // deno-lint-ignore ban-ts-comment
                        //@ts-ignore
                        animation={
                            type:tp,
                        }
                        break
                    }
                }
                return animation
            },1)
            if(this.animation_sync)this.set_animations(animations)
        }
        if(this.animation_sync){
            if(downed||swimming){
                this.container.callmode("downed")
            }else if(this.downed&&!(downed||swimming)){
                this.container.callmode("get_up")
            }
        }
        if(full||hand_dirty){
            const id=stream.read_int16()
            const current_weapon = id>=0?(this.game.definitions.game_items.valueNumber[id] as WeaponDef):undefined
            if(current_weapon!==this.current_weapon){
                this.current_weapon=current_weapon
                if(this.animation_sync)this.container.callmode("set_current_weapon",current_weapon)
            }
        }
        if(switching){
            if(this.animation_sync){
                this.reset_anim()
                this.animation.cycle_sound_time=undefined
                this.container.callmode("weapon_switch")
            }
        }
        if(full||melee_wold_dirty){
            const id=stream.read_uint16()
            if(this.melee?.idNumber!==id){
                this.melee=this.game.definitions.melees.getFromNumber(id)
                if(this.animation_sync)this.container.callmode("update_melee",this.melee)
            }
        }
        if(full){
            let name:string|undefined
            if(show_name){
                name=stream.read_string(1)
            }else if(this.id!==this.game.active_entity_id&&this.game.ui.group_members[this.id]){
                name=this.game.ui.players_name[this.id]?.name
            }
            if(name!==undefined)this.set_name(name)
        }
    }
}