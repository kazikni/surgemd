import { ABParticle2D, Sprite2D, type AnimatedContainerModeCallback } from "common/engine/web.ts";
import { type Human } from "../objects/human.ts";
import { ColorM, FrameDef, random, v2, Vec2 } from "common/engine/core.ts";
import { GraphicsDConfig } from "../others/config.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { ClientDecal } from "../objects/client_decal.ts";
import { DefaultFistRig } from "common/scripts/others/item.ts";
import { EffectDef } from "common/scripts/definitions/player/effects.ts";
import { MeleeDef } from "common/scripts/definitions/items/melees.ts";
import { GameItemType } from "common/scripts/definitions/utils.ts";
import { WeaponDef } from "common/scripts/definitions/game_defs.ts";

export const DefaultHumanModes={
    broke_shield(h:Human){
        const particles=h.game.save.get_variable("sv_graphics_particles")
        if(particles>=GraphicsDConfig.Advanced){
            for(let p=0;p<14;p++){
                const a=random.rad()
                h.game.scene_2d.particles.add_particle(new ABParticle2D({
                    direction:random.rad(),
                    life_time:0.5+(Math.random()*0.5),
                    position:h.position,
                    speed:7,
                    scale:random.float(2,3),
                    frame:{
                        layer:h.layer,
                        zIndex:zIndexes.Particles,
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
        if(particles>=GraphicsDConfig.Normal){
            h.game.scene_2d.particles.add_particle(new ABParticle2D({
                direction:0,
                life_time:0.4,
                position:h.position,
                speed:0,
                scale:0.1,
                frame:{
                    image:"shockwave",
                    layer:h.layer,
                    zIndex:zIndexes.Particles,
                    hotspot:v2.half_one
                },
                tint:ColorM.rgba(255,255,255,255),
                to:{
                tint:ColorM.rgba(255,255,255,0),
                    scale:10,
                }
            }))
        }
        const sound=h.game.resources.get_sound(`shield_break`)
        if(sound)h.game.sounds.play(sound,{
            position:h.position,
            max_distance:15,
            bus:"humans"
        })
    },
    hitted(h:Human,position:Vec2,critical:boolean=false,sound?:string,reflected:boolean=false){
        if(reflected){
            h.game.sounds.play(h.game.resources.get_sound(sound??"human_metal_hit"),{
                position:h.position,
                max_distance:10,
                bus:"humans"
            })
            return
        }
        if(h.shield){
        }else{
            if(Math.random()<=0.1){
                const d=new ClientDecal()
                d.sprite.set_frame({
                    image:`liquid_decal_${random.int(1,2)}`,
                    tint:random.choose([0xaa0a28,0xff0a28]),
                    alpha:210,
                    scale:random.float(0.7,1.4),
                    rotation:random.rad(),
                    position:position,
                },h.game.resources)
                h.game.scene_2d.objects.add_object(d,h.layer)
            }
            const tint=random.choose([ColorM.rgba(170,10,40),ColorM.rgba(255,10,40)])
            h.game.scene_2d.particles.add_particle(new ABParticle2D({
                scale:0.1,
                frame:{
                    image:`blood_splash_${random.int(1,3)}`,
                    layer:h.layer,
                    zIndex:zIndexes.Particles
                },
                direction:random.rad(),
                life_time:random.float(0.5,1),
                position:position,
                speed:random.float(0.1,0.4),
                angle:random.rad(),
                tint:tint,
                to:{
                    scale:1.5,
                    tint:ColorM.mult_hsv(tint,undefined,undefined,undefined,0)
                },
                zIndex:zIndexes.Particles
            }))
        }
        h.game.sounds.play(h.game.resources.get_sound(sound??(
            (h.vest&&h.vest.reflect_bullets)?
                (
                    "human_metal_hit"
                ):
                (critical?
                    "human_headshot":
                    `human_hit_${random.int(1,2)}`
                )
            )
        ),{
            position:h.position,
            max_distance:10,
            bus:"humans"
        })
    },
    die(h:Human){
        for(let i=0;i<5;i++){
            const angle=random.rad()
            h.game.scene_2d.particles.add_particle(new ABParticle2D({
                frame:{
                    image:`blood_splash_${random.int(1,3)}`,
                    layer:h.layer,
                },

                scale:0.1,
                direction:angle,
                angle:angle,
                position:h.position,
                zIndex:zIndexes.Particles,

                life_time:random.float(1,2),
                speed:random.float(1,2),
                tint:ColorM.rgba(170,10,40),
                to:{
                    scale:random.float(2,5),
                    tint:ColorM.rgba(170,10,40,0),
                    angle:angle+random.neg_float(0.5,3)
                },
            }))
        }
        const d=new ClientDecal()

        d.sprite.frame=h.game.resources.get_frame(`blood_decal_${random.int(1,2)}`)
        d.sprite.scale=v2.random(2,3)
        d.sprite.rotation=random.rad()
        d.sprite.position=h.position
        h.game.scene_2d.objects.add_object(d,h.layer)

        for(let i=0;i<4;i++){
            const angle=random.rad()
            h.game.scene_2d.particles.add_particle(new ABParticle2D({
                frame:{
                    image:`human_gore_${random.int(1,2)}`,
                    layer:h.layer,
                },
                scale:0.1,
                direction:angle,
                angle:angle,
                position:h.position,
                zIndex:zIndexes.Particles,

                life_time:random.float(1,2),
                speed:random.float(1,3),
                tint:ColorM.default.white,
                to:{
                    scale:random.float(1.7,3),
                    tint:ColorM.rgba(255,255,255,0),
                    angle:angle+random.neg_float(0.5,3)
                },
            }))
        }
    },
    downed(h:Human){
        if(h.downed)return
        h.downed=true
        h.container.zIndex=zIndexes.DownedPlayers
        h.sprites.chest.visible=true
        h.sprites.backpack.visible=false
        h.sprites.left_leg.visible=true
        h.sprites.right_leg.visible=true
        h.sprites.left_leg.position=v2(-0.8,-0.22)
        h.sprites.right_leg.position=v2(-0.8,0.22)
        h.sprites.left_leg.rotation=0.1
        h.sprites.right_leg.rotation=-0.1
        h.sprites.left_leg_foot.position=v2(0.02,0)
        h.sprites.right_leg_foot.position=v2(0.02,0)
        if(h.visual.foot&&h.visual.foot.downed_frame){
            h.sprites.left_leg_foot.set_frame(h.visual.foot.downed_frame,h.game.resources)
            h.sprites.right_leg_foot.set_frame(h.visual.foot.downed_frame,h.game.resources)
        }
        h.animation.walk_cycle=1

        h.sprites.left_arm.visible=true
        h.sprites.right_arm.visible=true
        h.sprites.left_arm.position=DefaultFistRig.left!.position
        h.sprites.right_arm.position=DefaultFistRig.right!.position
        h.sprites.left_arm.rotation=DefaultFistRig.left!.rotation
        h.sprites.right_arm.rotation=DefaultFistRig.right!.rotation

        h.sprites.weapon.visible=false
        h.sprites.weapon2.visible=false
        if(h.sprites.shadow)h.sprites.shadow.zIndex=h.container.zIndex-0.5
        if(h.melee)h.container.callmode("update_melee",h.melee)
    },
    get_up(h:Human){
        if(!h.downed)return
        h.downed=false
        h.sprites.chest.visible=false
        h.sprites.backpack.visible=true
        h.sprites.left_leg.visible=false
        h.sprites.right_leg.visible=false
        if(h.visual.foot&&h.visual.foot.frame){
            h.sprites.left_leg_foot.set_frame(h.visual.foot.frame,h.game.resources)
            h.sprites.right_leg_foot.set_frame(h.visual.foot.frame,h.game.resources)
        }
        h.container.zIndex=zIndexes.Players
        h.container.callmode("set_current_weapon",h.current_weapon)
        if(h.sprites.shadow)h.sprites.shadow.zIndex=h.container.zIndex-0.5
        if(h.melee)h.container.callmode("update_melee",h.melee)
    },
    effect_added(h:Human,effect:EffectDef){
        if(effect.assets?.sounds?.when_take){
            h.game.sounds.play(h.game.resources.get_sound(effect.assets.sounds.when_take),{
                position:h.position,
                max_distance: 7,
                volume: 0.7,
                bus:"humans"
            })
        }
    },
    effect_removed(h:Human,effect:EffectDef){
        if(effect.assets?.sounds?.when_remove){
            h.game.sounds.play(h.game.resources.get_sound(effect.assets.sounds.when_remove),{
                position:h.position,
                max_distance: 7,
                volume: 0.7,
                bus:"humans"
            })
        }
    },

    set_current_weapon(h:Human,weapon?:WeaponDef){
        if(h.downed)return

        h.assets.weapon_fire_sound=undefined
        h.assets.weapon_fire_last_sound=undefined
        h.assets.weapon_fire_alt_func_sound=undefined
        h.assets.weapon_reload_sound=undefined
        h.assets.weapon_reload_sound_alt=undefined
        h.assets.weapon_switch_sound=undefined
        h.assets.weapon_cycle_sound=undefined

        if(weapon){
            h.set_arms_rig(weapon.rig_arms)
            let original_name=weapon.idString
            let frame:string
            let replace:FrameDef|undefined
            if(weapon.item_type===GameItemType.gun){
                h.assets.weapon_reload_sound=h.game.resources.get_sound(weapon.assets?.reload_sound??weapon.idString+"_reload")
                h.assets.weapon_reload_sound_alt=h.game.resources.get_sound(weapon.assets?.reload_sound_alt??weapon.idString+"_reload_alt")
                if(weapon.dual_from){
                    const original=h.game.definitions.guns.getFromString(weapon.dual_from!)
                    original_name=original.idString
                    frame=weapon.assets?.world??original_name+"_world"
                    h.sprites.weapon2.set_frame({
                        image:frame,
                        rotation:0,
                        hotspot:v2.half_one,
                        zIndex:2,
                        scale:2,
                    },h.game.resources)
                    replace=h.visual.wrapping?.replace[frame]
                    if(replace)h.sprites.weapon2.set_frame(replace,h.game.resources)
                }else{
                    frame=weapon.assets?.world??weapon.idString+"_world"
                }
                if(weapon.assets?.use_last)h.assets.weapon_fire_last_sound=h.game.resources.get_sound(typeof weapon.assets?.use_last==="string"?weapon.assets.use_last:weapon.idString+"_fire_last")
                    if(weapon.assets?.use_alt_func)h.assets.weapon_fire_last_sound=h.game.resources.get_sound(weapon.assets.use_alt_func)
            }else{
                frame=weapon.assets?.world??weapon.idString
            }
            replace=h.visual.wrapping?.replace[frame]
            h.assets.weapon_fire_sound=h.game.resources.get_sound(weapon.assets?.use_sound??original_name+"_fire")
            h.assets.weapon_switch_sound=h.game.resources.get_sound(weapon.assets?.switch_sound??original_name+"_switch")

            if(typeof weapon.assets?.cycle_sound==="string"){
                h.assets.weapon_cycle_sound=h.game.resources.get_sound(weapon.assets.cycle_sound)
            }else if(weapon.assets?.cycle_sound){
                h.assets.weapon_cycle_sound=h.assets.weapon_switch_sound
            }

            h.assets.original_hand_frame=frame
            h.sprites.weapon.set_frame({
                image:frame,
                rotation:0,
                hotspot:v2.half_one,
                scale:2,
                zIndex:2,
            },h.game.resources)
            if(replace)h.sprites.weapon.set_frame(replace,h.game.resources)
        }else{
            h.set_arms_rig(undefined)
        }
        h.update_weapon(weapon)
        h.animation.base_left_arm_position=v2.clone(h.sprites.left_arm.position)
        h.animation.base_right_arm_position=v2.clone(h.sprites.right_arm.position)
        h.animation.base_weapon_position=v2.clone(h.sprites.weapon.position)
        if(h.melee)h.container.callmode("update_melee",h.melee)
    },
    weapon_switch(h:Human){
        if(h.assets.weapon_switch_sound){
            h.animation.sound_animation=h.game.sounds.play(h.assets.weapon_switch_sound,{
                position:h.position,
                max_distance:9,
                bus:"humans",
                delay:0.4,
                on_complete:()=>{
                    h.animation.sound_animation=undefined
                }
            })
        }
    },
    update_melee(h:Human,def?:MeleeDef){
        if(def?.character_frame){
            h.sprites.melee_world.visible=true
            if(h.downed&&def.character_frame.downed){
                h.sprites.melee_world.set_frame(def.character_frame.downed,h.game.resources)
            }else if(h.current_weapon?.item_type===def.item_type){
                h.sprites.melee_world.set_frame(def.character_frame.equipped_frame,h.game.resources)
            }else{
                h.sprites.melee_world.set_frame(def.character_frame.unequipped_frame,h.game.resources)
            }
        }else{
            h.sprites.melee_world.visible=false
        }
    },
    mounth(h:Human,state:number=0,emote_mounth:boolean=true,enabled:boolean=true){
        h.set_mounth(state,emote_mounth,enabled)
    },
    eyes(h:Human,state:number=0,animated:boolean=true){
        h.set_eyes(state,animated)
    }
} satisfies Record<string,AnimatedContainerModeCallback>