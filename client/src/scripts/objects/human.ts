
import { ABParticle2D, AnimatedContainer2D, AnimationInstance, CenterHotspot, CircleHitbox2D, type ClientGame, ClientParticle2D, ColorM, Container2D, ease, KeyFrameSpriteDef, Light2D, NetStream, Numeric, ParticlesEmitter2D, random, Sound, SoundInstance, SoundOptions, Sprite2D, Tween, v2, v2m, Vec2 } from "common/engine/client.ts";
import { GameConstants, GameObjectType,  PlayerAnimation, PlayerAnimationType, zIndexes } from "common/scripts/others/constants.ts"
import { GameObject } from "../others/gameObject.ts"
import { GraphicsDConfig } from "../others/config.ts"
import { InventoryItemType } from "common/scripts/definitions/utils.ts"
import { DualAdditional, GunDef } from "common/scripts/definitions/items/guns.ts"
import { BackpackDef } from "common/scripts/definitions/items/backpacks.ts"
import { SkinDef } from "common/scripts/definitions/loadout/skins.ts"
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
    skin!:SkinDef
    container!:AnimatedContainer2D
    sprites!:{
        body:Sprite2D,
        mounth:Sprite2D,
        helmet:Sprite2D,
        vest:Sprite2D,
        backpack:Sprite2D,
        left_arm:Sprite2D,
        right_arm:Sprite2D,
        chest:Sprite2D,
        left_leg:Sprite2D,
        right_leg:Sprite2D,
        weapon:Sprite2D,
        weapon2:Sprite2D,
        muzzle_flash:Sprite2D,
        parachute:Sprite2D,
        emote_container:Container2D,
        emote_bg:Sprite2D,
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
        this.happy=false
        this.reset_anim()
    }
    on_help_up(){
        if(!this.downed)return
        this.downed=false
        this.sprites.left_leg.visible=false
        this.sprites.right_leg.visible=false
        this.sprites.chest.visible=false
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
                this.sprites.left_arm.visible=true
                this.sprites.left_arm.position=def.arms.left.position
                this.sprites.left_arm.rotation=def.arms.left.rotation
                this.sprites.left_arm.zIndex=def.arms.left.zIndex??1
            }else{
                this.sprites.left_arm.visible=false
            }
            if(def.arms.right){
                this.sprites.right_arm.visible=true
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
            this.sprites.weapon.scale=v2.new(scale,scale)
            this.sprites.weapon.position=v2.clone(def.image.position)
            this.sprites.weapon.rotation=def.image.rotation
            this.sprites.weapon.zIndex=def.image.zIndex??2
            this.sprites.weapon.hotspot=def.image.hotspot??v2.new(.5,.5)
            if((def as GunDef).dual_from&&(def as unknown as GameItem).item_type===InventoryItemType.gun){
                const df=this.game.definitions.guns.getFromString((def as GunDef).dual_from!)
                const world_frame=def.assets?.world??`${df.idString}_world`
                this.sprites.weapon2.visible=true
                this.sprites.weapon2.scale=v2.new(1*(def.image.scale??1),1)
                this.sprites.weapon2.position=v2.clone(def.image.position)
                this.sprites.weapon2.rotation=def.image.rotation
                this.sprites.weapon2.zIndex=def.image.zIndex??2
                this.sprites.weapon2.hotspot=def.image.hotspot??v2.new(.5,.5)
                this.sprites.weapon.position.y+=(def as GunDef&DualAdditional).dual_offset!

                this.sprites.left_arm.visible=true
                this.sprites.right_arm.visible=true
                this.sprites.left_arm.position=v2.new(DefaultFistRig.left!.position.x,-(def as GunDef&DualAdditional).dual_offset!)
                this.sprites.right_arm.position=v2.new(DefaultFistRig.right!.position.x,(def as GunDef&DualAdditional).dual_offset!)
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
    set_skin(skin:SkinDef){
        if(this.skin==skin)return
        this.skin=skin

        const bf=skin.frame?.base??(skin.idString+"_body")
        const cf=skin.frame?.chest??(skin.idString+"_chest")
        this.sprites.body.frame=this.game.resources.get_sprite(bf)
        const arf=skin.frame?.arm??(skin.idString+"_arm")
        const lrf=skin.frame?.leg??(skin.idString+"_leg")

        this.sprites.left_arm.frame=this.game.resources.get_sprite(arf)
        this.sprites.right_arm.frame=this.game.resources.get_sprite(arf)
        this.sprites.left_arm.visible=false
        this.sprites.right_arm.visible=false
        this.sprites.left_arm.zIndex=1
        this.sprites.right_arm.zIndex=1

        this.sprites.left_leg.frame=this.game.resources.get_sprite(lrf)
        this.sprites.right_leg.frame=this.game.resources.get_sprite(lrf)

        this.sprites.left_leg.position=v2.new(-0.75,-0.22)
        this.sprites.right_leg.position=v2.new(-0.75,0.22)
        this.sprites.left_leg.scale=v2.new(1.33333,1.33333)
        this.sprites.right_leg.scale=v2.new(1.33333,1.33333)
        this.sprites.left_leg.rotation=0.1
        this.sprites.right_leg.rotation=-0.1
        this.sprites.left_leg.visible=false
        this.sprites.right_leg.visible=false
        this.sprites.left_leg.zIndex=1
        this.sprites.right_leg.zIndex=1

        this.sprites.chest.frame=this.game.resources.get_sprite(cf)
        this.sprites.chest.position=v2.new(-0.25,0)
        this.sprites.chest.scale=v2.new(1.33333,1.33333)
        this.sprites.chest.visible=false
        this.sprites.chest.zIndex=1

        this.sprites.body.hotspot=v2.new(0.5,0.5)
        this.sprites.chest.hotspot=v2.new(0.5,0.5)
        this.sprites.left_leg.hotspot=v2.new(0,0.5)
        this.sprites.right_leg.hotspot=v2.new(0,0.5)
        this.sprites.helmet.hotspot=v2.new(0.5,0.5)
        this.sprites.backpack.hotspot=v2.new(1,0.5)
        this.sprites.weapon.hotspot=v2.new(0.5,0.5)

        this.sprites.left_arm.hotspot=v2.new(1,0.5)
        this.sprites.right_arm.hotspot=v2.new(1,0.5)

        this.sprites.weapon.zIndex=2

        this.anims.mount_normal=skin.frame?.mount?.normal??"player_mounth_1_1"
        this.anims.mount_open=skin.frame?.mount?.closed??"player_mounth_1_2"
        this.sprites.mounth.frame=this.game.resources.get_sprite(this.anims.mount_normal)
        this.anims.mount_anims.length=0
        if(!this.skin.animation?.no_auto_talk){
            this.anims.mount_anims.push({delay:random.float(8,14),image:this.anims.mount_normal})
            const c=random.int(10,20)
            for(let i=0;i<c;i++){
                this.anims.mount_anims.push(
                    {delay:0.15,image:this.anims.mount_normal},
                    {delay:0.15,image:this.anims.mount_open}
                )
            }
            this.anims.mount_anims.push({delay:random.float(1,5),image:this.anims.mount_normal})
        }
        this.sprites.mounth.frames=this.anims.mount_anims
        if(!skin.animation?.no){
            if(skin.animation?.frames){
                this.sprites.body.frames=[...skin.animation.frames]
            }else{
                this.sprites.body.frames=[{delay:random.float(3.4,3.6),image:bf},{delay:0.1,image:bf+"_1"}]
            }
        }

        this.container.update_zindex()

        this.update_weapon(false)
        this.reset_anim()
    }
    override on_layer_set(layer: number): void {
        this.container.layer=layer
        this.sprites.emote_container.layer=layer
    }
    override create(_args: Record<string, void>): void {
        this.base_hitbox=new CircleHitbox2D(v2.new(0,0),GameConstants.player.radius)
        this.container=new AnimatedContainer2D(this.game as unknown as ClientGame)

        this.sprites={
            body:this.container.add_animated_sprite("body",{scale:1.333333,zIndex:4}),
            mounth:this.container.add_animated_sprite("mounth",{hotspot:v2.new(0.3,0.5),scale:1.4,position:v2.new(0.3,0),zIndex:4}),
            backpack:this.container.add_sprite("backpack",{position:v2.new(-0.27,0),scale:1.34,zIndex:3}),
            helmet:this.container.add_sprite("helmet",{zIndex:5,scale:1.333333}),
            vest:this.container.add_sprite("vest",{zIndex:0,scale:1.333333,hotspot:v2.new(.5,.5)}),
            left_arm:this.container.add_sprite("left_arm"),
            right_arm:this.container.add_sprite("right_arm"),
            left_leg:this.container.add_sprite("left_leg"),
            right_leg:this.container.add_sprite("right_leg"),
            chest:this.container.add_sprite("chest"),
            muzzle_flash:this.container.add_sprite("muzzle_flash",{visible:false,zIndex:6,hotspot:v2.new(0,.5)}),
            parachute:new Sprite2D(),//this.container.add_sprite("parachute",{zIndex:7,hotspot:v2.new(0.5,0.5),visible:false}),
            weapon:this.container.add_sprite("weapon"),
            weapon2:this.container.add_sprite("weapon2"),
            emote_container:new Container2D(),
            emote_bg:new Sprite2D(),
            emote_sprite:new Sprite2D()
        }
        this.sprites.emote_container.zIndex=zIndexes.DamageSplashs
        this.anims.consumible_particles=this.game.particles.add_emiter({
            delay:0.5,
            particle:()=>new ABParticle2D({
                direction:-3.141592/2,
                frame:{
                    image:this.anims.consumible_particle,
                },
                life_time:random.float(2,3),
                position:v2.add(this.position,v2.new(random.float((this.hitbox as CircleHitbox2D).radius*-0.8,(this.hitbox as CircleHitbox2D).radius*0.8),0)),
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
        this.set_skin(this.game.definitions.skins.getFromString("default_skin"))
        this.sprites.vest._frame=this.game.resources.get_sprite("player_vest")
        this.sprites.vest.sync_rotation=false
        this.sprites.emote_container.sync_rotation=false
        this.sprites.emote_container.position=v2.new(0,-1.5)
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
                        position:v2.new(-0.2,-0.2),
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
                            position:v2.new(-0.56,-0.2),
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
                        direction:angle,
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
        if(!this.sprites.mounth.frames&&this.anims.mount_anims){
            this.sprites.mounth.frames=this.anims.mount_anims
            this.sprites.mounth.current_delay=1000
        }
        this.sound_animation.animation=undefined
        this.anims.consumible_particles!.enabled=false
        this.attacking=false
        if(this.anims.fire){
            if(this.anims.fire.left_arm)this.anims.fire.left_arm.kill()
            if(this.anims.fire.right_arm)this.anims.fire.right_arm.kill()
            if(this.anims.fire.weapon)this.anims.fire.weapon.kill()
            this.anims.fire=undefined
        }
        if(this.happy){
            this.sprites.mounth.scale.x=1.4
            this.sprites.mounth.frames=this.anims.mount_anims
        }else{
            this.sprites.mounth.scale.x=-1.4
            this.sprites.mounth.frames=undefined
            this.sprites.mounth.frame=this.game.resources.get_sprite(this.anims.mount_normal)
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
        this.sprites.emote_container.scale=v2.new(0,0)
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
                            this.update_weapon(false)
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
                        v2.mult(v2.from_RadAngle(this.physical_data.rotation),v2.new(def.offset,def.offset))
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
                    to:v2.sub(this.sprites.weapon.position,v2.new(w,0)),
                    yoyo:true,
                    onComplete:()=>{
                        this.current_animation=undefined
                        this.anims.fire=undefined
                    }
                }),
                left_arm:this.game.add_tween({
                    target:this.sprites.left_arm.position,
                    duration:dur,
                    to:v2.sub(this.sprites.left_arm.position,v2.new(w,0)),
                    yoyo:true,
                }),
                
                right_arm:this.game.add_tween({
                    target:this.sprites.right_arm.position,
                    duration:dur,
                    to:v2.sub(this.sprites.right_arm.position,v2.new(w,0)),
                    yoyo:true,
                })
            }
        }
        if(d.muzzleFlash&&!this.sprites.muzzle_flash.visible){
            this.sprites.muzzle_flash.frame=this.game.resources.get_sprite(d.muzzleFlash.sprite)
            if(this.anims.muzzle_flash_light)this.anims.muzzle_flash_light.destroyed=true

            //this.anims.muzzle_flash_light=this.game.light_map.addLight(this.sprites.muzzle_flash._real_position,model2d.circle(1),ColorM.hex("#ff0"))
            this.sprites.muzzle_flash.position=v2.new(d.lenght,0)
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
            if(d.caseParticle&&!d.caseParticle.at_begin){
                const p=new ABParticle2D({
                    direction:this.physical_data.rotation+(3.141592/2),
                    life_time:0.4,
                    position:v2.add(
                        this.position,
                        v2.rotate_RadAngle(d.caseParticle.position,this.physical_data.rotation)
                    ),
                    frame:{
                        image:d.caseParticle.frame??"casing_"+d.ammoType,
                        hotspot:CenterHotspot
                    },
                    speed:random.float(3,4),
                    angle:0,
                    scale:1,
                    to:{
                        angle:random.float(1,3),
                        scale:0.7
                    }
                })
                this.game.particles.add_particle(p)
            }
            if(d.gasParticles){
                for(let i=0;i<d.gasParticles.count;i++){
                    const p=new ABParticle2D({
                        direction:this.physical_data.rotation+random.float(-d.gasParticles.direction_variation,d.gasParticles.direction_variation),
                        life_time:d.gasParticles.life_time,
                        position:v2.add(
                            this.position,
                            v2.mult(v2.from_RadAngle(this.physical_data.rotation),v2.new(d.lenght,d.lenght))
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
                this.sprites.helmet.position=v2.new(h.position.x,h.position.y)
            }else{
                this.sprites.helmet.position=v2.new(0,0)
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
                    hotspot:v2.new(.5,.5)
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
            const skin=stream.readUint16()
            this.sprites.parachute.visible=false
            this.set_skin(this.game.definitions.skins.getFromNumber(skin))
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