
import { ABParticle2D, AnimatedContainer2D, AudioVoice, CenterHotspot, CircleHitbox2D, type ClientGame, ColorM, Container2D, ease, NetStream, Numeric, random, Sound, Sprite2D, Tween, v2, v2m, Vec2 } from "common/engine/client.ts";
import { GameConstants, GameObjectType,  HumanLoadoutData,  PlayerAnimation, PlayerAnimationType, zIndexes } from "common/scripts/others/constants.ts"
import { GraphicsDConfig } from "../others/config.ts"
import { InventoryItemType } from "common/scripts/definitions/utils.ts"
import { DualAdditional, GunDef } from "common/scripts/definitions/items/guns.ts"
import { BackpackDef } from "common/scripts/definitions/items/backpacks.ts"
import { DefaultFistRig, FistRig } from "common/scripts/others/item.ts"
import { HelmetDef, VestDef } from "common/scripts/definitions/items/equipaments.ts"
import { FloorKind, Floors, FloorType } from "common/scripts/others/terrain.ts"
import { ClientDecal } from "./client_decal.ts";
import { Camera2D } from "common/engine/client/2d/camera.ts";
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts";
import { GameItem, GameObjectDef, WeaponDef } from "common/scripts/definitions/game_defs.ts";
import { EffectDef, Effects } from "common/scripts/definitions/player/effects.ts";
import { LoadoutBodyDef, LoadoutEyesDef, LoadoutHairDef, LoadoutLegDef, LoadoutShirtDef } from "common/scripts/definitions/loadout/skins.ts";
import { MeleeDef } from "common/scripts/definitions/items/melees.ts";
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

        left_leg:Container2D
        right_leg:Container2D

        left_leg_l:Sprite2D
        right_leg_l:Sprite2D

        left_leg_foot:Sprite2D
        right_leg_foot:Sprite2D

        weapon:Sprite2D
        weapon2:Sprite2D
        muzzle_flash:Sprite2D
        parachute:Sprite2D
        emote_container:Container2D
        emote_bg:Sprite2D
        emote_sprite:Sprite2D

        melee_world:Sprite2D
    }
    animation={
        emote_tween:undefined as Tween<Vec2>|undefined,
        emote_time:0,

        //animation?:SoundInstance
        footsteps:undefined as AudioVoice|undefined,

        recoil_time:0,
        recoil_state:-1,

        switch_and_cycle:undefined as AudioVoice|undefined,
        switch_and_cycle_sound_time:0,
        switch_and_cycle_state:0,

        muzzle_flash_time:-1,

        base_weapon_position:v2.zero(),
        base_left_arm_position:v2.zero(),
        base_right_arm_position:v2.zero(),
    }
    melee?:MeleeDef
    current_weapon?:WeaponDef
    dead:boolean=true
    shield:boolean=false
    assets:{
        weapon_switch_sound?:Sound
        weapon_cycle_sound?:Sound
        weapon_fire_sound?:Sound
        weapon_fire_last_sound?:Sound
        weapon_reload_sound?:Sound
        weapon_reload_sound_alt?:Sound
        footstep_sounds?:string[]
    }={}
    effects:{def:EffectDef,lifetime:number}[]=[]
    current_floor?:FloorType

    constructor(){
        super()
    }
    on_hitted(position:Vec2,critical:boolean=false,sound?:string){
        if(Math.random()<=0.1){
            const d=new ClientDecal()
            d.sprite.frame=this.game.resources.get_frame(`blood_decal_${random.int(1,2)}`)
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

        this.game.sounds.play(this.game.resources.get_sound(sound??(
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
            bus:"humans"
        })
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
        const d=new ClientDecal()

        d.sprite.frame=this.game.resources.get_frame(`blood_decal_${random.int(1,2)}`)
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
    }
    on_help_up(){
        if(!this.downed)return
        this.downed=false
        this.sprites.left_leg.visible=false
        this.sprites.right_leg.visible=false
        this.sprites.chest.visible=false
        this.sprites.backpack.visible=true
    }
    set_arms_rig(rig?:FistRig){
        if(rig){
            if(rig.left){
                this.sprites.left_arm.visible=rig.left.visible===undefined?true:rig.left.visible
                this.sprites.left_arm.position=rig.left.position
                this.sprites.left_arm.rotation=rig.left.rotation
                this.sprites.left_arm.zIndex=rig.left.zIndex??1
            }else{
                this.sprites.left_arm.visible=false
            }
            if(rig.right){
                this.sprites.right_arm.visible=rig.right.visible===undefined?true:rig.right.visible
                this.sprites.right_arm.position=rig.right.position
                this.sprites.right_arm.rotation=rig.right.rotation
                this.sprites.right_arm.zIndex=rig.right.zIndex??1
            }else{
                this.sprites.right_arm.visible=false
            }
        }else{
            this.sprites.left_arm.visible=false
            this.sprites.right_arm.visible=false
        }
    }
    update_weapon(def:WeaponDef|undefined,is_new:boolean=false){
        this.sprites.weapon.visible=false
        this.sprites.weapon2.visible=false
        if(def?.rig_image){
            const tint=def.assets?.world_tint?ColorM.number(def.assets.world_tint):ColorM.default.white

            if(def.rig_image){
                this.sprites.weapon.visible=true
                this.sprites.weapon.rotation=0
                this.sprites.weapon.transform_frame(def.rig_image)
                this.sprites.weapon.tint=tint
            }

            if((def as GameItem).item_type===InventoryItemType.gun&&(def as GunDef).dual_from){
                //const original_def=this.game.definitions.guns.getFromString((def as GunDef).dual_from!)

                this.sprites.weapon2.visible=true
                if(def.rig_image){
                    this.sprites.weapon2.rotation=0
                    this.sprites.weapon2.visible=true
                    this.sprites.weapon2.transform_frame(def.rig_image)
                    this.sprites.weapon2.tint=tint
                }

                this.sprites.weapon.position.y=(def as GunDef&DualAdditional).dual_offset!
                this.sprites.weapon2.position.y =(def as GunDef&DualAdditional).dual_offset!

                this.sprites.left_arm.visible=true
                this.sprites.left_arm.rotation=0
                this.sprites.left_arm.position.y=-(def as GunDef&DualAdditional).dual_offset!
                this.sprites.right_arm.visible=true
                this.sprites.right_arm.rotation=0
                this.sprites.right_arm.position.y=(def as GunDef&DualAdditional).dual_offset!
            }
        }
    }
    set_current_weapon(weapon?:WeaponDef,is_new:boolean=false){
        if(this.current_weapon===weapon)return
        this.current_weapon=weapon

        this.assets.weapon_fire_sound=undefined
        this.assets.weapon_fire_last_sound=undefined
        this.assets.weapon_reload_sound=undefined
        this.assets.weapon_reload_sound_alt=undefined
        this.assets.weapon_switch_sound=undefined
        this.assets.weapon_cycle_sound=undefined

        if(weapon){
            this.set_arms_rig(weapon.rig_arms)
            let frame:string=""
            if(weapon.item_type===InventoryItemType.gun){
                if(weapon.dual_from){
                    const original=this.game.definitions.guns.getFromString(weapon.dual_from!)
                    frame=original.assets?.world??original.idString+"_world"
                    this.sprites.weapon2.set_frame({
                        image:frame,
                        rotation:0,
                        hotspot:v2.half_one,
                        zIndex:2,
                    },this.game.resources)
                }else{
                    frame=weapon.assets?.world??weapon.idString+"_world"
                }

                if(weapon.assets?.use_last)this.assets.weapon_fire_last_sound=this.game.resources.get_sound(typeof weapon.assets?.use_last==="string"?weapon.assets.use_last:weapon.idString+"_fire_last")
            }else{
                frame=weapon.assets?.world??weapon.idString
            }
            this.assets.weapon_fire_sound=this.game.resources.get_sound(weapon.assets?.use_sound??`${weapon.idString}_fire`)
            this.assets.weapon_reload_sound=undefined
            this.assets.weapon_reload_sound_alt=undefined
            this.assets.weapon_switch_sound=this.game.resources.get_sound(weapon.assets?.switch_sound??`${weapon.idString}_switch`)

            this.sprites.weapon.set_frame({
                image:frame,
                rotation:0,
                hotspot:v2.half_one,
                zIndex:2,
            },this.game.resources)


            if(typeof weapon.assets?.cycle_sound==="string"){
                this.assets.weapon_cycle_sound=this.game.resources.get_sound(weapon.assets.cycle_sound)
            }else if(weapon.assets?.cycle_sound){
                this.assets.weapon_cycle_sound=this.assets.weapon_switch_sound
            }
        }else{
            this.set_arms_rig(undefined)
        }
        this.update_weapon(weapon,is_new)
        this.animation.base_weapon_position=v2.clone(this.sprites.weapon.position)
        this.animation.base_left_arm_position=v2.clone(this.sprites.left_arm.position)
        this.animation.base_right_arm_position=v2.clone(this.sprites.right_arm.position)
        if(this.melee)this.update_melee(this.melee)
    }
    update_melee(def?:MeleeDef){
        this.melee=def
        if(def?.character_frame){
            this.sprites.melee_world.visible=true
            if(this.current_weapon?.item_type===def.item_type){
                this.sprites.melee_world.set_frame(def.character_frame.equipped_frame,this.game.resources)
            }else{
                this.sprites.melee_world.set_frame(def.character_frame.unequipped_frame,this.game.resources)
            }
        }else{
            this.sprites.melee_world.visible=false
        }
    }
    set_skin(body_def:LoadoutBodyDef,hair:{tint:number,def:LoadoutHairDef}|undefined,eyes_def:LoadoutEyesDef|undefined,shirt_def:LoadoutShirtDef,legs_def:LoadoutLegDef,body_tint:number){
        if(
            this.loadout&&
            this.loadout.body.def===body_def&&this.loadout.body.tint===body_tint&&
            this.loadout.hair?.def===hair?.def&&this.loadout.hair?.tint===hair?.tint&&
            this.loadout.eyes===eyes_def
        )return
        this.loadout={
            body:{
                def:body_def,
                tint:body_tint,
            },
            hair:hair,
            eyes:eyes_def,
            shirt:shirt_def,
            legs:legs_def
        }

        const body_t=ColorM.number(body_tint)

        const body_f=body_def.frame?.base??"human_"+body_def.idString
        const hand_f=body_def.frame?.hand??"human_"+body_def.idString+"_hand"

        if(hair){
            if(hair.def.frame?.base)this.sprites.hair.set_frame(Object.assign({image:"human_"+hair.def.idString},hair.def.frame?.base),this.game.resources)
            this.sprites.hair.tint=ColorM.number(hair.tint)
        }
        if(eyes_def){
            const eyes_f=[eyes_def.frame?.base??"human_"+eyes_def.idString+"_1",eyes_def.frame?.blink??"human_"+eyes_def.idString+"_2"]
            this.sprites.eyes.frame=this.game.resources.get_frame(eyes_f[0])
            this.sprites.eyes.position=eyes_def.position
            this.sprites.eyes.frames=[{delay:random.float(3.4,3.6),image:eyes_f[0]},{delay:0.3,image:eyes_f[1]}]
            this.sprites.eyes.visible=true
        }else{
            this.sprites.eyes.frames=[]
            this.sprites.eyes.visible=false
        }

        const arm_f=shirt_def.frame?.arm??("human_"+shirt_def.idString+"_arm")

        this.sprites.body.frame=this.game.resources.get_frame(body_f)

        this.sprites.body.tint=body_t

        this.sprites.left_shirt_arm.frame=this.game.resources.get_frame(arm_f)
        this.sprites.right_shirt_arm.frame=this.game.resources.get_frame(arm_f)

        this.sprites.left_hand.frame=this.game.resources.get_frame(hand_f)
        this.sprites.right_hand.frame=this.game.resources.get_frame(hand_f)
        this.sprites.left_hand.tint=body_t
        this.sprites.right_hand.tint=body_t

        if(shirt_def.frame?.arm_tint)this.sprites.left_shirt_arm.tint=ColorM.number(shirt_def.frame?.arm_tint)
        if(shirt_def.frame?.arm_tint)this.sprites.right_shirt_arm.tint=ColorM.number(shirt_def.frame?.arm_tint)

        if(legs_def.frame?.leg){
            this.sprites.left_leg_l.set_frame(legs_def.frame.leg,this.game.resources)
            this.sprites.right_leg_l.set_frame(legs_def.frame.leg,this.game.resources)
        }
        if(legs_def.frame?.foot){
            this.sprites.left_leg_foot.position=v2(0.05,0)
            this.sprites.right_leg_foot.position=v2(0.05,0)
            this.sprites.left_leg_foot.set_frame(legs_def.frame.foot,this.game.resources)
            this.sprites.right_leg_foot.set_frame(legs_def.frame.foot,this.game.resources)
        }

        this.sprites.left_leg.position=v2(-0.75,-0.22)
        this.sprites.right_leg.position=v2(-0.75,0.22)
        this.sprites.left_leg.rotation=0.1
        this.sprites.right_leg.rotation=-0.1
        this.sprites.left_leg.visible=false
        this.sprites.right_leg.visible=false
        this.sprites.left_leg.zIndex=1
        this.sprites.right_leg.zIndex=1

        this.sprites.chest.position=v2(-0.25,0)
        this.sprites.chest.visible=false
        if(shirt_def.frame?.chest)this.sprites.chest.set_frame(shirt_def.frame.chest,this.game.resources)

        if(body_def.mounth){
            this.sprites.mounth.visible=true
            this.sprites.mounth.tint=body_t
            this.sprites.mounth.scale.x=1.4
            this.sprites.mounth.position=body_def.mounth.position
            this.sprites.mounth.frame=this.game.resources.get_frame(body_def.mounth.normal)
        }else{
            this.sprites.mounth.visible=false
        }

        this.sprites.weapon.zIndex=2

        this.reset_anim()
    }
    override on_layer_set(layer: number): void {
        this.container.layer=layer
        this.sprites.emote_container.layer=layer
    }
    update_scale(scale:number){
        this.physical_data.scale=scale
        this.container.scale.x=scale
        this.container.scale.y=scale
        this.base_hitbox=new CircleHitbox2D(v2(0,0),GameConstants.player.radius*scale)
    }
    override create(_args: Record<string, void>): void {
        this.base_hitbox=new CircleHitbox2D(v2(0,0),GameConstants.player.radius)
        this.container=new AnimatedContainer2D(this.game as unknown as ClientGame)

        this.sprites={
            body:this.container.add_animated_sprite("body",{scale:1.5,zIndex:4,hotspot:CenterHotspot}),
            eyes:this.container.add_animated_sprite("eyes",{scale:1.5,zIndex:5,hotspot:CenterHotspot}),
            hair:this.container.add_sprite("hair",{scale:1.5,zIndex:6,hotspot:CenterHotspot}),

            mounth:this.container.add_animated_sprite("mounth",{hotspot:v2(0.4,0.5),scale:1.4,zIndex:5}),

            helmet:this.container.add_sprite("helmet",{zIndex:8,scale:1.5,hotspot:CenterHotspot}),

            backpack:this.container.add_sprite("backpack",{position:v2(-0.27,0),hotspot:v2(1,0.5),scale:1.5,zIndex:3}),
            vest:this.container.add_sprite("vest",{zIndex:0,scale:1.5,hotspot:CenterHotspot}),

            left_arm:this.container.add_container("left_arm"),
            right_arm:this.container.add_container("right_arm"),

            left_shirt_arm:new Sprite2D(),
            left_hand:new Sprite2D(),
            right_shirt_arm:new Sprite2D(),
            right_hand:new Sprite2D(),

            left_leg:this.container.add_container("left_leg"),
            right_leg:this.container.add_container("right_leg"),

            left_leg_l:new Sprite2D(),
            left_leg_foot:new Sprite2D(),
            right_leg_l:new Sprite2D(),
            right_leg_foot:new Sprite2D(),

            chest:this.container.add_sprite("chest",{scale:1.5,hotspot:CenterHotspot,zIndex:1}),
            muzzle_flash:this.container.add_sprite("muzzle_flash",{visible:false,zIndex:6,hotspot:v2(0,.5)}),
            parachute:new Sprite2D(),//this.container.add_sprite("parachute",{zIndex:7,hotspot:v2.half_one,visible:false}),
            weapon:this.container.add_sprite("weapon"),
            weapon2:this.container.add_sprite("weapon2"),
            emote_container:new Container2D(),
            emote_bg:new Sprite2D(),
            emote_sprite:new Sprite2D(),
            melee_world:this.container.add_sprite("melee_world",{zIndex:2,hotspot:v2.half_one}),
        }

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

        this.sprites.left_leg_l.transform_frame({
            hotspot:v2(0,0.5),
            zIndex:1
        })
        this.sprites.left_leg_foot.transform_frame({
            hotspot:v2.half_one,
            zIndex:0
        })

        this.sprites.right_leg_l.transform_frame({
            hotspot:v2(0,0.5),
            zIndex:1
        })
        this.sprites.right_leg_foot.transform_frame({
            hotspot:v2.half_one,
            zIndex:0
        })
        v2m.set(this.sprites.left_leg.scale,1.5,1.5)
        v2m.set(this.sprites.right_leg.scale,1.5,1.5)

        this.sprites.left_leg.add_child(this.sprites.left_leg_l)
        this.sprites.left_leg.add_child(this.sprites.left_leg_foot)
        this.sprites.right_leg.add_child(this.sprites.right_leg_l)
        this.sprites.right_leg.add_child(this.sprites.right_leg_foot)
        this.container.add_child(this.sprites.muzzle_flash)

        this.container.zIndex=zIndexes.Players

        this.game.cam2d.addObject(this.container)
        this.sprites.parachute.frame=this.game.resources.get_frame("parachute")
        this.sprites.vest._frame=this.game.resources.get_frame("player_vest")
        this.sprites.vest.sync_rotation=false
        this.sprites.emote_bg.set_frame({
            image:"emote_background",
            hotspot:CenterHotspot,
            scale:2
        },this.game.resources)
        this.sprites.emote_sprite.transform_frame({
            hotspot:CenterHotspot,
            scale:2.6
        })

        this.set_skin(
            this.game.definitions.loadout.getFromString("body_1") as LoadoutBodyDef,
            undefined,undefined,
            this.game.definitions.loadout.getFromString("white_shirt") as LoadoutShirtDef,
            this.game.definitions.loadout.getFromString("jeans_pants") as LoadoutLegDef,
            0xffffff
        )

        // Emote
        this.sprites.emote_container.zIndex=zIndexes.DamageSplashs
        this.sprites.emote_container.sync_rotation=false
        this.sprites.emote_container.position=v2(0,-1.5)
        this.sprites.emote_container.add_child(this.sprites.emote_bg)
        this.sprites.emote_container.add_child(this.sprites.emote_sprite)
        this.sprites.emote_container.visible=false
        this.game.cam2d.addObject(this.sprites.emote_container)

        /*if(Debug.hitbox){
            this.game.hitboxes_gfx.fill_color(ColorM.hex("#f007"))
            this.game.hitboxes_gfx.drawModel(model2d.hitbox(this.base_hitbox))
        }*/
    }
    distance_since_last_footstep=0
    footstep_alternate:boolean=false

    override render(camera: Camera2D, _dt: number): void {
        /*camera.ctx.fill_style=this.game.world_shadow.color
        camera.ctx.begin_path()
        camera.ctx.arc(this.position.x+this.game.world_shadow.offset.x,this.position.y+this.game.world_shadow.offset.y,GameConstants.player.radius*this.game.world_shadow.radius,0,Math.PI*2)
        camera.ctx.fill()*/

        /*camera.ctx.fill_style=ColorM.default.red
        camera.ctx.begin_path()
        camera.ctx.arc(this.dest_pos?.x??0,this.dest_pos?.y??0,(this.hitbox as CircleHitbox2D).radius,0,Math.PI*2)
        camera.ctx.fill()*/
    }
    override update(dt:number): void {
        const old_pos=this.old_pos
        super.update(dt)
        this.container.rotation=this.physical_data.rotation
        this.container._position.set(this.position.x,this.position.y)
        if(this.distance_walked>0){
            const f=this.game.terrain.get_floor_type(this.position,this.layer,FloorType.Void)

            if(f!==this.current_floor){
                this.current_floor=f
                this.assets.footstep_sounds=Floors[f].footstep_sounds
            }

            this.distance_since_last_footstep+=this.distance_walked

            // Play Footstep Sound And Do Water Riple
            if(this.distance_since_last_footstep>=2){
                const walk_dir:number=old_pos?v2.lookTo(this.position,old_pos):this.physical_data.rotation
                this.distance_since_last_footstep=0
                if(this.assets.footstep_sounds){
                    if(this.animation.footsteps)this.animation.footsteps.stop()
                    this.animation.footsteps=this.game.sounds.play(this.game.resources.get_sound(random.choose(this.assets.footstep_sounds)),{
                        position:this.position,
                        max_distance: 15,
                        volume:0.3,
                        bus:"humans"
                    })
                }
                if(Floors[f].footstep_decal){
                    const d=new ClientDecal()
                    d.sprite.frame=this.game.resources.get_frame("player_footstep")
                    d.sprite.rotation=walk_dir
                    d.lifetime=30

                    const pos=v2(0,(this.footstep_alternate?0.3:-0.3)*this.physical_data.scale)
                    v2m.rotate_RadAngle(pos,this.physical_data.rotation)
                    d.sprite.position=v2.add(this.position,pos)
                    this.game.scene_2d.objects.add_object(d,this.layer)

                    this.footstep_alternate=!this.footstep_alternate
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
            if(this.animation.emote_time<2.5){
                this.animation.emote_time+=dt
            }else{
                this.animation.emote_tween=this.game.add_tween({
                    target:this.sprites.emote_container.scale,
                    duration:0.8,
                    to:{
                        x:0,
                        y:0
                    },
                    onComplete:()=>{
                        if(this.animation.emote_time<2.5)return
                        this.sprites.emote_container.visible=false
                        this.animation.emote_tween=undefined
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

        if(this.animation.recoil_state!==-1){
            this.sprites.weapon.position.x=Numeric.lerp(this.animation.base_weapon_position.x,this.animation.base_weapon_position.x-0.05,this.animation.recoil_time)
            this.sprites.left_arm.position.x=Numeric.lerp(this.animation.base_left_arm_position.x,this.animation.base_left_arm_position.x-0.05,this.animation.recoil_time)
            this.sprites.right_arm.position.x=Numeric.lerp(this.animation.base_right_arm_position.x,this.animation.base_right_arm_position.x-0.05,this.animation.recoil_time)
            if(this.animation.recoil_state===0){
                this.animation.recoil_time+=dt*10
                if(this.animation.recoil_time>=1){
                    this.animation.recoil_state=1
                    this.animation.recoil_time=1
                }
            }else{ 
                this.animation.recoil_time-=dt*10
                if(this.animation.recoil_time<=0){
                    this.animation.recoil_state=-1
                    this.animation.recoil_time=0
                }
            }
        }
        if(this.animation.switch_and_cycle_state!==0){
            this.animation.switch_and_cycle_sound_time-=dt
            if(this.animation.switch_and_cycle_sound_time<=0){
                if(this.animation.switch_and_cycle_state===1){
                    if(this.assets.weapon_switch_sound)this.animation.switch_and_cycle=this.game.sounds.play(this.assets.weapon_switch_sound,{
                        position:this.position,
                        max_distance:9,
                    })
                }else{
                    if(this.assets.weapon_cycle_sound)this.animation.switch_and_cycle=this.game.sounds.play(this.assets.weapon_cycle_sound,{
                        position:this.position,
                        max_distance:9,
                    })
                }
                this.animation.switch_and_cycle_state=0
            }
        }
        if(this.animation.muzzle_flash_time!==-1){
            this.animation.muzzle_flash_time-=dt
            if(this.animation.muzzle_flash_time<=0){
                this.sprites.muzzle_flash.visible=false
                this.animation.muzzle_flash_time=-1
            }
        }
    }
    override on_destroy(): void {
        this.container.destroy()
        this.sprites.emote_container.destroy()
    }
    reset_anim(){
        this.sprites.muzzle_flash.visible=false
        this.container.stop_all_animations()
        if(this.downed){
            this.sprites.left_arm.position=DefaultFistRig.left!.position
            this.sprites.right_arm.position=DefaultFistRig.right!.position
            this.sprites.weapon.visible=false
        }
    }
    update_animations(animations:PlayerAnimation[]){
        for(const a of animations){
            switch(a.type){
                case PlayerAnimationType.Switch:{
                    if(this.animation.switch_and_cycle)this.animation.switch_and_cycle.stop()
                    if(this.assets.weapon_switch_sound){
                        // deno-lint-ignore ban-ts-comment
                        //@ts-ignore
                        this.animation.switch_and_cycle_sound_time=this.current_weapon?.switch_delay??0.1
                        this.animation.switch_and_cycle_state=1
                    }
                    break
                }
                case PlayerAnimationType.Fire:{
                    const def=this.current_weapon
                    if(this.animation.recoil_state===-1){
                        this.animation.recoil_state=0
                        this.animation.recoil_time=0
                    }else{
                        this.animation.recoil_time+=0.1
                    }
                    if(def&&def.item_type===InventoryItemType.gun){
                        if(this.game.save.get_variable("sv_graphics_particles")>=GraphicsDConfig.Advanced){
                            if(def.gas_particles){
                                for(let i=0;i<def.gas_particles.count;i++){
                                    const p=new ABParticle2D({
                                        direction:this.physical_data.rotation+random.float(-def.gas_particles.direction_variation,def.gas_particles.direction_variation),
                                        life_time:def.gas_particles.life_time,
                                        position:v2.add(
                                            this.position,
                                            v2.from_RadAngle(this.physical_data.rotation,def.barrel_length)
                                        ),
                                        frame:{
                                            image:"gas_smoke_particle",
                                            hotspot:CenterHotspot
                                        },
                                        speed:random.float(def.gas_particles.speed.min,def.gas_particles.speed.max),
                                        scale:0.03,
                                        tint:ColorM.hex("#fff5"),
                                        to:{
                                            tint:ColorM.hex("#fff0"),
                                            scale:random.float(def.gas_particles.size.min,def.gas_particles.size.max)
                                        }
                                    })
                                    this.game.particles.add_particle(p)
                                }
                            }
                            if(def.case_particle&&!def.case_particle.at_begin){
                                const p=new ABParticle2D({
                                    direction:this.physical_data.rotation+(3.141592/2)+random.float(0,0.6),
                                    life_time:1,
                                    position:v2.add(
                                        this.position,
                                        v2.rotate_RadAngle(def.case_particle.position,this.physical_data.rotation)
                                    ),
                                    frame:{
                                        image:def.case_particle.frame??"casing_"+def.ammo_type,
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
                                const audio=this.game.resources.get_sound(def.case_particle!.sound??"casing_sound_"+def.ammo_type)
                                if(audio)this.game.add_timeout(()=>{
                                    this.game.sounds.play(audio,{
                                        position:this.position,
                                        max_distance:10,
                                        bus:"players"
                                    })
                                },0.75)
                                this.game.particles.add_particle(p)
                            }
                        }

                        let sound:Sound|undefined
                        if(a.last){
                            if(this.assets.weapon_fire_last_sound)sound=this.assets.weapon_fire_last_sound
                            else sound=this.assets.weapon_fire_sound
                        }else{
                            sound=this.assets.weapon_fire_sound
                        }
                        if(sound){
                            this.game.sounds.play(sound,{
                                position:this.position,
                                max_distance: 15,
                                volume:0.7,
                                bus:"humans"
                            })
                        }
                        if(this.assets.weapon_cycle_sound){
                            this.animation.switch_and_cycle_sound_time=def.fire_delay*0.3
                            this.animation.switch_and_cycle_state=2
                        }
                        if(def.muzzle_flash&&!this.sprites.muzzle_flash.visible){
                            this.sprites.muzzle_flash.frame=this.game.resources.get_frame(def.muzzle_flash.sprite)
                            this.sprites.muzzle_flash.position=v2(def.barrel_length,0)
                            this.sprites.muzzle_flash.visible=true
                            this.animation.muzzle_flash_time=Math.min(def.fire_delay*0.9,0.1)
                        }
                    }
                    break
                }
                case PlayerAnimationType.Reloading:
                case PlayerAnimationType.Consuming:
                case PlayerAnimationType.Melee:
                    break
                case PlayerAnimationType.Cook:
                    this.container.play_animation([
                        {
                            time:0.1,
                            actions:[
                                {
                                    type:"tween",
                                    fuser:"left_arm",
                                    to:{
                                        position:v2(DefaultFistRig.left!.position.x,0.2),
                                        rotation:0.3
                                    }
                                }
                            ]
                        },
                        {
                            time:0.23,
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
                                        position:v2(0.15,0.6),
                                        rotation:1.2
                                    }
                                },
                                {
                                    type:"tween",
                                    fuser:"weapon",
                                    to:{
                                        position:v2(0.15,0.6),
                                        rotation:0.3
                                    }
                                }
                            ]
                        },
                    ])
                    break
                case PlayerAnimationType.Throw:
                    this.container.play_animation([
                        {
                            time:0.1,
                            actions:[
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
                    console.log(animations)
                    break
                case PlayerAnimationType.Reset:
                    break
            }
        }
    }
    add_emote(emote:GameObjectDef){
        this.game.sounds.play(this.game.resources.get_sound("emote_play"),{
            position:this.position,
            max_distance: 50,
            volume: 0.7,
            bus:"humans"
        })
        this.animation.emote_time=0
        this.sprites.emote_container.visible=true
        this.sprites.emote_sprite.frame=this.game.resources.get_frame(emote.idString)
        this.sprites.emote_container.scale=v2(0,0)
        this.game.add_tween({
            target:this.sprites.emote_container.scale,
            duration:1,
            to:{
                x:1,
                y:1
            },
            ease:ease.elasticOut
        })
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
            this.sprites!.helmet.frame=this.game.resources.get_frame(h.idString+"_world")
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
    on_effect_added(effect:EffectDef){
        if(effect.assets?.sounds?.when_take){
            this.game.sounds.play(this.game.resources.get_sound(effect.assets.sounds.when_take),{
                position:this.position,
                max_distance: 7,
                volume: 0.7,
                bus:"humans"
            })
        }
    }
    on_effect_removed(effect:EffectDef){
        if(effect.assets?.sounds?.when_remove){
            this.game.sounds.play(this.game.resources.get_sound(effect.assets.sounds.when_remove),{
                position:this.position,
                max_distance: 7,
                volume: 0.7,
                bus:"humans"
            })
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
        const sound=this.game.resources.get_sound(`shield_break`)
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
            melee_wold_dirty,

            has_emote,

            dead,downed,

            controlling
        ]=stream.readBooleanGroup2()
        this.controlling=controlling
        if(!dead&&this.dead){
            this.dead=false
        }else if(dead){
            this.on_die()
        }
        if(full||physical_dirty_part||physical_dirty){
            this.decode_physical_data(stream,full)
            if(full||physical_dirty){
                const scale=stream.readFloat32()
                this.update_scale(scale)
            }
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
            const [has_hair,has_eyes]=stream.readBooleanGroup()
            const body_def=this.game.definitions.loadout.getFromNumber(stream.readUint16()) as LoadoutBodyDef
            let hair_def:LoadoutHairDef|undefined
            let hair_tint:number=0
            let eyes_def:LoadoutEyesDef|undefined
            if(has_hair){
                hair_def=this.game.definitions.loadout.getFromNumber(stream.readUint16()) as LoadoutHairDef
                hair_tint=stream.readUint32()
            }
            if(has_eyes){
                eyes_def=this.game.definitions.loadout.getFromNumber(stream.readUint16()) as LoadoutEyesDef
            }
            const shirt_def=this.game.definitions.loadout.getFromNumber(stream.readUint16()) as LoadoutShirtDef
            const legs_def=this.game.definitions.loadout.getFromNumber(stream.readUint16()) as LoadoutLegDef
            const body_tint=stream.readUint32()
            this.set_skin(body_def,hair_def?{def:hair_def,tint:hair_tint}:undefined,eyes_def,shirt_def,legs_def,body_tint)
        }
        if(has_emote){
            this.add_emote(this.game.definitions.game_objects.valueNumber[stream.readUint16()])
        }
        if(full||effects_dirty){
            const effects=stream.readArray(()=>{
                return Effects.getFromNumber(stream.readUint16())
            },1)
            this.update_effects(effects)
        }
        if(full||hand_dirty){
            const id = stream.readInt16()
            const current_weapon = id>=0?(this.game.definitions.game_items.valueNumber[id] as WeaponDef):undefined
            if(current_weapon!==this.current_weapon){
                this.set_current_weapon(current_weapon)
            }
        }
        if(full||melee_wold_dirty){
            const id=stream.readUint16()
            if(this.melee?.idNumber!==id){
                this.update_melee(this.game.definitions.melees.getFromNumber(id))
            }
        }
        if(full||animation_dirty){
            const animations:PlayerAnimation[]=stream.readArray(()=>{
                let animation:PlayerAnimation
                const tp=stream.readUint8() as PlayerAnimationType
                switch(tp){
                    case PlayerAnimationType.Fire:{
                        const bg=stream.readBooleanGroup()
                        animation={
                            type:tp,
                            alt:bg[0],
                            last:bg[1]
                        }
                        break
                    }
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
            this.update_animations(animations)
        }
        if(downed){
            this.on_downed()
        }else if(this.downed&&!downed){
            this.on_help_up()
        }
    }
}