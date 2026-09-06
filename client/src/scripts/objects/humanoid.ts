import { CircleHitbox2D, ColorM, ease, KeyFrameSpriteDef, model2d, Numeric, random, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { MovingBody } from "./moving_body.ts";
import { GameConstants, GameObjectType, HumanoidVisualData, zIndexes } from "common/scripts/others/constants.ts";
import { ABParticle2D, AnimatedContainer2D, AnimatedSprite2D, AudioInstance, ClientGame, Container2D, Frame, Shape2D, Sprite2D } from "common/engine/web.ts";
import { LoadoutAccessoryDef, LoadoutBodyDef, LoadoutEyesDef, LoadoutFootDef, LoadoutHairDef, LoadoutLegDef, LoadoutShirtDef } from "common/scripts/definitions/loadout/skins.ts";
import { FloorKind, Floors, FloorType } from "common/scripts/others/terrain.ts";
import { ClientDecal } from "./client_decal.ts";
import { DefaultDownedWalkFistRig, DefaultFistRig } from "common/scripts/others/item.ts";
export type HumanoidSprites={
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
export type HumanoidAnimation={
    mounth:KeyFrameSpriteDef[]
    base_left_arm_position:Vec2
    base_right_arm_position:Vec2
    footsteps?:AudioInstance

    walk_speed:number
    walk_cycle:number
    walk_time:number
}
export type HumanoidAssets={
    arm_frame_small?:Frame
    arm_frame_medium?:Frame
    eyes:string[]
    footstep_sounds?:string[]
}
export class Humanoid extends MovingBody{
    override number_type: number=GameObjectType.Humanoid
    override string_type: string="humanoid"

    scale:number=1

    container!:AnimatedContainer2D
    sprites!:HumanoidSprites

    visual!:HumanoidVisualData

    dead:boolean=true
    downed:boolean=false

    animation:HumanoidAnimation={
        base_left_arm_position:v2.zero(),
        base_right_arm_position:v2.zero(),
        mounth:[],
        walk_cycle:0,
        walk_speed:0,
        walk_time:0
    }
    assets:HumanoidAssets={
        eyes:[]
    }

    distance_since_last_footstep=0
    footstep_alternate:boolean=false

    paralized:boolean=false

    current_floor?:FloorType

    constructor(){
        super()
    }
    override on_create(_args: void): void {
        this.base_hitbox=new CircleHitbox2D(v2(0,0),GameConstants.humanoid.radius)
        this.container=new AnimatedContainer2D(this.game as unknown as ClientGame)

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

            left_leg_l:new Sprite2D(),
            left_leg_foot:new Sprite2D(),
            right_leg_l:new Sprite2D(),
            right_leg_foot:new Sprite2D(),

            chest:this.container.add_sprite("chest",{scale:1.4,hotspot:v2.half_one,zIndex:1}),

            accessorys:[]
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
        v2m.set(this.sprites.left_leg.scale,1.4,1.4)
        v2m.set(this.sprites.right_leg.scale,1.4,1.4)

        this.sprites.left_leg.add_child(this.sprites.left_leg_l)
        this.sprites.left_leg.add_child(this.sprites.left_leg_foot)
        this.sprites.right_leg.add_child(this.sprites.right_leg_l)
        this.sprites.right_leg.add_child(this.sprites.right_leg_foot)

        if(this.game.world_shadow.enabled){
            this.sprites.shadow=new Shape2D()
            this.sprites.shadow.model=model2d.hitbox(this.base_hitbox)
            this.sprites.shadow.color=this.game.world_shadow.color
            this.sprites.shadow.matrix=this.game.world_shadow.matrix
            this.sprites.shadow.zIndex=this.container.zIndex-0.5
            this.scene.camera.add_object(this.sprites.shadow)
        }
    }

    override on_tick(dt: number): void {
        super.on_tick(dt)
        this.container.rotation=this.rotation
        this.container._position.set(this.position.x,this.position.y)
        if(this.sprites.shadow)this.sprites.shadow.position=this.position
    }

    tick_footsteps(on_ground:boolean,footstep_distance:number=2){
        const old_pos=this.old_pos
        const f=this.game.terrain.get_floor_type(this.position,this.layer,FloorType.Void)
        if(f!==this.current_floor){
            this.current_floor=f
            this.assets.footstep_sounds=Floors[f as FloorType].footstep_sounds
        }
        if(this.distance_walked>0.001&&on_ground){
            this.distance_since_last_footstep+=this.distance_walked
            // Play Footstep Sound And Do Water Riple
            if(this.distance_since_last_footstep>=footstep_distance){
                const walk_dir:number=old_pos?v2.lookTo(this.position,old_pos):this.rotation
                this.distance_since_last_footstep=0
                if(this.assets.footstep_sounds){
                    if(this.animation.footsteps)this.animation.footsteps.stop()
                    this.animation.footsteps=this.game.sounds.play(this.game.resources.get_sound(random.choose(this.assets.footstep_sounds)),{
                        position:this.position,
                        max_distance: 15,
                        volume:0.3,
                        bus:"humans",
                        on_complete:()=>{
                            this.animation.footsteps=undefined
                        }
                    })
                }
                if(Floors[f as FloorType].footstep_decal&&!this.downed){
                    const d=new ClientDecal()
                    d.sprite.frame=this.game.resources.get_frame("human_footstep")
                    d.sprite.rotation=walk_dir
                    d.lifetime=30

                    const pos=v2(0,(this.footstep_alternate?0.3:-0.3)*this.scale)
                    v2m.rotate_RadAngle(pos,this.rotation)
                    d.sprite.position=v2.add(this.position,pos)
                    this.scene.objects.add_object(d,this.layer)

                    this.footstep_alternate=!this.footstep_alternate
                }
                if(Floors[f as FloorType].floor_kind===FloorKind.Liquid){
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
                        position:this.position,
                        speed:0,
                        to:{
                            scale:3,
                            tint:ColorM.default.transparent
                        }
                    }))
                }
            }
            this.animation.walk_speed=this.distance_walked
            if(this.animation.walk_cycle===0){
                this.animation.walk_cycle=1
                this.animation.walk_time=0
            }
        }else{
            if(this.animation.walk_cycle!==0){
                this.animation.walk_cycle=0
                this.animation.walk_time=0
            }
        }
    }
    tick_animations(dt:number){
        if(this.downed){
            if(this.animation.walk_cycle&&this.animation.walk_speed>0&&!this.paralized){
                this.animation.walk_time+=dt*1.8
                const time=ease.sineIn(this.animation.walk_time)
                switch(this.animation.walk_cycle){
                    case 1:
                        this.sprites.right_arm.position=v2.lerp(DefaultFistRig.right!.position,DefaultDownedWalkFistRig.right!.position,time)
                        this.sprites.right_arm.rotation=Numeric.lerp_rad(DefaultFistRig.right!.rotation,DefaultDownedWalkFistRig.right!.rotation,time)
                        this.sprites.left_leg.position=v2.lerp({x:-0.8,y:-0.22},{x:-0.7,y:-0.20},time)

                        this.sprites.left_arm.position=DefaultFistRig.left!.position
                        this.sprites.left_arm.rotation=DefaultFistRig.left!.rotation
                        this.sprites.right_leg.position={x:-0.8,y:0.22}
                        break
                    case 2:
                        this.sprites.right_arm.position=v2.lerp(DefaultDownedWalkFistRig.right!.position,DefaultFistRig.right!.position,time)
                        this.sprites.right_arm.rotation=Numeric.lerp_rad(DefaultDownedWalkFistRig.right!.rotation,DefaultFistRig.right!.rotation,time)
                        this.sprites.left_leg.position=v2.lerp({x:-0.7,y:-0.20},{x:-0.8,y:-0.22},time)
                        break
                    case 3:
                        this.sprites.left_arm.position=v2.lerp(DefaultFistRig.left!.position,DefaultDownedWalkFistRig.left!.position,time)
                        this.sprites.left_arm.rotation=Numeric.lerp_rad(DefaultFistRig.left!.rotation,DefaultDownedWalkFistRig.left!.rotation,time)
                        this.sprites.right_leg.position=v2.lerp({x:-0.8,y:0.22},{x:-0.7,y:0.20},time)
                        break
                    case 4:
                        this.sprites.left_arm.position=v2.lerp(DefaultDownedWalkFistRig.left!.position,DefaultFistRig.left!.position,time)
                        this.sprites.left_arm.rotation=Numeric.lerp_rad(DefaultDownedWalkFistRig.left!.rotation,DefaultFistRig.left!.rotation,time)
                        this.sprites.right_leg.position=v2.lerp({x:-0.7,y:0.20},{x:-0.8,y:0.22},time)
                        break
                    default:
                        break
                }
                if(this.animation.walk_time>=1){
                    this.animation.walk_time-=1
                    this.animation.walk_cycle=Numeric.loop(this.animation.walk_cycle+1,1,5)
                }
            }
        }else{
            if(this.animation.walk_cycle&&!this.paralized){
                this.animation.walk_time+=this.animation.walk_speed
                this.sprites.left_leg.visible=true
                this.sprites.right_leg.visible=true
                switch(this.animation.walk_cycle){
                    case 1:
                        this.sprites.left_leg.rotation=Numeric.lerp_rad(0,0.1,this.animation.walk_time)
                        this.sprites.right_leg.rotation=Numeric.lerp_rad(Math.PI,Math.PI+0.1,this.animation.walk_time)

                        this.sprites.left_leg.position.x=Numeric.lerp(-0.3,-0.45,this.animation.walk_time)
                        this.sprites.left_leg.position.y=-0.2

                        this.sprites.right_leg.position.x=Numeric.lerp(0.3,0.45,this.animation.walk_time)
                        this.sprites.right_leg.position.y=0.2

                        this.sprites.left_leg_foot.position.x=Numeric.lerp(0.05,0.04,this.animation.walk_time)
                        this.sprites.right_leg_foot.position.x=Numeric.lerp(0.05,0,this.animation.walk_time)
                        break
                    case 2:
                        this.sprites.left_leg.rotation=Numeric.lerp_rad(0.1,0,this.animation.walk_time)
                        this.sprites.right_leg.rotation=Numeric.lerp_rad(Math.PI+0.1,Math.PI,this.animation.walk_time)

                        this.sprites.left_leg.position.x=Numeric.lerp(-0.45,-0.3,this.animation.walk_time)
                        this.sprites.left_leg.position.y=-0.2

                        this.sprites.right_leg.position.x=Numeric.lerp(0.45,0.3,this.animation.walk_time)
                        this.sprites.right_leg.position.y=0.2

                        this.sprites.left_leg_foot.position.x=Numeric.lerp(0.04,0.05,this.animation.walk_time)
                        this.sprites.right_leg_foot.position.x=Numeric.lerp(0,0.05,this.animation.walk_time)
                        break
                    case 3:
                        this.sprites.left_leg.rotation=Numeric.lerp_rad(Math.PI,Math.PI-0.1,this.animation.walk_time)
                        this.sprites.right_leg.rotation=Numeric.lerp_rad(0,-0.1,this.animation.walk_time)

                        this.sprites.left_leg.position.x=Numeric.lerp(0.3,0.45,this.animation.walk_time)
                        this.sprites.left_leg.position.y=-0.2

                        this.sprites.right_leg.position.x=Numeric.lerp(-0.3,-0.45,this.animation.walk_time)
                        this.sprites.right_leg.position.y=0.2

                        this.sprites.left_leg_foot.position.x=Numeric.lerp(0.05,0,this.animation.walk_time)
                        this.sprites.right_leg_foot.position.x=Numeric.lerp(0.05,0.04,this.animation.walk_time)
                        break
                    case 4:
                        this.sprites.left_leg.rotation=Numeric.lerp_rad(Math.PI-0.1,Math.PI,this.animation.walk_time)
                        this.sprites.right_leg.rotation=Numeric.lerp_rad(-0.2,0,this.animation.walk_time)

                        this.sprites.left_leg.position.x=Numeric.lerp(0.45,0.3,this.animation.walk_time)
                        this.sprites.left_leg.position.y=-0.2

                        this.sprites.right_leg.position.x=Numeric.lerp(-0.45,-0.3,this.animation.walk_time)
                        this.sprites.right_leg.position.y=0.2

                        this.sprites.left_leg_foot.position.x=Numeric.lerp(0,0.05,this.animation.walk_time)
                        this.sprites.right_leg_foot.position.x=Numeric.lerp(0.04,0.05,this.animation.walk_time)
                        break
                }
                if(this.animation.walk_time>=1){
                    this.animation.walk_time=0
                    this.animation.walk_cycle=Numeric.loop(this.animation.walk_cycle+1,1,5)
                }
            }else{
                this.sprites.left_leg.visible=false
                this.sprites.right_leg.visible=false
            }
        }
        if(v2.len(this.sprites.left_arm.position)<=0.6){
            this.sprites.left_shirt_arm.frame=this.assets.arm_frame_small
        }else{
            this.sprites.left_shirt_arm.frame=this.assets.arm_frame_medium
        }
        if(v2.len(this.sprites.right_arm.position)<=0.6){
            this.sprites.right_shirt_arm.frame=this.assets.arm_frame_small
        }else{
            this.sprites.right_shirt_arm.frame=this.assets.arm_frame_medium
        }
    }
    update_body(){
        this.container.scale.x=this.scale
        this.container.scale.y=this.scale
        this.base_hitbox=new CircleHitbox2D(v2(0,0),GameConstants.humanoid.radius*this.scale)
        if(this.sprites.shadow)this.sprites.shadow.model=model2d.hitbox(this.base_hitbox)
    }

    reset_anim(hard:boolean=true){
        this.container.stop_all_animations()
        if(hard){
            this.set_mounth()
            this.set_eyes()
        }
    }
    set_skin(body_def:LoadoutBodyDef,hair:{tint:number,def:LoadoutHairDef,paint?:{tint:number,id:number}}|undefined,eyes_def:LoadoutEyesDef|undefined,shirt_def:LoadoutShirtDef,legs_def:LoadoutLegDef,foot_def:LoadoutFootDef|undefined,body_tint:number,accessorys:LoadoutAccessoryDef[]){
        if(this.visual&&this.visual.body.def===body_def&&this.visual.body.tint===body_tint&&this.visual.hair?.def===hair?.def&&this.visual.hair?.tint===hair?.tint&&this.visual.eyes===eyes_def)return
        this.visual={
            body:{
                def:body_def,
                tint:body_tint,
            },
            hair:hair,
            eyes:eyes_def,
            shirt:shirt_def,
            legs:legs_def,
            foot:foot_def,
            accessorys
        }

        const body_t=ColorM.number(body_tint)

        const body_f=body_def.frame?.base??"human_"+body_def.idString
        const hand_f=body_def.frame?.hand??"human_"+body_def.idString+"_hand"

        if(hair){
            this.sprites.hair.tint=ColorM.number(hair.tint)
            this.sprites.hair.child_sprites=undefined
            if(hair.def.frame?.front){
                const sub_sprites=[]
                if(hair.paint&&hair.def.frame.front.paint)sub_sprites.push({image:hair.def.frame.front.paint,tint:hair.paint.tint})
                this.sprites.hair.set_frame(Object.assign({
                    image:"human_"+hair.def.idString+"_front",
                    sub_sprites
                },hair.def.frame?.front),this.game.resources)
            }
        }
        if(eyes_def){
            this.assets.eyes=[eyes_def.frame?.base??"human_"+eyes_def.idString+"_1",eyes_def.frame?.blink??"human_"+eyes_def.idString+"_2"]
            this.sprites.eyes.position=eyes_def.position
        }else{
            this.assets.eyes.length=0
        }
        this.set_eyes()

        const arm_f=shirt_def.frame?.arm??("human_"+shirt_def.idString+"_arm")

        this.sprites.body.frame=this.game.resources.get_frame(body_f)

        this.sprites.body.tint=body_t

        this.assets.arm_frame_small=this.game.resources.get_frame(arm_f+"_1")
        this.assets.arm_frame_medium=this.game.resources.get_frame(arm_f+"_2")

        this.sprites.left_hand.frame=this.game.resources.get_frame(hand_f)
        this.sprites.right_hand.frame=this.game.resources.get_frame(hand_f)
        this.sprites.left_hand.tint=body_t
        this.sprites.right_hand.tint=body_t

        if(shirt_def.frame?.arm_tint)this.sprites.left_shirt_arm.tint=ColorM.number(shirt_def.frame?.arm_tint)
        if(shirt_def.frame?.arm_tint)this.sprites.right_shirt_arm.tint=ColorM.number(shirt_def.frame?.arm_tint)

        if(legs_def.frame){
            this.sprites.left_leg_l.set_frame(legs_def.frame,this.game.resources)
            this.sprites.right_leg_l.set_frame(legs_def.frame,this.game.resources)
        }
        this.sprites.left_leg_foot.set_frame({
            image:"human_foot_1_1",
            position:v2(0.05,0),
            tint:body_tint
        },this.game.resources)
        this.sprites.right_leg_foot.set_frame({
            image:"human_foot_1_1",
            position:v2(0.05,0),
            tint:body_tint
        },this.game.resources)
        if(foot_def?.frame){
            this.sprites.left_leg_foot.set_frame(foot_def.frame,this.game.resources)
            this.sprites.right_leg_foot.set_frame(foot_def.frame,this.game.resources)
        }

        this.sprites.left_leg.rotation=0.05
        this.sprites.right_leg.rotation=3.19
        this.sprites.left_leg.position=v2(-0.6,-0.2)
        this.sprites.right_leg.position=v2(0.6,0.2)
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
            this.animation.mounth=[
                {image:body_def.mounth.normal,delay:0.15},
                {image:body_def.mounth.open,delay:0.15},
            ]
        }else{
            this.animation.mounth.length=0
            this.sprites.mounth.visible=false
        }

        for(const a of this.sprites.accessorys){
            a.destroy()
        }
        this.sprites.accessorys.length=0
        for(const a of accessorys){
            const spr=new Sprite2D()
            spr.set_frame({
                image:a.frame?.image??a.idString,
                hotspot:v2.half_one,
                scale:2,
                zIndex:6
            },this.game.resources)
            if(a.frame)spr.transform_frame(a.frame)
            this.container.add_child(spr)
            this.sprites.accessorys.push(spr)
        }
        this.reset_anim()
    }
    set_mounth(state:number=0,enabled:boolean=true,emote_mounth:boolean=true){
        if(this.animation.mounth.length===0){
            return
        }
        if(enabled===false){
            this.sprites.mounth.visible=false
        }else{
            this.sprites.mounth.visible=true
            this.sprites.mounth.frame=this.game.resources.get_frame(this.animation.mounth[state].image as string)
        }
    }
    set_eyes(state:number=0,animated:boolean=true){
        if(this.assets.eyes.length===0){
            this.sprites.eyes.visible=false
            this.sprites.eyes.frames=undefined
        }else{
            this.sprites.eyes.visible=true
            if(animated)this.sprites.eyes.frames=[{delay:random.float(3.4,3.6),image:this.assets.eyes[0]},{delay:0.3,image:this.assets.eyes[1]}]
            else this.sprites.eyes.frames=undefined

            this.sprites.eyes.frame=this.game.resources.get_frame(this.assets.eyes[state])
        }
    }

    play_alt_animation(animation:string){
        //if(!this.game.alt_animations)
    }
    decode_animation(stream:Stream){
        const arr=stream.read_array(()=>{
            return stream.read_string(1)
        },1)
        for(let i=0;i<arr.length-1;i++)this.play_alt_animation(arr[i])
    }
}