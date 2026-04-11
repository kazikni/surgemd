
import { ABParticle2D, AnimatedContainer2D, AnimationInstance, CenterHotspot, CircleHitbox2D, type ClientGame, ClientParticle2D, ColorM, Container2D, ease, KeyFrameSpriteDef, Light2D, NetStream, Numeric, ParticlesEmitter2D, random, Sound, SoundInstance, SoundOptions, Sprite2D, Tween, v2, v2m, Vec2 } from "common/engine/client.ts";
import { GameConstants, GameObjectType,  HumanLoadoutData,  PlayerAnimation, PlayerAnimationType, zIndexes } from "common/scripts/others/constants.ts"
import { GameObject } from "../others/gameObject.ts"
import { GraphicsDConfig } from "../others/config.ts"
import { InventoryItemType } from "common/scripts/definitions/utils.ts"
import { DualAdditional, GunDef } from "common/scripts/definitions/items/guns.ts"
import { BackpackDef } from "common/scripts/definitions/items/backpacks.ts"
import { DefaultFistRig } from "common/scripts/others/item.ts"
import { Boosts } from "common/scripts/definitions/player/boosts.ts"
import { MeleeDef } from "common/scripts/definitions/items/melees.ts"
import { HelmetDef, VestDef } from "common/scripts/definitions/items/equipaments.ts"
import { FloorKind, Floors, FloorType } from "common/scripts/others/terrain.ts"
import { Decal } from "./decal.ts";
import { Camera2D } from "common/engine/client/2d/camera.ts";
import { StaticBody } from "./static_body.ts";
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts";
import { GameItem, GameObjectDef, WeaponDef } from "common/scripts/definitions/game_defs.ts";
import { EffectDef, Effects } from "common/scripts/definitions/player/effects.ts";
import { LoadoutBodyDef, LoadoutEyesDef, LoadoutHairDef, LoadoutShirtDef } from "common/scripts/definitions/loadout/skins.ts";
export type HumanPhysicalData=MovingBodyPhysicalData&{
    scale:number
}
export class Human extends MovingBody{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    string_type:string="human"
    number_type:number=GameObjectType.Human

    ////////////////////////////
    // State                  //
    ////////////////////////////
    zIndex=zIndexes.Players
    parachute:boolean=false
    controlling:boolean=false
    override physical_data: HumanPhysicalData={
        rotation:0,
        scale:1
    };

    ////////////////////////////
    // Equipment              //
    ////////////////////////////
    vest?:VestDef
    helmet?:HelmetDef
    helmet_health:number=0
    vest_health:number=0
    backpack?:BackpackDef
    ////////////////////////////
    // Visual                 //
    ////////////////////////////
    loadout!:HumanLoadoutData
    container!:AnimatedContainer2D
    sprites!:{
        hair:Sprite2D
        body:Sprite2D
        eyes:Sprite2D
        mounth:Sprite2D

        helmet:Sprite2D
        vest:Sprite2D
        backpack:Sprite2D

        left_arm:Container2D
        right_arm:Container2D

        left_shirt_arm:Sprite2D
        left_hand:Sprite2D
        right_shirt_arm:Sprite2D
        right_hand:Sprite2D

        chest:Sprite2D
        left_leg:Sprite2D
        right_leg:Sprite2D
        weapon:Sprite2D
        weapon2:Sprite2D
        muzzle_flash:Sprite2D
        parachute:Sprite2D
        emote_container:Container2D
        emote_bg:Sprite2D
        emote_sprite:Sprite2D
    }
    anims:{
        fire?:{
            left_arm?:Tween<Vec2>
            right_arm?:Tween<Vec2>
            weapon?:Tween<Vec2>
        },
        muzzle_flash_light?:Light2D
        consumible_particle:string
        consumible_particles?:ParticlesEmitter2D<ClientParticle2D>
        mount_anims:KeyFrameSpriteDef[]
        mount_open:string
        mount_normal:string
        emote?:Tween<Vec2>
        walk_anim?:AnimationInstance
    }={consumible_particle:"healing_particle",mount_anims:[],mount_open:"",mount_normal:""}
    sound_animation:{
        animation?:SoundInstance
        footsteps?:SoundInstance
        weapon:{
            switch?:SoundInstance
        }
    }={weapon:{}}

    current_weapon?:WeaponDef
    dead:boolean=true
    _happy:boolean=true
    get happy():boolean{
        return this._happy
    }
    set happy(val:boolean){
        this._happy=val
        if(val){
            this.sprites.mounth.scale.x=1.4
            this.sprites.mounth.frames=this.anims.mount_anims
        }else{
            this.sprites.mounth.scale.x=-1.4
            this.sprites.mounth.frames=undefined
            this.sprites.mounth.frame=this.game.resources.get_sprite(this.anims.mount_normal)
        }
    }

    shield:boolean=false

    assets:{
        weapon_cycle_sound?:Sound
        weapon_fire_sound?:Sound
        weapon_reload_sound?:Sound
        weapon_reload_sound_alt?:Sound
        footstep_sounds?:string[]
    }={}

    effects:{def:EffectDef,lifetime:number}[]=[]

    current_floor?:FloorType

    on_hitted(position:Vec2,critical:boolean=false,sound?:string){
        if(Math.random()<=0.1){
            const d=new Decal()
            d.sprite.frame=this.game.resources.get_sprite(`blood_decal_${random.int(1,2)}`)
            d.sprite.scale=v2.random(0.7,1.4)
            d.sprite.rotation=random.rad()
            d.sprite.position=v2.clone(position)
            this.game.scene_2d.objects.add_object(d,this.layer)
        }
        if(!this.shield){
            this.game.particles.add_particle(new ABParticle2D({
                scale:0.1,
                frame:{
                    image:`blood_splash_${random.int(1,3)}`,
                },
                direction:random.rad(),
                life_time:random.float(0.5,1),
                position:position,
                speed:random.float(0.1,0.4),
                angle:random.rad(),
                tint:ColorM.rgba(170,10,40),
                to:{
                    scale:1.5,
                    tint:ColorM.rgba(170,10,40,0)
                },
                zIndex:zIndexes.Particles
            }))
        }

        this.game.sounds.play(this.game.resources.get_audio(sound??(
            (this.vest&&this.vest.reflect_bullets)?
                (
                    "player_metal_hit"
                ):
                (critical?
                    "player_headshot":
                    `player_hit_${random.int(1,2)}`
                )
            )
        ),{
            position:this.position,
            max_distance:10,
        },"humans")
    }

    on_die(){
        if(this.dead&&this.container.destroyed)return
        this.dead=true

        for(let i=0;i<5;i++){
            this.game.particles.add_particle(new ABParticle2D({
                scale:0.1,
                frame:{
                    image:`blood_splash_${random.int(1,3)}`,
                },
                direction:random.rad(),
                life_time:random.float(1,2),
                position:this.position,
                speed:random.float(1,2),
                angle:random.rad(),
                tint:ColorM.rgba(170,10,40),
                to:{
                    scale:random.float(2,5),
                    tint:ColorM.rgba(170,10,40,0)
                },
                zIndex:zIndexes.Particles
            }))
        }
        const d=new Decal()

        d.sprite.frame=this.game.resources.get_sprite(`blood_decal_${random.int(1,2)}`)
        d.sprite.scale=v2.random(2,3)
        d.sprite.rotation=random.rad()
        d.sprite.position=v2.clone(this.position)
        this.game.scene_2d.objects.add_object(d,this.layer)

        for(let i=0;i<4;i++){
            this.game.particles.add_particle(new ABParticle2D({
                scale:0.1,
                frame:{
                    image:`player_gore_${random.int(1,2)}`,
                },
                direction:random.rad(),
                life_time:random.float(1,2),
                position:this.position,
                speed:random.float(5,6),
                angle:random.rad(),
                tint:ColorM.default.white,
                to:{
                    scale:random.float(1.7,3),
                    tint:ColorM.rgba(255,255,255,0)
                },
                zIndex:zIndexes.Particles
            }))
        }

        this.container.destroy()
        this.destroy()
    }
    downed:boolean=false
    on_downed(){
        if(this.downed)return
        this.downed=true
        this.sprites.left_leg.visible=true
        this.sprites.right_leg.visible=true
        this.sprites.chest.visible=true
        this.sprites.backpack.visible=false
        this.happy=false
        this.reset_anim()
    }
    on_help_up(){
        if(!this.downed)return
        this.downed=false
        this.sprites.left_leg.visible=false
        this.sprites.right_leg.visible=false
        this.sprites.chest.visible=false
        this.sprites.backpack.visible=true
        this.happy=true
        this.reset_anim()
    }

    current_animation?:PlayerAnimation
    driving:boolean=false
    set_driving(driving:boolean){
        if(this.driving||!driving){
            this.driving=driving
            return
        }
        this.current_weapon=undefined
        this.update_weapon()
        this.driving=driving
        this.sprites.left_arm.visible=true
        this.sprites.right_arm.visible=true
        this.sprites.left_arm.position=v2.clone(DefaultFistRig.left!.position)
        this.sprites.right_arm.position=v2.clone(DefaultFistRig.right!.position)
        this.sprites.left_arm.rotation=DefaultFistRig.left!.rotation
        this.sprites.right_arm.rotation=DefaultFistRig.right!.rotation
        this.driving=true
    }

    update_weapon(is_new:boolean=false){
        if(this.driving||!this.current_weapon)return
        if(is_new)this.reset_anim()
        this.sprites.weapon2.visible=false
        if(this.parachute){
            this.current_weapon=undefined
            this.sprites.left_arm.visible=false
            this.sprites.right_arm.visible=false
            this.sprites.weapon.visible=false
            return
        }
        const def=this.current_weapon
        if(def.arms){
            if(def.arms.left){
                this.sprites.left_arm.visible=def.arms.left.visible===undefined?true:def.arms.left.visible
                this.sprites.left_arm.position=def.arms.left.position
                this.sprites.left_arm.rotation=def.arms.left.rotation
                this.sprites.left_arm.zIndex=def.arms.left.zIndex??1
            }else{
                this.sprites.left_arm.visible=false
            }
            if(def.arms.right){
                this.sprites.right_arm.visible=def.arms.right.visible===undefined?true:def.arms.right.visible
                this.sprites.right_arm.position=def.arms.right.position
                this.sprites.right_arm.rotation=def.arms.right.rotation
                this.sprites.right_arm.zIndex=def.arms.right.zIndex??1
            }else{
                this.sprites.right_arm.visible=false
            }
        }else{
            this.sprites.left_arm.visible=false
            this.sprites.right_arm.visible=false
        }
        if(def?.image){
            this.sprites.weapon.visible=true
            const scale=(def.image.scale??1)
            this.sprites.weapon.scale=v2(scale,scale)
            this.sprites.weapon.position=v2.clone(def.image.position)
            this.sprites.weapon.rotation=def.image.rotation
            this.sprites.weapon.zIndex=def.image.zIndex??2
            this.sprites.weapon.hotspot=def.image.hotspot??v2(.5,.5)
            if((def as GunDef).dual_from&&(def as unknown as GameItem).item_type===InventoryItemType.gun){
                const df=this.game.definitions.guns.getFromString((def as GunDef).dual_from!)
                const world_frame=def.assets?.world??`${df.idString}_world`
                this.sprites.weapon2.visible=true
                this.sprites.weapon2.scale=v2(1*(def.image.scale??1),1)
                this.sprites.weapon2.position=v2.clone(def.image.position)
                this.sprites.weapon2.rotation=def.image.rotation
                this.sprites.weapon2.zIndex=def.image.zIndex??2
                this.sprites.weapon2.hotspot=def.image.hotspot??v2(.5,.5)
                this.sprites.weapon.position.y+=(def as GunDef&DualAdditional).dual_offset!

                this.sprites.left_arm.visible=true
                this.sprites.right_arm.visible=true
                this.sprites.left_arm.position=v2(DefaultFistRig.left!.position.x,-(def as GunDef&DualAdditional).dual_offset!)
                this.sprites.right_arm.position=v2(DefaultFistRig.right!.position.x,(def as GunDef&DualAdditional).dual_offset!)
                this.sprites.left_arm.rotation=0
                this.sprites.right_arm.rotation=0

                this.sprites.weapon2.position.y-=(def as GunDef&DualAdditional).dual_offset!
                this.sprites.weapon.frame=this.game.resources.get_sprite(world_frame)
                this.sprites.weapon2.frame=this.game.resources.get_sprite(world_frame)
                
                if(def.assets?.world_tint){
                    const col=ColorM.number(def.assets?.world_tint)
                    this.sprites.weapon.tint=col
                    this.sprites.weapon2.tint=col
                }else{
                    this.sprites.weapon.tint=ColorM.number(0xffffff)
                }
            }else{
            const world_frame=def.assets?.world??((def as unknown as GameItem).item_type===InventoryItemType.melee?def.idString:`${def.idString}_world`)
                this.sprites.weapon.frame=this.game.resources.get_sprite(world_frame)
                if(def.assets?.world_tint)this.sprites.weapon.tint=ColorM.number(def.assets?.world_tint)
                else this.sprites.weapon.tint=ColorM.number(0xffffff)
            }
        }else{
            this.sprites.weapon.visible=false
        }
        if(is_new){
            const sound=this.game.resources.get_audio(`${def.idString}_switch`)
            if(this.sound_animation.weapon.switch)this.sound_animation.weapon.switch.stop()
            if(sound){
                this.sound_animation.weapon.switch=this.game.sounds.play(sound,{
                    on_complete:()=>{
                        this.sound_animation.weapon.switch=undefined
                    },
                    position:this.position,
                    max_distance:17,
                })
            }
            this.attacking=false
            // deno-lint-ignore ban-ts-comment
            //@ts-ignore
            const sdd=def.dual_from??def.idString
            this.assets.weapon_fire_sound=def.assets?.use_sound?this.game.resources.get_audio(def.assets.use_sound):this.game.resources.get_audio(`${sdd}_fire`)
            this.assets.weapon_cycle_sound=this.game.resources.get_audio(
                (def.assets?.cycle_sound===true)?
                (`${sdd}_switch`):
                (def.assets?.cycle_sound as string)
            )

            if(def.item_type===InventoryItemType.gun){
                this.assets.weapon_reload_sound=this.game.resources.get_audio(def.assets?.reload_sound??`${def.idString}_reload`)
                this.assets.weapon_reload_sound_alt=this.game.resources.get_audio(def.assets?.reload_sound_alt??`${def.idString}_reload_alt`)
            }
        }
        this.container.update_zindex()
    }
    set_skin(body_def:LoadoutBodyDef,hair_def:LoadoutHairDef,eyes_def:LoadoutEyesDef,shirt_def:LoadoutShirtDef,body_tint:number,hair_tint:number){
        if(
            this.loadout&&
            this.loadout.body.def===body_def&&this.loadout.body.tint==body_tint&&
            this.loadout.hair.def===hair_def&&this.loadout.hair.tint==hair_tint&&
            this.loadout.eyes===eyes_def
        )return
        this.loadout={
            body:{
                def:body_def,
                tint:body_tint,
            },
            hair:{
                def:hair_def,
                tint:hair_tint
            },
            eyes:eyes_def,
            shirt:shirt_def
        }

        const body_t=ColorM.number(body_tint)
        const hair_t=ColorM.number(hair_tint)

        const body_f=body_def.frame?.base??"human_"+body_def.idString
        const hand_f=body_def.frame?.hand??"human_"+body_def.idString+"_hand"
        const hair_f=hair_def.frame?.base??"human_"+hair_def.idString
        const eyes_f=[eyes_def.frame?.base??"human_"+eyes_def.idString+"_1",eyes_def.frame?.blink??"human_"+eyes_def.idString+"_2"]

        const arm_f=shirt_def.frame?.arm??("human_"+shirt_def.idString+"_arm")
        const cf=("_chest")

        const lrf="_leg"

        this.sprites.body.frame=this.game.resources.get_sprite(body_f)
        this.sprites.hair.frame=this.game.resources.get_sprite(hair_f)
        this.sprites.eyes.frame=this.game.resources.get_sprite(eyes_f[0])

        this.sprites.body.tint=body_t
        this.sprites.hair.tint=hair_t

        this.sprites.hair.position=hair_def.position
        this.sprites.eyes.position=eyes_def.position

        this.sprites.left_shirt_arm.frame=this.game.resources.get_sprite(arm_f)
        this.sprites.right_shirt_arm.frame=this.game.resources.get_sprite(arm_f)

        this.sprites.left_hand.frame=this.game.resources.get_sprite(hand_f)
        this.sprites.right_hand.frame=this.game.resources.get_sprite(hand_f)
        this.sprites.left_hand.tint=body_t
        this.sprites.right_hand.tint=body_t

        if(shirt_def.frame?.arm_tint)this.sprites.left_shirt_arm.tint=ColorM.number(shirt_def.frame?.arm_tint)
        if(shirt_def.frame?.arm_tint)this.sprites.right_shirt_arm.tint=ColorM.number(shirt_def.frame?.arm_tint)

        this.sprites.left_leg.frame=this.game.resources.get_sprite(lrf)
        this.sprites.right_leg.frame=this.game.resources.get_sprite(lrf)

        this.sprites.left_leg.position=v2(-0.75,-0.22)
        this.sprites.right_leg.position=v2(-0.75,0.22)
        this.sprites.left_leg.rotation=0.1
        this.sprites.right_leg.rotation=-0.1
        this.sprites.left_leg.visible=false
        this.sprites.right_leg.visible=false
        this.sprites.left_leg.zIndex=1
        this.sprites.right_leg.zIndex=1

        this.sprites.chest.frame=this.game.resources.get_sprite(cf)
        this.sprites.chest.position=v2(-0.25,0)
        this.sprites.chest.scale=v2(1.33333,1.33333)
        this.sprites.chest.visible=false
        this.sprites.chest.zIndex=1

        this.sprites.left_leg.hotspot=v2(0,0.5)
        this.sprites.right_leg.hotspot=v2(0,0.5)
        this.sprites.backpack.hotspot=v2(1,0.5)

        this.sprites.weapon.zIndex=2

        this.anims.mount_normal=body_def.mounth.normal
        this.anims.mount_open=body_def.mounth.open
        this.sprites.mounth.tint=body_t
        this.sprites.mounth.position=body_def.mounth.position
        this.sprites.mounth.frame=this.game.resources.get_sprite(this.anims.mount_normal)

        this.sprites.eyes.frames=[{delay:random.float(3.4,3.6),image:eyes_f[0]},{delay:0.3,image:eyes_f[1]}]

        this.container.update_zindex()

        this.update_weapon(false)
        this.reset_anim()
    }
    override on_layer_set(layer: number): void {
        this.container.layer=layer
        this.sprites.emote_container.layer=layer
    }
    override create(_args: Record<string, void>): void {
        this.base_hitbox=new CircleHitbox2D(v2(0,0),GameConstants.player.radius)
        this.container=new AnimatedContainer2D(this.game as unknown as ClientGame)

        this.sprites={
            body:this.container.add_animated_sprite("body",{scale:1.333333,zIndex:4,hotspot:CenterHotspot}),
            eyes:this.container.add_animated_sprite("eyes",{scale:1.333333,zIndex:5,hotspot:CenterHotspot}),
            hair:this.container.add_sprite("hair",{scale:1.333333,zIndex:6,hotspot:CenterHotspot}),

            mounth:this.container.add_animated_sprite("mounth",{hotspot:v2(0.4,0.5),scale:1.4,zIndex:5}),

            helmet:this.container.add_sprite("helmet",{zIndex:8,scale:1.333333,hotspot:CenterHotspot}),

            backpack:this.container.add_sprite("backpack",{position:v2(-0.27,0),scale:1.34,zIndex:3}),
            vest:this.container.add_sprite("vest",{zIndex:0,scale:1.333333,hotspot:CenterHotspot}),

            left_arm:this.container.add_container("left_arm"),
            right_arm:this.container.add_container("right_arm"),

            left_shirt_arm:new Sprite2D(),
            left_hand:new Sprite2D(),
            right_shirt_arm:new Sprite2D(),
            right_hand:new Sprite2D(),

            left_leg:this.container.add_sprite("left_leg",{scale:1.333333}),
            right_leg:this.container.add_sprite("right_leg",{scale:1.333333}),
            chest:this.container.add_sprite("chest"),
            muzzle_flash:this.container.add_sprite("muzzle_flash",{visible:false,zIndex:6,hotspot:v2(0,.5)}),
            parachute:new Sprite2D(),//this.container.add_sprite("parachute",{zIndex:7,hotspot:v2(0.5,0.5),visible:false}),
            weapon:this.container.add_sprite("weapon"),
            weapon2:this.container.add_sprite("weapon2"),
            emote_container:new Container2D(),
            emote_bg:new Sprite2D(),
            emote_sprite:new Sprite2D()
        }

        this.sprites.left_shirt_arm.transform_frame({
            hotspot:v2(1,0.5),
            zIndex:1,
            scale:1.2,
        })
        this.sprites.left_hand.transform_frame({
            hotspot:v2(0.5,0.5),
            zIndex:0,
            scale:1.2,
        })
        this.sprites.right_shirt_arm.transform_frame({
            hotspot:v2(1,0.5),
            zIndex:1,
            scale:1.2,
        })
        this.sprites.right_hand.transform_frame({
            hotspot:v2(0.5,0.5),
            zIndex:0,
            scale:1.2,
        })

        this.sprites.left_arm.add_child(this.sprites.left_hand)
        this.sprites.left_arm.add_child(this.sprites.left_shirt_arm)
        this.sprites.right_arm.add_child(this.sprites.right_hand)
        this.sprites.right_arm.add_child(this.sprites.right_shirt_arm)

        this.container.add_child(this.sprites.left_arm)
        this.container.add_child(this.sprites.right_arm)

        this.sprites.emote_container.zIndex=zIndexes.DamageSplashs
        this.anims.consumible_particles=this.game.particles.add_emiter({
            delay:0.5,
            particle:()=>new ABParticle2D({
                direction:-3.141592/2,
                frame:{
                    image:this.anims.consumible_particle,
                },
                life_time:random.float(2,3),
                position:v2.add(this.position,v2(random.float((this.hitbox as CircleHitbox2D).radius*-0.8,(this.hitbox as CircleHitbox2D).radius*0.8),0)),
                speed:1,
                scale:2,
                to:{
                    tint:{r:1,g:1,b:1,a:0}
                }
            }),
            enabled:false
        })

        this.container.zIndex=zIndexes.Players
        this.container.add_child(this.sprites.muzzle_flash)

        this.game.cam2d.addObject(this.container)
        this.sprites.parachute.frame=this.game.resources.get_sprite("parachute")
        this.set_skin(
            this.game.definitions.loadout.getFromString("body_1") as LoadoutBodyDef,
            this.game.definitions.loadout.getFromString("hair_1") as LoadoutHairDef,
            this.game.definitions.loadout.getFromString("eyes_1") as LoadoutEyesDef,
            this.game.definitions.loadout.getFromString("white_shirt") as LoadoutShirtDef,
            0,0
        )
        this.sprites.vest._frame=this.game.resources.get_sprite("player_vest")
        this.sprites.vest.sync_rotation=false
        this.sprites.emote_container.sync_rotation=false
        this.sprites.emote_container.position=v2(0,-1.5)
        this.sprites.emote_container.add_child(this.sprites.emote_bg)
        this.sprites.emote_container.add_child(this.sprites.emote_sprite)
        this.sprites.emote_container.visible=false
        this.sprites.emote_bg.set_frame({
            image:"emote_background",
            hotspot:CenterHotspot,
            scale:2
        },this.game.resources)
        this.sprites.emote_sprite.transform_frame({
            hotspot:CenterHotspot,
            scale:2.6
        })
    }
    distance_since_last_footstep=0

    override render(camera: Camera2D, _dt: number): void {
        camera.ctx.fill_style=this.game.world_shadow.color
        camera.ctx.begin_path()
        camera.ctx.arc(this.position.x+this.game.world_shadow.offset.x,this.position.y+this.game.world_shadow.offset.y,GameConstants.player.radius*this.game.world_shadow.radius,0,Math.PI*2)
        camera.ctx.fill()

        /*camera.ctx.fill_style=ColorM.default.red
        camera.ctx.begin_path()
        camera.ctx.arc(this.dest_pos?.x??0,this.dest_pos?.y??0,(this.hitbox as CircleHitbox2D).radius,0,Math.PI*2)
        camera.ctx.fill()*/
    }
    override update(dt:number): void {
        super.update(dt)
        this.container.rotation=this.physical_data.rotation
        this.container._position.set(this.position.x,this.position.y)
        /*if(!this.anims.walk_anim||this.anims.walk_anim.destroyed)this.anims.walk_anim=this.container.play_animation([
            {
                actions:[
                    {
                        type:"sprite",
                        fuser:"left_leg",
                        rotation:-0.1,
                        position:v2(-0.2,-0.2),
                    },
                ],
                time:0
            },
            {
                actions:[
                    {
                        type:"tween",
                        fuser:"left_leg",
                        to:{
                            position:v2(-0.56,-0.2),
                        },
                        yoyo:true
                    }
                ],
                time:0.1
            }
        ],undefined,true)*/
        if(this.distance_walked>0){
            const f=this.game.terrain.get_floor_type(this.position,this.layer,FloorType.Void)

            if(f!==this.current_floor){
                this.current_floor=f
                this.assets.footstep_sounds=Floors[f].footstep_sounds
            }

            this.distance_since_last_footstep+=this.distance_walked

            // Play Footstep Sound And Do Water Riple
            if(this.distance_since_last_footstep>=2){
                this.distance_since_last_footstep=0
                if(this.assets.footstep_sounds){
                    this.sound_animation.footsteps=this.game.sounds.play(this.game.resources.get_audio(random.choose(this.assets.footstep_sounds)),{
                        position:this.position,
                        max_distance: 15,
                        volume:0.7
                    },"humans")
                }
                if(Floors[f].floor_kind===FloorKind.Liquid){
                    this.game.particles.add_particle(new ABParticle2D({
                        direction:0,
                        frame:{
                            image:"riple",
                            hotspot:CenterHotspot,
                            zIndex:zIndexes.Decals,
                            scale:0,
                        },
                        zIndex:zIndexes.Decals,
                        life_time:0.5,
                        position:this.position,
                        speed:0,
                        to:{
                            scale:3,
                            tint:{
                                r:1,
                                g:1,
                                b:1,
                                a:0
                            }
                        }
                    }))
                }
            }
        }

        this.sprites.vest.rotation=Numeric.loop(this.sprites.vest.rotation+(1*dt),-3.1415,3.1415)

        if(this.sprites.emote_container.visible){
            this.sprites.emote_container.position=this.position
            v2m.add_component(this.sprites.emote_container.position,0,-1.5)
            if(this.emote_time<2.5){
                this.emote_time+=dt
            }else{
                this.anims.emote=this.game.add_tween({
                    target:this.sprites.emote_container.scale,
                    duration:0.8,
                    to:{
                        x:0,
                        y:0
                    },
                    onComplete:()=>{
                        if(this.emote_time<2.5)return
                        this.sprites.emote_container.visible=false
                        this.anims.emote=undefined
                    },
                    ease:ease.circOut
                })
            }
        }
        for(const f of this.effects){
            f.lifetime+=dt
            if(f.def.particles){
                if(f.lifetime>=f.def.particles.delay){
                    f.lifetime=0
                    const angle=random.rad()
                    this.game.particles.add_particle(new ABParticle2D({
                        frame:f.def.particles.frame,
                        direction:-Math.PI/2,
                        angle:angle,
                        life_time:random.float(1,3),
                        position:this.position,
                        speed:random.float(1,3),
                        tint:ColorM.hex("#ffff"),
                        to:{
                            angle:angle+(Math.random()>=0.5?-6:6),
                            tint:ColorM.hex("#fff0"),
                        }
                    }))
                }
            }
        }
    }
    override on_destroy(): void {
        this.anims.consumible_particles!.destroyed=true
        this.container.destroy()
        if(this.sprites.emote_container.visible)this.sprites.emote_container.destroy()
    }
    constructor(){
        super()
    }
    reset_anim(){
        this.sprites.muzzle_flash.visible=false
        this.container.stop_all_animations()
        this.current_animation=undefined
        if(this.sound_animation.animation)this.sound_animation.animation.stop()
        this.sprites.mounth.frame=this.game.resources.get_sprite(this.anims.mount_normal)
        this.sound_animation.animation=undefined
        this.anims.consumible_particles!.enabled=false
        this.attacking=false
        if(this.anims.fire){
            if(this.anims.fire.left_arm)this.anims.fire.left_arm.kill()
            if(this.anims.fire.right_arm)this.anims.fire.right_arm.kill()
            if(this.anims.fire.weapon)this.anims.fire.weapon.kill()
            this.anims.fire=undefined
        }
        if(this.downed){
            this.sprites.left_arm.position=DefaultFistRig.left!.position
            this.sprites.right_arm.position=DefaultFistRig.right!.position
            this.sprites.weapon.visible=false
        }
    }
    emote_time:number=0
    add_emote(emote:GameObjectDef){
        this.game.sounds.play(this.game.resources.get_audio("emote_play"),{
            position:this.position,
            max_distance: 50,
            volume: 0.7,
        },"humans")
        if(!this.sprites.emote_container.visible)this.game.cam2d.addObject(this.sprites.emote_container)
        this.sprites.emote_container.visible=true
        this.emote_time=0
        this.sprites.emote_sprite.frame=this.game.resources.get_sprite(emote.idString)
        this.sprites.emote_container.scale=v2(0,0)
        if(this.anims.emote)this.anims.emote.kill()
        this.game.add_tween({
            target:this.sprites.emote_container.scale,
            duration:0.9,
            to:{
                x:1,
                y:1
            },
            ease:ease.elasticOut
        })
    }
    play_animation(animation:PlayerAnimation){
        if(this.current_animation&&this.current_animation.type==animation.type)return
        this.reset_anim()
        this.current_animation=animation
        switch(this.current_animation.type){
            case PlayerAnimationType.Reloading:{
                if((this.current_weapon as unknown as GameItem).item_type!==InventoryItemType.gun){this.current_animation=undefined;break}
                const d=this.current_weapon as GunDef

                const sound=(d.reload?.reload_alt&&this.current_animation.alt_reload)?this.assets.weapon_reload_sound_alt:this.assets.weapon_reload_sound
                if(sound){
                    if(this.sound_animation.animation)this.sound_animation.animation.stop()
                    this.sound_animation.animation=this.game.sounds.play(sound,{
                        position:this.position,
                        max_distance:10,
                        on_complete:()=>{
                            this.reset_anim()
                        },
                    },"humans")
                }
                break
            }
            case PlayerAnimationType.Consuming:{
                const def=this.game.definitions.consumibles.getFromNumber(this.current_animation.item)
                const sound=this.game.resources.get_audio((def.assets?.using_sound)??`using_${def.idString}`)
                if(sound){
                    if(def.drink){
                        this.sprites.mounth.frames=undefined
                        this.sprites.mounth.frame=this.game.resources.get_sprite(this.anims.mount_open)
                    }
                    this.sound_animation.animation=this.game.sounds.play(sound,{
                        position:this.position,
                        max_distance:10,
                        on_complete:()=>{
                            if(def.drop){
                                const angle=this.physical_data.rotation+(3.141592/2)
                                const p=new ABParticle2D({
                                    direction:angle,
                                    life_time:2,
                                    position:this.sprites.weapon._real_position,
                                    angle:this.sprites.weapon.rotation,
                                    frame:{
                                        image:this.sprites.weapon.frame?.id,
                                        hotspot:CenterHotspot,
                                        layer:this.layer,
                                        zIndex:zIndexes.Particles
                                    },
                                    speed:random.float(0.5,1),
                                    scale:this.sprites.weapon.scale.x,
                                    to:{
                                        angle:angle+random.float(6,10),
                                        scale:0.6
                                    }
                                })
                                this.game.particles.add_particle(p)
                            }
                            this.update_weapon(false)
                            this.reset_anim()
                        }
                    },"humans")
                }
                if(def.assets?.using_particle){
                    this.anims.consumible_particle=def.assets.using_particle
                }if(def.boost_type){
                    this.anims.consumible_particle=`boost_${Boosts[def.boost_type].name}_particle`
                }else{
                    this.anims.consumible_particle="healing_particle"
                }
                this.anims.consumible_particles!.enabled=true
                if(def.animation){
                    this.container.play_animation(def.animation,()=>{
                        this.current_animation=undefined
                    })
                }
                break
            }
            case PlayerAnimationType.Melee:{
                const def=this.current_weapon as MeleeDef
                if(!def)break
                if(def.animation){
                    this.container.play_animation(def.animation,()=>{
                        this.current_animation=undefined
                    })
                }
                const att=()=>{
                    if(def.assets?.use_sound){
                        this.game.sounds.play(this.game.resources.get_audio(def.assets.use_sound),{
                            position:this.position,
                            max_distance:12,
                            volume:0.7
                        },"humans")
                    }
                    const position=v2.add(
                        this.position,
                        v2.mult(v2.from_RadAngle(this.physical_data.rotation),v2(def.offset,def.offset))
                    )
                    const hb=new CircleHitbox2D(position,def.radius)
                    const collidibles:GameObject[]=this.manager.cells.get_objects(hb,this.layer)
                    for(const c of collidibles){
                        if(!hb.collidingWith(c.hitbox))continue
                        switch(c.number_type){
                            case GameObjectType.Obstacle:
                            case GameObjectType.Building:
                                if((c as StaticBody).physical_data.no_collision)continue
                                (c as StaticBody).on_hitted(position,true)
                                break
                            case GameObjectType.Human:
                                if((c as Human).dead||c.id===this.id)continue
                                (c as Human).on_hitted(position,false,def.assets?.hit_sound)
                        }
                    }
                }
                for(const delay of def.damage_delays??[]){
                    this.game.add_timeout(att,delay)
                }
                break
            }
        }
    }
    attacking=false
    attack(){
        if(this.attacking)return
        this.attacking=true
        if(!this.current_weapon||(this.current_weapon as unknown as GameItem).item_type!==InventoryItemType.gun){
            this.current_animation=undefined
            return
        }
        const d=this.current_weapon as GunDef
        const dur=Math.min(d.fireDelay*0.9,0.1)
        if(d.recoil&&!this.anims.fire){
            const w=0.05
            this.anims.fire={
                weapon:this.game.add_tween({
                    target:this.sprites.weapon.position,
                    duration:dur,
                    to:v2.sub(this.sprites.weapon.position,v2(w,0)),
                    yoyo:true,
                    onComplete:()=>{
                        this.current_animation=undefined
                        this.anims.fire=undefined
                    }
                }),
                left_arm:this.game.add_tween({
                    target:this.sprites.left_arm.position,
                    duration:dur,
                    to:v2.sub(this.sprites.left_arm.position,v2(w,0)),
                    yoyo:true,
                }),
                
                right_arm:this.game.add_tween({
                    target:this.sprites.right_arm.position,
                    duration:dur,
                    to:v2.sub(this.sprites.right_arm.position,v2(w,0)),
                    yoyo:true,
                })
            }
        }
        if(d.muzzleFlash&&!this.sprites.muzzle_flash.visible){
            this.sprites.muzzle_flash.frame=this.game.resources.get_sprite(d.muzzleFlash.sprite)
            if(this.anims.muzzle_flash_light)this.anims.muzzle_flash_light.destroyed=true

            //this.anims.muzzle_flash_light=this.game.light_map.addLight(this.sprites.muzzle_flash._real_position,model2d.circle(1),ColorM.hex("#ff0"))
            this.sprites.muzzle_flash.position=v2(d.lenght,0)
            this.sprites.muzzle_flash.visible=true

            this.game.add_timeout(()=>{
                if(this.anims.muzzle_flash_light)this.anims.muzzle_flash_light!.destroyed=true
                this.sprites.muzzle_flash.visible=false
            },dur*0.9)
        }
        
        this.game.add_timeout(()=>{
            this.attacking=false
        },d.fireDelay)
        if(this.assets.weapon_cycle_sound)this.game.add_timeout(()=>{
            //Cycle Sound
            if(this.assets.weapon_cycle_sound){
                this.sound_animation.weapon.switch?.stop()
                this.sound_animation.weapon.switch=this.game.sounds.play(this.assets.weapon_cycle_sound,{
                    on_complete:()=>{
                        this.sound_animation.weapon.switch=undefined
                    },
                    position:this.position,
                    max_distance:10,
                },"humans")
            }
        },d.fireDelay*0.25)
        if(this.game.save.get_variable("sv_graphics_particles")>=GraphicsDConfig.Advanced){
            if(d.case&&!d.case.at_begin){
                const p=new ABParticle2D({
                    direction:this.physical_data.rotation+(3.141592/2)+random.float(0,0.6),
                    life_time:1,
                    position:v2.add(
                        this.position,
                        v2.rotate_RadAngle(d.case.position,this.physical_data.rotation)
                    ),
                    frame:{
                        image:d.case.frame??"casing_"+d.ammoType,
                        hotspot:CenterHotspot,
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
                const audio=this.game.resources.get_audio(d.case!.sound??"casing_sound_"+d.ammoType)
                if(audio)this.game.add_timeout(()=>{
                    this.game.sounds.play(audio,{
                        position:this.position,
                        max_distance:10,
                    },"players")
                },0.75)
                this.game.particles.add_particle(p)
            }
            if(d.gasParticles){
                for(let i=0;i<d.gasParticles.count;i++){
                    const p=new ABParticle2D({
                        direction:this.physical_data.rotation+random.float(-d.gasParticles.direction_variation,d.gasParticles.direction_variation),
                        life_time:d.gasParticles.life_time,
                        position:v2.add(
                            this.position,
                            v2.mult(v2.from_RadAngle(this.physical_data.rotation),v2(d.lenght,d.lenght))
                        ),
                        frame:{
                            image:"gas_smoke_particle",
                            hotspot:CenterHotspot
                        },
                        speed:random.float(d.gasParticles.speed.min,d.gasParticles.speed.max),
                        scale:0.03,
                        tint:ColorM.hex("#fff5"),
                        to:{
                            tint:ColorM.hex("#fff0"),
                            scale:random.float(d.gasParticles.size.min,d.gasParticles.size.max)
                        }
                    })
                    this.game.particles.add_particle(p)
                }
            }
        }
        if(this.assets.weapon_fire_sound){
            this.game.sounds.play(this.assets.weapon_fire_sound,{
                position:this.position,
                max_distance: 15,
                volume:0.7
            },"humans")
        }
    }
    set_helmet(helmet:number){
        if(this.helmet&&helmet-1===this.helmet.idNumber!)return
        if(helmet>0){
            this.helmet=this.game.definitions.helmets.getFromNumber(helmet-1)
            const h=this.helmet

            if(h.position){
                this.sprites.helmet.position=v2(h.position.x,h.position.y)
            }else{
                this.sprites.helmet.position=v2(0,0)
            }
            this.sprites!.helmet.frame=this.game.resources.get_sprite(h.idString+"_world")
        }else{
            this.sprites.helmet.frame=undefined
        }
    }
    set_vest(vest:number){
        if(this.vest&&vest-1===this.vest.idNumber!)return
        if(vest>0){
            this.sprites.vest.visible=true
            this.vest=this.game.definitions.vests.getFromNumber(vest-1)
            this.sprites!.vest.tint=ColorM.number(this.vest.tint)
        }else{
            this.sprites.vest.visible=false
        }
    }
    update_helmet_health(){
        if(!this.helmet){
            this.sprites.helmet.frame = undefined
            return
        }
        let frame = this.helmet.idString + "_world"
        if(this.helmet.health_frames && this.helmet.health){
            const hp = this.helmet_health / this.helmet.health
            for(const h of this.helmet.health_frames){
                if(hp <= h.health){
                    frame = h.frame
                    break
                }
            }
        }

        this.sprites.helmet.frame = this.game.resources.get_sprite(frame)
    }
    set_backpack(backpack:number){
        if(this.backpack&&backpack===this.backpack.idNumber!)return
        this.backpack=this.game.definitions.backpacks.getFromNumber(backpack)
        if(this.backpack.no_world_image){
            this.sprites.backpack.frame=undefined
        }else{
            this.sprites!.backpack.frame=this.game.resources.get_sprite(this.backpack.idString+"_world")
        }
    }
    on_effect_added(effect:EffectDef){
        if(effect.assets?.sounds?.when_take){
            this.game.sounds.play(this.game.resources.get_audio(effect.assets.sounds.when_take),{
                position:this.position,
                max_distance: 7,
                volume: 0.7,
            },"humans")
        }
    }
    on_effect_removed(effect:EffectDef){
        if(effect.assets?.sounds?.when_remove){
            this.game.sounds.play(this.game.resources.get_audio(effect.assets.sounds.when_remove),{
                position:this.position,
                max_distance: 7,
                volume: 0.7,
            },"humans")
        }
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
                this.on_effect_added(newEffect)
                result.push({
                    def: newEffect,
                    lifetime: 0
                })
            }
        }
        for(const [id, oldEffect] of oldMap){
            if(!newMap.has(id)){
                this.on_effect_removed(oldEffect.def)
            }
        }
        this.effects = result
    }
    broke_shield(){
        if(this.game.save.get_variable("sv_graphics_particles")>=GraphicsDConfig.Advanced){
            for(let p=0;p<14;p++){
                const a=random.rad()
                this.game.particles.add_particle(new ABParticle2D({
                    direction:random.rad(),
                    life_time:0.5+(Math.random()*0.5),
                    position:this.position,
                    speed:7,
                    scale:random.float(2,3),
                    frame:{
                        image:"shield_part"
                    },
                    angle:a,
                    tint:ColorM.rgba(255,255,255,255),
                    to:{
                    tint:ColorM.rgba(255,255,255,0),
                        scale:0.3,
                        angle:random.float(-10,10),
                        speed:5,
                    }
                }))
            }
        }
        if(this.game.save.get_variable("sv_graphics_particles")>=GraphicsDConfig.Normal){
            this.game.particles.add_particle(new ABParticle2D({
                direction:0,
                life_time:0.4,
                position:this.position,
                speed:0,
                scale:0.1,
                frame:{
                    image:"shockwave",
                    hotspot:v2(.5,.5)
                },
                tint:ColorM.rgba(255,255,255,255),
                to:{
                tint:ColorM.rgba(255,255,255,0),
                    scale:10,
                }
            }))
        }
        const sound=this.game.resources.get_audio(`shield_break`)
        if(sound){
            this.game.sounds.play(sound,{
                position:this.position,
                max_distance:15
            })
        }
    }
    override decode(stream: NetStream, full: boolean): void {
        const [
            physical_dirty_part,physical_dirty,
            equipment_dirty_part,equipment_dirty,
            loadout_dirty,
            animation_dirty,
            effects_dirty,

            hand_dirty,

            has_emote,
            has_animation,

            attacking,
            swithced,

            dead,downed,invensibility,
        ]=stream.readBooleanGroup2()
        const [
            controlling
        ]=stream.readBooleanGroup()
        this.controlling=controlling
        if(!dead&&this.dead){
            this.dead=false
        }else if(dead){
            this.on_die()
        }
        if(full||physical_dirty_part||physical_dirty){
            this.decode_physical_data(stream,full)
        }
        if(full||equipment_dirty||equipment_dirty_part){
            const helmet_health=stream.readUint16()
            const vest_health=stream.readUint16()
            this.helmet_health=helmet_health
            this.vest_health=vest_health
            if(full||equipment_dirty){
                this.set_helmet(stream.readUint8())
                this.set_vest(stream.readUint8())
                this.set_backpack(stream.readUint8())
            }
            //this.update_helmet_health()
        }
        if(loadout_dirty||full){
            const body_def=this.game.definitions.loadout.getFromNumber(stream.readUint16()) as LoadoutBodyDef
            const hair_def=this.game.definitions.loadout.getFromNumber(stream.readUint16()) as LoadoutHairDef
            const eyes_def=this.game.definitions.loadout.getFromNumber(stream.readUint16()) as LoadoutEyesDef
            const shirt_def=this.game.definitions.loadout.getFromNumber(stream.readUint16()) as LoadoutShirtDef
            const body_tint=stream.readUint32()
            const hair_tint=stream.readUint32()
            this.set_skin(body_def,hair_def,eyes_def,shirt_def,body_tint,hair_tint)
        }
        if(has_emote){
            this.add_emote(this.game.definitions.game_objects.valueNumber[stream.readUint16()])
        }
        if(attacking){
            if(!this.attacking)this.attack()
        }
        if(full||animation_dirty){
            if(has_animation){
                const tp=stream.readUint8() as PlayerAnimationType
                let animation:PlayerAnimation
                switch(tp){
                    case PlayerAnimationType.Reloading:
                        animation={
                            type:tp,
                            alt_reload:!!stream.readUint8()
                        }
                        break
                    case PlayerAnimationType.Consuming:
                        animation={
                            type:tp,
                            item:stream.readUint16()
                        }
                        break
                    default:{
                        animation={
                            type:tp
                        }
                        break
                    }
                }
                this.play_animation(animation)
            }
        }
        if(full||effects_dirty){
            const effects=stream.readArray(()=>{
                return Effects.getFromNumber(stream.readUint16())
            },1)
            this.update_effects(effects)
        }
        if(full||hand_dirty){
            const id = stream.readInt16()
            const current_weapon = id >= 0 ? (this.game.definitions.game_items.valueNumber[id] as WeaponDef) : undefined
            if(current_weapon!==this.current_weapon){
                this.current_weapon=current_weapon
                this.update_weapon(true)
            }else if(swithced)this.update_weapon(true)
        }
        if(downed){
            this.on_downed()
        }else if(this.downed&&!downed){
            this.on_help_up()
        }
    }
}