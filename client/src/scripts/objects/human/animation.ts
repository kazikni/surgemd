import { CircleCollider2D, ColorM, ease, random, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type Human } from "./human.ts";
import { ClientDecal } from "../client_decal.ts";
import { ABParticle2D, AudioInstance, Sound, Sprite2D } from "common/engine/web.ts";
import { ObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { GraphicsDConfig } from "../../main/config.ts";
import { GameItemType, GameObjectDefinitionType, ItemQualitySettings } from "common/scripts/definitions/utils.ts";
import { GunDef } from "common/scripts/definitions/items/guns.ts";
import { DefaultFistRig } from "common/scripts/others/item.ts";
import { MeleeDef } from "common/scripts/definitions/items/melees.ts";
import { GameObject } from "../../main/gel.ts";
import { ConsumibleDef, ConsumingAction } from "common/scripts/definitions/items/consumibles.ts";
import { BadgeDef } from "common/scripts/definitions/loadout/badges.ts";
import { EmoteDef } from "common/scripts/definitions/loadout/emotes.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";

export interface BulletWeightDef{
    blood_decal_chance:number
}
export const bullet_weights:Record<number,BulletWeightDef>={
    0:{
        blood_decal_chance:0.05,
    },
    1:{
        blood_decal_chance:0.1,
    },
    2:{
        blood_decal_chance:0.15,
    },
    3:{
        blood_decal_chance:0.75,
    },
    4:{
        blood_decal_chance:1,
    }
}

export const DefaultHumanModes={
    eyes:(h:Human,state:number=0,animated:boolean=true)=>h.set_eyes(state,animated),
    mounth:(h:Human,state:number=0,enabled:boolean=true)=>h.set_mounth(state,enabled),
    reset_action(h:Human,hard:boolean=true){
        if(h.action.sound){
            h.action.sound.stop()
            h.action.sound=undefined
        }
        h.sprites.muzzle_flash.visible=false
        h.action.cycle_sound_time=undefined
        h.action.recoil_state=-1
        h.action.recoil_time=0
        h.sprites.left_arm.matrix=undefined
        h.sprites.right_arm.matrix=undefined
        h.sprites.weapon.matrix=undefined
        h.sprites.weapon2.matrix=undefined
        h.sprites.muzzle_flash.matrix=undefined
        h.consumible_particles.enabled=false
        if(hard){
            h.container.stop_all_animations()
            h.set_mounth()
            h.set_eyes()
            if(!h.downed_pose)h.set_hand_visual(h.hand)
        }else if(!h.downed_pose&&!h.momentary){
            h.update_weapon(h.hand)
        }
    },
    reset_pose(h:Human){
        h.container.stop_all_animations()
        h.set_eyes()
        h.set_mounth()

        v2m.set(h.sprites.left_leg.scale,1.4,1.4)
        v2m.set(h.sprites.right_leg.scale,1.4,1.4)

        h.sprites.left_leg.rotation=0.1
        h.sprites.left_leg.position=v2(-0.6,-0.2)
        h.sprites.left_leg_foot.position=v2(0.05,0)

        h.sprites.right_leg.rotation=-0.1
        h.sprites.right_leg.position=v2(0.6,0.2)
        h.sprites.right_leg_foot.position=v2(0.05,0)

        if(h.visual.foot?.frame){
            h.sprites.left_leg_foot.set_frame(h.visual.foot!.frame!,h.app.resources)
            h.sprites.right_leg_foot.set_frame(h.visual.foot!.frame!,h.app.resources)
        }

        h.sprites.chest.position=v2(-0.25,0)
        h.sprites.chest.visible=false

        if(h.downed_pose){
            h.set_downed_pose(true)
        }else{
            h.set_arms_rig(h.arms_rig??DefaultFistRig)
            h.sprites.left_leg.visible=false
            h.sprites.right_leg.visible=false
            h.sprites.left_leg.position=v2(-0.3,-0.2)
            h.sprites.right_leg.position=v2(0.3,0.2)

            h.walk.cycle=0
            h.walk.time=0
        }
        if(!h.downed_pose)h.update_weapon(h.hand)
    },

    fire(h:Human,def:GunDef,alt:boolean,last:boolean,alt_func:boolean){
        if(def?.item_type!==GameItemType.gun)return
        const a=h.action
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

        const cycle_time=(def.fire_delay??0)*0.4
        if(!def.case_particle?.at_begin){
            h.app.clock.add_timeout(()=>{
                if(!h.destroyed)h.play_casing_particle(def)
            },cycle_time*1.25)
        }
        if(def.assets?.cycle_animation)h.container.play_animation(def.assets.cycle_animation)

        let sound:Sound|undefined
        if(alt_func)sound=h.weapon_assets.fire_alt_func??h.weapon_assets.fire
        else if(last)sound=h.weapon_assets.fire_last??h.weapon_assets.fire
        else sound=h.weapon_assets.fire
        if(sound){
            h.app.sounds.play(sound,{
                position:h.position,
                max_distance:15,
                volume:0.7,
                bus:"humans",
            })
        }
        if(h.weapon_assets.cycle)a.cycle_sound_time=cycle_time
        if(def.muzzle_flash&&!h.sprites.muzzle_flash.visible){
            const m=h.sprites.muzzle_flash
            m.visible=true
            m.frame=h.app.resources.get_frame(def.muzzle_flash.sprite)
            m.position=v2(def.barrel_length,barrel_offset)
            a.muzzle_flash_time=Math.min((def.fire_delay??0)*0.9,0.2)
        }
    },
    melee(h:Human,def:MeleeDef){
        if(def?.item_type!==GameItemType.melee)return
        const animation=def.alt_animation!==undefined?(h.action.melee_alt?def.alt_animation:def.animation):def.animation
        h.action.melee_alt=!h.action.melee_alt
        if(animation)h.container.play_animation(animation)
        const attack=()=>{
            if(h.destroyed||h.dead)return
            const hb=new CircleCollider2D(v2.add_rotate_RadAngle(h.position,def.offset,h.rotation),def.radius)
            for(const o of h.manager.cells.get_objects(hb,h.layer) as GameObject[]){
                if(o.id===h.id||!hb.colliding_with(o.collider))continue
                if(o.object_type===ObjectType.StaticBody){
                    if((o as unknown as {physical:{no_projectiles_collision?:boolean}}).physical.no_projectiles_collision)continue
                    ;(o as unknown as {on_hitted(position:Vec2,critical:boolean):void}).on_hitted(hb.position,true)
                    break
                }
                if(o.object_type===ObjectType.Human&&!(o as Human).dead){
                    (o as Human).container.callmode("hitted",hb.position,false,def.assets?.hit_sound)
                    break
                }
            }
        }
        for(const delay of def.damage_delays??[])h.app.clock.add_timeout(attack,delay)
        if(def.assets?.use_sound){
            h.app.sounds.play(h.app.resources.get_sound(def.assets.use_sound),{
                position:h.position,
                max_distance:12,
                volume:0.7,
                bus:"humans",
            })
        }
    },
    reloading(h:Human,def:GunDef,alt_reload:boolean=false){
        if(def?.item_type!==GameItemType.gun)return
        h.container.callmode("reset_action",false)
        const d=def as unknown as GunDef
        const reload_alt=d.reload?.reload_alt!==undefined&&alt_reload
        const sound=reload_alt?h.weapon_assets.reload_alt:h.weapon_assets.reload
        if(sound){
            h.action.sound?.stop()
            h.action.sound=h.app.sounds.play(sound,{
                position:h.position,
                max_distance:10,
                bus:"humans",
                on_complete:()=>{
                    h.action.sound=undefined
                },
            })
        }
        if(reload_alt&&d.assets?.reload_alt_animation)h.container.play_animation(d.assets.reload_alt_animation)
        else if(!reload_alt&&d.assets?.reload_animation)h.container.play_animation(d.assets.reload_animation)
        if(d.case_particle?.at_begin){
            if(d.dual_from){
                h.play_casing_particle(d,undefined,v2(0,-d.dual_offset))
                h.play_casing_particle(d,undefined,v2(0,d.dual_offset))
            }else{
                h.play_casing_particle(d)
            }
        }
    },
    consuming(h:Human,def?:ConsumibleDef){
        if(!def)return
        h.container.callmode("reset_action",false)
        h.action.recoil_state=-1
        const consuming=def.consuming as ConsumingAction&{type:0}
        const sound=h.app.resources.get_sound(def.assets?.using_sound??`using_${def.id_string}`)
        if(sound){
            h.action.sound?.stop()
            h.action.sound=h.app.sounds.play(sound,{
                position:h.position,
                max_distance:10,
                bus:"humans",
                on_complete:()=>{
                    h.action.sound=undefined
                },
            })
        }
        if(def.assets?.using_particle){
            h.weapon_assets.consumible_particle=def.assets.using_particle
        }else if(consuming.boost_def===undefined){
            h.weapon_assets.consumible_particle="healing_particle"
        }else{
            h.weapon_assets.consumible_particle=h.app.definitions.boosts.getFromStringSafe(consuming.boost_def)?.particle??"healing_particle"
        }
        h.consumible_particles.enabled=true
        if(consuming.animation)h.container.play_animation(consuming.animation)
    },

    broke_shield(h:Human){
        const particles=h.app.save.settings.get_var("graphics_particles")
        if(particles>=GraphicsDConfig.Advanced){
            for(let i=0;i<14;i++){
                h.scene.particles.add_particle(new ABParticle2D({
                    direction:random.rad(),
                    life_time:0.5+(Math.random()*0.5),
                    position:v2.clone(h.position),
                    speed:7,
                    scale:random.float(2,3),
                    frame:{
                        layer:h.layer,
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
            h.scene.particles.add_particle(new ABParticle2D({
                direction:0,
                life_time:0.4,
                position:v2.clone(h.position),
                speed:0,
                scale:0.1,
                frame:{
                    image:"shockwave",
                    layer:h.layer,
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
        h.app.sounds.play(h.app.resources.get_sound("shield_break"),{
            position:v2.clone(h.position),
            max_distance:30,
            bus:"humans",
        })
        const shield=h.particles.find((p)=>p.sprite instanceof Sprite2D&&p.sprite.frame?.id==="human_shield")
        if(shield)shield.lifetime=0
    },
    hitted(h:Human,position:Vec2,critical:boolean=false,sound?:string,reflected:boolean=false,weight:number=0){
        if(reflected){
            h.app.sounds.play(h.app.resources.get_sound(sound??"human_metal_hit"),{
                position:h.position,
                max_distance:20,
                bus:"humans",
            })
        }else if(h.shield){
            let shield=h.particles.find((p)=>p.sprite instanceof Sprite2D&&p.sprite.frame?.id==="human_shield")
            if(shield){
                shield.lifetime=0.5
            }else{
                const sprite=new Sprite2D()
                sprite.set_frame({image:"human_shield",hotspot:v2.half_one,zIndex:10,scale:2},h.app.resources)
                h.container.add_child(sprite)
                shield={lifetime:0.5,sprite}
                h.particles.push(shield)
            }
            h.app.sounds.play(h.app.resources.get_sound("human_hit_shield"),{
                position:h.position,
                max_distance:17,
                bus:"humans",
            })
        }else{
            const tint=random.choose([ColorM.rgba(170,10,40),ColorM.rgba(255,10,40)])
            if(Math.random()<=(bullet_weights[0]?.blood_decal_chance??0)){
                ClientDecal.spawn(h.scene,h.layer,{
                    image:`liquid_decal_${random.int(1,2)}`,
                    tint:random.choose([0xaa0a28,0xff0a28]),
                    alpha:210,
                    scale:random.float(0.7,1),
                    rotation:random.rad(),
                    position:position,
                })
            }
            if(h.app.save.settings.get_var("graphics_particles")>=GraphicsDConfig.Normal){
                h.scene.particles.add_particle(new ABParticle2D({
                    scale:0.1,
                    frame:{
                        image:`blood_splash_${random.int(1,3)}`,
                        layer:h.layer,
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
            h.app.sounds.play(h.app.resources.get_sound(sound??(critical?"human_headshot":`human_hit_${random.int(1,2)}`)),{
                position:h.position,
                max_distance:17,
                bus:"humans",
            })
        }
    },
    die(h:Human){
        for(let i=0;i<5;i++){
            const angle=random.rad()
            h.scene.particles.add_particle(new ABParticle2D({
                frame:{
                    image:`blood_splash_${random.int(1,3)}`,
                    layer:h.layer,
                },

                scale:0.1,
                direction:angle,
                angle:angle,
                position:h.position,
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
            h.scene.particles.add_particle(new ABParticle2D({
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
                    tint:ColorM.default.transparent,
                    tint_ease:ease.quarticIn,
                    angle:angle+random.neg_float(0.5,3)
                },
            }))
        }
        ClientDecal.spawn(h.scene,h.layer,{
            image:`liquid_decal_${random.int(1,2)}`,
            tint:random.choose([0xaa0a28,0xff0a28]),
            alpha:210,
            scale:random.float(2,3),
            rotation:random.rad(),
            position:v2.clone(h.position),
        })
    },

    message(h:Human,message:string){
        h.app.sounds.play(h.app.resources.get_sound("emote_play"),{
            position:h.position,
            max_distance:50,
            volume:0.7,
            bus:"humans",
        })
        h.action.emote_time=5
        h.sprites.emote_container.visible=true
        h.sprites.emote_container.scale=v2(0,0)
        h.sprites.emote_bg.set_frame({image:"dialog_background_1",scale:2},h.app.resources)
        h.sprites.emote_sprite.rotation=0
        v2m.single(h.sprites.emote_sprite.scale,1)
        h.sprites.emote_sprite.frame=undefined
        h.app.resources.render_text(message,40,"#ffffff","Russo-One",620).then((frame)=>{
            if(h.destroyed){
                frame.free()
                return
            }
            if(h.action.emote_is_message)h.sprites.emote_sprite.frame?.free()
            h.sprites.emote_sprite.frame=frame
            h.action.emote_is_message=true
        })
        h.play_speak_animation()
    },
    emote(h:Human,emote:GameItem|EmoteDef|BadgeDef){
        const s=h.sprites
        const sound:AudioInstance|undefined=h.app.sounds.play(h.app.resources.get_sound((emote as EmoteDef).use_sound??"emote_play"),{
            position:h.position,
            max_distance:50,
            volume:0.7,
            bus:"humans",
            on_complete:()=>{
                if(h.action.emote_sound===sound)h.action.emote_sound=undefined
            },
        })
        if((emote as EmoteDef).block_old_sound){
            h.action.emote_sound?.stop()
            h.action.emote_sound=sound
        }
        h.action.emote_time=2.5
        s.emote_container.visible=true
        s.emote_container.scale=v2(0,0)
        v2m.single(s.emote_sprite.scale,1)
        s.emote_sprite.rotation=0
        s.emote_bg.set_frame({image:"emote_background",tint:0xffffff,scale:2},h.app.resources)
        let frame=emote.id_string
        switch(emote.def_type){
            case GameObjectDefinitionType.emote:
                frame="emote_"+frame
                v2m.single(s.emote_sprite.scale,2.6)
                break
            case GameObjectDefinitionType.item:
                v2m.single(s.emote_sprite.scale,emote.item_type===GameItemType.ammo?1:1.75)
                if(emote.item_type===GameItemType.gun||emote.item_type===GameItemType.melee)s.emote_sprite.rotation=-0.523599
                s.emote_bg.set_frame({image:"rarity_outline",tint:ItemQualitySettings[emote.rank].tint},h.app.resources)
                break
            case GameObjectDefinitionType.badge:
                s.emote_bg.frame=h.app.resources.get_frame("emote_badge_background")
                v2m.single(s.emote_bg.scale,1)
                v2m.single(s.emote_sprite.scale,2)
                break
        }
        s.emote_sprite.frame=h.app.resources.get_frame(frame)
        h.action.emote_is_message=false
        h.play_speak_animation()
    }
}