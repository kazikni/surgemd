import { Hitbox2D, Container2DObject, Sprite2D, ColorM, Stream, Angle, v2, Orientation, Sound, NullHitbox2D, Color, Tween, v2m } from "common/engine/client.ts"
import { BuildingCeilingDef, BuildingDef } from "common/scripts/definitions/objects/buildings_base.ts"
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts"
import { StaticBody, StaticBodyAssetData, StaticBodyPhysicalData } from "./static_body.ts";
import { Debug } from "../others/config.ts";
export class BuildingCeiling{
    parent:Building
    def:BuildingCeilingDef
    alpha_tween?:Tween<Color>
    alive:boolean=false
    below:boolean=false
    opacity:number=1
    hitbox:Hitbox2D
    container:Container2DObject
    sprite:Sprite2D
    constructor(parent:Building,def:BuildingCeilingDef,hitbox:Hitbox2D,container:Container2DObject,sprite:Sprite2D){
        this.parent=parent
        this.def=def
        this.hitbox=hitbox
        this.container=container
        this.sprite=sprite
    }
    can_below(other:Hitbox2D):boolean{
        return !this.def.below?.deenabled&&this.alive&&other.colliding_with(this.hitbox)
    }
    set_below(below:boolean){
        if(this.below===below||this.def.below?.deenabled)return
        if(this.alpha_tween)this.alpha_tween.kill()
        this.below=below
        this.alpha_tween=this.parent.game.add_tween({
            duration:this.def.below?.duration??0.5,
            target:this.container.tint,
            to:{
                a:below?(this.def.below?.alpha??0):255,
            }
        })
    }
}
export class Building extends StaticBody{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    override string_type:string="building"
    override number_type: number=GameObjectType.Building
    def!:BuildingDef

    override physical_data: StaticBodyPhysicalData={
        hitbox:new NullHitbox2D(v2.zero),
        
        no_bullets_collision:false,
        no_collision:false,
        reflect_bullets:false,
        passable_by_bullets:false,

        side:0
    };
    objects:Container2DObject[]=[]

    ceilings:BuildingCeiling[]=[]

    ////////////////////////////
    // Assets                 //
    ////////////////////////////
    override assets_data: StaticBodyAssetData&{
        sounds:{    
            break?:Sound
        }
    }={
        particles:{
            images:[]
        },
        sounds:{
            hit:[],
        }
    }

    constructor(){
        super()
    }
    override on_destroy(): void {
        for(const o of this.objects){
            o.destroy()
        }
    }
    update_ceilings(ceilings:{alive:boolean}[]){
        for(let i=0;i<ceilings.length;i++){
            if(this.ceilings[i].alive&&!ceilings[i].alive){
                if(this.ceilings[i].def.destroy){
                    this.ceilings[i].alive=false
                    this.ceilings[i].sprite.set_frame({
                        image:this.ceilings[i].def.destroy!.frame,
                        zIndex:zIndexes.DeadCeilings,
                    },this.game.resources)
                    if(this.ceilings[i].def.destroy!.sound){
                        this.game.sounds.play(this.game.resources.get_sound(this.ceilings[i].def.destroy!.sound!),{
                            position:this.position,
                            max_distance:40,
                            delay:0.25,
                            bus:"obstacles"
                        })
                    }
                    if(this.ceilings[i].def.destroy!.particles?.count){
                        for(let j=0;j<this.ceilings[i].def.destroy!.particles!.count;j++){
                            this._add_own_particle(this.ceilings[i].hitbox.random_point())
                        }
                    }
                }
            }else if(!this.ceilings[i].alive&&ceilings[i].alive){
                this.ceilings[i].alive=true
                this.ceilings[i].sprite.set_frame({
                    image:this.ceilings[i].def.frame.image,
                    zIndex:this.ceilings[i].def.frame.zIndex??zIndexes.BuildingsCeiling
                },this.game.resources)
            }
        }
    }
    set_definition(def:BuildingDef){
        if(this.def)return
        if(def.hitbox)this.base_hitbox=def.hitbox.transform(undefined,undefined,undefined,this.physical_data.side)

        this.def=def
        const rot=Angle.side_rad(this.physical_data.side as Orientation)

        this.physical_data.no_collision=this.def.no_collisions??false
        this.physical_data.no_bullets_collision=this.def.no_bullet_collision??false

        for(const f of def.floor_image??[]){
            const sprite=new Sprite2D()
            sprite.hotspot=v2.half_one
            sprite._scale.set(2,2)
            sprite.zIndex=zIndexes.BuildingsFloor3
            sprite.set_frame({
                image:f.image,
                position:f.position?v2.add_with_orientation(this.position,f.position,this.physical_data.side as Orientation):this.position,
                rotation:rot+(f.rotation??0),
                layer:this.layer+(f.layer??0),

                scale:f.scale,
                scale2:f.scale2,
                zIndex:f.zIndex,
                tint:f.tint,
            },this.game.resources)
            
            if(f.create_shadow){
                const shadow_sprite=new Sprite2D()
                shadow_sprite.frame=sprite.frame
                shadow_sprite.layer=sprite.layer
                shadow_sprite.position=sprite.position
                shadow_sprite.rotation=sprite.rotation
                shadow_sprite.scale=sprite.scale
                shadow_sprite.hotspot=sprite.hotspot
                shadow_sprite.zIndex=sprite.zIndex
                shadow_sprite.tint=this.game.world_shadow.color
                v2m.add(shadow_sprite.position,shadow_sprite.position,this.game.world_shadow.offset)
                this.game.cam2d.add_object(shadow_sprite)
                this.objects.push(shadow_sprite)
            }

            this.game.cam2d.add_object(sprite)
            this.objects.push(sprite)
        }
        for(const c of def.ceiling??[]){
            const sprite=new Sprite2D()

            sprite.hotspot=v2.half_one
            sprite._scale.set(2,2)
            sprite.zIndex=zIndexes.BuildingsCeiling

            sprite.set_frame({
                image:c.destroy?.frame??c.frame.image,
                position:c.frame.position?v2.add_with_orientation(this.position,c.frame.position,this.physical_data.side as Orientation):this.position,
                rotation:rot+(c.frame.rotation??0),
                layer:this.layer+(c.frame.layer??0),

                scale:c.frame.scale,
                scale2:c.frame.scale2,
                zIndex:zIndexes.DeadCeilings,
                tint:c.frame.tint
            },this.game.resources)
            this.game.cam2d.add_object(sprite)
            this.objects.push(sprite)

            const ceiling=new BuildingCeiling(this,c,c.hitbox.transform(this.position,undefined,undefined,this.physical_data.side),sprite,sprite)
            this.ceilings.push(ceiling)
        }

        if(this.def.assets?.sounds)this.set_hit_sounds_def(this.def.assets.sounds)
        if(this.def.assets?.particles)this.set_hit_particles_def(this.def.idString,0,this.def.assets.particles)

    }
    override on_decode_net(stream: Stream, full: boolean): void {
        const [physical_data]=stream.read_boolean_group()
        if(physical_data||full){
            this.position=stream.read_pos2()
            this.physical_data.side=stream.read_uint8()
        }
        if(full){
            const def=this.game.definitions.buildings.getFromNumber(stream.read_id())
            this.set_definition(def)
        }
        const ceilings=stream.read_array(()=>{
            const bg=stream.read_boolean_group()
            return {
                alive:bg[0]
            }
        },1)
        this.update_ceilings(ceilings)
        if(Debug.hitbox&&full){
            this.game.hitboxes_gfx.ctx.hitbox(this.hitbox)
            this.game.hitboxes_gfx.ctx.fill_color=ColorM.hex("#f007")
            this.game.hitboxes_gfx.ctx.fill()
        }
    }
}