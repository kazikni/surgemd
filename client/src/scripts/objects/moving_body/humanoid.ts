import { ColorM, gel_events, GELComponent, random, v2, v2m } from "common/engine/core.ts";
import { GameObject } from "../../main/gel.ts";
import { C_Humanoid_Visual} from "common/scripts/game/objects/moving_body/humanoid.ts";
import { AnimatedContainer2D, AnimatedSprite2D, Container2D, Frame, Shape2D, Sprite2D } from "common/engine/web.ts";
import { FistRig } from "common/scripts/others/item.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
export type CC_Humanoid_Visual=GameObject&C_Humanoid_Visual&{
    container:AnimatedContainer2D

    sprites:{
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
    assets:{
        eyes?:Frame[]
        mounth?:Frame[]

        arm_frame_small?:Frame
        arm_frame_medium?:Frame
    }

    update_visual():void

    set_mounth(state?:number,enabled?:boolean):void
    set_eyes(state?:number,animated?:boolean,enabled?:boolean):void
    set_arms_rig(rig?:FistRig):void
    reset_animations():void
}
export const cc_humanoid_visual:GELComponent<CC_Humanoid_Visual>={
    id_string:"cc_humanoid_visual",
    events:{
        [gel_events.bind]:function(){
            this.assets={}
        },
        [gel_events.create]:function(){
            this.container=new AnimatedContainer2D(this.app)
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
            this.sprites.left_leg.visible=false
            this.sprites.right_leg.visible=false

            v2m.set(this.sprites.left_leg.scale,1.4,1.4)
            v2m.set(this.sprites.right_leg.scale,1.4,1.4)

            this.sprites.left_leg.add_child(this.sprites.left_leg_l)
            this.sprites.left_leg.add_child(this.sprites.left_leg_foot)
            this.sprites.right_leg.add_child(this.sprites.right_leg_l)
            this.sprites.right_leg.add_child(this.sprites.right_leg_foot)

            this.scene.camera.add_object(this.container)
        },
        [gel_events.layer_set]:function(){
            this.container.layer=this.layer
        },
        [gel_events.tick]:function(){
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
        },
        [gel_events.destroy]:function(){
            this.container.destroy()
        }
    },
    methods:{
        update_visual(){
            const body_t=ColorM.number(this.visual.body.tint)

            const body_f=this.visual.body.def.frame?.base??"human_"+this.visual.body.def.id_string
            const hand_f=this.visual.body.def.frame?.hand??"human_"+this.visual.body.def.id_string+"_hand"

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

            this.assets.arm_frame_small=this.app.resources.get_frame(arm_f+"_1")
            this.assets.arm_frame_medium=this.app.resources.get_frame(arm_f+"_2")

            this.sprites.left_hand.frame=this.app.resources.get_frame(hand_f)
            this.sprites.right_hand.frame=this.app.resources.get_frame(hand_f)
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
                position:v2(0.05,0),
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

            this.sprites.left_leg.rotation=0.05
            this.sprites.right_leg.rotation=3.19
            this.sprites.left_leg.position=v2(-0.6,-0.2)
            this.sprites.right_leg.position=v2(0.6,0.2)
            this.sprites.left_leg.zIndex=1
            this.sprites.right_leg.zIndex=1

            this.sprites.chest.position=v2(-0.25,0)
            this.sprites.chest.visible=false
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
        },
        
        set_mounth(state:number=0,enabled:boolean=true){
            if(!enabled||!this.assets.mounth){
                this.sprites.mounth.visible=false
            }else{
                this.sprites.mounth.visible=true
                this.sprites.mounth.frame=this.assets.mounth[state]
            }
        },
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
        },
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
    }
}