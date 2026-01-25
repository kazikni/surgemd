import { CircleHitbox2D, KeyFrameSpriteDef, model2d, NetStream, random, v2, v2m, Vec2 } from "common/scripts/engine/mod.ts"
import { GameConstants, PlayerAnimation, PlayerAnimationType, zIndexes } from "common/scripts/others/constants.ts"
import { GameItem, GameObjectDef, GameObjectsDefs, WeaponDef,Weapons } from "common/scripts/definitions/alldefs.ts"
import { GameObject } from "../others/gameObject.ts"
import { AnimatedContainer2D, Light2D, Sprite2D, type Tween } from "../engine/mod.ts"
import { GraphicsDConfig } from "../others/config.ts"
import { Decal } from "./decal.ts"
import { InventoryItemType } from "common/scripts/definitions/utils.ts"
import { DualAdditional, GunDef, Guns } from "common/scripts/definitions/items/guns.ts"
import { ClientGame2D, type ClientGameObject2D } from "../engine/game.ts"
import { ColorM } from "../engine/renderer.ts"
import { SoundInstance, SoundOptions } from "../engine/sounds.ts"
import { BackpackDef, Backpacks } from "common/scripts/definitions/items/backpacks.ts"
import {SkinDef, Skins} from "common/scripts/definitions/loadout/skins.ts"
import { DefaultFistRig } from "common/scripts/others/item.ts"
import { Consumibles } from "common/scripts/definitions/items/consumibles.ts"
import { ParticlesEmitter2D} from "common/scripts/engine/particles.ts"
import { Boosts } from "common/scripts/definitions/player/boosts.ts"
import { ease, Numeric } from "common/scripts/engine/utils.ts"
import { Container2D } from "../engine/container_2d.ts"
import { MeleeDef, Melees } from "common/scripts/definitions/items/melees.ts"
import { ABParticle2D, ClientParticle2D } from "../engine/particles.ts"
import { HelmetDef, Helmets, VestDef, Vests } from "common/scripts/definitions/items/equipaments.ts"
import { type Sound } from "../engine/resources.ts"
import { FloorKind, Floors, FloorType } from "common/scripts/others/terrain.ts"
import { CenterHotspot } from "../engine/utils.ts"
import { type Obstacle } from "./obstacle.ts"
export class Player extends GameObject{
    stringType:string="player"
    numberType: number=1
    zIndex=zIndexes.Players

    vest?:VestDef
    helmet?:HelmetDef
    backpack?:BackpackDef

    rotation:number=0
    scale:number=1

    parachute:boolean=false

    skin!:string
    container!:AnimatedContainer2D
    sprites!:{
        body:Sprite2D,
        mounth:Sprite2D,
        helmet:Sprite2D,
        vest:Sprite2D,
        backpack:Sprite2D,
        left_arm:Sprite2D,
        right_arm:Sprite2D,
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
        emote?:Tween<Vec2>
    }={consumible_particle:"healing_particle",mount_anims:[],mount_open:""}
    sound_animation:{
        animation?:SoundInstance
        footsteps?:SoundInstance
        weapon:{
            switch?:SoundInstance
        }
    }={weapon:{}}

    current_weapon?:WeaponDef
    dead:boolean=true

    shield:boolean=false

    assets:{
        weapon_cycle_sound?:Sound
        weapon_fire_sound?:Sound
        footstep_sounds?:string[]
    }={}

    default_melee=Melees.getFromString("survival_knife")
    current_floor?:FloorType

    on_hitted(position:Vec2,critical:boolean=false,sound?:string){
        if(Math.random()<=0.1){
            const d=new Decal()
            d.sprite.frame=this.game.resources.get_sprite(`blood_decal_${random.int(1,2)}`)
            d.sprite.scale=v2.random(0.7,1.4)
            d.sprite.rotation=random.rad()
            d.sprite.position=v2.duplicate(position)
            this.game.scene.objects.add_object(d,this.layer)
        }
        if(!this.shield){
            this.game.particles.add_particle(new ABParticle2D({
                scale:0.1,
                frame:{
                    image:`blood_splash_${random.int(1,3)}`,
                },
                direction:random.rad(),
                life_time:0.5,
                position:position,
                speed:random.float(0.1,0.5),
                angle:random.rad(),
                tint:ColorM.rgba(170,10,40),
                to:{
                    scale:1.5,
                    tint:ColorM.rgba(170,10,40,0)
                },
                zIndex:zIndexes.Particles
            }))
        }
        
        this.play_sound(this.game.resources.get_audio(sound??(
            (this.vest&&this.vest.reflect_bullets)?
                (
                    "player_metal_hit"
                ):
                (critical?
                    "player_headshot":
                    `player_hit_${random.int(1,2)}`
                )
            )
        ))
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
                life_time:0.5,
                position:this.position,
                speed:random.float(2,4),
                angle:random.rad(),
                tint:ColorM.rgba(170,10,40),
                to:{
                    scale:1.8,
                    tint:ColorM.rgba(170,10,40,0)
                },
                zIndex:zIndexes.Particles
            }))
        }
        const d=new Decal()
        d.sprite.frame=this.game.resources.get_sprite(`blood_decal_${random.int(1,2)}`)
        d.sprite.scale=v2.random(2,3)
        d.sprite.rotation=random.rad()
        d.sprite.position=v2.duplicate(this.position)
        this.game.scene.objects.add_object(d,this.layer)
        for(let i=0;i<4;i++){
            this.game.particles.add_particle(new ABParticle2D({
                scale:0.1,
                frame:{
                    image:`player_gore_${random.int(1,2)}`,
                },
                direction:random.rad(),
                life_time:0.7,
                position:this.position,
                speed:random.float(5,6),
                angle:random.rad(),
                tint:ColorM.default.white,
                to:{
                    scale:1.7,
                    tint:ColorM.rgba(255,255,255,0)
                },
                zIndex:zIndexes.Particles
            }))
        }

        this.container.destroy()
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
        this.sprites.left_arm.position=v2.duplicate(DefaultFistRig.left!.position)
        this.sprites.right_arm.position=v2.duplicate(DefaultFistRig.right!.position)
        this.sprites.left_arm.rotation=DefaultFistRig.left!.rotation
        this.sprites.right_arm.rotation=DefaultFistRig.right!.rotation
        this.driving=true
    }

    update_weapon(is_new:boolean=false){
        if(this.driving||!this.current_weapon)return
        this.reset_anim()
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
            this.sprites.weapon.position=v2.duplicate(def.image.position)
            this.sprites.weapon.rotation=def.image.rotation
            this.sprites.weapon.zIndex=def.image.zIndex??2
            this.sprites.weapon.hotspot=def.image.hotspot??v2.new(.5,.5)
            if((def as GunDef).dual_from&&(def as unknown as GameItem).item_type===InventoryItemType.gun){
                const df=Guns.getFromString((def as GunDef).dual_from!)
                const world_frame=def.assets?.world??`${df.idString}_world`
                this.sprites.weapon2.visible=true
                this.sprites.weapon2.scale=v2.new(1*(def.image.scale??1),1)
                this.sprites.weapon2.position=v2.duplicate(def.image.position)
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
                this.sound_animation.weapon.switch=this.play_sound(sound,{
                    on_complete:()=>{
                        this.sound_animation.weapon.switch=undefined
                    },
                })
            }
            this.attacking=false
            // deno-lint-ignore ban-ts-comment
            //@ts-ignore
            const sdd=def.dual_from??def.idString
            this.assets.weapon_fire_sound=this.game.resources.get_audio(`${sdd}_fire`)
            this.assets.weapon_cycle_sound=this.game.resources.get_audio(
                (def.assets?.cycle_sound===true)?
                (`${sdd}_switch`):
                (def.assets?.cycle_sound as string)
            )
        }
        this.container.updateZIndex()
    }
    set_skin(skin:SkinDef){
        if(this.skin==skin.idString)return
        this.skin=skin.idString

        const bf=skin.frame?.base??(skin.idString+"_body")
        this.sprites.body.frame=this.game.resources.get_sprite(bf)
        const arf=skin.frame?.arm??(skin.idString+"_arm")
        this.sprites.left_arm.frame=
        this.sprites.right_arm.frame=this.game.resources.get_sprite(arf)

        this.sprites.left_arm.zIndex=1
        this.sprites.right_arm.zIndex=1

        this.sprites.left_arm.visible=false
        this.sprites.right_arm.visible=false

        this.sprites.body.hotspot=v2.new(0.5,0.5)
        this.sprites.helmet.hotspot=v2.new(0.5,0.5)
        this.sprites.backpack.hotspot=v2.new(1,0.5)
        this.sprites.weapon.hotspot=v2.new(0.5,0.5)

        this.sprites.left_arm.hotspot=v2.new(1,0.5)
        this.sprites.right_arm.hotspot=v2.new(1,0.5)

        this.sprites.weapon.zIndex=2

        const ms1=skin.frame?.mount?.normal??"player_mounth_1_1"
        const ms2=skin.frame?.mount?.closed??"player_mounth_1_2"
        this.anims.mount_open=ms2
        this.sprites.mounth.frame=this.game.resources.get_sprite(ms1)
        this.anims.mount_anims.length=0
        if(!skin.animation?.no_auto_talk){
            this.anims.mount_anims.push({delay:random.float(8,14),image:ms1})
            const c=random.int(10,20)
            for(let i=0;i<c;i++){
                this.anims.mount_anims.push(
                    {delay:0.15,image:ms1},
                    {delay:0.15,image:ms2}
                )
            }
            this.anims.mount_anims.push({delay:random.float(1,5),image:ms1})
        }
        this.sprites.mounth.frames=this.anims.mount_anims
        if(!skin.animation?.no){
            if(skin.animation?.frames){
                this.sprites.body.frames=[...skin.animation.frames]
            }else{
                this.sprites.body.frames=[{delay:random.float(3.4,3.6),image:bf},{delay:0.1,image:bf+"_1"}]
            }
        }

        this.container.updateZIndex()

        this.update_weapon(false)
    }
    create(_args: Record<string, void>): void {
        this.base_hitbox=new CircleHitbox2D(v2.new(0,0),GameConstants.player.playerRadius)
        this.container=new AnimatedContainer2D(this.game as unknown as ClientGame2D)
        //#region AA
        this.sprites={
            body:this.container.add_animated_sprite("body",{scale:1.333333,zIndex:4}),
            mounth:this.container.add_animated_sprite("mounth",{hotspot:v2.new(0.3,0.5),scale:1.4,position:v2.new(0.3,0),zIndex:4}),
            backpack:this.container.add_sprite("backpack",{position:v2.new(-0.27,0),scale:1.34,zIndex:3}),
            helmet:this.container.add_sprite("helmet",{zIndex:5,scale:1.333333}),
            vest:this.container.add_sprite("vest",{zIndex:0,scale:1.333333,hotspot:v2.new(.5,.5)}),
            left_arm:this.container.add_sprite("left_arm"),
            right_arm:this.container.add_sprite("right_arm"),
            muzzle_flash:this.container.add_sprite("muzzle_flash",{visible:false,zIndex:6,hotspot:v2.new(0,.5)}),
            parachute:this.container.add_sprite("parachute",{zIndex:7,hotspot:v2.new(0.5,0.5)}),
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
        //#endregion
        this.game.camera.addObject(this.container)
        this.sprites.parachute.frame=this.game.resources.get_sprite("parachute")
        this.set_skin(Skins.getFromString("default_skin"))
        if(this.game.activePlayerId===this.id){
            this.game.activePlayer=this
        }
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
            scale:1.5
        },this.game.resources)
        this.sprites.emote_sprite.transform_frame({
            hotspot:CenterHotspot,
            scale:2.6
        })
    }
    old_pos?:Vec2
    distance_walked=0
    distance_since_last_footstep=0
    update(dt:number): void {
        this.container.rotation=this.rotation
        if(this.dest_pos){
            this.position=v2.lerp(this.position,this.dest_pos,this.game.inter_global)
        }
        if(this.dest_rot){
            this.rotation=Numeric.lerp_rad(this.rotation,this.dest_rot!,this.game.inter_global)
        }
        if(!this.old_pos){
            this.old_pos=v2.duplicate(this.position)
            this.manager.cells.updateObject(this)
        }
        if(this.old_pos.y!=this.position.x||this.old_pos.y!=this.position.y){
            const dist = v2.distance(this.old_pos, this.position)
            this.old_pos=v2.duplicate(this.position)

            this.container._position.set(this.position.x,this.position.y)
            this.manager.cells.updateObject(this)

            const f=this.game.terrain.get_floor_type(this.position,this.layer,FloorType.Water)
            if(f!==this.current_floor){
                this.current_floor=f
                this.assets.footstep_sounds=Floors[f].footstep_sounds
            }
            this.distance_walked+=dist
            this.distance_since_last_footstep+=dist
            if(this.distance_since_last_footstep>=2){
                this.distance_since_last_footstep=0
                if(this.assets.footstep_sounds){
                    this.sound_animation.footsteps=this.play_sound(this.game.resources.get_audio(random.choose(this.assets.footstep_sounds)))
                }
                if(Floors[f].floor_kind===FloorKind.Liquid){
                    this.game.particles.add_particle(new ABParticle2D({
                        direction:0,
                        frame:{
                            image:"riple",
                            hotspot:CenterHotspot,
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
                this.anims.emote=this.game.addTween({
                    target:this.sprites.emote_container.scale,
                    duration:0.8,
                    to:{
                        x:0,
                        y:0
                    },
                    onComplete:()=>{
                        if(this.emote_time<2.5)return
                        this.sprites.emote_container.visible=false
                        this.sprites.emote_container.destroy()
                        this.anims.emote=undefined
                    },
                    ease:ease.circOut
                })
            }
        }
        /*const objects:ClientGameObject2D[]=this.manager.cells.get_objects(this.hitbox,this.layer)
        for(const obj of objects){
            if(obj.id===this.id)continue
            switch(obj.stringType){
                case "building":{
                    const o:Building=obj as Building
                    for(const ceiling of o.ceilings){
                        if(ceiling.hitbox.collidingWith(this.hitbox)){
                            ceiling.container.tint.a=Numeric.lerp(ceiling.container.tint.a,ceiling.opacity,1/(1+dt*1000))
                            ceiling.collided=true
                        }
                    }
                }
            }
        }*/
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
    }
    emote_time:number=0
    add_emote(emote:GameObjectDef){
        this.play_sound(this.game.resources.get_audio("emote_play"))
        if(!this.sprites.emote_container.visible)this.game.camera.addObject(this.sprites.emote_container)
        this.sprites.emote_container.visible=true
        this.emote_time=0
        this.sprites.emote_sprite.frame=this.game.resources.get_sprite(emote.idString)
        this.sprites.emote_container.scale=v2.new(0,0)
        if(this.anims.emote)this.anims.emote.kill()
        this.game.addTween({
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
        if(this.current_animation!==undefined)return
        this.reset_anim()
        this.current_animation=animation
        switch(this.current_animation.type){
            case PlayerAnimationType.Reloading:{
                if((this.current_weapon as unknown as GameItem).item_type!==InventoryItemType.gun){this.current_animation=undefined;break}
                const d=this.current_weapon as GunDef

                const sound=this.game.resources.get_audio((d.reload?.reload_alt&&this.current_animation.alt_reload)?`${d.idString}_reload_alt`:`${d.idString}_reload`)
                if(sound){
                    if(this.sound_animation.animation)this.sound_animation.animation.stop()
                    this.sound_animation.animation=this.play_sound(sound,{
                        on_complete:()=>{
                            this.reset_anim()
                        },
                    })
                }
                break
            }
            case PlayerAnimationType.Consuming:{
                const def=Consumibles.getFromNumber(this.current_animation.item)
                const sound=this.game.resources.get_audio((def.assets?.using_sound)??`using_${def.idString}`)
                if(sound){
                    if(def.drink){
                        this.sprites.mounth.frames=undefined
                        this.sprites.mounth.frame=this.game.resources.get_sprite(this.anims.mount_open)
                    }
                    this.sound_animation.animation=this.play_sound(sound,{
                        on_complete:()=>{
                            this.update_weapon(false)
                        }
                    })
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
                if(def.animation){
                    this.container.play_animation(def.animation,()=>{
                        this.current_animation=undefined
                    })
                }
                const att=()=>{
                    if(def.assets?.use_sound){
                        this.play_sound(this.game.resources.get_audio(def.assets.use_sound))
                    }
                    const position=v2.add(
                        this.position,
                        v2.mult(v2.from_RadAngle(this.rotation),v2.new(def.offset,def.offset))
                    )
                    const hb=new CircleHitbox2D(position,def.radius)
                    const collidibles:ClientGameObject2D[]=this.manager.cells.get_objects(hb,this.layer)
                    for(const c of collidibles){
                        if(!hb.collidingWith(c.hitbox))continue
                        switch(c.stringType){
                            case "obstacle":
                                if((c as Obstacle).dead)continue
                                (c as Obstacle).on_hitted(position,true)
                                break
                            case "player":
                                if((c as Player).dead||c.id===this.id)continue
                                (c as Player).on_hitted(position,false,def.assets?.hit_sound)
                        }
                    }
                }
                for(const delay of def.damage_delays??[]){
                    this.game.addTimeout(att,delay)
                }
                break
            }
        }
    }
    attacking=false
    attack(){
        if(this.attacking)return
        if(!this.current_weapon||(this.current_weapon as unknown as GameItem).item_type!==InventoryItemType.gun){
            this.current_animation=undefined
            return
        }
        const d=this.current_weapon as GunDef
        const dur=Math.min(d.fireDelay*0.9,0.1)
        if(d.recoil&&!this.anims.fire){
            const w=0.05
            this.anims.fire={
                weapon:this.game.addTween({
                    target:this.sprites.weapon.position,
                    duration:dur,
                    to:v2.sub(this.sprites.weapon.position,v2.new(w,0)),
                    yoyo:true,
                    onComplete:()=>{
                        this.current_animation=undefined
                        this.anims.fire=undefined
                    }
                }),
                left_arm:this.game.addTween({
                    target:this.sprites.left_arm.position,
                    duration:dur,
                    to:v2.sub(this.sprites.left_arm.position,v2.new(w,0)),
                    yoyo:true,
                }),
                
                right_arm:this.game.addTween({
                    target:this.sprites.right_arm.position,
                    duration:dur,
                    to:v2.sub(this.sprites.right_arm.position,v2.new(w,0)),
                    yoyo:true,
                })
            }
        }
        this.attacking=true
        if(d.muzzleFlash&&!this.sprites.muzzle_flash.visible){
            this.sprites.muzzle_flash.frame=this.game.resources.get_sprite(d.muzzleFlash.sprite)
            if(this.anims.muzzle_flash_light)this.anims.muzzle_flash_light.destroyed=true
            this.anims.muzzle_flash_light=this.game.light_map.addLight(this.sprites.muzzle_flash._real_position,model2d.circle(1),ColorM.hex("#ff0"))
            this.sprites.muzzle_flash.position=v2.new(d.lenght,0)
            
            this.sprites.muzzle_flash.visible=true
            this.game.addTimeout(()=>{
                this.anims.muzzle_flash_light!.destroyed=true
                this.sprites.muzzle_flash.visible=false
            },dur*0.9)
        }
        this.game.addTimeout(()=>{
            this.attacking=false
        },d.fireDelay)
        this.game.addTimeout(()=>{
            //Cycle Sound
            if(this.assets.weapon_cycle_sound){
                this.sound_animation.weapon.switch?.stop()
                this.sound_animation.weapon.switch=this.play_sound(this.assets.weapon_cycle_sound,{
                    on_complete:()=>{
                        this.sound_animation.weapon.switch=undefined
                    },
                })
            }
        },d.fireDelay*0.25)
        if(this.game.save.get_variable("cv_graphics_particles")>=GraphicsDConfig.Advanced){
            if(d.caseParticle&&!d.caseParticle.at_begin){
                const p=new ABParticle2D({
                    direction:this.rotation+(3.141592/2),
                    life_time:0.4,
                    position:v2.add(
                        this.position,
                        v2.rotate_RadAngle(d.caseParticle.position,this.rotation)
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
                        direction:this.rotation+random.float(-d.gasParticles.direction_variation,d.gasParticles.direction_variation),
                        life_time:d.gasParticles.life_time,
                        position:v2.add(
                            this.position,
                            v2.mult(v2.from_RadAngle(this.rotation),v2.new(d.lenght,d.lenght))
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
            this.play_sound(this.assets.weapon_fire_sound)
        }
    }
    set_helmet(helmet:number){
        if(this.helmet&&helmet-1===this.helmet.idNumber!)return
        if(helmet>0){
            this.helmet=Helmets.getFromNumber(helmet-1)
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
            this.vest=Vests.getFromNumber(vest-1)
            this.sprites!.vest.tint=ColorM.number(this.vest.tint)
        }else{
            this.sprites.vest.visible=false
        }
    }
    set_backpack(backpack:number){
        if(this.backpack&&backpack===this.backpack.idNumber!)return
        this.backpack=Backpacks.getFromNumber(backpack)
        if(this.backpack.no_world_image){
            this.sprites.backpack.frame=undefined
        }else{
            this.sprites!.backpack.frame=this.game.resources.get_sprite(this.backpack.idString+"_world")
        }
        if(this.game.activePlayer===this){
            this.game.inventoryManager.inventory.set_backpack(this.backpack)
        }
    }
    broke_shield(){
        if(this.game.save.get_variable("cv_graphics_particles")>=GraphicsDConfig.Advanced){
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
        if(this.game.save.get_variable("cv_graphics_particles")>=GraphicsDConfig.Normal){
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
            this.play_sound(sound)
        }
    }
    dest_pos?:Vec2
    dest_rot?:number
    play_sound(sound: Sound, params: SoundOptions = {}): SoundInstance | undefined {
        if (!sound) return

        const {
            position = this.position,
            volume = 1,
            max_distance = 60,
            rolloffFactor = 0.5,
            delay,
            on_complete,
        } = params

        return this.game.sounds.play(
            sound,
            {
                position,
                volume,
                max_distance,
                rolloffFactor,
                delay,
                on_complete,
            },
            "players"
        )
    }

    override decode(stream: NetStream, full: boolean): void {
        const position=stream.readPosition()
        const rotation=stream.readRad()
        const [dead, shield, vehicle, parachute,emote,attacking,swicthed]=stream.readBooleanGroup()
        this.shield=shield
        if(this.game.save.get_variable("cv_game_interpolation")&&!full){
            this.dest_pos=position
            if(!(this.id===this.game.activePlayerId&&this.game.save.get_variable("cv_game_client_rot"))){
                this.dest_rot=rotation
            }
        }else{
            this.position=position
            if(!(this.id===this.game.activePlayerId&&this.game.save.get_variable("cv_game_client_rot"))){
                this.rotation=rotation
            }
        }
        if(dead){
            this.on_die()
        }else if(this.dead){
            this.dead=false
        }
        if(parachute){
            const para=stream.readFloat(0,1,1)
            this.current_weapon=undefined
            this.update_weapon(false)
            this.sprites.parachute.visible=true
            const s=this.scale+(1*para)
            this.container.scale=v2.new(s,s)
            this.parachute=true
            this.container.zIndex=zIndexes.ParachutePlayers+(0.9*para)
        }else{
            this.sprites.parachute.visible=false
            this.parachute=false
            this.container.zIndex=zIndexes.Players
        }
        if(emote){
            this.add_emote(GameObjectsDefs.valueNumber[stream.readUint16()])
        }
        
        if(attacking){
            this.attack()
        }
        if(full){
            const [has_animation]=stream.readBooleanGroup()
            this.set_vest(stream.readUint8())
            this.set_helmet(stream.readUint8())
            this.set_backpack(stream.readUint8())
            const skin=stream.readUint16()
            this.set_skin(Skins.getFromNumber(skin))
            const current_weapon=this.current_weapon
            this.current_weapon=Weapons.valueNumber[stream.readInt16()]
            if(current_weapon!==this.current_weapon)this.update_weapon(true)
            else if(this.current_weapon&&swicthed)this.update_weapon(true)
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
        }else{
            if(this.current_weapon!==undefined&&swicthed)this.update_weapon(swicthed)
        }
        this.set_driving(vehicle)
            
        if(this.id===this.game.activePlayerId){
            this.game.update_camera()
            this.game.sounds.listener_position=this.position
            this.sprites.parachute.tint=ColorM.rgba(255,255,255,100)
            if(full){
                this.game.guiManager.update_equipaments()
            }
            this.game.guiManager.state.driving=this.driving
            this.game.guiManager.state.gun=!this.driving&&this.current_weapon!==undefined&&Guns.exist(this.current_weapon.idString)
        }
    }
}