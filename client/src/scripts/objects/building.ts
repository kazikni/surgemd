import { Hitbox2D, Container2DObject, Sprite2D, ColorM, Numeric, NetStream, Angle, v2, Orientation, Sound, NullHitbox2D, model2d } from "common/engine/client.ts"
import { BuildingCeilingDef, BuildingDef } from "common/scripts/definitions/objects/buildings_base.ts"
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts"
import { StaticBody, StaticBodyAssetData, StaticBodyPhysicalData } from "./static_body.ts";
import { Debug } from "../others/config.ts";
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

        side:0
    };
    objects:Container2DObject[]=[]

    ceilings:{
        def:BuildingCeilingDef
        alive:boolean
        collided:boolean
        opacity:number
        hitbox:Hitbox2D
        container:Container2DObject
        sprite:Sprite2D
    }[]=[]

    
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

    override on_destroy(): void {
        for(const o of this.objects){
            o.destroy()
        }
    }
    update(dt:number): void {
        for(const c of this.ceilings){
            if(c.container.tint.a===0&&c.container.visible){
                c.container.visible=false
            }else if(c.container.tint.a!==0&&!c.container.visible){
                c.container.visible=true
            }

            if(!c.collided){
                c.container.tint.a=Numeric.lerp(c.container.tint.a,1,Numeric.dt_expo_inter(5,dt))
            }
            c.collided=false
        }
    }
    constructor(){
        super()
    }

    override create(_args: Record<string, any>): void {
        //this.updatable=false
    }

    update_ceilings(ceilings:{alive:boolean}[]){
        for(let i=0;i<ceilings.length;i++){
            if(this.ceilings[i].alive&&!ceilings[i].alive){
                if(this.ceilings[i].def.destroy){
                    this.ceilings[i].alive=false
                    this.ceilings[i].sprite.set_frame(this.ceilings[i].def.destroy!.frame,this.game.resources)
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
                            this._add_own_particle(this.ceilings[i].hitbox.randomPoint())
                        }
                    }
                }
            }else if(!this.ceilings[i].alive&&ceilings[i].alive){
                this.ceilings[i].alive=true
                this.ceilings[i].sprite.set_frame({
                    image:this.ceilings[i].def.frame.image,
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

        for(const f of def.content.floor_image??[]){
            const sprite=new Sprite2D()

            sprite.hotspot=v2.half_one
            sprite._scale.set(2,2)
            sprite.zIndex=zIndexes.BuildingsFloor

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

            this.game.cam2d.addObject(sprite)
            this.objects.push(sprite)
        }
        for(const c of def.content.ceiling??[]){
            const sprite=new Sprite2D()

            sprite.hotspot=v2.half_one
            sprite._scale.set(2,2)
            sprite.zIndex=zIndexes.BuildingsCeiling

            sprite.set_frame({
                image:c.frame.image,
                position:c.frame.position?v2.add_with_orientation(this.position,c.frame.position,this.physical_data.side as Orientation):this.position,
                rotation:rot+(c.frame.rotation??0),
                layer:this.layer+(c.frame.layer??0),

                scale:c.frame.scale,
                scale2:c.frame.scale2,
                zIndex:c.frame.zIndex,
                tint:c.frame.tint
            },this.game.resources)
            this.game.cam2d.addObject(sprite)
            this.objects.push(sprite)

            this.ceilings.push({
                container:sprite,
                def:c,
                hitbox:c.hitbox.transform(this.position,undefined,undefined,this.physical_data.side),
                opacity:c.visible_opacity??0,
                collided:false,
                alive:false,
                sprite
            })
        }

        if(this.def.assets?.sounds)this.set_hit_sounds_def(this.def.assets.sounds)
        if(this.def.assets?.particles)this.set_hit_particles_def(this.def.idString,0,this.def.assets.particles)

        if(Debug.hitbox){
            this.game.hitboxes_gfx.fill_color(ColorM.hex("#f007"))
            this.game.hitboxes_gfx.drawModel(model2d.hitbox(this.hitbox))
        }
    }
    override decode(stream: NetStream, full: boolean): void {
        const [physical_data]=stream.readBooleanGroup()
        if(physical_data||full){
            this.position=stream.readPos2()
            this.physical_data.side=stream.readUint8()
        }
        if(full){
            const def=this.game.definitions.buildings.getFromNumber(stream.readID())
            this.set_definition(def)
        }
        const ceilings=stream.readArray(()=>{
            const bg=stream.readBooleanGroup()
            return {
                alive:bg[0]
            }
        },1)
        this.update_ceilings(ceilings)
    }
}